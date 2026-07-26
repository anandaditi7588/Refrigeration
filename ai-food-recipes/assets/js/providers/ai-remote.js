/* ==========================================================================
 * ai-remote.js — adapters for hosted models (OpenAI, Gemini, Claude) and for
 * your own backend proxy.
 *
 * All four expose the same `generate(answers, hooks)` signature as the local
 * engine and return the same schema, so switching provider is a one-line
 * change in config.js.
 *
 * SECURITY: putting a vendor API key in `AFR.config.keys` ships it to every
 * visitor. That path exists for local development only. In production set
 * `AFR.config.endpoints.ai` to a small server you control that holds the key
 * and forwards the request — the `proxy` adapter below talks to exactly that.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /** Pull a JSON object out of a model response that may be fenced or chatty. */
  function extractJSON(text) {
    if (!text) throw new Error('Empty response from the model');
    const cleaned = String(text).replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    try { return JSON.parse(cleaned); } catch (_) { /* fall through to brace scan */ }

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('Model response did not contain JSON');
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  /**
   * Fill the gaps a language model tends to leave: images, cost, shopping list
   * and the customisation summary are all deterministic, so we compute them
   * locally rather than paying tokens for them.
   */
  function hydrate(raw, answers) {
    const recipe = AFR.schema.normalise(raw);
    const servings = Math.max(1, parseInt(answers.servings, 10) || recipe.servings || 4);
    recipe.servings = servings;

    recipe.image = recipe.image || AFR.images.dish(recipe.name);
    if (!recipe.gallery.length) {
      recipe.gallery = [
        { kind: 'ingredients', caption: 'Mise en place', src: AFR.images.dish(`${recipe.name} ingredients`) },
        { kind: 'preparation', caption: 'Preparation', src: AFR.images.step(`${recipe.name} preparation`) },
        { kind: 'cooking', caption: 'Cooking', src: AFR.images.step(`${recipe.name} cooking`) },
        { kind: 'final', caption: `Finished ${recipe.name}`, src: AFR.images.dish(recipe.name) },
        { kind: 'serving', caption: 'Plated and served', src: AFR.images.serving(`${recipe.name} plated`) },
      ];
    }

    /* Resolve each ingredient against the pantry so images, grouping, cost and
       the nutrition cross-check all work even when the model omitted them. */
    let resolvedCount = 0;
    recipe.ingredients = recipe.ingredients.map((line) => {
      const item = AFR.data.ingredients.resolve(line.name);
      /* resolve() always returns something usable, flagging a guessed entry
         with `estimated`. Counting only genuine pantry matches is what decides
         whether the local nutrition cross-check below means anything at all. */
      if (item && !item.estimated) resolvedCount += 1;
      const grams = line.grams || (parseFloat(line.qty) || 1) * (item.gramsPerUnit || 50);
      return Object.assign({}, line, {
        item,
        grams,
        image: line.image || AFR.images.ingredient(line.name),
        group: line.group || item.group,
        substitute: line.substitute || item.substitute,
        healthy: line.healthy || item.healthy,
        purpose: line.purpose || item.purpose,
        display: line.display || `${line.qty} ${line.unit}`.trim(),
        have: (answers.available || []).some((a) => U.includesTerm(line.name, a)),
      });
    });

    recipe.equipment = recipe.equipment.map((e) =>
      Object.assign({}, e, { image: e.image || AFR.images.equipment(e.name) }));
    recipe.preparation = recipe.preparation.map((s) =>
      Object.assign({}, s, { image: s.image || AFR.images.step(`${recipe.name} ${s.title}`) }));
    recipe.steps = recipe.steps.map((s) =>
      Object.assign({}, s, { image: s.image || AFR.images.step(`${recipe.name} ${s.title}`) }));
    recipe.serving.image = recipe.serving.image || AFR.images.serving(`${recipe.name} served`);

    /* Nutrition: trust the model's numbers if they look sane, otherwise
       recompute from the resolved ingredient list.

       The cross-check is only valid when the ingredients actually matched the
       pantry. When the model writes in Marathi or Arabic, or names a regional
       ingredient the pantry lacks, almost nothing resolves and the local figure
       collapses towards zero — at which point "they disagree" says the local
       number is wrong, not the model's. Overriding here is how a correct
       420 kcal Puran Poli became 51 kcal. */
    const computed = AFR.nutrition.perServing(recipe.ingredients, servings);
    const coverage = recipe.ingredients.length ? resolvedCount / recipe.ingredients.length : 0;
    const canCrossCheck = coverage >= 0.6;
    const modelKcal = Number(recipe.nutrition.calories) || 0;
    const disagrees = Math.abs(modelKcal - computed.calories) / Math.max(computed.calories, 1) > 0.6;

    if (modelKcal && !canCrossCheck) {
      /* Keep the model's figures, and say why they were not verified rather
         than implying they were. */
      recipe.nutrition = Object.assign({}, computed, recipe.nutrition);
      recipe.nutritionNote = `Per serving, for ${servings} servings, as given by the model. `
        + 'These could not be cross-checked locally because most ingredients here are not in the built-in food table.';
      recipe.meta.warnings.push(
        'Nutrition figures come from the AI model and were not verified against the local food-composition table.');
    } else if (!modelKcal || disagrees) {
      recipe.nutrition = computed;
      recipe.nutritionNote = `Recalculated locally from the ingredient list and divided by ${servings} servings, because the model's figures were inconsistent with the ingredients it listed.`;
      recipe.meta.warnings.push('Nutrition was recomputed locally for internal consistency.');
    } else {
      recipe.nutrition = Object.assign(computed, recipe.nutrition);
      recipe.nutritionNote = recipe.nutritionNote || `Per serving, for ${servings} servings. Estimated values.`;
    }

    if (!recipe.health.score) {
      const h = AFR.nutrition.healthScore(recipe.nutrition, { diet: answers.diet, oil: answers.oil, salt: answers.salt, style: answers.style });
      recipe.health = { score: h.score, band: h.band, pros: h.pros, cons: h.cons, suitability: {} };
    }
    if (!recipe.health.suitability || !Object.keys(recipe.health.suitability).length) {
      const spiceOpt = AFR.data.wizard.optionFor('spice', answers.spice) || { level: 3 };
      recipe.health.suitability = AFR.nutrition.suitability(recipe.nutrition, {
        diet: answers.diet || [], spiceLevel: spiceOpt.level,
      });
    }

    if (!recipe.cost.total) {
      recipe.cost = Object.assign(AFR.nutrition.cost(recipe.ingredients, servings), {
        note: 'Estimated locally from typical retail prices.',
      });
    }

    if (!recipe.shopping.length) {
      const order = ['Vegetables', 'Spices', 'Dairy', 'Meat', 'Grains', 'Others'];
      const grouped = U.groupBy(recipe.ingredients, (l) => l.group || 'Others');
      recipe.shopping = order.filter((g) => grouped[g]).map((group) => ({
        group,
        items: grouped[group].map((l) => ({ name: l.name, qty: l.display, have: l.have })),
      }));
    }

    if (!recipe.customization.length) {
      // The summary is purely a restatement of the user's answers, so we can
      // always build it locally rather than trusting the model to echo them.
      const local = AFR.providers.aiLocal && AFR.providers.aiLocal._internal;
      if (local) {
        recipe.customization = local.buildCustomization(local.buildContext(answers));
      }
    }

    recipe.totalTime = recipe.totalTime || recipe.prepTime + recipe.cookTime;
    return recipe;
  }

  /** Shared fetch with timeout and useful error text. */
  async function post(url, options, label) {
    const res = await U.withTimeout(fetch(url, options), AFR.config.generation.timeoutMs, label);
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch (_) { /* ignore */ }
      throw new Error(`${label} failed: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
    }
    return res.json();
  }

  /* ------------------------------------------------------------- OpenAI */
  const openai = {
    id: 'openai', capability: 'ai', label: 'OpenAI',
    async generate(answers, hooks = {}) {
      const key = AFR.config.keys.openai;
      if (!key) throw new Error('No OpenAI key configured (AFR.config.keys.openai)');
      (hooks.onProgress || (() => {}))('Asking OpenAI for a structured recipe…', 0.4);

      const data = await post('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: AFR.config.models.openai,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: AFR.prompt.SYSTEM },
            { role: 'user', content: AFR.prompt.build(answers) },
          ],
        }),
      }, 'OpenAI');

      const text = data.choices && data.choices[0] && data.choices[0].message.content;
      const recipe = hydrate(extractJSON(text), answers);
      recipe.meta.provider = 'openai';
      recipe.meta.mode = 'ai';
      return recipe;
    },
  };

  /* ------------------------------------------------------------- Gemini */
  const gemini = {
    id: 'gemini', capability: 'ai', label: 'Google Gemini',
    async generate(answers, hooks = {}) {
      const key = AFR.config.keys.gemini;
      if (!key) throw new Error('No Gemini key configured (AFR.config.keys.gemini)');
      (hooks.onProgress || (() => {}))('Asking Gemini for a structured recipe…', 0.4);

      const model = AFR.config.models.gemini;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

      const data = await post(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: AFR.prompt.SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: AFR.prompt.build(answers) }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      }, 'Gemini');

      const text = data.candidates && data.candidates[0]
        && data.candidates[0].content.parts.map((p) => p.text).join('');
      const recipe = hydrate(extractJSON(text), answers);
      recipe.meta.provider = 'gemini';
      recipe.meta.mode = 'ai';
      return recipe;
    },
  };

  /* ------------------------------------------------------------- Claude */
  const claude = {
    id: 'claude', capability: 'ai', label: 'Anthropic Claude',
    async generate(answers, hooks = {}) {
      const key = AFR.config.keys.claude;
      if (!key) throw new Error('No Claude key configured (AFR.config.keys.claude)');
      (hooks.onProgress || (() => {}))('Asking Claude for a structured recipe…', 0.4);

      const data = await post('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          // Required when calling Anthropic directly from a browser.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: AFR.config.models.claude,
          max_tokens: 8000,
          temperature: 0.7,
          system: AFR.prompt.SYSTEM,
          messages: [{ role: 'user', content: AFR.prompt.build(answers) }],
        }),
      }, 'Claude');

      const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const recipe = hydrate(extractJSON(text), answers);
      recipe.meta.provider = 'claude';
      recipe.meta.mode = 'ai';
      return recipe;
    },
  };

  /* -------------------------------------------------------------- proxy */
  /* The recommended production path: your server holds the key and decides
     which model to call. It should return either the recipe JSON directly or
     `{ recipe: {...} }`. */
  const proxy = {
    id: 'proxy', capability: 'ai', label: 'Your backend',
    async generate(answers, hooks = {}) {
      const url = AFR.config.endpoints.ai;
      if (!url) throw new Error('No AI endpoint configured (AFR.config.endpoints.ai)');
      (hooks.onProgress || (() => {}))('Generating your recipe…', 0.4);

      const data = await post(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, brief: AFR.prompt.brief(answers) }),
      }, 'Recipe backend');

      const recipe = hydrate(data.recipe || data, answers);
      recipe.meta.provider = 'proxy';
      recipe.meta.mode = 'ai';
      return recipe;
    },
  };

  AFR.providers = AFR.providers || {};
  Object.assign(AFR.providers, { aiOpenai: openai, aiGemini: gemini, aiClaude: claude, aiProxy: proxy });
  AFR.providers._aiHelpers = { extractJSON, hydrate };
})(window);
