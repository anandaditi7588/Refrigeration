/* ==========================================================================
 * config.js — single source of truth for provider wiring.
 *
 * The whole app talks to providers through the registry (providers/registry.js);
 * nothing else reads API keys. To go live with a real backend you only ever
 * touch this file:
 *
 *   AFR.config.providers.ai      = 'openai' | 'gemini' | 'claude' | 'local'
 *   AFR.config.providers.video   = 'youtube' | 'local'
 *   AFR.config.providers.recipe  = 'spoonacular' | 'edamam' | 'local'
 *
 * Keys should be supplied by a proxy you control, never hard-coded into a
 * public page — see `endpoints` below, which is the recommended path.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  AFR.config = {
    app: {
      name: 'AI Food Recipes',
      tagline: 'Every cuisine on earth, cooked your way.',
      version: '1.0.0',
    },

    /* Which implementation the registry resolves for each capability.
       'local' runs entirely in the browser with no network calls — it is the
       default so the app is fully functional out of the box. */
    providers: {
      ai: 'local',
      video: 'local',
      recipe: 'local',
      image: 'local',
    },

    /* Preferred, safe integration path: a small server of yours that holds the
       secrets and forwards to the vendor. Set a URL here and switch the
       matching entry in `providers` above. */
    endpoints: {
      ai: '',        // e.g. 'https://api.example.com/ai/recipe'
      video: '',     // e.g. 'https://api.example.com/youtube/search'
      recipe: '',    // e.g. 'https://api.example.com/recipes/search'
    },

    /* Direct-from-browser keys. Only for local development — anything here is
       visible to every visitor. Leave blank in production and use `endpoints`. */
    keys: {
      openai: '',
      gemini: '',
      claude: '',
      youtube: '',
      spoonacular: '',
      edamam: { appId: '', appKey: '' },
      unsplash: '',
    },

    /* Model defaults per vendor, kept out of the adapter code so they can be
       tuned without touching logic. */
    models: {
      openai: 'gpt-4o-mini',
      gemini: 'gemini-1.5-flash',
      claude: 'claude-sonnet-4-5',
    },

    /* Source priority for the orchestrator, highest first. The recipe service
       walks this list, merges whatever answers, and falls back to AI. */
    sourcePriority: ['video', 'website', 'recipeApi', 'ai'],

    generation: {
      timeoutMs: 25000,        // per-provider ceiling before we fall through
      maxVideos: 6,
      maxSources: 8,
      minStepCount: 6,
      simulateLatencyMs: 1500, // local provider only: keeps the progress UI honest-looking
    },

    ui: {
      defaultTheme: 'auto',    // 'auto' | 'light' | 'dark'
      cardsPerSection: 8,
      searchDebounceMs: 160,
      storagePrefix: 'afr:',
    },
  };

  /* Convenience: is a real (non-local) provider configured for a capability? */
  AFR.config.isLive = function (capability) {
    const name = AFR.config.providers[capability];
    return Boolean(name && name !== 'local');
  };
})(window);
