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
      video: 'local',        // 'youtube' for live video search
      recipe: 'local',
      image: 'local',        // drawn-plate fallback painter
      /* Real photography for the DISH itself. Wikimedia Commons is the default
         because it is the only source that needs no key at all and answers a
         browser directly (its API sends `origin=*`), so a plain static deploy
         shows real photographs out of the box.
         'pexels' and 'unsplash' are better-curated but each need a free key;
         'youtube' reuses video thumbnails you already fetched; 'local' goes
         back to the drawn plates and makes no network request whatsoever. */
      photo: 'wikimedia',    // 'wikimedia' | 'youtube' | 'pexels' | 'unsplash' | 'local'
      /* Ingredient tiles use openly-licensed sources that need no key at all:
         TheMealDB's ingredient CDN first (fast, predictable URLs, studio shots)
         then Wikimedia Commons for anything it lacks -- which is most regional
         vegetables. Independent of `providers.photo`. */
      ingredientPhoto: 'themealdb+wikimedia',
      /* Makes the OFFLINE engine multilingual: the recipe is composed in
         English, then translated into whatever language the user picked.
         'googleFree' needs no key and works from a static page. Use
         'googleCloud' (with keys.googleTranslate) or 'proxy' for production
         traffic, or 'none' to leave recipes in English.
         Ignored when `ai` is a hosted model -- those are asked to write in the
         target language directly, which reads better than translating after. */
      translate: 'googleFree',   // 'googleFree' | 'googleCloud' | 'proxy' | 'none'
    },

    /* Preferred, safe integration path: a small server of yours that holds the
       secrets and forwards to the vendor. Set a URL here and switch the
       matching entry in `providers` above. */
    endpoints: {
      /* The shared backend (see proxy/worker.js and proxy/README.md). Holds
         the site owner's Groq key server-side, so a visitor gets a real
         recipe for any dish with no key of their own. Setting this switches
         providers.ai to 'proxy' automatically for everyone whose own choice
         is still on the default — see applyStoredKeys() below. */
      ai: 'https://ai-food-recipes-model.aditianand.workers.dev',
      video: '',     // e.g. 'https://api.example.com/youtube/search'
      recipe: '',    // e.g. 'https://api.example.com/recipes/search'
      translate: '', // e.g. 'https://api.example.com/translate'
      /* Any OpenAI-compatible chat-completions URL: a hosted service not in the
         list below, or your own Ollama / vLLM / LM Studio server. Set this and
         `providers.ai = 'openModel'` to run a fully open-source model. */
      openaiCompatible: '',   // e.g. 'http://localhost:11434/v1/chat/completions'
    },

    /* Direct-from-browser keys. Only for local development — anything here is
       visible to every visitor. Leave blank in production and use `endpoints`. */
    keys: {
      openai: '',
      gemini: '',
      claude: '',
      youtube: '',
      pexels: '',
      unsplash: '',
      spoonacular: '',
      googleTranslate: '',   // only for providers.translate = 'googleCloud'
      openModel: '',         // Groq / OpenRouter / Together / DeepInfra key
      edamam: { appId: '', appKey: '' },
    },

    /* Which open-source model to run, and where. Used when
       `providers.ai = 'openModel'`. Everything here speaks the OpenAI
       chat-completions protocol, which is why one adapter covers all of them.

       Groq is the recommended starting point: genuinely free, very fast, and
       it serves Llama and other open weights. OpenRouter has a free tier
       across many open models. For a model running on your own machine, leave
       `host` alone and set `endpoints.openaiCompatible` instead. */
    openModel: {
      host: 'groq',                                  // 'groq' | 'openrouter' | 'together' | 'deepinfra'
      model: 'llama-3.3-70b-versatile',              // open weights, good at structured JSON
    },

    /* Model defaults per vendor, kept out of the adapter code so they can be
       tuned without touching logic. */
    models: {
      openai: 'gpt-4o-mini',
      /* Flash models are the right trade here: one recipe is a single
         structured-JSON call, and the cheap tier handles it well. If this name
         ever 404s, list what your key can actually see with:
         curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" */
      gemini: 'gemini-2.0-flash',
      claude: 'claude-sonnet-4-5',
    },

    /* Source priority for the orchestrator, highest first. The recipe service
       walks this list, merges whatever answers, and falls back to AI. */
    sourcePriority: ['video', 'website', 'recipeApi', 'ai'],

    generation: {
      /* A full 20-section recipe with detailed steps is a large JSON document.
         Left unset, several OpenAI-compatible hosts default to 1024 or 4096
         output tokens, which cuts the JSON mid-array — the parse then fails and
         the app quietly falls back to the offline engine, which reads to a user
         as "the model gave me short, incomplete steps". Set it high enough that
         a long recipe is never the reason. */
      maxTokens: 16000,

      /* Writing a model's answer takes far longer than fetching a photo or a
         video listing, and asking for a fully detailed method made it longer
         again. Sharing one timeout with those searches meant a recipe that was
         still being written got aborted at 25s and reported as a failed
         connection. AI generation gets its own, generous ceiling. */
      aiTimeoutMs: 90000,
      timeoutMs: 25000,        // per-provider ceiling before we fall through
      translateTimeoutMs: 30000, // ceiling on translating a finished recipe
      maxVideos: 6,
      maxSources: 8,
      minStepCount: 6,
      simulateLatencyMs: 1500, // local provider only: keeps the progress UI honest-looking
    },

    images: {
      /* How many dish photos to pull per recipe. They are shared across the
         hero, gallery, preparation and cooking steps. */
      photosPerRecipe: 12,
      /* Look up a photo for each ingredient. Keyless via Wikimedia and cached
         in localStorage, so the cost falls away after the first few recipes.
         On by default and independent of `providers.photo`, so ingredient
         tiles are real photographs with no setup. Set false for a build that
         makes no network requests at all. */
      ingredientPhotos: true,
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

  /* ---------------------------------------------------------------------- */
  /* Runtime keys                                                            */
  /* ---------------------------------------------------------------------- */

  /**
   * Keys saved on the setup page live in localStorage, not in this file, so a
   * user can switch the app to live data without editing source or
   * redeploying. This runs on EVERY page — previously the setup page applied
   * them and nothing else did, which meant a pasted key tested green there and
   * then did nothing on the page that actually generates recipes.
   *
   * File values win when both exist: a key committed to config.js is a
   * deliberate deployment choice, and a stale browser entry should not
   * silently override it.
   */
  /* Must match AFR.store's prefix + the setup page's key, spelled out here
     because config.js loads before store.js and cannot use the helper. */
  const KEY_STORE = 'afr:setup:keys';

  /**
   * Which provider a key implies. A key is only ever useful if the matching
   * capability is actually switched on, and asking someone to paste a key AND
   * know which provider string to set is a trap.
   */
  const IMPLIES = {
    gemini: { ai: 'gemini' },
    openai: { ai: 'openai' },
    claude: { ai: 'claude' },
    openModel: { ai: 'openModel' },
    youtube: { video: 'youtube', photo: 'youtube' },
    pexels: { photo: 'pexels' },
    unsplash: { photo: 'unsplash' },
    spoonacular: { recipe: 'spoonacular' },
  };

  AFR.config.applyStoredKeys = function () {
    let saved = {};
    try {
      saved = JSON.parse(global.localStorage.getItem(KEY_STORE) || '{}') || {};
    } catch (err) {
      return { applied: [], enabled: {} };
    }

    const applied = [];
    const enabled = {};

    Object.keys(saved).forEach((field) => {
      const value = String(saved[field] || '').trim();
      if (!value) return;
      /* Never clobber a key that was deliberately committed to this file. */
      if (AFR.config.keys[field]) return;

      AFR.config.keys[field] = value;
      applied.push(field);

      /* Switch the capability on, but only where the user has not already
         chosen a provider themselves. */
      const implied = IMPLIES[field] || {};
      Object.keys(implied).forEach((capability) => {
        if (AFR.config.providers[capability] === 'local') {
          AFR.config.providers[capability] = implied[capability];
          enabled[capability] = implied[capability];
        }
      });
    });

    return { applied, enabled };
  };

  /* A shared backend, if one is configured, is the default for everybody.
     This is the only way to let every visitor use one API key: the key sits on
     that server, never in this file. Anything written into `keys` above is
     downloadable by every visitor — it is for local development only.

     A visitor who connects their own model on the Live Data page overrides
     this (see providers/ai-universal.js); the shared endpoint is the floor,
     not a ceiling. */
  if (AFR.config.endpoints.ai && AFR.config.providers.ai === 'local') {
    AFR.config.providers.ai = 'proxy';
  }

  /* Applied immediately so every page — including the one that generates
     recipes — sees the same configuration. */
  AFR.config.runtime = AFR.config.applyStoredKeys();
  AFR.config.KEY_STORE = KEY_STORE;
  AFR.config.KEY_IMPLIES = IMPLIES;
})(window);
