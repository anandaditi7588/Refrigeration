/* ==========================================================================
 * recipe-schema.js — the contract every recipe provider must satisfy.
 *
 * This is the seam that makes the app provider-agnostic. The local engine,
 * an OpenAI/Gemini/Claude adapter, Spoonacular or your own backend all return
 * THIS shape, and the renderer never knows or cares which one produced it.
 *
 * `normalise()` is defensive on purpose: a remote model will occasionally omit
 * a field or return a string where an array belongs, and a missing section
 * should degrade to an empty section rather than a blank page.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  const arr = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v]);
  const str = (v, fallback = '') => (v === undefined || v === null ? fallback : String(v));
  const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

  /** The canonical empty recipe — also serves as living documentation. */
  function blank() {
    return {
      /* Section 1 — Overview */
      id: '', name: '', dish: '',
      cuisine: { id: 'global', name: 'Global', flag: '🌐' },
      technique: { id: 'curry', name: '' },
      description: '',
      image: '',
      difficulty: 'Medium',
      prepTime: 0, cookTime: 0, totalTime: 0, servings: 4,

      /* Section 2 — Images */
      gallery: [],           // [{ kind, caption, src }]

      /* Section 3 — Ingredients */
      ingredients: [],       // [{ name, qty, unit, display, purpose, substitute, healthy, image, group, grams, have }]
      ingredientNote: '',

      /* Section 4 — Equipment */
      equipment: [],         // [{ name, image, usage }]

      /* Sections 5 & 6 — Preparation and cooking */
      preparation: [],       // [{ n, title, desc, image, minutes }]
      steps: [],             // [{ n, title, desc, image, temp, flame, minutes, tips[], mistakes[] }]

      /* Section 7 — Serving */
      serving: { image: '', sides: [], drinks: [], garnish: '', plating: '' },

      /* Section 8 — Nutrition (per serving) */
      nutrition: {}, nutritionNote: '',

      /* Section 9 — Health analysis */
      health: { score: 0, band: '', pros: [], cons: [], suitability: {} },

      /* Section 10 — Customisation summary */
      customization: [],     // [{ label, value, icon }]

      /* Section 11 — Variations */
      variations: [],        // [{ id, name, icon, desc, changes[] }]

      /* Section 12 — Storage */
      storage: { fridge: '', freezer: '', reheat: '', notes: [] },

      /* Section 13 — Meal planning */
      mealPlan: { best: '', slots: [] },

      /* Section 14 — Cost */
      cost: { total: 0, perServing: 0, currency: '₹', totalLabel: '', perServingLabel: '', note: '' },

      /* Section 15 — Shopping list */
      shopping: [],          // [{ group, items: [{ name, qty, have }] }]

      /* Section 16 — Videos */
      videos: [],            // [{ title, channel, duration, views, published, url, thumb, estimated }]

      /* Section 17 — Sources */
      sources: [],           // [{ type, title, url, note }]

      /* Section 18 — Tips */
      tips: { chef: [], pro: [], mistakes: [], flavor: [], texture: [] },

      /* Section 19 — Food safety */
      safety: { temps: [], storage: [], crossContamination: [], expiry: [] },

      /* Provenance — drives the honesty banner in the UI */
      meta: { generatedAt: '', provider: 'local', mode: 'generated', warnings: [], sourcesUsed: [] },
    };
  }

  /** Coerce anything provider-shaped into a safe, renderable recipe. */
  function normalise(input) {
    const raw = input || {};
    const out = blank();

    Object.assign(out, {
      id: str(raw.id) || U.slug(raw.name || raw.dish || 'recipe') + '-' + U.hash(JSON.stringify(raw.customization || raw.name || '')).toString(36),
      name: str(raw.name || raw.dish, 'Untitled Recipe'),
      dish: str(raw.dish || raw.name),
      description: str(raw.description),
      image: str(raw.image),
      difficulty: str(raw.difficulty, 'Medium'),
      prepTime: num(raw.prepTime), cookTime: num(raw.cookTime),
      servings: Math.max(1, num(raw.servings, 4)),
      ingredientNote: str(raw.ingredientNote),
      nutritionNote: str(raw.nutritionNote),
    });
    out.totalTime = num(raw.totalTime) || out.prepTime + out.cookTime;

    out.cuisine = Object.assign(out.cuisine, raw.cuisine || {});
    out.technique = Object.assign(out.technique, raw.technique || {});

    out.gallery = arr(raw.gallery).map((g) => ({
      kind: str(g.kind, 'dish'), caption: str(g.caption), src: str(g.src),
    }));

    out.ingredients = arr(raw.ingredients).map((i) => ({
      name: str(i.name), qty: str(i.qty), unit: str(i.unit),
      display: str(i.display) || `${str(i.qty)} ${str(i.unit)}`.trim(),
      purpose: str(i.purpose), substitute: str(i.substitute), healthy: str(i.healthy),
      image: str(i.image), group: str(i.group, 'Others'),
      grams: num(i.grams), have: Boolean(i.have), item: i.item || null,
    }));

    out.equipment = arr(raw.equipment).map((e) => ({
      name: str(e.name), image: str(e.image), usage: str(e.usage),
    }));

    out.preparation = arr(raw.preparation).map((s, idx) => ({
      n: num(s.n, idx + 1), title: str(s.title), desc: str(s.desc),
      image: str(s.image), minutes: num(s.minutes, 5),
    }));

    out.steps = arr(raw.steps).map((s, idx) => ({
      n: num(s.n, idx + 1), title: str(s.title), desc: str(s.desc), image: str(s.image),
      temp: str(s.temp), flame: str(s.flame), minutes: num(s.minutes, 5),
      tips: arr(s.tips).map(String), mistakes: arr(s.mistakes).map(String),
    }));

    out.serving = {
      image: str((raw.serving || {}).image),
      sides: arr((raw.serving || {}).sides).map(String),
      drinks: arr((raw.serving || {}).drinks).map(String),
      garnish: str((raw.serving || {}).garnish),
      plating: str((raw.serving || {}).plating),
    };

    out.nutrition = Object.assign({}, raw.nutrition || {});
    out.health = Object.assign(out.health, raw.health || {});
    out.health.pros = arr(out.health.pros).map(String);
    out.health.cons = arr(out.health.cons).map(String);

    out.customization = arr(raw.customization).map((c) => ({
      label: str(c.label), value: str(c.value), icon: str(c.icon, 'fa-circle-check'),
    }));

    out.variations = arr(raw.variations).map((v) => ({
      id: str(v.id) || U.slug(v.name), name: str(v.name), icon: str(v.icon, 'fa-wand-magic-sparkles'),
      desc: str(v.desc), changes: arr(v.changes).map(String),
    }));

    out.storage = Object.assign(out.storage, raw.storage || {});
    out.storage.notes = arr(out.storage.notes).map(String);

    out.mealPlan = Object.assign(out.mealPlan, raw.mealPlan || {});
    out.mealPlan.slots = arr(out.mealPlan.slots).map((s) => ({
      slot: str(s.slot), fit: str(s.fit, 'ok'), note: str(s.note),
    }));

    out.cost = Object.assign(out.cost, raw.cost || {});

    out.shopping = arr(raw.shopping).map((g) => ({
      group: str(g.group, 'Others'),
      items: arr(g.items).map((it) => ({
        name: str(it.name), qty: str(it.qty), have: Boolean(it.have),
      })),
    }));

    out.videos = arr(raw.videos).map((v) => ({
      title: str(v.title), channel: str(v.channel), duration: str(v.duration),
      views: str(v.views), published: str(v.published), url: str(v.url),
      thumb: str(v.thumb), estimated: Boolean(v.estimated),
    }));

    out.sources = arr(raw.sources).map((s) => ({
      type: str(s.type, 'web'), title: str(s.title), url: str(s.url), note: str(s.note),
    }));

    const tips = raw.tips || {};
    out.tips = {
      chef: arr(tips.chef).map(String), pro: arr(tips.pro).map(String),
      mistakes: arr(tips.mistakes).map(String), flavor: arr(tips.flavor).map(String),
      texture: arr(tips.texture).map(String),
    };

    const safety = raw.safety || {};
    out.safety = {
      temps: arr(safety.temps).map(String), storage: arr(safety.storage).map(String),
      crossContamination: arr(safety.crossContamination).map(String), expiry: arr(safety.expiry).map(String),
    };

    out.meta = Object.assign(out.meta, raw.meta || {}, {
      generatedAt: str((raw.meta || {}).generatedAt) || new Date().toISOString(),
    });
    out.meta.warnings = arr(out.meta.warnings).map(String);
    out.meta.sourcesUsed = arr(out.meta.sourcesUsed).map(String);

    return out;
  }

  AFR.schema = { blank, normalise };
})(window);
