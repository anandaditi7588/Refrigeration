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
    { id: 'finish', label: 'Assembling all 20 sections', weight: 0.12 },
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

    const videoPromise = attempt('YouTube', async () => {
      const result = await videoProvider.search(searchQuery, {
        max: AFR.config.generation.maxVideos, dish, cuisine: cuisine.name,
      });
      if (result && result.length) sourcesUsed.push(`video:${videoProvider.id}`);
      return result;
    }, warnings);

    const referencePromise = attempt('Recipe sources', async () => {
      const diet = (answers.diet || []).find((d) => ['vegetarian', 'vegan', 'gluten-free', 'keto', 'paleo'].includes(d));
      const result = await recipeProvider.search(searchQuery, {
        max: AFR.config.generation.maxSources, dish, cuisineName: cuisine.name, diet,
        intolerances: (answers.allergies || []).join(','),
      });
      if (result && result.length) sourcesUsed.push(`recipe:${recipeProvider.id}`);
      return result;
    }, warnings);

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

    const [videos, references] = await Promise.all([videoPromise, referencePromise]);

    recipe.videos = (videos || []).map((v) =>
      Object.assign({ thumb: AFR.images.video(v.title || dish) }, v));

    recipe.sources = buildSources(recipe, references, videos, {
      videoProvider, recipeProvider, aiProvider, dish, cuisine,
    });

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

    /* ------------------------------------------------------- 5. finalise */
    onStage('finish', STAGES[4].label);
    advance(4, 0.5);

    recipe.meta.warnings = U.unique(recipe.meta.warnings.concat(warnings));
    recipe.meta.sourcesUsed = U.unique(sourcesUsed);
    recipe.meta.live = {
      ai: AFR.config.isLive('ai'),
      video: AFR.config.isLive('video'),
      recipe: AFR.config.isLive('recipe'),
    };
    recipe.meta.generatedAt = new Date().toISOString();

    advance(4, 1);
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
