/* ==========================================================================
 * ui-translator.js — translating the interface itself.
 *
 * i18n.js holds a hand-written catalogue, which is exact but only covers
 * strings someone remembered to mark with `data-i18n` — about seven of them.
 * Picking Hindi translated the navigation and left "Create Your Own Dish",
 * every wizard question, every button and every placeholder in English.
 *
 * Marking up hundreds of strings and hand-translating them into 35 languages
 * is not a real option. So the interface goes through the same machine
 * translation the recipe does: walk the DOM, collect the visible text,
 * translate it, write it back.
 *
 * Order of authority, because exactness beats coverage where we have it:
 *   1. the i18n catalogue      (hand-written, correct, small)
 *   2. this translator         (machine, complete)
 *   3. English                 (when both are unavailable)
 *
 * The originals are kept so switching back to English is exact rather than a
 * round-trip through the translator, which would slowly corrupt the wording.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  /* Never translate the contents of these — they are code, data or a name. */
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'KBD', 'SAMP', 'SVG', 'PATH']);

  /* Attributes that are user-visible text in their own right. */
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

  /* The original English, keyed by node, so returning to English is lossless. */
  const originalText = new WeakMap();
  const originalAttr = new WeakMap();

  /* ---------------------------------------------------------------------- */
  /* Embedded catalogue                                                      */
  /* ---------------------------------------------------------------------- */
  /* A published Artifact page cannot make ANY external request, so the live
     translator is unavailable there. The build step pre-translates the whole
     interface and embeds it as gzipped base64 (AFR.uiCatalogPacked), which
     this decodes once on demand. That is what makes language switching work
     offline and instantly.

     It is also a straight upgrade when online: an embedded hit costs nothing
     and never waits on the network. */
  const decoded = {};
  let decoding = null;

  function b64ToBytes(b64) {
    const binary = global.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /** Unpack the embedded catalogue. Cached, and only ever attempted once. */
  async function loadCatalog() {
    if (decoding) return decoding;

    decoding = (async () => {
      const packed = AFR.uiCatalogPacked;
      if (!packed) return {};
      try {
        const bytes = b64ToBytes(packed);
        /* DecompressionStream is native in current browsers. Where it is
           missing the page simply falls back to the live translator, so an
           older browser loses speed rather than the feature. */
        if (typeof DecompressionStream !== 'function') return {};
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        const json = await new Response(stream).text();
        Object.assign(decoded, JSON.parse(json));
        return decoded;
      } catch (err) {
        return {};
      }
    })();

    return decoding;
  }

  /** Translations for one language from the embedded catalogue. */
  async function embedded(language) {
    const all = await loadCatalog();
    return all[language] || null;
  }

  /* Numbers change at runtime — "11/16 answered" is never the same twice — so
     the catalogue is keyed on the shape with every digit run flattened to 0.
     One entry then serves the whole family of counters. */
  const canonical = (s) => String(s).replace(/\d+/g, '0');

  /**
   * Look a string up in the embedded catalogue, restoring its real numbers.
   * Returns null when there is no usable entry, so the caller can fall through
   * to the live translator.
   */
  function lookup(book, text) {
    if (!book) return null;

    const exact = book[text];
    if (exact) return exact;

    const digits = text.match(/\d+/g);
    if (!digits) return null;

    const translated = book[canonical(text)];
    if (!translated) return null;

    /* Only substitute when the translation kept the same number of slots —
       otherwise we would be guessing which number goes where, and a wrong
       quantity in a recipe is worse than an untranslated label. */
    const slots = translated.match(/\d+/g);
    if (!slots || slots.length !== digits.length) return null;

    let i = 0;
    return translated.replace(/\d+/g, () => digits[i++]);
  }

  let observer = null;
  let scheduled = null;
  let running = false;
  let currentLanguage = 'en';
  /* Latched once the live translator is shown to be unreachable, so a page
     with no network (a published Artifact) stops paying for the discovery. */
  let liveDead = false;

  /** Marks a subtree as off-limits: brand names, user input, dish names. */
  function isProtected(node) {
    return Boolean(node.closest && node.closest('[data-no-translate]'));
  }

  /**
   * Is this text node worth sending? Reuses the recipe rules (skip numbers,
   * URLs, punctuation) and adds the DOM-specific ones.
   */
  function wantsText(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    if (SKIP_TAGS.has(parent.tagName)) return false;
    if (isProtected(parent)) return false;
    /* A node the catalogue already owns is translated exactly; leave it. */
    if (parent.hasAttribute('data-i18n')) return false;
    if (parent.getAttribute('aria-hidden') === 'true') return false;
    return AFR.translation.translatable(node.nodeValue);
  }

  /** Every translatable text node and attribute under `root`. */
  function harvest(root) {
    const texts = [];
    const attrs = [];

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (wantsText(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    let node = walker.nextNode();
    while (node) {
      texts.push(node);
      node = walker.nextNode();
    }

    const scope = root.nodeType === 1 ? [root] : [];
    scope.concat(Array.from(root.querySelectorAll ? root.querySelectorAll('*') : []))
      .forEach((el) => {
        if (isProtected(el) || SKIP_TAGS.has(el.tagName)) return;
        ATTRS.forEach((name) => {
          if (!el.hasAttribute(name)) return;
          /* The catalogue owns this one. */
          if (name === 'placeholder' && el.hasAttribute('data-i18n-placeholder')) return;
          if (name === 'aria-label' && el.hasAttribute('data-i18n-label')) return;
          if (AFR.translation.translatable(el.getAttribute(name))) attrs.push({ el, name });
        });
      });

    return { texts, attrs };
  }

  /** Remember the English once, the first time we touch a node. */
  function rememberText(node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    return originalText.get(node);
  }

  function rememberAttr(el, name) {
    let store = originalAttr.get(el);
    if (!store) { store = {}; originalAttr.set(el, store); }
    if (!(name in store)) store[name] = el.getAttribute(name);
    return store[name];
  }

  /** Put every remembered original back — used when returning to English. */
  function restore(root = document.body) {
    const { texts, attrs } = harvestAll(root);
    texts.forEach((node) => {
      if (originalText.has(node)) node.nodeValue = originalText.get(node);
    });
    attrs.forEach(({ el, name }) => {
      const store = originalAttr.get(el);
      if (store && name in store) el.setAttribute(name, store[name]);
    });
  }

  /* Restoring has to see nodes we already translated, which `wantsText` would
     now reject on the grounds that they are no longer English. */
  function harvestAll(root) {
    const texts = [];
    const attrs = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
      if (originalText.has(node)) texts.push(node);
      node = walker.nextNode();
    }
    Array.from(root.querySelectorAll('*')).forEach((el) => {
      const store = originalAttr.get(el);
      if (store) Object.keys(store).forEach((name) => attrs.push({ el, name }));
    });
    return { texts, attrs };
  }

  /**
   * Translate everything under `root` into the current language.
   * Safe to call repeatedly: already-translated nodes are remembered and their
   * English original is what gets sent, so nothing is ever double-translated.
   */
  async function translate(root = document.body) {
    if (!AFR.translation || currentLanguage === 'en') return null;
    if (running) return null;
    running = true;

    try {
      const { texts, attrs } = harvest(root);
      if (!texts.length && !attrs.length) return null;

      const sources = texts.map(rememberText)
        .concat(attrs.map(({ el, name }) => rememberAttr(el, name)));

      /* Normalise before looking anything up: whitespace in markup is layout,
         not content, and the embedded catalogue is keyed on the collapsed
         form. */
      const key = (s) => String(s).trim().replace(/\s+/g, ' ');
      const trimmed = sources.map(key).filter(Boolean);

      /* Embedded catalogue first — free, instant, and the only source that
         works on a published page. Anything it lacks goes to the network,
         which is a no-op when there isn't one. */
      const book = await embedded(currentLanguage);
      const map = new Map();
      const missing = [];

      trimmed.forEach((text) => {
        if (map.has(text)) return;
        const hit = lookup(book, text);
        if (hit) map.set(text, hit); else missing.push(text);
      });

      const report = { embedded: map.size, live: 0, missing: missing.length, warnings: [] };

      /* Only reach for the network when the catalogue came up short AND the
         network has not already proved itself absent. On a published Artifact
         every request is blocked, and the wizard re-renders on every step —
         without this latch each step would stall on a doomed round trip. */
      if (missing.length && !liveDead) {
        const live = await AFR.translation.translateStrings(missing, currentLanguage);
        live.map.forEach((value, text) => map.set(text, value));
        report.live = live.report.translated + live.report.cached;
        report.warnings = live.report.warnings;

        if (!live.report.translated && !live.report.cached && live.report.failed) {
          liveDead = true;
        }
      }

      texts.forEach((node) => {
        const original = originalText.get(node);
        const value = map.get(key(original));
        if (!value || value === key(original)) return;
        /* Preserve the original leading/trailing whitespace so inline layout
           ("Step 1 of 16") does not lose its spaces. */
        const lead = (original.match(/^\s*/) || [''])[0];
        const tail = (original.match(/\s*$/) || [''])[0];
        node.nodeValue = lead + value + tail;
      });

      attrs.forEach(({ el, name }) => {
        const store = originalAttr.get(el) || {};
        const value = map.get(key(store[name] || ''));
        if (value) el.setAttribute(name, value);
      });

      return report;
    } finally {
      running = false;
    }
  }

  /** Coalesce bursts of DOM changes into one translation pass. */
  function schedule(delay = 220) {
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(() => {
      scheduled = null;
      translate().catch(() => { /* never break the page over a translation */ });
    }, delay);
  }

  /**
   * Watch for content rendered after load — the wizard swaps its question on
   * every step, and the recipe view builds all 20 sections at once. Without
   * this, only the markup present at load would ever be translated.
   */
  function observe() {
    if (observer || typeof MutationObserver !== 'function') return;
    observer = new MutationObserver((records) => {
      if (running || currentLanguage === 'en') return;
      const meaningful = records.some((r) =>
        Array.from(r.addedNodes).some((n) => n.nodeType === 1 || n.nodeType === 3));
      if (meaningful) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function setLanguage(code) {
    const previous = currentLanguage;
    currentLanguage = code || 'en';
    if (currentLanguage === 'en') {
      if (previous !== 'en') restore();
      return Promise.resolve(null);
    }
    /* Coming from another non-English language, put the English back first so
       we translate from the source rather than from a translation. */
    if (previous !== 'en' && previous !== currentLanguage) restore();
    observe();
    return translate();
  }

  function init() {
    /* The brand is a name, not a phrase to translate. */
    const brand = document.querySelector('.afr-brand__text');
    if (brand) brand.setAttribute('data-no-translate', '');

    /* Read the saved choice directly rather than trusting AFR.i18n.current:
       both modules initialise on DOMContentLoaded and this one is registered
       first, so i18n has not necessarily picked up the stored language yet.
       Relying on it meant a returning user's saved language applied only when
       they re-opened the picker. */
    currentLanguage = (AFR.store && AFR.store.get('language'))
      || (AFR.i18n && AFR.i18n.current) || 'en';
    if (currentLanguage !== 'en') { observe(); schedule(60); }

    document.addEventListener('afr:languagechange', (event) => {
      setLanguage(event.detail.language.code);
    });
  }

  AFR.uiTranslator = { init, translate, setLanguage, restore, schedule };

  document.addEventListener('DOMContentLoaded', () => {
    if (AFR.translation && AFR.i18n) init();
  });
})(window);
