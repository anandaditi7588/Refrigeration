/* ==========================================================================
 * recipe-service.js — the orchestrator.
 *
 * Implements the source-priority chain from the brief:
 *
 *   1. YouTube            → video references (Section 16)
 *   2. Trusted websites   → reading references (Section 17)
 *   3. Public recipe APIs → structured cross-checks (times, servings, ratings)
 *   4. AI                 → the recipe body itself
 *
 * The video and reference lookups run in parallel with generation, because
 * neither blocks the other, and every one of them is allowed to fail without
 * taking the page down: a failed source becomes a warning, not an error.
 *
 * Combination rule: external sources INFORM the recipe (they cross-check
 * timings and provide references) — they are never copied into it. The body
 * is always freshly generated.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /* The stages shown in the generation overlay. Weights sum to 1. */
  const STAGES = [
    { id: 'brief', label: 'Reading your brief', weight: 0.08 },
    { id: 'sources', label: 'Searching videos and recipe sources', weight: 0.22 },
    { id: 'generate', label: 'Composing your recipe', weight: 0.42 },
    { id: 'nutrition', label: 'Scaling ingredients and nutrition', weight: 0.16 },
    { id: 'translate', label: 'Translating the recipe', weight: 0.10 },
    { id: 'finish', label: 'Assembling all 20 sections', weight: 0.02 },
  ];

  /** Never let one bad provider break generation. */
  async function attempt(label, fn, warnings) {
    try {
      return await fn();
    } catch (err) {
      warnings.push(`${label}: ${err && err.message ? err.message : 'unavailable'}`);
      return null;
    }
  }

  /**
   * Generate a complete recipe from wizard answers.
   *
   * @param {object} answers  wizard answers
   * @param {object} hooks    { onStage(stageId, label), onProgress(fraction, label) }
   * @returns {Promise<object>} a recipe matching AFR.schema
   */
  async function generate(answers, hooks = {}) {
    const onStage = hooks.onStage || (() => {});
    const onProgress = hooks.onProgress || (() => {});
    const warnings = [];
    const sourcesUsed = [];

    /* The picker is global rather than a wizard step, so fold it in here. */
    if (!answers.language && AFR.i18n) answers.language = AFR.i18n.current;

    let completed = 0;
    const advance = (stageIndex, within, label) => {
      const before = STAGES.slice(0, stageIndex).reduce((s, x) => s + x.weight, 0);
      completed = before + STAGES[stageIndex].weight * U.clamp(within, 0, 1);
      onProgress(completed, label || STAGES[stageIndex].label);
    };

    /* ---------------------------------------------------------- 1. brief */
    onStage('brief', STAGES[0].label);
    advance(0, 0.4);

    const dish = U.clean(answers.dish) || 'Chef’s Special';
    const cuisineId = (!answers.cuisine || answers.cuisine === 'auto')
      ? AFR.data.cuisines.detect(dish) : answers.cuisine;
    const cuisine = AFR.data.cuisines.get(cuisineId);
    const searchQuery = `${dish} ${cuisine.id === 'global' ? '' : cuisine.name} recipe`.trim();
    advance(0, 1);

    /* ------------------------------------------- 2. sources (in parallel) */
    onStage('sources', STAGES[1].label);
    advance(1, 0.2);

    const videoProvider = AFR.registry.resolve('video');
    const recipeProvider = AFR.registry.resolve('recipe');

    /* YouTube is source priority #1 in the brief, and its thumbnails can also
       supply the photography, so it is awaited before generation rather than
       raced against it. Everything else still runs in parallel. */
    const videos = await attempt('YouTube', async () => {
      const result = await videoProvider.search(searchQuery, {
        max: AFR.config.generation.maxVideos, dish, cuisine: cuisine.name,
      });
      if (result && result.length) sourcesUsed.push(`video:${videoProvider.id}`);
      return result;
    }, warnings) || [];
    advance(1, 0.55);

    const referencePromise = attempt('Recipe sources', async () => {
      const diet = (answers.diet || []).find((d) => ['vegetarian', 'vegan', 'gluten-free', 'keto', 'paleo'].includes(d));
      const result = await recipeProvider.search(searchQuery, {
        max: AFR.config.generation.maxSources, dish, cuisineName: cuisine.name, diet,
        intolerances: (answers.allergies || []).join(','),
      });
      if (result && result.length) sourcesUsed.push(`recipe:${recipeProvider.id}`);
      return result;
    }, warnings);

    /* Real photography, fetched before generation because the renderer asks
       for image URLs synchronously while the recipe is being built. */
    let photoReport = { count: 0, ingredientCount: 0, warnings: [] };
    if (AFR.config.providers.photo && AFR.config.providers.photo !== 'local') {
      onStage('sources', 'Finding photographs');
      advance(1, 0.75);
      photoReport = await attempt('Photos', () => AFR.images.prefetch({
        dish,
        cuisine: cuisine.id === 'global' ? '' : cuisine.name,
        videos,
      }), warnings) || photoReport;

      warnings.push(...(photoReport.warnings || []));
      if (photoReport.count) sourcesUsed.push(`photo:${AFR.config.providers.photo}`);
    } else {
      AFR.images.reset();
    }
    advance(1, 1);

    /* --------------------------------------------------- 3. recipe body */
    onStage('generate', STAGES[2].label);
    advance(2, 0.1);

    const aiProvider = AFR.registry.resolve('ai');
    let recipe = await attempt(`AI provider (${aiProvider.id})`, () =>
      U.withTimeout(
        aiProvider.generate(answers, {
          onProgress: (label, fraction) => advance(2, fraction, label),
        }),
        AFR.config.generation.timeoutMs,
        'Recipe generation'), warnings);

    /* Falling back is a normal outcome, not a crash. */
    if (!recipe && aiProvider.id !== 'local') {
      onStage('generate', 'Falling back to the built-in engine');
      const localProvider = AFR.registry.fallback('ai');
      recipe = await localProvider.generate(answers, {
        onProgress: (label, fraction) => advance(2, fraction, label),
      });
      warnings.push('The configured AI provider was unavailable, so the built-in engine generated this recipe.');
    }
    if (!recipe) throw new Error('Recipe generation failed and no fallback was available.');
    sourcesUsed.push(`ai:${recipe.meta.provider}`);
    advance(2, 1);

    /* ------------------------------------------ 4. merge external sources */
    onStage('nutrition', STAGES[3].label);
    advance(3, 0.3);

    const references = await referencePromise;

    recipe.videos = (videos || []).map((v) =>
      Object.assign({ thumb: AFR.images.video(v.title || dish) }, v));

    recipe.sources = buildSources(recipe, references, videos, {
      videoProvider, recipeProvider, aiProvider, dish, cuisine,
    });

    /* Ingredient photos come last, once we know which ~18 the recipe uses --
       fetching the whole pantry up front would be dozens of wasted requests.
       This is deliberately independent of the DISH photo provider: the
       ingredient source (Wikimedia) needs no key, so vegetables get real
       photographs even when nothing else is configured. */
    if (AFR.config.images.ingredientPhotos
        && AFR.config.providers.ingredientPhoto
        && AFR.config.providers.ingredientPhoto !== 'local') {
      const named = await attempt('Ingredient photos',
        () => AFR.images.prefetchIngredients(recipe.ingredients.map((i) => i.name)), warnings);
      if (named) {
        recipe.ingredients = recipe.ingredients.map((line) => Object.assign({}, line, {
          image: AFR.images.ingredient(line.name),
        }));
        sourcesUsed.push(`ingredientPhoto:${AFR.config.providers.ingredientPhoto}`);
      }
    }

    /* Photographers must be credited — Unsplash's terms require it, and it is
       the right thing to do for Wikimedia and Pexels too. */
    const credits = AFR.images.credits();
    if (credits.length) {
      recipe.sources.push({
        type: 'photo',
        title: `Photography: ${credits.slice(0, 4).map((c) => c.credit).join(', ')}`
          + (credits.length > 4 ? ` and ${credits.length - 4} more` : ''),
        url: credits[0].url || '',
        note: `Images supplied live by ${AFR.config.providers.photo}.`,
      });
      recipe.meta.photoCredits = credits;
    }

    /* Cross-check our timing against structured API data where we have it.
       We report the discrepancy rather than silently overwriting our own
       method, because the timings belong to the steps we actually wrote. */
    const apiTimes = (references || [])
      .map((r) => Number(r.readyInMinutes))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (apiTimes.length) {
      const median = apiTimes.sort((a, b) => a - b)[Math.floor(apiTimes.length / 2)];
      const drift = Math.abs(median - recipe.totalTime) / Math.max(median, 1);
      if (drift > 0.5) {
        recipe.meta.warnings.push(
          `Published versions of this dish typically take around ${U.humanTime(median)}; this method comes to ${U.humanTime(recipe.totalTime)} because it is adapted to your equipment and time preference.`);
      }
      sourcesUsed.push('crosscheck:timing');
    }

    advance(3, 1);

    /* ------------------------------------------------------ 5. translate */
    /* Only the offline engine needs this. A hosted model was already asked to
       write in the target language (see prompt-builder.js), and its native
       prose reads better than a translation of English. */
    const language = answers.language || 'en';
    let translationReport = null;

    if (language !== 'en' && recipe.meta.provider === 'local' && AFR.translation) {
      onStage('translate', `Translating into ${AFR.data.languages.get(language).name}`);
      advance(4, 0.05);

      /* Belt and braces: the service has its own breaker and deadline, but a
         provider that neither resolves nor rejects must not strand the user
         on a spinner. A partly-translated recipe is still fully readable. */
      translationReport = await attempt('Translation', () =>
        U.withTimeout(
          AFR.translation.translateRecipe(recipe, language, {
            onProgress: (fraction) => advance(4, 0.05 + fraction * 0.95),
          }),
          AFR.config.generation.translateTimeoutMs || 30000,
          'Translation'), warnings);

      if (translationReport) {
        warnings.push(...translationReport.warnings);
        if (translationReport.translated || translationReport.cached) {
          sourcesUsed.push(`translate:${translationReport.provider}`);
        }
      } else {
        /* attempt() already recorded the reason; say what it means for them. */
        warnings.push('The translator could not be reached, so this recipe is in English.');
      }
    }
    advance(4, 1);

    /* ------------------------------------------------------- 6. finalise */
    onStage('finish', STAGES[5].label);
    advance(5, 0.5);

    recipe.meta.warnings = U.unique(recipe.meta.warnings.concat(warnings));
    recipe.meta.sourcesUsed = U.unique(sourcesUsed);
    recipe.meta.live = {
      ai: AFR.config.isLive('ai'),
      video: AFR.config.isLive('video'),
      recipe: AFR.config.isLive('recipe'),
    };
    recipe.meta.generatedAt = new Date().toISOString();
    recipe.meta.language = language;
    recipe.meta.translation = translationReport;

    /* Be specific about what the reader is actually looking at. */
    if (language !== 'en' && recipe.meta.provider === 'local') {
      const langName = AFR.data.languages.get(language).name;
      if (!translationReport || !(translationReport.translated || translationReport.cached)) {
        recipe.meta.warnings.push(
          `This recipe is in English — ${langName} translation was unavailable. `
          + 'It needs a working internet connection, and a published Artifact page blocks the request entirely.');
      } else if (translationReport.failed) {
        recipe.meta.warnings.push(
          `Most of this recipe is in ${langName}; ${translationReport.failed} phrase(s) stayed in English.`);
      } else {
        recipe.meta.warnings.push(
          `Translated into ${langName} by machine translation. Quantities, temperatures and timings are unchanged — `
          + 'check any ingredient name that looks unfamiliar against the English original.');
      }
    }

    advance(5, 1);
    return recipe;
  }

  /** Section 17 — an honest account of what actually informed the recipe. */
  function buildSources(recipe, references, videos, ctx) {
    const list = [];

    if (videos && videos.length) {
      const live = videos.some((v) => !v.estimated);
      list.push({
        type: 'youtube',
        title: live
          ? `${videos.length} YouTube videos found for this dish`
          : `YouTube searches for ${ctx.dish}`,
        url: videos[0].url,
        note: live
          ? `Retrieved live via the YouTube Data API and ranked by view count.`
          : 'No YouTube API key is configured, so these are search links rather than retrieved videos.',
      });
    }

    (references || []).forEach((ref) => {
      list.push({
        type: ref.type || 'web',
        title: ref.title,
        url: ref.url,
        note: ref.note || '',
      });
    });

    list.push({
      type: 'engine',
      title: recipe.meta.provider === 'local'
        ? 'Generated by the built-in recipe engine'
        : `Generated by ${ctx.aiProvider.label || recipe.meta.provider}`,
      url: '',
      note: recipe.meta.provider === 'local'
        ? `Composed from this app's own knowledge base: the ${recipe.technique.name.toLowerCase()} technique combined with the ${recipe.cuisine.name} flavour profile and a food-composition table. No external recipe text was copied.`
        : 'The method was written for your brief. External sources were used as references, not copied.',
    });

    list.push({
      type: 'reference',
      title: 'Nutrition reference data',
      url: 'https://fdc.nal.usda.gov/',
      note: 'Per-serving values are estimated from public food-composition data applied to this ingredient list.',
    });

    return list;
  }

  AFR.recipeService = { generate, STAGES };
})(window);
