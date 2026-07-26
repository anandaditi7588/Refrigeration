/* ==========================================================================
 * translate-providers.js — turning generated English into the chosen language.
 *
 * The offline engine composes English prose from templates. Rather than
 * shipping 35 hand-written copies of every step, tip and ingredient purpose,
 * we translate the finished recipe. That keeps one authoritative source of
 * cooking knowledge and lets any language ride on top of it.
 *
 * Same provider shape as everything else in this app: `capability`,
 * `needsKey`, and one method the service calls. Swap the provider in
 * config.js and nothing else changes.
 *
 * Providers here, in order of preference:
 *   googleFree   keyless, browser-callable, good quality — the default
 *   googleCloud  the supported paid API, for production traffic
 *   proxy        your own endpoint, when you would rather not call Google
 *                from the browser at all
 *
 * A hosted AI provider (Gemini/OpenAI/Claude) does NOT need any of these: it
 * is asked to write in the target language directly, which reads better than
 * translating English after the fact. This file is what makes the OFFLINE
 * engine multilingual.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /* A separator that survives machine translation intact. Newlines are the
     only reliable one: Google returns each line as its own segment, so a
     batch of 30 strings costs one request instead of 30. Bullets, pipes and
     sentinel tokens all get mangled, translated or dropped. */
  const SEP = '\n';

  /* Kept well under the ~2000-character practical URL limit, since the text
     is percent-encoded and non-Latin scripts expand considerably. */
  const MAX_BATCH_CHARS = 1400;
  const MAX_BATCH_LINES = 40;

  /* A browser left to its own devices can sit on a refused connection for
     ~25 seconds before reporting it. That is far too long to make someone wait
     to be told their recipe is in English, so every request carries its own
     deadline and the caller's circuit breaker trips promptly. */
  const REQUEST_TIMEOUT_MS = 7000;

  /** fetch with a hard deadline, so a dead host fails in seconds not minutes. */
  async function fetchWithDeadline(url, options = {}) {
    /* AbortController is everywhere we support, but a missing one should
       degrade to a plain fetch rather than throw. */
    if (typeof AbortController !== 'function') return fetch(url, options);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } catch (err) {
      /* An abort should read as a timeout, not as a mysterious DOMException. */
      if (err && err.name === 'AbortError') {
        throw new Error(`Translation request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Split a list of strings into batches that will each fit in one request.
   * @param {string[]} texts
   * @returns {string[][]}
   */
  function batch(texts) {
    const batches = [];
    let current = [];
    let chars = 0;

    texts.forEach((text) => {
      const cost = text.length + 1;
      /* A single string longer than a whole batch gets its own request. */
      if (current.length && (chars + cost > MAX_BATCH_CHARS || current.length >= MAX_BATCH_LINES)) {
        batches.push(current);
        current = [];
        chars = 0;
      }
      current.push(text);
      chars += cost;
    });

    if (current.length) batches.push(current);
    return batches;
  }

  /* ---------------------------------------------------------------- google */

  /**
   * The endpoint the Google Translate browser widget uses. It needs no key and
   * sends `access-control-allow-origin: *`, which is what makes it callable
   * from a static page with no backend.
   *
   * Being straight about what this is: it is undocumented and unsupported.
   * Google may rate-limit or change it without notice. That is an acceptable
   * trade for a personal or local project — for production traffic set
   * `providers.translate` to 'googleCloud' or 'proxy' below, which are the
   * supported paths and use the same interface.
   */
  const googleFree = {
    id: 'googleFree',
    label: 'Google Translate (keyless)',
    capability: 'translate',
    needsKey: null,
    supported: true,

    async translateBatch(texts, target, source = 'en') {
      const joined = texts.join(SEP);
      const url = 'https://translate.googleapis.com/translate_a/single'
        + `?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}`
        + `&dt=t&q=${encodeURIComponent(joined)}`;

      const res = await fetchWithDeadline(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Google Translate replied ${res.status}`);

      const data = await res.json();
      const segments = (data && data[0]) || [];
      /* Each segment keeps its own trailing newline, so re-joining and
         re-splitting reproduces the original line boundaries. */
      const out = segments.map((s) => (s && s[0]) || '').join('').split(SEP);

      /* Alignment is not guaranteed — the translator may merge two very short
         lines. Rather than silently pairing the wrong translation to the wrong
         field, report the mismatch and let the caller retry one by one. */
      if (out.length !== texts.length) {
        throw new Error(`segment mismatch: sent ${texts.length}, got ${out.length}`);
      }
      return out.map((t) => t.trim());
    },
  };

  /** The supported, billable API. Same shape, different transport. */
  const googleCloud = {
    id: 'googleCloud',
    label: 'Google Cloud Translation',
    capability: 'translate',
    needsKey: 'googleTranslate',
    get supported() { return Boolean(AFR.config.keys.googleTranslate); },

    async translateBatch(texts, target, source = 'en') {
      const key = AFR.config.keys.googleTranslate;
      if (!key) throw new Error('No Google Cloud Translation key configured.');

      const res = await fetchWithDeadline(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /* This API takes an array natively, so no separator trickery needed. */
        body: JSON.stringify({ q: texts, source, target, format: 'text' }),
      });
      if (!res.ok) throw new Error(`Cloud Translation replied ${res.status}`);

      const data = await res.json();
      const list = (data && data.data && data.data.translations) || [];
      if (list.length !== texts.length) throw new Error('Cloud Translation returned the wrong number of strings.');
      return list.map((t) => U.decodeEntities(String(t.translatedText || '')));
    },
  };

  /** Your own backend, for when the browser should not talk to Google at all. */
  const proxy = {
    id: 'proxy',
    label: 'Your translation endpoint',
    capability: 'translate',
    needsKey: null,
    get supported() { return Boolean(AFR.config.endpoints.translate); },

    async translateBatch(texts, target, source = 'en') {
      const endpoint = AFR.config.endpoints.translate;
      if (!endpoint) throw new Error('No translate endpoint configured.');

      const res = await fetchWithDeadline(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, target, source }),
      });
      if (!res.ok) throw new Error(`Translate endpoint replied ${res.status}`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.translations || data.texts || []);
      if (list.length !== texts.length) throw new Error('Translate endpoint returned the wrong number of strings.');
      return list.map(String);
    },
  };

  /** Explicitly off: the recipe stays in the language the engine wrote it in. */
  const none = {
    id: 'none',
    label: 'No translation',
    capability: 'translate',
    needsKey: null,
    supported: true,
    async translateBatch(texts) { return texts.slice(); },
  };

  const ALL = { googleFree, googleCloud, proxy, none };

  /** Resolve the configured provider, falling back to keyless Google. */
  function resolve(id) {
    const wanted = ALL[id || AFR.config.providers.translate];
    if (wanted && wanted.supported) return wanted;
    /* A configured-but-unusable provider (missing key) should degrade to the
       one that always works rather than silently returning English. */
    if (wanted && !wanted.supported && googleFree.supported) return googleFree;
    return none;
  }

  AFR.providers = AFR.providers || {};
  AFR.providers.translate = ALL;
  AFR.providers.resolveTranslate = resolve;
  AFR.providers.translateBatchHelper = { batch, SEP, MAX_BATCH_CHARS, MAX_BATCH_LINES };
})(window);
