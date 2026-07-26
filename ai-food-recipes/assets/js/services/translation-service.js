/* ==========================================================================
 * translation-service.js — rewriting a finished recipe in the chosen language.
 *
 * The offline engine composes English. This walks the finished recipe object,
 * collects every human-readable string, translates them in batches, and writes
 * them back — so picking Marathi gives you Marathi ingredient names, Marathi
 * steps, Marathi tips and a Marathi shopping list, not just a Marathi menu bar.
 *
 * Three things make this affordable rather than 200 network round-trips:
 *
 *   1. FIELD MAP    — an explicit list of what is prose and what is not, so
 *                     numbers, URLs, ids and real YouTube titles are never sent.
 *   2. DEDUPLICATION — a recipe repeats itself heavily ("Medium", "Vegetables",
 *                     "Seasoning, added in layers"). Unique strings only.
 *   3. CACHE        — translations are stable, so they persist in localStorage
 *                     and the second recipe in a language is nearly free.
 *
 * Failure is never fatal: an unreachable translator leaves the recipe in
 * English and adds a warning. A half-translated recipe is still readable,
 * because each batch is written back independently.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  const CACHE_KEY = 'afr.translations.v1';
  const CACHE_LIMIT = 4000;          // entries; roughly 20 recipes in one language
  const MAX_PARALLEL = 4;            // polite concurrency against a free endpoint
  const BREAKER_TRIP = 2;            // consecutive network failures before giving up
  const OVERALL_TIMEOUT_MS = 25000;  // translation must never hold the page hostage

  /**
   * Is this failure the network being unavailable, rather than the translator
   * disliking one particular batch?
   *
   * The distinction matters enormously. A misaligned batch is worth retrying
   * string by string. A dead network is not: retrying 150 strings individually
   * against a host that is not there turns a 2-second failure into a
   * multi-minute hang, which is exactly what it did before this check existed.
   */
  function isNetworkFailure(err) {
    const message = String((err && err.message) || err || '');
    const name = String((err && err.name) || '');
    /* "timed out" and "timeout" are both in play, and an AbortError may arrive
       with an empty message — matching on the name too avoids treating a
       transport failure as a content problem and retrying it 40 more times. */
    return /AbortError|TypeError/.test(name)
      || /failed to fetch|networkerror|load failed|err_|tim(e|ed)\s?out|abort|ECONN|ENOTFOUND|socket|reset/i.test(message);
  }

  /* ---------------------------------------------------------------------- */
  /* What counts as prose                                                    */
  /* ---------------------------------------------------------------------- */

  /**
   * Paths into the recipe that hold translatable prose.
   *
   * `list` walks an array of objects and translates the named keys.
   * `strings` translates an array of plain strings.
   * `fields` translates named keys on a single object.
   *
   * Deliberately excluded, and why:
   *   videos[]        real YouTube titles and channel names — translating a
   *                   video's actual title would misrepresent the source
   *   sources[].url   URLs
   *   nutrition.*     numbers
   *   ingredients.qty quantities stay numeric so scaling maths still works
   *   cuisine.id,
   *   technique.id,
   *   ingredients.group keys used for grouping/lookup, not display
   */
  const MAP = {
    fields: ['name', 'description', 'ingredientNote', 'nutritionNote'],

    lists: [
      { path: 'gallery', keys: ['caption'] },
      { path: 'ingredients', keys: ['name', 'unit', 'purpose', 'substitute', 'healthy', 'display'] },
      { path: 'equipment', keys: ['name', 'usage'] },
      { path: 'preparation', keys: ['title', 'desc'] },
      { path: 'steps', keys: ['title', 'desc', 'temp', 'flame'] },
      { path: 'customization', keys: ['label', 'value'] },
      { path: 'variations', keys: ['name', 'desc'] },
      { path: 'sources', keys: ['title', 'note'] },
      { path: 'shopping', keys: ['group'] },
    ],

    /* Arrays of plain strings hanging off nested objects. */
    stringArrays: [
      'steps[].tips', 'steps[].mistakes',
      'serving.sides', 'serving.drinks',
      'health.pros', 'health.cons',
      'variations[].changes',
      'storage.notes',
      'tips.chef', 'tips.pro', 'tips.mistakes', 'tips.flavor', 'tips.texture',
      'safety.temps', 'safety.storage', 'safety.crossContamination', 'safety.expiry',
      'meta.warnings',
    ],

    /* Named keys on nested single objects. */
    nested: [
      { path: 'cuisine', keys: ['name'] },
      { path: 'technique', keys: ['name'] },
      { path: 'serving', keys: ['garnish', 'plating'] },
      { path: 'health', keys: ['band'] },
      { path: 'storage', keys: ['fridge', 'freezer', 'reheat'] },
      { path: 'mealPlan', keys: ['best'] },
      { path: 'cost', keys: ['totalLabel', 'perServingLabel', 'note'] },
    ],
  };

  /* Top-level scalars that read as prose but live outside `fields`. */
  const SCALARS = ['difficulty'];

  /* ---------------------------------------------------------------------- */
  /* Collection — gather every string with a setter to put it back           */
  /* ---------------------------------------------------------------------- */

  /** Worth translating? Skip blanks, pure numbers, URLs and bare punctuation. */
  function translatable(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    if (text.length < 2) return false;
    if (/^https?:\/\//i.test(text)) return false;
    if (/^[\d\s.,:/•\-–—°%()]+$/.test(text)) return false;
    return /[a-z]/i.test(text);
  }

  /**
   * Walk the recipe and produce a flat list of { text, set } pairs.
   * Returning setters rather than paths keeps the write-back trivial and means
   * a field can be skipped without the two halves drifting out of sync.
   */
  function collect(recipe) {
    const jobs = [];
    const take = (obj, key) => {
      if (!obj || !translatable(obj[key])) return;
      jobs.push({ text: obj[key].trim(), set: (v) => { obj[key] = v; } });
    };

    MAP.fields.concat(SCALARS).forEach((key) => take(recipe, key));

    MAP.nested.forEach(({ path, keys }) => {
      const target = recipe[path];
      if (target) keys.forEach((key) => take(target, key));
    });

    MAP.lists.forEach(({ path, keys }) => {
      (recipe[path] || []).forEach((row) => keys.forEach((key) => take(row, key)));
    });

    /* Shopping items are one level deeper than the group row. */
    (recipe.shopping || []).forEach((group) => {
      (group.items || []).forEach((item) => take(item, 'name'));
    });

    /* Meal-plan slots likewise. */
    ((recipe.mealPlan || {}).slots || []).forEach((slot) => {
      take(slot, 'slot');
      take(slot, 'note');
    });

    MAP.stringArrays.forEach((spec) => {
      collectStringArray(recipe, spec, jobs);
    });

    return jobs;
  }

  /** Resolve a 'a.b' or 'a[].b' path and queue each string in the array. */
  function collectStringArray(recipe, spec, jobs) {
    const [head, tail] = spec.split('[].');

    /* 'steps[].tips' — the same array key on every row of a list. */
    if (tail !== undefined) {
      (recipe[head] || []).forEach((row) => queueArray(row, tail, jobs));
      return;
    }

    /* 'tips.chef' — a plain nested path. */
    const parts = spec.split('.');
    const key = parts.pop();
    const owner = parts.reduce((acc, part) => (acc ? acc[part] : null), recipe);
    queueArray(owner, key, jobs);
  }

  function queueArray(owner, key, jobs) {
    const list = owner && owner[key];
    if (!Array.isArray(list)) return;
    list.forEach((value, index) => {
      if (!translatable(value)) return;
      jobs.push({ text: value.trim(), set: (v) => { list[index] = v; } });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Cache                                                                   */
  /* ---------------------------------------------------------------------- */

  let memory = null;

  function loadCache() {
    if (memory) return memory;
    try {
      memory = JSON.parse(global.localStorage.getItem(CACHE_KEY) || '{}');
    } catch (err) {
      memory = {};
    }
    return memory;
  }

  function saveCache() {
    if (!memory) return;
    try {
      const keys = Object.keys(memory);
      /* Trim oldest-first when it grows past the limit. Insertion order is
         preserved for string keys, so slicing from the front is enough. */
      if (keys.length > CACHE_LIMIT) {
        const trimmed = {};
        keys.slice(keys.length - CACHE_LIMIT).forEach((k) => { trimmed[k] = memory[k]; });
        memory = trimmed;
      }
      global.localStorage.setItem(CACHE_KEY, JSON.stringify(memory));
    } catch (err) {
      /* A full quota is not worth failing a recipe over. */
    }
  }

  const cacheKey = (lang, text) => `${lang}:${U.hash(text).toString(36)}:${text.length}`;

  /* ---------------------------------------------------------------------- */
  /* Translation                                                             */
  /* ---------------------------------------------------------------------- */

  /**
   * Translate a list of strings. The single implementation behind both the
   * recipe body and the interface, so they share one cache, one circuit
   * breaker and one set of network manners.
   *
   * @param {string[]} texts    may contain duplicates; they cost nothing extra
   * @param {string} language   target language code
   * @param {object} hooks      { onProgress(fraction) }
   * @returns {Promise<{map: Map<string,string>, report: object}>}
   *          `map` always has an entry for every input — the original string
   *          when translation was unavailable, so callers never handle null.
   */
  async function translateStrings(texts, language, hooks = {}) {
    const onProgress = hooks.onProgress || (() => {});
    const report = { translated: 0, cached: 0, failed: 0, provider: 'none', warnings: [] };
    const map = new Map();

    const giveUp = () => {
      texts.forEach((text) => { if (!map.get(text)) map.set(text, text); });
      return { map, report };
    };

    if (!language || language === 'en' || !texts.length) return giveUp();

    const provider = AFR.providers.resolveTranslate();
    report.provider = provider.id;
    if (provider.id === 'none') {
      report.warnings.push('No translation provider is configured, so this text is in English.');
      return giveUp();
    }

    const cache = loadCache();

    /* Batches are newline-separated, so a string containing a newline would
       silently become two segments and throw the whole batch out of alignment.
       Markup wraps prose across lines constantly, so collapse whitespace
       before sending. The DOM collapses it for display anyway, which is why
       writing back the collapsed form is visually identical. */
    const normalise = (text) => String(text).trim().replace(/\s+/g, ' ');

    /* Deduplicate: one network slot per distinct string, however many places
       used it. A typical recipe drops from ~210 strings to ~150, and an
       interface full of repeated labels compresses far harder than that.
       Two spellings that differ only in whitespace collapse to one here. */
    const unique = [];
    const wanted = new Map();       // normalised -> the inputs waiting on it

    texts.forEach((text) => {
      if (map.has(text)) return;
      const key = normalise(text);
      if (!key) { map.set(text, text); return; }

      if (!wanted.has(key)) wanted.set(key, []);
      wanted.get(key).push(text);
      map.set(text, '');            // reserved: needed, not yet resolved

      /* Only queue each distinct normalised string once. */
      if (wanted.get(key).length > 1) return;

      const hit = cache[cacheKey(language, key)];
      if (hit) {
        report.cached += 1;
        wanted.get(key).forEach((original) => map.set(original, hit));
        wanted.set(key, []);        // satisfied; nothing left waiting
        return;
      }
      unique.push(key);
    });

    /* Cached entries resolved above may have arrived before their duplicates
       were seen, so give any straggler the same answer. */
    texts.forEach((text) => {
      if (map.get(text)) return;
      const hit = cache[cacheKey(language, normalise(text))];
      if (hit) map.set(text, hit);
    });

    if (!unique.length) {
      onProgress(1);
      return giveUp();
    }

    const batches = AFR.providers.translateBatchHelper.batch(unique);
    let done = 0;

    /* Circuit breaker. Once the network is clearly gone, every remaining batch
       is skipped instantly instead of waiting out its own timeout. */
    let consecutiveNetworkFailures = 0;
    let broken = false;
    const deadline = Date.now() + OVERALL_TIMEOUT_MS;

    /* Write each batch back as it lands, so a later failure still leaves the
       earlier text translated rather than rolling everything back. */
    const runBatch = async (texts) => {
      if (broken || Date.now() > deadline) {
        report.failed += texts.length;
        return;
      }

      let results;
      try {
        results = await provider.translateBatch(texts, language, 'en');
        consecutiveNetworkFailures = 0;
      } catch (err) {
        if (isNetworkFailure(err)) {
          consecutiveNetworkFailures += 1;
          report.failed += texts.length;
          if (consecutiveNetworkFailures >= BREAKER_TRIP) {
            broken = true;
            report.warnings.push('The translator could not be reached, so the rest of this text is in English.');
          }
          return;
        }
        /* Not the network — usually segment misalignment. Retry the strings
           individually so one awkward string cannot cost the other 39. */
        results = await translateOneByOne(provider, texts, language, report, () => broken || Date.now() > deadline);
      }

      texts.forEach((key, index) => {
        const value = results[index];
        if (!value || value === key) {
          if (!value) report.failed += 1;
          return;
        }
        cache[cacheKey(language, key)] = value;
        /* Apply to every original spelling that normalised to this key. */
        (wanted.get(key) || []).forEach((original) => map.set(original, value));
        report.translated += 1;
      });

      done += 1;
      onProgress(done / batches.length);
    };

    await pool(batches, MAX_PARALLEL, runBatch, (err) => {
      report.failed += 1;
      if (report.warnings.length < 2) {
        report.warnings.push(`Some text stayed in English: ${err.message}`);
      }
    });

    saveCache();
    return giveUp();          // fills any un-fetched entry with its original
  }

  /**
   * Translate a finished recipe in place.
   *
   * @param {object} recipe   a normalised recipe (mutated)
   * @param {string} language target language code
   * @param {object} hooks    { onProgress(fraction) }
   * @returns {Promise<object>} the translation report
   */
  async function translateRecipe(recipe, language, hooks = {}) {
    if (!language || language === 'en') {
      return { translated: 0, cached: 0, failed: 0, provider: 'none', warnings: [] };
    }

    const jobs = collect(recipe);
    if (!jobs.length) {
      return { translated: 0, cached: 0, failed: 0, provider: 'none', warnings: [] };
    }

    const { map, report } = await translateStrings(jobs.map((j) => j.text), language, hooks);
    jobs.forEach((job) => {
      const value = map.get(job.text);
      if (value && value !== job.text) job.set(value);
    });

    /* The recipe-specific phrasing of a failure, now that the shared helper
       speaks in generalities. */
    report.warnings = report.warnings.map((w) =>
      w.replace('this text is in English', 'this recipe is in English')
        .replace('the rest of this text', 'the rest of this recipe'));

    return report;
  }

  /** Last resort when a batch will not align: one request per string. */
  async function translateOneByOne(provider, texts, language, report, shouldStop) {
    const out = [];
    let networkFailures = 0;

    for (const text of texts) {
      /* Bail the moment the caller's breaker trips or its deadline passes. */
      if ((shouldStop && shouldStop()) || networkFailures >= BREAKER_TRIP) {
        out.push(text);
        report.failed += 1;
        continue;
      }
      try {
        const [value] = await provider.translateBatch([text], language, 'en');
        out.push(value);
      } catch (err) {
        if (isNetworkFailure(err)) networkFailures += 1;
        out.push(text);            // leave it in English rather than blank
        report.failed += 1;
      }
    }
    return out;
  }

  /** Bounded-concurrency map that never rejects — errors go to `onError`. */
  async function pool(items, limit, worker, onError) {
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        try {
          await worker(item);
        } catch (err) {
          onError(err);
        }
      }
    });
    await Promise.all(runners);
  }

  /** Drop cached translations — exposed for the setup page and for tests. */
  function clearCache() {
    memory = {};
    try { global.localStorage.removeItem(CACHE_KEY); } catch (err) { /* ignore */ }
  }

  AFR.translation = {
    translateRecipe, translateStrings, collect, translatable, clearCache, CACHE_KEY,
  };
})(window);
