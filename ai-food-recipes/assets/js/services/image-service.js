/* ==========================================================================
 * image-service.js — every picture in the app comes from here.
 *
 * The default 'local' provider paints deterministic SVG plates (gradient +
 * food glyph) as data URIs: no network, no broken images, no licensing
 * questions, and the same dish always looks the same across reloads.
 *
 * Swap `AFR.config.providers.image` to 'unsplash' (or add your own case in
 * `resolve`) to serve real photography instead — nothing else in the app
 * changes, because every caller goes through AFR.images.*.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /* Glyphs by keyword. First match wins, so order from specific → generic.
     Named dishes come first so "Pad Thai" gets a noodle bowl rather than the
     generic plate it would fall through to. */
  const GLYPHS = [
    // named dishes (most specific)
    [['pad thai', 'chow mein', 'lo mein', 'pho', 'khao soi', 'japchae'], '🍜'],
    [['biryani', 'pulao', 'pilaf', 'paella', 'jollof', 'bibimbap', 'risotto', 'jambalaya'], '🍚'],
    [['shawarma', 'gyro', 'kathi', 'banh mi'], '🌯'],
    [['falafel', 'kofta', 'ladoo', 'arancini', 'croquette'], '🧆'],
    [['kebab', 'kabab', 'satay', 'souvlaki', 'yakitori', 'tandoori', 'tikka'], '🍢'],
    [['tagine', 'goulash', 'ratatouille', 'jambalaya', 'shakshuka'], '🥘'],
    [['hummus', 'baba ganoush', 'guacamole', 'tzatziki'], '🥣'],
    [['baklava', 'tiramisu', 'cheesecake', 'brownie', 'macaron'], '🍰'],
    [['quesadilla', 'enchilada', 'fajita', 'chilaquiles'], '🌮'],
    [['lasagna', 'lasagne', 'carbonara', 'bolognese', 'alfredo', 'gnocchi'], '🍝'],
    // proteins
    [['chicken', 'murgh', 'poultry'], '🍗'], [['mutton', 'lamb', 'goat', 'beef', 'steak', 'meat'], '🥩'],
    [['fish', 'salmon', 'tuna', 'cod'], '🐟'], [['prawn', 'shrimp', 'seafood', 'lobster'], '🍤'],
    [['crab'], '🦀'], [['egg'], '🥚'], [['bacon', 'ham', 'pork'], '🥓'],
    [['tofu', 'paneer', 'cottage cheese'], '🧀'], [['tempeh', 'seitan'], '🍢'],
    // veg
    [['tomato'], '🍅'], [['onion', 'shallot'], '🧅'], [['garlic'], '🧄'], [['ginger'], '🫚'],
    [['potato'], '🥔'], [['carrot'], '🥕'], [['broccoli'], '🥦'], [['corn', 'maize'], '🌽'],
    [['cucumber', 'zucchini', 'courgette'], '🥒'], [['pepper', 'capsicum', 'bell'], '🫑'],
    [['chilli', 'chili', 'chile'], '🌶️'], [['mushroom'], '🍄'], [['eggplant', 'brinjal', 'aubergine'], '🍆'],
    [['spinach', 'kale', 'lettuce', 'greens', 'cabbage', 'herb', 'coriander', 'cilantro', 'basil', 'mint', 'parsley'], '🌿'],
    [['avocado'], '🥑'], [['peas', 'bean', 'lentil', 'dal', 'chickpea', 'rajma'], '🫘'],
    [['pumpkin', 'squash'], '🎃'], [['olive'], '🫒'], [['seaweed', 'nori'], '🌊'],
    // fruit
    [['lemon', 'lime'], '🍋'], [['apple'], '🍎'], [['banana'], '🍌'], [['mango'], '🥭'],
    [['coconut'], '🥥'], [['pineapple'], '🍍'], [['strawberry', 'berry'], '🍓'], [['grape'], '🍇'],
    [['orange', 'citrus'], '🍊'], [['peach'], '🍑'], [['watermelon'], '🍉'], [['cherry'], '🍒'],
    // pantry
    [['rice', 'basmati', 'biryani', 'pulao', 'risotto'], '🍚'], [['flour', 'atta', 'maida', 'dough'], '🌾'],
    [['bread', 'bun', 'baguette', 'toast'], '🍞'], [['pasta', 'spaghetti', 'noodle', 'ramen'], '🍜'],
    [['butter', 'ghee', 'margarine'], '🧈'], [['oil'], '🫒'], [['milk', 'cream', 'yogurt', 'curd', 'dahi'], '🥛'],
    [['cheese'], '🧀'], [['honey'], '🍯'], [['sugar', 'jaggery', 'syrup'], '🍬'], [['salt'], '🧂'],
    [['nut', 'almond', 'cashew', 'peanut', 'walnut', 'pistachio'], '🥜'], [['seed', 'sesame'], '🌰'],
    [['spice', 'masala', 'cumin', 'coriander seed', 'turmeric', 'cinnamon', 'cardamom', 'clove', 'pepper corn'], '🫙'],
    [['vinegar', 'sauce', 'soy', 'ketchup'], '🧴'], [['water', 'stock', 'broth'], '💧'],
    [['wine', 'beer', 'alcohol'], '🍷'], [['tea', 'chai'], '🍵'], [['coffee'], '☕'],
    // dishes
    [['pizza'], '🍕'], [['burger'], '🍔'], [['taco'], '🌮'], [['burrito', 'wrap', 'roll'], '🌯'],
    [['sushi'], '🍣'], [['dumpling', 'momo', 'gyoza'], '🥟'], [['curry', 'gravy', 'masala', 'stew'], '🍛'],
    [['soup'], '🥣'], [['salad'], '🥗'], [['sandwich'], '🥪'], [['pancake', 'crepe', 'dosa'], '🥞'],
    [['cake', 'dessert', 'pastry'], '🍰'], [['ice cream', 'kulfi', 'gelato'], '🍨'],
    [['cookie', 'biscuit'], '🍪'], [['chocolate'], '🍫'], [['doughnut', 'donut'], '🍩'],
    [['pudding', 'custard', 'kheer', 'halwa'], '🍮'], [['pie', 'tart'], '🥧'],
    [['fries', 'fried', 'fritter', 'pakora', 'samosa', 'tempura'], '🍟'], [['popcorn', 'snack'], '🍿'],
    [['smoothie', 'juice', 'shake', 'lassi', 'drink'], '🥤'], [['cocktail', 'mocktail'], '🍹'],
    [['taco'], '🌮'], [['pretzel', 'bagel'], '🥨'], [['honeycomb'], '🍯'],
    // equipment
    [['pan', 'skillet', 'kadai', 'wok', 'tawa'], '🍳'], [['pot', 'cooker', 'saucepan'], '🍲'],
    [['oven', 'otg', 'microwave', 'air fryer'], '🔥'], [['knife', 'chop'], '🔪'],
    [['blender', 'grinder', 'mixer', 'processor'], '🌀'], [['bowl'], '🥣'], [['spoon', 'ladle', 'spatula'], '🥄'],
    [['plate', 'serving', 'garnish'], '🍽️'], [['scale', 'measure', 'cup'], '⚖️'],
    [['thermometer', 'temperature'], '🌡️'], [['grill', 'barbecue', 'bbq', 'skewer'], '🍢'],
    [['strainer', 'sieve', 'colander'], '🕸️'], [['board', 'cutting'], '🪵'], [['timer', 'clock'], '⏱️'],
  ];

  /* Background palettes per image kind — keeps a page visually coherent. */
  const PALETTES = {
    dish:       [['#ffd9a8', '#ff9a56'], ['#ffe0b2', '#f4845f'], ['#ffd3c2', '#e56b6f'], ['#ffe9b0', '#f2a65a']],
    ingredient: [['#e9f5e1', '#b9dfa3'], ['#fdf0d5', '#f6c667'], ['#e4f1f8', '#a6cfe3'], ['#fbe6e8', '#eaa9ae']],
    equipment:  [['#e8e9f3', '#b3b7d1'], ['#eef1f5', '#aab6c4'], ['#f0ece6', '#c4b7a6']],
    step:       [['#fff1de', '#ffbe7d'], ['#ffe8e0', '#ffab91'], ['#f3f0ff', '#c1b2f0'], ['#e6f7f1', '#8fd4bb']],
    serving:    [['#fff4e0', '#ffd28a'], ['#f6efe7', '#d9bb95']],
    video:      [['#2b2b3a', '#4a4a63'], ['#3a2b2b', '#63494a']],
    category:   [['#fff0e0', '#ffc08a'], ['#e8f6ee', '#9dd9b6'], ['#eaf0fb', '#a8bfe6'], ['#f9ecf7', '#dfaad6']],
  };

  /** Resolve the best glyph for an arbitrary label. */
  function glyphFor(label, fallback = '🍽️') {
    const text = String(label || '').toLowerCase();
    for (const [keys, glyph] of GLYPHS) {
      if (keys.some((k) => text.includes(k))) return glyph;
    }
    return fallback;
  }

  /**
   * Paint an SVG plate. Everything (palette, tilt, speck placement) is derived
   * from the label hash so the output is stable and cache-friendly.
   */
  function svgPlate({ label, kind = 'dish', w = 640, h = 480, glyph, caption }) {
    const seed = U.hash(`${kind}|${label}`);
    const rand = U.rng(seed);
    const palette = PALETTES[kind] || PALETTES.dish;
    const [c1, c2] = palette[seed % palette.length];
    const mark = glyph || glyphFor(label, kind === 'equipment' ? '🍳' : '🍽️');
    const id = `g${seed.toString(36)}`;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.31;
    const tilt = (rand() * 16 - 8).toFixed(1);

    // Decorative specks — herbs scattered on the plate rim.
    let specks = '';
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const dist = r * (1.16 + rand() * 0.42);
      const sx = (cx + Math.cos(a) * dist).toFixed(1);
      const sy = (cy + Math.sin(a) * dist * 0.72).toFixed(1);
      const sr = (3 + rand() * 6).toFixed(1);
      specks += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#ffffff" opacity="${(0.16 + rand() * 0.22).toFixed(2)}"/>`;
    }

    const cap = caption
      ? `<text x="${cx}" y="${h - 26}" text-anchor="middle" font-family="system-ui,sans-serif"
             font-size="${Math.round(h * 0.062)}" font-weight="600" fill="#3d2a17" opacity="0.72">${
        U.esc(caption).slice(0, 34)}</text>`
      : '';

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${U.esc(label)}">` +
        `<defs>` +
          `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
            `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>` +
          `</linearGradient>` +
          /* A near-white plate hides pale food (white rice, dough, cream), so
             the plate is a soft neutral with a visible rim instead. */
          `<radialGradient id="${id}p" cx="50%" cy="40%" r="62%">` +
            `<stop offset="0%" stop-color="#fbf8f4"/>` +
            `<stop offset="70%" stop-color="#ece5da"/>` +
            `<stop offset="100%" stop-color="#dcd2c4"/>` +
          `</radialGradient>` +
        `</defs>` +
        `<rect width="${w}" height="${h}" fill="url(#${id})"/>` +
        specks +
        `<ellipse cx="${cx}" cy="${cy + r * 0.1}" rx="${r * 1.08}" ry="${r * 1.02}" fill="rgba(0,0,0,0.10)"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}p)" stroke="rgba(80,60,40,0.16)" stroke-width="2"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="none" stroke="rgba(80,60,40,0.12)" stroke-width="2"/>` +
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ` +
          `font-size="${Math.round(r * 1.05)}" transform="rotate(${tilt} ${cx} ${cy})">${mark}</text>` +
        cap +
      `</svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /* ---------------------------------------------------------- providers */

  const providers = {
    local(spec) { return svgPlate(spec); },

    /** Unsplash Source-style URL. Requires a key/proxy in production. */
    unsplash(spec) {
      const key = AFR.config.keys.unsplash;
      const q = encodeURIComponent(`${spec.label} ${spec.kind === 'ingredient' ? 'ingredient' : 'food'}`);
      if (!key) return svgPlate(spec); // no key configured → stay on the local painter
      return `https://api.unsplash.com/photos/random?query=${q}&client_id=${encodeURIComponent(key)}`;
    },
  };

  /* ======================================================================
     Real photography
     ----------------------------------------------------------------------
     The renderer asks for images synchronously (AFR.images.dish(name) returns
     a string), but photo APIs are async. So the recipe service calls
     `prefetch()` once before generating, which fills these caches; every
     lookup afterwards is an instant cache hit, and anything not covered falls
     back to the drawn plate. That keeps one code path for both modes.
     ====================================================================== */

  const photos = {
    pool: [],              // photos of the dish, shared by hero/steps/gallery
    byLabel: new Map(),    // exact overrides, e.g. the hero shot
    credits: [],           // attribution records for the sources section
  };

  /* Ingredient photos are reused across recipes, so they persist. */
  const INGREDIENT_CACHE_KEY = 'photos:ingredients';
  let ingredientCache = null;

  function loadIngredientCache() {
    if (!ingredientCache) ingredientCache = AFR.store.get(INGREDIENT_CACHE_KEY, {}) || {};
    return ingredientCache;
  }

  function saveIngredientCache() {
    if (ingredientCache) AFR.store.set(INGREDIENT_CACHE_KEY, ingredientCache);
  }

  /** Deterministic pick from the pool, so a given step always gets one image. */
  function fromPool(label) {
    if (!photos.pool.length) return null;
    return photos.pool[U.hash(label) % photos.pool.length].url;
  }

  function recordCredit(photo) {
    if (!photo || !photo.credit) return;
    if (photos.credits.some((c) => c.credit === photo.credit)) return;
    photos.credits.push({ credit: photo.credit, url: photo.creditUrl || '', source: photo.source });
  }

  /** Run promises with a small concurrency cap — API rate limits are real. */
  async function mapLimit(items, limit, worker) {
    const out = [];
    let index = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const i = index++;
        try { out[i] = await worker(items[i]); } catch (_) { out[i] = null; }
      }
    });
    await Promise.all(runners);
    return out;
  }

  /**
   * Fetch real photography for a dish, ahead of rendering.
   *
   * @param {object} spec { dish, cuisine, videos }
   * @returns {Promise<{count:number, warnings:string[]}>}
   */
  async function prefetch(spec = {}) {
    photos.pool = [];
    photos.byLabel.clear();
    photos.credits = [];

    const warnings = [];
    const providerName = AFR.config.providers.photo || 'local';
    if (providerName === 'local') return { count: 0, warnings };

    const provider = AFR.registry.resolve('photo');
    if (!provider) return { count: 0, warnings: ['No photo provider registered'] };

    const dish = U.clean(spec.dish || '');
    const cuisine = spec.cuisine ? `${spec.cuisine} ` : '';

    /* ---- dish photography ---- */
    try {
      const found = await provider.search(`${cuisine}${dish} food dish`, {
        count: AFR.config.images.photosPerRecipe,
        videos: spec.videos || [],
        orientation: 'landscape',
      });
      photos.pool = (found || []).filter((p) => p && p.url);
      photos.pool.forEach(recordCredit);

      /* The best shot becomes the hero rather than a hashed pick. */
      if (photos.pool.length) {
        photos.byLabel.set(`dish|${dish}`, photos.pool[0].url);
      }
    } catch (err) {
      warnings.push(`Photos (${provider.id}): ${err.message}`);
    }

    return { count: photos.pool.length, warnings };
  }

  /** "Yogurt (Curd)" searches far better as "Yogurt". */
  function searchTermFor(name) {
    const base = String(name).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    return `${base || name} food ingredient`;
  }

  /**
   * Pick the most relevant result rather than blindly taking the first.
   * A file whose own title mentions the ingredient is far more likely to be a
   * picture of it than the top hit for a loose keyword search.
   */
  function pickBestFor(name, hits) {
    const usable = (hits || []).filter((h) => h && h.url);
    if (!usable.length) return null;
    const words = U.deaccent(name).replace(/\([^)]*\)/g, ' ')
      .split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    if (!words.length) return usable[0];

    const scored = usable.map((hit) => {
      const haystack = U.deaccent(`${hit.url} ${hit.creditUrl || ''}`);
      return { hit, score: words.filter((w) => haystack.includes(w)).length };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].hit;
  }

  /**
   * Photos for the ~18 ingredients a recipe actually uses, run AFTER generation
   * so we never pay for the whole 120-item pantry. Results persist in
   * localStorage, so repeat ingredients cost nothing on later recipes.
   *
   * @param {string[]} names ingredient names from the generated recipe
   * @returns {Promise<number>} how many now have a photograph
   */
  async function prefetchIngredients(names) {
    if (!AFR.config.images.ingredientPhotos || !names || !names.length) return 0;

    const provider = photoProvider(AFR.config.providers.ingredientPhoto)
      || photoProvider('wikimedia');
    if (!provider) return 0;

    const cache = loadIngredientCache();
    const wanted = U.unique(names);
    const misses = wanted.filter((name) => cache[name] === undefined);

    /* If the very first lookup fails at the network level (offline, blocked by
       a page CSP, DNS), the other seventeen will fail identically. Trip a
       breaker rather than firing them all and filling the console. */
    let networkDown = false;

    await mapLimit(misses, 4, async (name) => {
      if (networkDown) return;
      try {
        const hits = await provider.search(searchTermFor(name), { count: 4, width: 320 });
        const best = pickBestFor(name, hits);
        cache[name] = best
          ? { url: best.url, credit: best.credit, creditUrl: best.creditUrl }
          : { url: '' }; // remember the miss so we do not ask again
      } catch (err) {
        if (/failed to fetch|networkerror|timed out|load failed/i.test(err.message || '')) {
          networkDown = true;
        }
        /* leave uncached, so a later run can retry once the network is back */
      }
    });
    saveIngredientCache();

    let count = 0;
    wanted.forEach((name) => {
      const hit = cache[name];
      if (hit && hit.url) {
        photos.byLabel.set(`ingredient|${name}`, hit.url);
        recordCredit(hit);
        count++;
      }
    });
    return count;
  }

  /* ---------------------------------------------------------------------- */
  /* Dish photos for browsing cards                                         */
  /* ---------------------------------------------------------------------- */
  /* The home page shows 74 cards. Fetching a photo for every one on load
     would be 74 requests nobody asked for, so this is deliberately pull-based:
     the card component asks only for cards the visitor actually scrolls to.
     Results persist, so the second visit is free. */

  /**
   * Find a photo provider by its config name.
   *
   * Deliberately does NOT go through AFR.registry: the registry is only loaded
   * on pages that generate recipes, and the browsing pages need photos too.
   * Looking one up through the registry here is what made the home page fetch
   * nothing at all.
   *
   * @returns {object|null} the provider, or null when photos are switched off
   *          or the provider file was not loaded on this page.
   */
  function photoProvider(name) {
    if (!name || name === 'local') return null;

    const direct = AFR.registry && AFR.registry._all && AFR.registry._all.photo
      && AFR.registry._all.photo[name];
    if (direct) return direct.id === 'local' ? null : direct;

    /* photo-providers.js publishes them as AFR.providers.photoWikimedia etc. */
    const key = `photo${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    const fallback = AFR.providers && AFR.providers[key];
    return fallback && fallback.id !== 'local' ? fallback : null;
  }

  const DISH_CACHE_KEY = 'photos:dishes';
  let dishCache = null;
  let dishNetworkDown = false;

  function loadDishCache() {
    if (!dishCache) dishCache = AFR.store.get(DISH_CACHE_KEY, {}) || {};
    return dishCache;
  }

  /* Written on a timer rather than per photo: a page of cards resolves in a
     burst and localStorage writes are synchronous. */
  let dishSaveTimer = null;
  function saveDishCacheSoon() {
    if (dishSaveTimer) clearTimeout(dishSaveTimer);
    dishSaveTimer = setTimeout(() => {
      dishSaveTimer = null;
      if (dishCache) AFR.store.set(DISH_CACHE_KEY, dishCache);
    }, 400);
  }

  /**
   * A photograph for one dish, by name.
   *
   * @param {string} name dish name as shown on the card
   * @returns {Promise<string>} a photo URL, or '' when there is none. A miss is
   *          cached too, so a dish Commons has never heard of is asked once.
   */
  async function photoForDish(name) {
    const key = String(name || '').trim();
    if (!key) return '';

    const cache = loadDishCache();
    const hit = cache[key];
    if (hit !== undefined) return hit.url || '';

    if (dishNetworkDown) return '';
    const provider = photoProvider(AFR.config.providers.photo);
    if (!provider) return '';

    try {
      const hits = await provider.search(`${key} food dish`, { count: 3, width: 640 });
      const best = (hits && hits[0]) || null;
      cache[key] = best
        ? { url: best.url, credit: best.credit, creditUrl: best.creditUrl }
        : { url: '' };
      saveDishCacheSoon();
      if (best) recordCredit(best);
      return cache[key].url || '';
    } catch (err) {
      /* One network-level failure means they will all fail — stop asking. */
      if (/failed to fetch|networkerror|timed out|load failed/i.test(err.message || '')) {
        dishNetworkDown = true;
      }
      return '';
    }
  }

  function resolve(spec) {
    /* A real photograph always wins over the drawn plate. */
    const exact = photos.byLabel.get(`${spec.kind}|${spec.label}`);
    if (exact) return exact;

    if (photos.pool.length && spec.kind !== 'ingredient' && spec.kind !== 'equipment') {
      const pooled = fromPool(`${spec.kind}|${spec.label}`);
      if (pooled) return pooled;
    }

    const name = (AFR.config.providers.image) || 'local';
    const provider = providers[name] || providers.local;
    try { return provider(spec); } catch (_) { return providers.local(spec); }
  }

  /* -------------------------------------------------------------- public */

  AFR.images = {
    glyphFor,
    prefetch,
    prefetchIngredients,
    photoForDish,
    clearDishCache() { dishCache = {}; AFR.store.set(DISH_CACHE_KEY, {}); },

    /** Attribution records for whatever photography ended up being used. */
    credits() { return photos.credits.slice(); },

    /** True when the current recipe is showing real photographs. */
    usingPhotos() { return photos.pool.length > 0 || photos.byLabel.size > 0; },

    /** Drop cached photography (used when switching provider in setup). */
    reset() {
      photos.pool = [];
      photos.byLabel.clear();
      photos.credits = [];
    },

    /** Forget every cached ingredient photo, e.g. after changing provider. */
    clearIngredientCache() {
      ingredientCache = {};
      AFR.store.set(INGREDIENT_CACHE_KEY, {});
    },


    /** Hero / card image for a dish. */
    dish(name, opts = {}) {
      return resolve({ label: name, kind: 'dish', w: 800, h: 600, ...opts });
    },

    /** Small square tile for an ingredient row. */
    /**
     * Order of preference: a real photograph if one was fetched, then a drawn
     * illustration of that specific ingredient, then the generic plate.
     *
     * The middle step matters most on a published Artifact page, which blocks
     * every external request — there, the illustration is all there is, and an
     * emoji in a tinted square looked like a missing image rather than a
     * deliberate one.
     */
    ingredient(name, opts = {}) {
      const photo = resolve({ label: name, kind: 'ingredient', w: 160, h: 160, ...opts });
      /* resolve() returns a drawn plate when no photo is cached; only that
         case is worth replacing with something better. */
      if (photo && !photo.startsWith('data:')) return photo;

      const drawn = AFR.produceArt
        && AFR.produceArt.ingredient(name, opts.item, opts.w || 160);
      return drawn || photo;
    },

    equipment(name, opts = {}) {
      return resolve({ label: name, kind: 'equipment', w: 200, h: 200, ...opts });
    },

    /** Wide illustration for a preparation/cooking step. */
    step(title, opts = {}) {
      return resolve({ label: title, kind: 'step', w: 800, h: 450, ...opts });
    },

    serving(name, opts = {}) {
      return resolve({ label: name, kind: 'serving', w: 800, h: 600, ...opts });
    },

    video(title, opts = {}) {
      return resolve({ label: title, kind: 'video', w: 480, h: 270, glyph: '▶️', ...opts });
    },

    category(name, glyph, opts = {}) {
      return resolve({ label: name, kind: 'category', w: 400, h: 300, glyph, ...opts });
    },

    /** Escape-safe <img> markup with lazy loading + async decoding baked in. */
    tag(src, alt, opts = {}) {
      const cls = opts.class ? ` class="${U.esc(opts.class)}"` : '';
      const size = opts.width ? ` width="${opts.width}" height="${opts.height || opts.width}"` : '';
      return `<img src="${U.esc(src)}" alt="${U.esc(alt)}" loading="${opts.eager ? 'eager' : 'lazy'}" ` +
             `decoding="async"${cls}${size}>`;
    },
  };
})(window);
