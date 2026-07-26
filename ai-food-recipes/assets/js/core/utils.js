/* ==========================================================================
 * utils.js — pure helpers shared across the app. No DOM, no state.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  const U = {
    /* ---------------------------------------------------------------- text */

    /** Escape text destined for innerHTML. Every user/provider string that
     *  reaches the DOM goes through this — the app never trusts input. */
    esc(value) {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /** Escape a string used inside an HTML attribute value. */
    escAttr(value) { return U.esc(value); },

    /** The inverse, for text that arrives already HTML-escaped. Google's
     *  Cloud Translation API returns &#39; and &amp; in its output, and that
     *  text is escaped again on the way to the DOM — without this you get a
     *  visible "&amp;#39;" in the middle of a translated step. */
    decodeEntities(value) {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      return String(value === null || value === undefined ? '' : value)
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&([a-z]+);/gi, (whole, name) => {
          const key = name.toLowerCase();
          return Object.prototype.hasOwnProperty.call(named, key) ? named[key] : whole;
        });
    },

    slug(value) {
      return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item';
    },

    titleCase(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/\b([a-z])/g, (m) => m.toUpperCase());
    },

    /** Trim and collapse whitespace. */
    clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); },

    /** "2 hours 15 minutes" from a minute count. */
    humanTime(minutes) {
      const m = Math.max(0, Math.round(Number(minutes) || 0));
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      const rest = m % 60;
      return rest ? `${h} hr ${rest} min` : `${h} hr`;
    },

    /* -------------------------------------------------------------- numbers */

    clamp(n, min, max) { return Math.min(max, Math.max(min, n)); },

    /** Round to a sensible number of decimals for display. */
    round(n, decimals = 1) {
      const f = Math.pow(10, decimals);
      return Math.round((Number(n) || 0) * f) / f;
    },

    /**
     * Format a scaled quantity the way a cook would write it: whole numbers
     * stay whole, awkward decimals become kitchen fractions (½, ¼, ⅓, ¾).
     */
    prettyQty(value) {
      const n = Number(value) || 0;
      if (n === 0) return '0';
      if (n >= 20) return String(Math.round(n));
      if (n >= 10) return String(U.round(n, 0));

      const whole = Math.floor(n);
      const frac = n - whole;
      const table = [
        [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
        [0.5, '½'], [0.625, '⅝'], [0.666, '⅔'], [0.75, '¾'], [0.875, '⅞'],
      ];
      let best = null;
      let bestDiff = 0.085; // snap to a kitchen fraction when we're close enough
      table.forEach(([val, glyph]) => {
        const diff = Math.abs(frac - val);
        if (diff < bestDiff) { bestDiff = diff; best = glyph; }
      });
      if (frac < 0.06) return String(whole || 0);
      if (best) return whole ? `${whole}${best}` : best;
      return String(U.round(n, n < 1 ? 2 : 1));
    },

    /** Currency-ish formatting that stays locale-safe without Intl surprises. */
    money(amount, currency = '₹') {
      const n = Math.max(0, Number(amount) || 0);
      return `${currency}${n >= 100 ? Math.round(n) : U.round(n, 1)}`;
    },

    /** 1,234,567 → "1.2M" for view counts. */
    compactNumber(n) {
      const v = Number(n) || 0;
      if (v >= 1e9) return `${U.round(v / 1e9, 1)}B`;
      if (v >= 1e6) return `${U.round(v / 1e6, 1)}M`;
      if (v >= 1e3) return `${U.round(v / 1e3, 1)}K`;
      return String(v);
    },

    /* ------------------------------------------------------------ functions */

    debounce(fn, wait = 150) {
      let timer = null;
      return function debounced(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); },

    /** Reject after `ms` so a hung provider can never freeze the wizard. */
    withTimeout(promise, ms, label = 'request') {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
      ]);
    },

    /* -------------------------------------------------------- deterministic */

    /** FNV-1a: stable hash so the same dish always gets the same imagery. */
    hash(str) {
      let h = 0x811c9dc5;
      const s = String(str || '');
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return h >>> 0;
    },

    /** Seeded PRNG (mulberry32) — reproducible "randomness" per recipe. */
    rng(seed) {
      let a = typeof seed === 'string' ? U.hash(seed) : (seed >>> 0);
      return function next() {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    /** Deterministic pick from a list. */
    pick(list, rand) {
      if (!list || !list.length) return undefined;
      const r = typeof rand === 'function' ? rand() : Math.random();
      return list[Math.floor(r * list.length) % list.length];
    },

    /** Deterministic sample of `count` distinct entries. */
    sample(list, count, rand) {
      const pool = (list || []).slice();
      const out = [];
      while (pool.length && out.length < count) {
        const r = typeof rand === 'function' ? rand() : Math.random();
        out.push(pool.splice(Math.floor(r * pool.length) % pool.length, 1)[0]);
      }
      return out;
    },

    /* ------------------------------------------------------------ structure */

    unique(list) { return Array.from(new Set((list || []).filter(Boolean))); },

    groupBy(list, keyFn) {
      return (list || []).reduce((acc, item) => {
        const key = keyFn(item);
        (acc[key] = acc[key] || []).push(item);
        return acc;
      }, {});
    },

    deepClone(value) {
      if (typeof structuredClone === 'function') {
        try { return structuredClone(value); } catch (_) { /* fall through */ }
      }
      return JSON.parse(JSON.stringify(value));
    },

    /** Case/space-insensitive containment test used across matching logic. */
    includesTerm(haystack, needle) {
      if (!haystack || !needle) return false;
      return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
    },

    /**
     * Keyword match anchored to a word start, with a simple plural allowance.
     *
     * Plain substring matching is not safe for food words: "classic" contains
     * "lassi", "veggie" contains "egg" and "pineapple" contains "apple". Every
     * keyword table in the app (cuisine detection, technique detection,
     * protein/base hints) goes through this instead.
     */
    matchesKeyword(text, keyword) {
      if (!text || !keyword) return false;
      // Fold accents first: \b sits between word and non-word characters, and
      // "é" counts as non-word, so "soufflé" would never match "soufflé".
      const kw = U.deaccent(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${kw}(e?s)?\\b`, 'i');
      return re.test(U.deaccent(text));
    },

    /** "crème brûlée" → "creme brulee". Used before any keyword matching. */
    deaccent(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    },

    /** Query string helpers so pages can hand state to each other. */
    query(name, fallback = '') {
      const params = new URLSearchParams(global.location.search);
      return params.has(name) ? params.get(name) : fallback;
    },

    /** URL-safe base64 for handing a whole config between pages. */
    encodeState(obj) {
      try {
        const json = JSON.stringify(obj);
        return btoa(unescape(encodeURIComponent(json)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      } catch (_) { return ''; }
    },

    decodeState(str) {
      try {
        const pad = str.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(decodeURIComponent(escape(atob(pad))));
      } catch (_) { return null; }
    },

    todayISO() { return new Date().toISOString().slice(0, 10); },

    /** "3 months ago" for video publish dates. */
    relativeDate(iso) {
      const then = new Date(iso).getTime();
      if (!then || Number.isNaN(then)) return '';
      const days = Math.floor((Date.now() - then) / 86400000);
      if (days < 1) return 'today';
      if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
      const years = Math.floor(months / 12);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    },
  };

  AFR.utils = U;
})(window);
