/* ==========================================================================
 * recipe-api-providers.js — Section 17 (source references) and the optional
 * "trusted websites / public APIs" tiers of the source priority chain.
 *
 * Adapters:
 *   • spoonacular — complexSearch + information, returns reference recipes
 *   • edamam      — recipe search v2
 *   • proxy       — your own aggregator endpoint
 *   • local       — no network: emits the *searches* a cook would run, as
 *                   real links, clearly marked as suggested reading rather
 *                   than as sources that were actually consulted.
 *
 * The orchestrator uses these as REFERENCES, never as content to copy: the
 * recipe body is always generated. That is deliberate — reproducing another
 * site's recipe text would be plagiarism, and the brief explicitly asks the
 * app never to simply copy content.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  async function getJSON(url, label) {
    const res = await U.withTimeout(fetch(url), AFR.config.generation.timeoutMs, label);
    if (!res.ok) throw new Error(`${label} failed: HTTP ${res.status}`);
    return res.json();
  }

  /* --------------------------------------------------------- Spoonacular */
  const spoonacular = {
    id: 'spoonacular', capability: 'recipe', label: 'Spoonacular',

    async search(query, opts = {}) {
      const key = AFR.config.keys.spoonacular;
      if (!key) throw new Error('No Spoonacular key configured');
      const max = opts.max || 4;

      const url = 'https://api.spoonacular.com/recipes/complexSearch'
        + `?query=${encodeURIComponent(query)}&number=${max}&addRecipeInformation=true`
        + `&sort=popularity${opts.diet ? `&diet=${encodeURIComponent(opts.diet)}` : ''}`
        + `${opts.intolerances ? `&intolerances=${encodeURIComponent(opts.intolerances)}` : ''}`
        + `&apiKey=${encodeURIComponent(key)}`;

      const data = await getJSON(url, 'Spoonacular');
      return (data.results || []).map((r) => ({
        type: 'api',
        title: r.title,
        url: r.sourceUrl || r.spoonacularSourceUrl,
        note: `${r.sourceName || 'Spoonacular'} · ready in ${r.readyInMinutes} min · serves ${r.servings}`,
        image: r.image,
        readyInMinutes: r.readyInMinutes,
        servings: r.servings,
        healthScore: r.healthScore,
      }));
    },
  };

  /* --------------------------------------------------------------- Edamam */
  const edamam = {
    id: 'edamam', capability: 'recipe', label: 'Edamam',

    async search(query, opts = {}) {
      const { appId, appKey } = AFR.config.keys.edamam || {};
      if (!appId || !appKey) throw new Error('No Edamam credentials configured');
      const max = opts.max || 4;

      const url = 'https://api.edamam.com/api/recipes/v2?type=public'
        + `&q=${encodeURIComponent(query)}&app_id=${encodeURIComponent(appId)}`
        + `&app_key=${encodeURIComponent(appKey)}`
        + `${opts.diet ? `&health=${encodeURIComponent(opts.diet)}` : ''}`;

      const data = await getJSON(url, 'Edamam');
      return (data.hits || []).slice(0, max).map(({ recipe }) => ({
        type: 'api',
        title: recipe.label,
        url: recipe.url,
        note: `${recipe.source} · ${Math.round(recipe.calories / (recipe.yield || 1))} kcal per serving`,
        image: recipe.image,
        servings: recipe.yield,
      }));
    },
  };

  /* ---------------------------------------------------------------- proxy */
  const proxy = {
    id: 'proxy', capability: 'recipe', label: 'Your aggregator',
    async search(query, opts = {}) {
      const endpoint = AFR.config.endpoints.recipe;
      if (!endpoint) throw new Error('No recipe endpoint configured');
      const data = await getJSON(
        `${endpoint}?q=${encodeURIComponent(query)}&max=${opts.max || 4}`, 'Recipe API');
      return (data.results || data || []).map((r) => Object.assign({ type: 'api' }, r));
    },
  };

  /* ---------------------------------------------------------------- local */
  const local = {
    id: 'local', capability: 'recipe', label: 'Suggested reading (no API key)',

    async search(query, opts = {}) {
      const cuisine = opts.cuisineName || '';
      const dish = opts.dish || query;

      /* Real, working search links. We do not claim these pages were consulted
         — the UI presents them as "where to read more". */
      return [
        {
          type: 'search',
          title: `Recipes for ${U.titleCase(dish)}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(`${dish} recipe`)}`,
          note: 'Web search across recipe sites',
        },
        {
          type: 'search',
          title: `Authentic ${cuisine ? `${cuisine} ` : ''}${U.titleCase(dish)}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(`authentic ${cuisine} ${dish} traditional recipe`)}`,
          note: 'Regional and traditional versions',
        },
        {
          type: 'search',
          title: `${U.titleCase(dish)} technique and troubleshooting`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(`${dish} technique tips common mistakes`)}`,
          note: 'Method deep-dives and problem solving',
        },
        {
          type: 'reference',
          title: 'Food safety: cooking temperatures',
          url: 'https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures',
          note: 'Official minimum internal cooking temperatures',
        },
        {
          type: 'reference',
          title: 'USDA FoodData Central',
          url: 'https://fdc.nal.usda.gov/',
          note: 'The food-composition reference behind the nutrition estimates',
        },
      ].slice(0, opts.max || 5);
    },
  };

  AFR.providers = AFR.providers || {};
  Object.assign(AFR.providers, {
    recipeSpoonacular: spoonacular, recipeEdamam: edamam, recipeProxy: proxy, recipeLocal: local,
  });
})(window);
