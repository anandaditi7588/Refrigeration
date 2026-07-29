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
    const res = await U.withTimeout(fetch(url, options), AFR.config.generation.timeoutMs, label);
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch (err) { /* ignore */ }
      throw new Error(`${label} failed: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
    }
    return res.json();
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
            /* Not every open model honours this, so the prompt demands raw
               JSON too and extractJSON copes with fenced output. */
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          }),
        }, spec.name);

        return data.choices && data.choices[0] && data.choices[0].message.content;
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
            max_tokens: 8000,
            system,
            messages: [{ role: 'user', content: user }],
          }),
        }, spec.name);

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
            generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
          }),
        }, spec.name);

        return data.candidates && data.candidates[0]
          && data.candidates[0].content.parts.map((p) => p.text).join('');
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

      const text = await protocol.chat(spec, AFR.prompt.SYSTEM, AFR.prompt.build(answers));
      const recipe = AFR.providers._hydrate(AFR.providers._extractJSON(text), answers);
      recipe.meta.provider = `${spec.id}:${spec.model}`;
      recipe.meta.mode = 'ai';
      return recipe;
    },
  };

  AFR.providers = AFR.providers || {};
  AFR.providers.aiUniversal = universal;
  AFR.llm = { connection, save, listModels, shared, STORE_KEY, PROTOCOLS };

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
