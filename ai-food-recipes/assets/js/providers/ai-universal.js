/* ==========================================================================
 * ai-universal.js — one adapter for whichever model you connect.
 *
 * The earlier approach was one adapter per vendor, which meant a new file
 * every time you wanted a different host. But almost every host speaks one of
 * three protocols (see data/llm-providers.js), so this implements those three
 * and reads which one to use from your saved connection.
 *
 * The practical result: OpenAI, Gemini, Claude, Groq, OpenRouter, Mistral,
 * Together, DeepInfra, DeepSeek, xAI, a local Ollama and any endpoint not
 * invented yet are all the same code path.
 *
 * The connection lives in localStorage (set on the Live Data page), so nothing
 * is baked into the source and nobody else's key ships with the site.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  const STORE_KEY = 'llm:connection';

  /** The connection the user configured, or null. */
  function connection() {
    const saved = AFR.store ? AFR.store.get(STORE_KEY, null) : null;
    if (saved && saved.provider && (saved.key || saved.keyless || saved.baseUrl)) return saved;

    /* A key committed to config.js still works, and still wins. */
    const keys = AFR.config.keys || {};
    if (keys.gemini) return { provider: 'gemini', key: keys.gemini, model: AFR.config.models.gemini };
    if (keys.openai) return { provider: 'openai', key: keys.openai, model: AFR.config.models.openai };
    if (keys.claude) return { provider: 'anthropic', key: keys.claude, model: AFR.config.models.claude };
    if (keys.openModel) {
      return { provider: AFR.config.openModel.host, key: keys.openModel, model: AFR.config.openModel.model };
    }
    return null;
  }

  /** True when the site owner has configured a shared backend for everyone. */
  function shared() { return Boolean(AFR.config.endpoints.ai); }

  function save(conn) {
    AFR.store.set(STORE_KEY, conn || null);
    /* Switch the capability on, or fall back to whatever the site provides —
       the shared backend if there is one, the offline engine otherwise.
       Disconnecting should not drop a visitor below the site's own default. */
    AFR.config.providers.ai = conn ? 'universal' : (shared() ? 'proxy' : 'local');
  }

  /* ---------------------------------------------------------------------- */
  /* The three protocols                                                    */
  /* ---------------------------------------------------------------------- */

  async function post(url, options, label) {
    const res = await U.withTimeout(fetch(url, options), AFR.config.generation.aiTimeoutMs, label);
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch (err) { /* ignore */ }
      throw new Error(`${label} failed: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
    }
    return res.json();
  }

  /**
   * How many output tokens to ask this host for.
   *
   * Requesting more than a model can emit is not clamped by the provider — it
   * is rejected outright, which reads to a user as the key or the model being
   * wrong. So take the lower of what the app wants and what the host allows,
   * and let a connection override it for a model we have no entry for.
   */
  function outputCap(spec) {
    const wanted = AFR.config.generation.maxTokens;
    const allowed = spec.maxOutputTokens || 8192;
    return Math.min(wanted, allowed);
  }

  /** Does this failure look like the host refusing our token ceiling? */
  function isTokenCapError(err) {
    const m = String(err && err.message || '');
    return /max_?_?tokens|maxoutputtokens|max output|output token/i.test(m)
      && /(exceed|less than|greater than|too large|must be|invalid|400)/i.test(m);
  }

  /**
   * The limit the host says it wants, if the error bothered to name one.
   *
   * Read the number that follows the phrase stating the limit, rather than
   * scanning the message for figures. These errors carry at least three:
   * the limit, the value we sent, and the HTTP status — and "smallest number
   * present" happily returns 400, which would cap every recipe at 400 tokens
   * and truncate all of them.
   */
  function capFromError(err) {
    const m = String(err && err.message || '');
    const stated = m.match(
      /(?:less than or equal to|at most|no more than|maximum(?: of| is)?|max(?:imum)? value|cannot exceed|<=)\s*:?\s*(\d{3,7})/i);
    const value = stated ? Number(stated[1]) : 0;
    /* No host caps output below ~1k; anything smaller is a misread. */
    return value >= 1024 && value <= 200000 ? value : 0;
  }

  const PROTOCOLS = {
    /* OpenAI chat-completions — by far the most widely spoken. */
    openai: {
      async chat(spec, system, user) {
        const headers = { 'Content-Type': 'application/json' };
        if (spec.key) headers.Authorization = `Bearer ${spec.key}`;
        if (spec.id === 'openrouter') headers['X-Title'] = 'AI Food Recipes';

        const data = await post(`${spec.base}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: spec.model,
            temperature: 0.7,
            max_tokens: spec.maxTokens || outputCap(spec),
            /* Not every open model honours this, so the prompt demands raw
               JSON too and extractJSON copes with fenced output. */
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          }),
        }, spec.name);

        const choice = data.choices && data.choices[0];
        /* Say so plainly. Truncated JSON otherwise surfaces as an opaque parse
           error and a silent fall back to the offline engine. */
        if (choice && choice.finish_reason === 'length') {
          throw new Error('The model ran out of output space before finishing the recipe. '
            + 'Raise generation.maxTokens, or choose a model with a larger output limit.');
        }
        return choice && choice.message.content;
      },

      async models(spec) {
        const headers = {};
        if (spec.key) headers.Authorization = `Bearer ${spec.key}`;
        const data = await post(`${spec.base}${spec.modelsPath}`, { headers }, spec.name);
        return (data.data || data.models || [])
          .map((m) => m.id || m.name).filter(Boolean).sort();
      },
    },

    /* Anthropic messages. */
    anthropic: {
      async chat(spec, system, user) {
        const data = await post(`${spec.base}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': spec.key,
            'anthropic-version': '2023-06-01',
            /* Anthropic blocks browser calls unless the caller opts in. */
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: spec.model,
            max_tokens: spec.maxTokens || outputCap(spec),
            system,
            messages: [{ role: 'user', content: user }],
          }),
        }, spec.name);

        if (data.stop_reason === 'max_tokens') {
          throw new Error('The model ran out of output space before finishing the recipe. '
            + 'Raise generation.maxTokens, or choose a model with a larger output limit.');
        }
        return (data.content || []).map((part) => part.text || '').join('');
      },

      async models(spec) {
        const data = await post(`${spec.base}${spec.modelsPath}`, {
          headers: {
            'x-api-key': spec.key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        }, spec.name);
        return (data.data || []).map((m) => m.id).filter(Boolean).sort();
      },
    },

    /* Google Gemini generateContent. */
    gemini: {
      async chat(spec, system, user) {
        const url = `${spec.base}/models/${encodeURIComponent(spec.model)}:generateContent`
          + `?key=${encodeURIComponent(spec.key)}`;
        const data = await post(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json',
              maxOutputTokens: spec.maxTokens || outputCap(spec),
            },
          }),
        }, spec.name);

        const candidate = data.candidates && data.candidates[0];
        if (candidate && candidate.finishReason === 'MAX_TOKENS') {
          throw new Error('The model ran out of output space before finishing the recipe. '
            + 'Raise generation.maxTokens, or choose a model with a larger output limit.');
        }
        return candidate && candidate.content.parts.map((p) => p.text).join('');
      },

      async models(spec) {
        const data = await post(`${spec.base}${spec.modelsPath}?key=${encodeURIComponent(spec.key)}`,
          {}, spec.name);
        return (data.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map((m) => String(m.name).replace(/^models\//, ''))
          .sort();
      },
    },
  };

  /* ---------------------------------------------------------------------- */
  /* Public surface                                                         */
  /* ---------------------------------------------------------------------- */

  /** List the models a connection can actually use, straight from the host. */
  async function listModels(conn) {
    const spec = AFR.data.llmProviders.resolve(conn);
    if (!spec.base) throw new Error('No endpoint set for this provider.');
    const protocol = PROTOCOLS[spec.protocol];
    if (!protocol || !protocol.models) throw new Error('This provider cannot list its models.');
    return protocol.models(spec);
  }

  const universal = {
    id: 'universal', capability: 'ai', label: 'Your connected model',

    get supported() { return Boolean(connection()); },

    async generate(answers, hooks = {}) {
      const conn = connection();
      if (!conn) throw new Error('No model is connected. Add one on the Live Data page.');

      const spec = AFR.data.llmProviders.resolve(conn);
      if (!spec.base) throw new Error('This connection has no endpoint URL.');
      if (!spec.model) throw new Error('This connection has no model name.');

      const protocol = PROTOCOLS[spec.protocol];
      if (!protocol) throw new Error(`Unknown protocol "${spec.protocol}".`);

      (hooks.onProgress || (() => {}))('Writing your recipe…', 0.4);

      let text;
      try {
        text = await protocol.chat(spec, AFR.prompt.SYSTEM, AFR.prompt.build(answers));
      } catch (err) {
        /* The table of per-host ceilings cannot cover a model released after
           this file was written, so treat the host's own complaint as the
           authority and go again with what it will accept. Failing outright
           here is what makes a working key look broken. */
        if (!isTokenCapError(err)) throw err;
        const retryCap = capFromError(err) || 4096;
        text = await protocol.chat(
          Object.assign({}, spec, { maxTokens: retryCap }),
          AFR.prompt.SYSTEM, AFR.prompt.build(answers));
      }
      const recipe = AFR.providers._hydrate(AFR.providers._extractJSON(text), answers);
      recipe.meta.provider = `${spec.id}:${spec.model}`;
      recipe.meta.mode = 'ai';
      return recipe;
    },
  };

  AFR.providers = AFR.providers || {};
  AFR.providers.aiUniversal = universal;
  AFR.llm = { connection, save, listModels, shared, STORE_KEY, PROTOCOLS,
    /* Exposed for tests: the error-message parsing is fiddly enough to
       deserve direct coverage rather than only being exercised end to end. */
    _capFromError: capFromError, _isTokenCapError: isTokenCapError };

  /* A connection saved on the Live Data page has to take effect on every page,
     not just the one where it was entered — otherwise it tests green and the
     wizard carries on using the offline engine. Only claim the slot if it is
     still on the default, so an explicit choice in config.js is respected. */
  if ((AFR.config.providers.ai === 'local' || AFR.config.providers.ai === 'proxy')
      && AFR.store && AFR.store.get(STORE_KEY, null)) {
    /* Overrides a shared backend too: someone who went to the trouble of
       connecting their own model wants theirs, and it spares the shared
       allowance. */
    AFR.config.providers.ai = 'universal';
  }
})(window);
