/* ==========================================================================
 * ai-local.js — the built-in recipe engine.
 *
 * This is the default `ai` provider. It runs entirely in the browser and
 * composes a full 20-section recipe from three knowledge sources:
 *
 *   technique (techniques.js) × cuisine (cuisines.js) × pantry (ingredients.js)
 *
 * then applies every wizard answer as a real transformation: diets swap
 * ingredients, allergies remove them, spice/salt/oil/sweetness change
 * quantities, appliances change the method, and servings scale everything.
 *
 * It is deterministic — the same answers always produce the same recipe —
 * which makes it testable and makes bookmarks stable.
 *
 * When you configure a hosted model instead (`AFR.config.providers.ai`), that
 * adapter returns the same schema and this file simply stops being called,
 * except as the fallback if the network request fails.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /* ---------------------------------------------------------------------- */
  /* Lookup tables                                                          */
  /* ---------------------------------------------------------------------- */

  /* Protein keywords found in a dish name → pantry id. */
  const PROTEIN_HINTS = [
    ['chicken', 'chicken'], ['murgh', 'chicken'], ['poultry', 'chicken'],
    ['mutton', 'mutton'], ['lamb', 'mutton'], ['goat', 'mutton'], ['keema', 'mutton'],
    ['beef', 'beef'], ['steak', 'beef'], ['pork', 'pork'], ['bacon', 'pork'], ['ham', 'pork'],
    ['fish', 'fish'], ['salmon', 'fish'], ['tuna', 'fish'], ['cod', 'fish'],
    ['prawn', 'prawns'], ['shrimp', 'prawns'], ['squid', 'squid'],
    ['egg', 'egg'], ['anda', 'egg'],
    ['paneer', 'paneer'], ['tofu', 'tofu'], ['soya', 'soy-chunks'], ['soy chunk', 'soy-chunks'],
    ['chana', 'chickpeas'], ['chickpea', 'chickpeas'], ['chole', 'chickpeas'], ['falafel', 'chickpeas'],
    ['rajma', 'kidney-beans'], ['kidney bean', 'kidney-beans'], ['black bean', 'black-beans'],
    ['dal', 'toor-dal'], ['daal', 'toor-dal'], ['lentil', 'lentils'], ['moong', 'moong-dal'],
    ['mushroom', 'mushroom'], ['cheese', 'cheese'],
  ];

  /* Vegetable / base keywords → pantry id. */
  const BASE_HINTS = [
    ['potato', 'potato'], ['aloo', 'potato'], ['spinach', 'spinach'], ['palak', 'spinach'],
    ['cauliflower', 'cauliflower'], ['gobi', 'cauliflower'], ['broccoli', 'broccoli'],
    ['mushroom', 'mushroom'], ['eggplant', 'eggplant'], ['brinjal', 'eggplant'], ['baingan', 'eggplant'],
    ['pumpkin', 'pumpkin'], ['carrot', 'carrot'], ['peas', 'peas'], ['matar', 'peas'],
    ['corn', 'corn'], ['cabbage', 'cabbage'], ['zucchini', 'zucchini'], ['beetroot', 'beetroot'],
    ['sweet potato', 'sweet-potato'], ['pepper', 'bell-pepper'], ['capsicum', 'bell-pepper'],
    /* South Asian vegetable names, so "Bhendi Masala" is about the bhendi. */
    ['okra', 'okra'], ['bhindi', 'okra'], ['bhendi', 'okra'], ['ladyfinger', 'okra'],
    ['lauki', 'bottle-gourd'], ['dudhi', 'bottle-gourd'], ['ghiya', 'bottle-gourd'],
    ['karela', 'bitter-gourd'], ['bitter gourd', 'bitter-gourd'], ['bitter melon', 'bitter-gourd'],
    ['turai', 'ridge-gourd'], ['tori', 'ridge-gourd'], ['ridge gourd', 'ridge-gourd'],
    ['tinda', 'tinda'], ['methi', 'fenugreek-leaves'], ['sarson', 'mustard-greens'],
    ['saag', 'mustard-greens'], ['drumstick', 'drumstick'], ['moringa', 'drumstick'],
    ['arbi', 'colocasia'], ['taro', 'colocasia'], ['suran', 'yam'], ['yam', 'yam'],
    ['guar', 'cluster-beans'], ['gawar', 'cluster-beans'], ['petha', 'ash-gourd'],
    ['mooli', 'radish'], ['radish', 'radish'], ['chaulai', 'amaranth-leaves'],
    ['green beans', 'green-beans'], ['french beans', 'green-beans'],
    ['plantain', 'raw-banana'], ['kela', 'raw-banana'],
    ['poha', 'poha'], ['sabudana', 'sabudana'], ['sago', 'sabudana'],
    ['besan', 'besan'], ['gram flour', 'besan'], ['upma', 'semolina'], ['rava', 'semolina'],
    ['tomato', 'tomato'], ['onion', 'onion'], ['cucumber', 'cucumber'], ['avocado', 'avocado'],
    ['rice', 'rice'], ['pasta', 'pasta'], ['noodle', 'noodles'], ['bread', 'bread'],
    ['oat', 'oats'], ['quinoa', 'quinoa'], ['flour', 'all-purpose-flour'], ['chocolate', 'chocolate'],
    ['mango', 'mango'], ['banana', 'banana'], ['apple', 'apple'], ['strawberry', 'strawberry'],
    ['coconut', 'coconut'], ['lemon', 'lemon'], ['pineapple', 'pineapple'], ['coffee', 'milk'],
  ];

  /* Diet-driven protein swaps. */
  const VEG_SWAP = { chicken: 'paneer', 'chicken-thigh': 'paneer', mutton: 'soy-chunks', beef: 'mushroom', pork: 'mushroom', fish: 'tofu', prawns: 'mushroom', squid: 'mushroom' };
  const VEGAN_SWAP = {
    chicken: 'tofu', 'chicken-thigh': 'tofu', mutton: 'soy-chunks', beef: 'mushroom', pork: 'mushroom',
    fish: 'tofu', prawns: 'mushroom', squid: 'mushroom', egg: 'tofu',
    milk: 'coconut-milk', yogurt: 'coconut-milk', cream: 'coconut-milk', butter: 'coconut-oil',
    ghee: 'coconut-oil', paneer: 'tofu', cheese: 'tofu', 'condensed-milk': 'coconut-milk',
    honey: 'maple-syrup', mayonnaise: 'peanut-butter',
  };
  const GLUTEN_SWAP = { 'wheat-flour': 'rice', 'all-purpose-flour': 'cornflour', pasta: 'rice', bread: 'rice', noodles: 'rice', semolina: 'cornflour', 'soy-sauce': 'salt' };
  const JAIN_SWAP = { onion: 'cabbage', garlic: 'asafoetida', potato: 'peas', ginger: 'black-pepper', 'sweet-potato': 'pumpkin', beetroot: 'tomato' };
  const KETO_SWAP = { rice: 'cauliflower', pasta: 'zucchini', potato: 'cauliflower', 'wheat-flour': 'almond', 'all-purpose-flour': 'almond', bread: 'lettuce', sugar: 'stevia', noodles: 'zucchini' };
  const PALEO_SWAP = { rice: 'sweet-potato', pasta: 'zucchini', 'wheat-flour': 'almond', 'all-purpose-flour': 'almond', bread: 'sweet-potato', milk: 'coconut-milk', yogurt: 'coconut-milk', cheese: 'avocado', paneer: 'chicken', 'toor-dal': 'chicken', chickpeas: 'chicken', tofu: 'chicken', sugar: 'honey' };

  /* Equipment catalogue per technique + appliance. */
  const EQUIPMENT = {
    knife: { name: 'Chef’s knife & chopping board', usage: 'All the prep — uniform cuts are what make everything cook evenly.' },
    kadai: { name: 'Heavy-bottomed pan / kadai', usage: 'The main cooking vessel. Weight matters: thin pans scorch spices.' },
    pot: { name: 'Deep pot with a tight lid', usage: 'Simmering, steaming and anything that needs trapped moisture.' },
    wok: { name: 'Wok or wide frying pan', usage: 'High-heat, fast cooking with room to toss.' },
    tray: { name: 'Baking tray / oven dish', usage: 'Holds the assembly through the bake and catches any overflow.' },
    bowls: { name: 'Mixing bowls (2–3)', usage: 'Marinating, batter and keeping prepped components separate.' },
    spatula: { name: 'Spatula & slotted spoon', usage: 'Turning, folding and lifting food clear of the oil.' },
    measure: { name: 'Measuring spoons & cups', usage: 'Spice and leavening quantities are not the place to guess.' },
    strainer: { name: 'Strainer / colander', usage: 'Draining rice, pasta and rinsing vegetables.' },
    blender: { name: 'Blender or mixer grinder', usage: 'Purées, pastes and smooth sauces.' },
    thermometer: { name: 'Instant-read thermometer', usage: 'The only reliable way to know meat and oil have hit a safe temperature.' },
    rack: { name: 'Wire cooling rack', usage: 'Keeps fried and baked food crisp instead of steaming on a plate.' },
    'pressure-cooker': { name: 'Pressure cooker', usage: 'Cuts long braises and pulses to a fraction of the time.' },
    'air-fryer': { name: 'Air fryer', usage: 'Crisp finish with a fraction of the oil.' },
    oven: { name: 'Oven / OTG', usage: 'Even, enveloping heat for baking and roasting.' },
    microwave: { name: 'Microwave', usage: 'Fast reheating, melting and steaming vegetables.' },
    'slow-cooker': { name: 'Slow cooker', usage: 'Unattended low-temperature braising over several hours.' },
    'instant-pot': { name: 'Instant Pot', usage: 'Sauté and pressure-cook in the same vessel — fewer pans, less washing up.' },
    'rice-cooker': { name: 'Rice cooker', usage: 'Hands-off, consistently cooked rice.' },
    grill: { name: 'Grill pan or barbecue', usage: 'Direct high heat for char and smoke.' },
  };

  /* ---------------------------------------------------------------------- */
  /* Context building                                                       */
  /* ---------------------------------------------------------------------- */

  /** Resolve a pantry item from a keyword table against the dish name. */
  function hintLookup(text, table) {
    let best = null;
    let bestLen = 0;
    table.forEach(([kw, id]) => {
      if (U.matchesKeyword(text, kw) && kw.length > bestLen) { best = id; bestLen = kw.length; }
    });
    return best ? AFR.data.ingredients.byId[best] || null : null;
  }

  /** Turn raw wizard answers into the rich context every step function uses. */
  function buildContext(answers) {
    const W = AFR.data.wizard;
    const dishRaw = U.clean(answers.dish) || 'Chef’s Special';
    const dish = U.titleCase(dishRaw);
    const lower = dishRaw.toLowerCase();

    /* Does the app actually KNOW this dish? A known dish brings its own real
       ingredients and method, which is the difference between answering
       "Puran Poli" and guessing at it from the words in the name. Everything
       downstream — scaling, diet swaps, nutrition, costing — is unchanged. */
    const known = (AFR.data.dishes && AFR.data.dishes.match(dishRaw)) || null;

    const cuisineId = (!answers.cuisine || answers.cuisine === 'auto')
      ? (known ? known.dish.cuisine : AFR.data.cuisines.detect(dishRaw))
      : answers.cuisine;
    const cuisine = AFR.data.cuisines.get(cuisineId);
    const technique = known
      ? AFR.data.dishes.toTechnique(known.dish)
      : AFR.data.techniques.detect(dishRaw);

    const servings = Math.max(1, parseInt(answers.servings, 10) || 4);
    const diet = (Array.isArray(answers.diet) ? answers.diet : [answers.diet]).filter(Boolean);
    const allergies = (Array.isArray(answers.allergies) ? answers.allergies : []).filter(Boolean);
    const appliances = (Array.isArray(answers.appliances) ? answers.appliances : ['gas']).filter(Boolean);
    const avoid = (Array.isArray(answers.avoid) ? answers.avoid : []).filter(Boolean);
    const available = (Array.isArray(answers.available) ? answers.available : []).filter(Boolean);

    const spiceOpt = W.optionFor('spice', answers.spice) || { level: 3, label: 'Medium' };
    const sweetOpt = W.optionFor('sweetness', answers.sweetness) || { factor: 0.7, label: 'Medium' };
    const saltOpt = W.optionFor('salt', answers.salt) || { factor: 1, label: 'Normal' };
    const oilOpt = W.optionFor('oil', answers.oil) || { factor: 1, label: 'Normal' };
    const timeOpt = W.optionFor('time', answers.time) || { minutes: 0, label: 'No preference' };

    /* Diets can cap the heat regardless of what was picked in step 7. */
    let spiceLevel = spiceOpt.level;
    diet.forEach((d) => {
      const opt = W.optionFor('diet', d);
      if (opt && typeof opt.maxSpice === 'number') spiceLevel = Math.min(spiceLevel, opt.maxSpice);
    });

    const isVeg = diet.some((d) => ['vegetarian', 'vegan', 'jain', 'eggetarian'].includes(d));
    const isVegan = diet.includes('vegan');

    /* Detect the protein and the vegetable/starch base from the dish name.
       A known dish already carries its real ingredient list, so these hints
       only matter for the generic composition path. */
    let protein = hintLookup(lower, PROTEIN_HINTS);
    let base = hintLookup(lower, BASE_HINTS);

    /* If the diet forbids the detected protein, swap it before anything else. */
    if (protein && isVegan && VEGAN_SWAP[protein.id]) protein = AFR.data.ingredients.byId[VEGAN_SWAP[protein.id]];
    else if (protein && isVeg && VEG_SWAP[protein.id]) protein = AFR.data.ingredients.byId[VEG_SWAP[protein.id]];

    /* Did the dish name actually mention a protein, or are we guessing? */
    const proteinExplicit = Boolean(protein);

    /* Only invent a protein when the dish names no main ingredient at all.
       "Bhendi Masala" and "Aloo Gobi" are ABOUT their vegetable -- injecting a
       default paneer turned every vegetable curry into a paneer curry. */
    /* When the dish is unknown AND its name names no ingredient, we genuinely
       do not know what it is made of. The engine used to invent paneer here,
       which is how "Borscht" and "Laal Maas" — a beetroot soup and a Rajasthani
       mutton curry — both came back as paneer curries. Inventing a hero
       ingredient is worse than admitting we have none, so take the cuisine's
       own signature ingredient instead and mark the result speculative. */
    let speculative = false;
    if (!known && !protein && !base && ['curry', 'riceDish', 'stirFry', 'grilled', 'assembly'].includes(technique.id)) {
      speculative = true;
      /* A staple of the detected cuisine is a defensible neutral choice: it at
         least belongs in that kitchen, and it makes no claim about a dish we
         cannot identify. */
      const staple = (cuisine.staples || []).concat(['potato'])
        .map((id) => AFR.data.ingredients.byId[id])
        .find((item) => {
          if (!item) return false;
          if (isVegan && ['meat', 'seafood', 'dairy'].includes(item.category)) return false;
          if (isVeg && ['meat', 'seafood'].includes(item.category)) return false;
          return true;
        });
      if (staple) base = staple;
    }
    if (protein && base && protein.id === base.id) base = null;

    return {
      answers,
      dish, dishRaw,
      cuisine, technique, servings,
      known: known ? known.dish : null,
      knownConfidence: known ? known.confidence : 0,
      speculative,
      protein, base, proteinExplicit,
      diet, allergies, appliances, avoid, available,
      notes: U.clean(answers.notes),
      experience: answers.experience || 'intermediate',
      style: answers.style || 'traditional',
      heat: { label: spiceOpt.label, level: spiceLevel },
      sweet: { label: sweetOpt.label, factor: sweetOpt.factor, natural: Boolean(sweetOpt.natural) },
      salt: { label: saltOpt.label, factor: saltOpt.factor },
      oil: { label: oilOpt.label, factor: oilOpt.factor, id: answers.oil },
      timeBudget: timeOpt.minutes || 0,
      appliance: pickPrimaryAppliance(appliances, technique),
      isVeg, isVegan,
      rand: U.rng(`${dish}|${cuisine.id}|${technique.id}|${servings}|${diet.join()}|${spiceLevel}`),
    };
  }

  /** The appliance that most changes the method for this technique. */
  function pickPrimaryAppliance(appliances, technique) {
    const preference = {
      baked: ['oven', 'otg', 'air-fryer', 'microwave'],
      grilled: ['oven', 'otg', 'air-fryer', 'gas'],
      fried: ['air-fryer', 'gas', 'induction'],
      riceDish: ['instant-pot', 'pressure-cooker', 'rice-cooker', 'oven', 'gas'],
      curry: ['instant-pot', 'pressure-cooker', 'slow-cooker', 'gas'],
      soup: ['instant-pot', 'pressure-cooker', 'slow-cooker', 'gas'],
      dessert: ['oven', 'otg', 'microwave', 'gas'],
      stirFry: ['gas', 'induction'],
    }[technique.id] || ['gas', 'induction'];
    return preference.find((a) => appliances.includes(a)) || appliances[0] || 'gas';
  }

  /* ---------------------------------------------------------------------- */
  /* Ingredient pipeline                                                    */
  /* ---------------------------------------------------------------------- */

  /* Spices, herbs and fats don't scale linearly with batch size — a pot for
     eight doesn't need eight times the cumin. Real cooks scale these back, and
     so do we. The exponent is applied to the serving count. */
  const SCALE_EXPONENT = {
    spices: 0.78, herbs: 0.85, oils: 0.86, condiments: 0.9, sweeteners: 0.92,
    dairy: 0.96, others: 0.92,
  };

  /* Ingredients that are counted, not measured — always whole numbers. */
  const DISCRETE = new Set([
    'bay-leaf', 'cardamom', 'cloves', 'star-anise', 'cinnamon', 'green-chilli',
    'egg', 'curry-leaves', 'dates', 'lemon', 'lime',
  ]);

  function scaleFactor(category, servings) {
    const exp = SCALE_EXPONENT[category] !== undefined ? SCALE_EXPONENT[category] : 1;
    return Math.pow(servings, exp);
  }

  /** Apply diet/allergy/avoid rules, returning a replacement id or null to drop. */
  function applySwaps(id, c, warnings) {
    let current = id;

    if (c.diet.includes('vegan') && VEGAN_SWAP[current]) current = VEGAN_SWAP[current];
    else if (c.isVeg && VEG_SWAP[current]) current = VEG_SWAP[current];

    if (c.diet.includes('jain') && JAIN_SWAP[current]) {
      warnings.push(`Jain: ${AFR.data.ingredients.byId[current].name} replaced with ${AFR.data.ingredients.byId[JAIN_SWAP[current]].name}.`);
      current = JAIN_SWAP[current];
    }
    if (c.diet.includes('gluten-free') && GLUTEN_SWAP[current]) current = GLUTEN_SWAP[current];
    if (c.diet.includes('keto') && KETO_SWAP[current]) current = KETO_SWAP[current];
    if (c.diet.includes('paleo') && PALEO_SWAP[current]) current = PALEO_SWAP[current];

    /* Allergies are hard blocks — swap if we can, otherwise remove entirely. */
    for (const allergyId of c.allergies) {
      const opt = AFR.data.wizard.optionFor('allergies', allergyId);
      const blocks = (opt && opt.blocks) || [];
      if (blocks.includes(current)) {
        const alt = VEGAN_SWAP[current] || GLUTEN_SWAP[current] || null;
        if (alt && !blocks.includes(alt)) {
          warnings.push(`${opt.label}: ${AFR.data.ingredients.byId[current].name} replaced with ${AFR.data.ingredients.byId[alt].name}.`);
          current = alt;
        } else {
          warnings.push(`${opt.label}: ${AFR.data.ingredients.byId[current].name} removed from the recipe.`);
          return null;
        }
      }
    }

    /* User "avoid" list — a preference, so we substitute where we sensibly can. */
    const item = AFR.data.ingredients.byId[current];
    if (item) {
      const avoided = c.avoid.find((a) => {
        const resolved = AFR.data.ingredients.find(a);
        return (resolved && resolved.id === current) || U.includesTerm(item.name, a);
      });
      if (avoided) {
        const alt = { onion: 'cabbage', garlic: 'asafoetida', ginger: 'black-pepper' }[current]
          || VEGAN_SWAP[current] || null;
        if (alt) {
          warnings.push(`You asked to avoid ${avoided} — using ${AFR.data.ingredients.byId[alt].name} instead.`);
          current = alt;
        } else {
          warnings.push(`You asked to avoid ${avoided} — left out of this recipe.`);
          return null;
        }
      }
    }

    return current;
  }

  /** Build the final, scaled, filtered ingredient list. */
  function buildIngredients(c, warnings) {
    const spec = c.technique.ingredients(c) || [];
    const seen = new Map();

    spec.forEach((line) => {
      const swapped = applySwaps(line.ref, c, warnings);
      if (!swapped) return;

      const item = AFR.data.ingredients.byId[swapped] || AFR.data.ingredients.resolve(swapped);
      if (!item) return;

      /* Preference multipliers — this is where the wizard answers bite. */
      let per = Number(line.per) || 0;

      /* Oil-free means oil-free: added fats are dropped outright rather than
         scaled down to a token amount that would still appear in the list. */
      if (c.oil.factor <= 0.1 && (item.category === 'oils' || ['butter', 'ghee'].includes(item.id))) return;
      if (item.category === 'oils' || ['butter', 'ghee', 'cream'].includes(item.id)) per *= c.oil.factor;
      if (item.id === 'salt' || item.id === 'soy-sauce' || item.id === 'fish-sauce') per *= c.salt.factor;
      if (item.category === 'sweeteners' || item.id === 'condensed-milk') per *= Math.max(0, c.sweet.factor);
      if (['green-chilli', 'red-chilli-powder', 'chilli-sauce'].includes(item.id)) per *= (c.heat.level / 3);
      if (c.diet.includes('high-protein') && ['meat', 'seafood', 'legumes', 'dairy'].includes(item.category)) per *= 1.35;
      if (c.diet.includes('muscle-gain') && ['meat', 'seafood', 'legumes'].includes(item.category)) per *= 1.5;
      if (c.diet.includes('weight-loss') && item.category === 'oils') per *= 0.6;
      if (c.style === 'healthy' && item.category === 'oils') per *= 0.7;
      if (c.style === 'restaurant' && ['cream', 'butter', 'ghee'].includes(item.id)) per *= 1.4;
      if (c.style === 'street' && ['red-chilli-powder', 'chilli-sauce', 'oil'].includes(item.id)) per *= 1.25;

      if (per <= 0.0005) return; // e.g. sugar at "No Sugar", oil at "Oil Free"

      /* Natural sweetener preference: refined sugar becomes jaggery/dates. */
      let finalItem = item;
      if (c.sweet.natural && item.id === 'sugar') {
        finalItem = AFR.data.ingredients.byId.jaggery;
        per *= 1.2; // jaggery is slightly less sweet by volume
      }

      const key = finalItem.id;
      if (seen.has(key)) {
        seen.get(key).per += per; // merge duplicates (e.g. two spice sources)
        return;
      }
      seen.set(key, { item: finalItem, per, unit: line.unit || finalItem.unit, purpose: line.purpose });
    });

    /* Ingredients the user already has get priority billing in the list. */
    const availableIds = new Set();
    c.available.forEach((name) => {
      const resolved = AFR.data.ingredients.find(name);
      if (resolved) availableIds.add(resolved.id);
    });

    /* Fold in anything they have that suits the dish but wasn't in the template. */
    c.available.forEach((name) => {
      const resolved = AFR.data.ingredients.find(name);
      if (!resolved || seen.has(resolved.id)) return;
      if (!['vegetables', 'herbs', 'legumes', 'fruits'].includes(resolved.category)) return;
      if (seen.size > 22) return;
      if (applySwaps(resolved.id, c, []) !== resolved.id) return; // would violate a restriction
      availableIds.add(resolved.id);
      seen.set(resolved.id, {
        item: resolved, per: 0.5, unit: resolved.unit,
        purpose: 'Added because you already have it — it works well in this dish',
      });
    });

    const lines = [];
    seen.forEach(({ item, per, unit, purpose }) => {
      let qty = per * scaleFactor(item.category, c.servings);
      const grams = qty * (unit === item.unit ? item.gramsPerUnit : unitToGrams(unit, item));

      /* Things you count out one at a time never make sense as fractions —
         nobody adds "1⅝ bay leaves". Round these to whole units. */
      if (DISCRETE.has(item.id)) qty = Math.max(1, Math.round(qty));

      /* "1053 grams" is technically right and practically unreadable. */
      let displayUnit = unit;
      let qtyText;
      if (unit === 'grams' && qty >= 1000) {
        qty /= 1000;
        displayUnit = 'kg';
        qtyText = String(U.round(qty, 2));
      } else if (unit === 'grams') {
        qtyText = String(Math.round(qty));
      } else {
        qtyText = U.prettyQty(qty);
      }

      const label = qty <= 1 && displayUnit !== 'grams' ? singular(displayUnit) : displayUnit;
      lines.push({
        item,
        name: item.name,
        qty: qtyText,
        qtyRaw: qty,
        unit: label,
        display: `${qtyText} ${label}`,
        purpose: purpose || item.purpose,
        substitute: item.substitute,
        healthy: item.healthy,
        image: AFR.images.ingredient(item.name),
        group: item.group,
        grams,
        have: availableIds.has(item.id),
        estimated: Boolean(item.estimated),
      });
    });

    /* Sort so the main components lead and seasoning trails. The dish's own
       star ingredient always comes first: "Bhendi Masala" should not open its
       ingredient table with cream and ghee. */
    const starIds = new Set([c.protein && c.protein.id, c.base && c.base.id].filter(Boolean));
    const rank = { meat: 0, seafood: 0, legumes: 1, dairy: 2, vegetables: 3, grains: 4, fruits: 5, nuts: 6, herbs: 7, oils: 8, condiments: 9, sweeteners: 10, spices: 11, others: 12 };
    lines.forEach((line) => { line.star = starIds.has(line.item.id); });
    lines.sort((a, b) =>
      (b.star ? 1 : 0) - (a.star ? 1 : 0)
      || (rank[a.item.category] ?? 99) - (rank[b.item.category] ?? 99)
      || b.grams - a.grams);
    return lines;
  }

  /** Grams for a unit that differs from the pantry entry's native unit. */
  function unitToGrams(unit, item) {
    const map = {
      tsp: 4, tbsp: 13, cups: 200, grams: 1, pieces: item.gramsPerUnit || 80,
      cloves: 5, inch: 12, pinch: 0.4, pods: 1, sprigs: 2, stalks: 15, slices: 30,
    };
    return map[unit] !== undefined ? map[unit] : (item.gramsPerUnit || 50);
  }

  function singular(unit) {
    const map = { cups: 'cup', pieces: 'piece', cloves: 'clove', pods: 'pod', sprigs: 'sprig', stalks: 'stalk', slices: 'slice', grams: 'grams' };
    return map[unit] || unit;
  }

  /* ---------------------------------------------------------------------- */
  /* Steps                                                                  */
  /* ---------------------------------------------------------------------- */

  /** Experience level changes how much a step says. */
  function voice(desc, c) {
    if (c.experience === 'expert') {
      // Trim the hand-holding clauses experts don't need.
      return desc
        .replace(/ — this takes longer than you think[^.]*\./gi, '.')
        .replace(/\s*[A-Z][^.]*\bdo not rush it\b[^.]*\./gi, '')
        .trim();
    }
    if (c.experience === 'beginner') {
      return desc;
    }
    return desc;
  }

  /** Scale a step's duration with batch size (bigger pans take longer). */
  function scaleMinutes(min, c) {
    const factor = 1 + Math.log2(Math.max(1, c.servings / 4)) * 0.18;
    return Math.max(1, Math.round(min * factor));
  }

  function buildSteps(c, warnings) {
    const prepRaw = (c.technique.prep(c) || []).filter(Boolean);
    let cookRaw = (c.technique.cook(c) || []).filter(Boolean);

    /* Appliance rewrites — the method genuinely changes with the kit. */
    if (c.appliance === 'pressure-cooker' || c.appliance === 'instant-pot') {
      cookRaw = cookRaw.map((s) => {
        if (!/simmer|braise|cook.*tender|20–25 minutes/i.test(s.title + s.desc)) return s;
        return Object.assign({}, s, {
          title: `${s.title} (pressure cooked)`,
          desc: `${s.desc} Using your ${c.appliance === 'instant-pot' ? 'Instant Pot' : 'pressure cooker'}: seal and cook on high pressure for ${c.protein && c.protein.category === 'meat' ? '12' : '6'} minutes, then let the pressure release naturally for 10 minutes before opening.`,
          min: Math.round(s.min * 0.5),
          tips: s.tips.concat(['Natural pressure release keeps meat tender; a quick release seizes it up.']),
        });
      });
    }
    if (c.appliance === 'slow-cooker') {
      cookRaw = cookRaw.map((s) => (/simmer|braise/i.test(s.title) ? Object.assign({}, s, {
        desc: `${s.desc} In a slow cooker, transfer everything after the browning stages and cook on LOW for 5–6 hours.`,
        tips: s.tips.concat(['Brown the aromatics and protein on the hob first — a slow cooker cannot create those flavours.']),
      }) : s));
    }
    if (c.oil.factor <= 0.1) {
      cookRaw = cookRaw.map((s, i) => (i === 0 ? Object.assign({}, s, {
        title: `${s.title} (oil-free)`,
        desc: `${s.desc} Cooking oil-free: use 2–3 tbsp of water or stock instead of fat, adding a splash whenever the pan looks dry. A good non-stick pan makes this far easier.`,
        tips: s.tips.concat(['Water-sautéing gives you softness rather than browning, so lean on spices and acid for depth.']),
      }) : s));
      warnings.push('Oil-free mode: sautéing steps use water or stock instead of fat.');
    }

    /* Compress the method if the user is short on time. Prep gets cut hardest
       because that is where the passive slack lives — marinating and soaking. */
    let prepList = prepRaw;
    const totalNeeded = [...prepRaw, ...cookRaw].reduce((sum, s) => sum + (s.min || 0), 0);
    let timeNote = '';
    if (c.timeBudget && totalNeeded > c.timeBudget * 1.15) {
      prepList = prepRaw.map((s) => Object.assign({}, s, { min: Math.max(2, Math.round(s.min * 0.45)) }));
      cookRaw = cookRaw.map((s) => Object.assign({}, s, { min: Math.max(1, Math.round(s.min * 0.72)) }));
      const trimmed = [...prepList, ...cookRaw].reduce((sum, s) => sum + (s.min || 0), 0);
      timeNote = `Your ${c.timeBudget}-minute window is tighter than this dish traditionally needs (about ${U.humanTime(totalNeeded)}). Marinating, soaking and resting times have been cut back and faster equipment suggested where it helps, bringing it to roughly ${U.humanTime(trimmed)}`
        + (trimmed > c.timeBudget * 1.15
          ? `. That is still over your window — this dish genuinely cannot be rushed further without becoming a different dish, so treat the timings as the honest minimum.`
          : `. Flavour will be slightly less developed than the full version.`);
      warnings.push(timeNote);
    }

    const preparation = prepList.map((s, i) => ({
      n: i + 1,
      title: s.title,
      desc: voice(s.desc, c),
      image: AFR.images.step(`${c.dish} prep ${s.title}`),
      minutes: scaleMinutes(s.min, c),
      tips: s.tips, mistakes: s.mistakes,
    }));

    const steps = cookRaw.map((s, i) => ({
      n: i + 1,
      title: s.title,
      desc: voice(s.desc, c),
      image: AFR.images.step(`${c.dish} step ${i + 1} ${s.title}`),
      temp: s.temp || '—',
      flame: s.flame || 'Medium',
      minutes: scaleMinutes(s.min, c),
      tips: c.experience === 'expert' ? s.tips.slice(0, 1) : s.tips,
      mistakes: s.mistakes,
    }));

    /* Beginners get an explicit final check they can trust. */
    if (c.experience === 'beginner') {
      steps.push({
        n: steps.length + 1,
        title: 'Final check before serving',
        desc: `Taste it. Ask three questions: is it salty enough, does it need acid (lemon or vinegar), and is the ${c.protein ? c.protein.name.toLowerCase() : 'main ingredient'} cooked through? Nine times out of ten a dish that tastes "not quite right" needs salt or acid, not more spice.`,
        image: AFR.images.step(`${c.dish} final check`),
        temp: 'Off heat', flame: 'Off', minutes: 3,
        tips: ['Taste with a clean spoon each time, and taste it on its own rather than with rice or bread.'],
        mistakes: ['Serving without tasting — the one habit that separates good home cooks from frustrated ones.'],
      });
    }

    return { preparation, steps, timeNote };
  }

  /* ---------------------------------------------------------------------- */
  /* Supporting sections                                                    */
  /* ---------------------------------------------------------------------- */

  function buildEquipment(c) {
    const base = ['knife', 'bowls', 'measure'];
    const byTechnique = {
      curry: ['kadai', 'spatula', 'blender'],
      riceDish: ['pot', 'strainer', 'spatula'],
      stirFry: ['wok', 'spatula'],
      baked: ['tray', 'spatula', 'oven'],
      grilled: ['grill', 'thermometer', 'spatula'],
      fried: ['kadai', 'strainer', 'rack', 'thermometer'],
      soup: ['pot', 'strainer', 'blender'],
      salad: ['bowls', 'strainer'],
      dessert: ['bowls', 'tray', 'oven'],
      drink: ['blender', 'strainer'],
      assembly: ['kadai', 'spatula'],
      breakfast: ['kadai', 'spatula'],
      pasta: ['pot', 'strainer', 'kadai'],
    }[c.technique.id] || ['kadai', 'spatula'];

    const applianceExtras = c.appliances.filter((a) => EQUIPMENT[a]);
    const ids = U.unique([...base, ...byTechnique, ...applianceExtras]).slice(0, 9);

    return ids.map((id) => {
      const e = EQUIPMENT[id] || { name: U.titleCase(id), usage: 'Used during cooking.' };
      return { name: e.name, usage: e.usage, image: AFR.images.equipment(e.name) };
    });
  }

  function buildGallery(c) {
    return [
      { kind: 'ingredients', caption: 'Everything measured and ready (mise en place)', src: AFR.images.dish(`${c.dish} ingredients flatlay`) },
      { kind: 'preparation', caption: 'Prep — chopping, marinating and measuring', src: AFR.images.step(`${c.dish} preparation`) },
      { kind: 'cooking', caption: 'The dish mid-cook', src: AFR.images.step(`${c.dish} cooking process`) },
      { kind: 'final', caption: `Finished ${c.dish}`, src: AFR.images.dish(c.dish) },
      { kind: 'serving', caption: 'Plated and served', src: AFR.images.serving(`${c.dish} plated serving`) },
    ];
  }

  function buildVariations(c) {
    const p = c.protein ? c.protein.name.toLowerCase() : 'the main ingredient';
    return [
      { id: 'healthy', name: 'Healthy Version', icon: 'fa-heart-pulse',
        desc: 'Same dish, meaningfully lighter — without tasting like a compromise.',
        changes: [
          'Cut the cooking fat by half and use a non-stick pan or air fryer.',
          'Swap cream for thick yogurt or blended cashews, stirred in off the heat.',
          'Use a whole grain (brown rice, whole-wheat pasta) for the starch.',
          'Double the vegetables and reduce the starch portion by a third.',
          'Finish with lemon and fresh herbs so the reduced salt goes unnoticed.',
        ] },
      { id: 'restaurant', name: 'Restaurant Version', icon: 'fa-utensils',
        desc: 'The glossy, rich version you get when someone else is counting the butter.',
        changes: [
          'Add a tablespoon of butter or cream at the very end, off the heat.',
          'Sieve the gravy or sauce for a completely smooth texture.',
          `Marinate ${p} for a full 4 hours, or overnight.`,
          'Finish with a smoke infusion (dhungar) or a browned-butter drizzle.',
          'Plate in a warmed dish with a deliberate garnish.',
        ] },
      { id: 'quick', name: 'Quick Version', icon: 'fa-bolt',
        desc: `On the table in roughly ${Math.max(15, Math.round((c.technique.times(c).prep + c.technique.times(c).cook) * 0.45))} minutes.`,
        changes: [
          'Use ready ginger-garlic paste and tinned tomato purée.',
          'Skip the marinade; season directly and increase the heat instead.',
          c.appliances.includes('pressure-cooker') || c.appliances.includes('instant-pot')
            ? 'Pressure cook the long-simmer stage — 6 to 12 minutes replaces 25.'
            : 'Cut everything smaller so it cooks in half the time.',
          'Prep while the pan heats rather than before.',
        ] },
      { id: 'budget', name: 'Budget Version', icon: 'fa-wallet',
        desc: 'Roughly 40% cheaper per serving, with the character intact.',
        changes: [
          c.protein && c.protein.category === 'meat'
            ? `Halve the ${p} and make up the volume with potato, beans or lentils.`
            : 'Use seasonal vegetables and whatever is cheapest that week.',
          'Replace cashews or cream with a slurry of soaked oats or bread.',
          'Buy whole spices and grind them yourself — a fraction of the cost of blends.',
          'Cook a double batch; the second meal costs almost nothing in fuel.',
        ] },
      { id: 'premium', name: 'Premium Version', icon: 'fa-gem',
        desc: 'For when it needs to be the best thing on the table.',
        changes: [
          'Use saffron, aged spices and the best fat you can justify.',
          c.protein ? `Upgrade to a premium cut of ${p} and cook it separately for precision.` : 'Use heirloom or organic produce, which genuinely shows here.',
          'Layer two acids (citrus plus vinegar) for a more complex finish.',
          'Add a textural garnish: toasted nuts, crisp shallots or micro herbs.',
        ] },
      { id: 'festival', name: 'Festival Version', icon: 'fa-star',
        desc: 'Scaled up, richer, and designed to be made partly in advance.',
        changes: [
          `Scale to ${c.servings * 3} servings — make the base a day ahead and finish on the day.`,
          'Increase the whole spices and add a fried-onion or nut garnish.',
          'Add ghee, saffron or edible silver leaf for the occasion.',
          'Serve with two sides and a dessert from the same region.',
          'Keep it warm in a low oven (80°C) rather than reheating repeatedly.',
        ] },
    ];
  }

  function buildStorage(c) {
    const perishable = c.protein && ['meat', 'seafood'].includes(c.protein.category);
    const dairy = c.technique.id === 'dessert' || (c.cuisine.finishers || []).includes('cream');
    return {
      fridge: perishable ? '2–3 days in an airtight container at or below 4°C'
        : dairy ? '2–3 days refrigerated, kept covered'
          : '3–4 days in an airtight container at or below 4°C',
      freezer: c.technique.id === 'salad' || c.technique.id === 'drink'
        ? 'Not suitable for freezing — the texture collapses on thawing'
        : perishable ? 'Up to 2 months, portioned flat in freezer bags'
          : 'Up to 3 months; freeze before adding any fresh herbs or dairy',
      reheat: `Reheat gently: ${c.technique.id === 'fried' ? 'oven or air fryer at 180°C for 6–8 minutes to bring the crispness back — never the microwave' : 'a covered pan over low heat with a splash of water, stirring, until it is steaming throughout (74°C)'}.`,
      notes: [
        'Cool to room temperature within 90 minutes, then refrigerate. Leaving food out longer is where most home food-safety problems start.',
        'Store in shallow containers so the centre cools quickly rather than staying warm for hours.',
        'Reheat only the portion you are eating — repeated reheating degrades both safety and texture.',
        c.technique.id === 'riceDish' ? 'Cooked rice should be cooled fast and eaten within 24 hours; reheated rice carries a genuine risk of Bacillus cereus if it has sat warm.' : 'Label the container with the date — memory is unreliable after three days.',
      ],
    };
  }

  function buildMealPlan(c, ps) {
    const kind = c.technique.kind;
    const heavy = ps.calories > 600;
    const slots = [
      { slot: 'Breakfast', fit: kind === 'breakfast' || kind === 'drink' ? 'good' : heavy ? 'poor' : 'ok',
        note: kind === 'breakfast' ? 'Designed for it.' : heavy ? `${ps.calories} kcal is a lot to start the day with.` : 'Workable as a weekend breakfast.' },
      { slot: 'Lunch', fit: kind === 'dessert' || kind === 'drink' ? 'ok' : 'good',
        note: kind === 'dessert' ? 'As a portion after a light lunch.' : `${ps.calories} kcal and ${ps.protein} g protein carries you through the afternoon.` },
      { slot: 'Dinner', fit: heavy ? 'ok' : 'good',
        note: heavy ? 'Rich for a late meal — eat it at least three hours before bed.' : 'A comfortable evening portion.' },
      { slot: 'Snack', fit: kind === 'snack' || kind === 'drink' || kind === 'dessert' ? 'good' : ps.calories < 300 ? 'ok' : 'poor',
        note: kind === 'snack' ? 'Exactly what it is for.' : ps.calories < 300 ? 'A half portion works as a snack.' : 'Too substantial to snack on.' },
    ];
    const best = slots.reduce((a, b) => (a.fit === 'good' && b.fit !== 'good' ? a : b.fit === 'good' ? b : a)).slot;
    return { best, slots };
  }

  function buildShopping(lines) {
    const order = ['Vegetables', 'Spices', 'Dairy', 'Meat', 'Grains', 'Others'];
    const grouped = U.groupBy(lines, (l) => l.group);
    return order
      .filter((group) => grouped[group] && grouped[group].length)
      .map((group) => ({
        group,
        items: grouped[group].map((l) => ({ name: l.name, qty: l.display, have: l.have })),
      }));
  }

  function buildTips(c) {
    const p = c.protein ? c.protein.name.toLowerCase() : 'the main ingredient';
    const cuisineTip = c.cuisine.signature;

    return {
      chef: [
        cuisineTip,
        `Season in layers rather than all at the end — a pinch with the onions, a pinch with the ${p}, and a final correction before serving.`,
        c.cuisine.temperature,
        'Taste at every stage. A recipe is a starting point; your palate is the instrument.',
      ],
      pro: [
        'Get everything prepped and within arm’s reach before the pan goes on. Professional kitchens call this mise en place and it exists because cooking punishes hesitation.',
        'Heat the pan before the fat, and the fat before the food. Almost every sticking problem traces back to this.',
        c.style === 'restaurant'
          ? 'Restaurants finish with fat and acid off the heat — a knob of butter or a squeeze of lemon at the end is what makes a dish taste "finished".'
          : 'Rest the finished dish for five minutes before serving; the flavours settle and the texture improves.',
        'Keep a bowl of hot water beside the hob. It adjusts consistency far better than cold water, which shocks and stalls everything.',
      ],
      mistakes: [
        'Overcrowding the pan — the single most common home-cooking error. Food steams instead of browning and you lose all the flavour that browning creates.',
        'Cooking with fridge-cold ingredients, which cook unevenly from the outside in.',
        'Adding delicate herbs, garam masala or sesame oil while the pan is still on the flame; their aroma is volatile and disappears with heat.',
        c.heat.level >= 4
          ? 'Adding all the chilli at once. Add two-thirds, taste, then decide — you can add heat but you cannot take it out.'
          : 'Under-salting out of caution. Salt is what makes every other flavour legible.',
      ],
      flavor: [
        'If it tastes flat, it almost always needs acid — lemon, vinegar or tamarind — not more salt.',
        'A pinch of sugar rounds off aggressive acidity; a pinch of salt makes sweetness taste like more.',
        `Toast whole spices in a dry pan before grinding. The difference is not subtle.`,
        `Umami depth without meat: mushrooms, tomato paste, a splash of soy, or a hard cheese rind in the simmer.`,
        c.heat.level === 0 ? 'Without chilli, build interest with black pepper, ginger, mustard and fresh herbs — heat is only one kind of intensity.' : 'Use two chilli forms — one fresh for brightness, one dried or powdered for depth.',
      ],
      texture: [
        'Contrast is what makes a dish memorable: something crisp against something soft, in every serving.',
        'Dry the surface of anything you want to brown. Water on the surface means steam, and steam means no crust.',
        c.technique.id === 'fried' ? 'Double-frying is the reliable route to a crust that survives more than two minutes on the plate.'
          : 'Finish with a textural garnish — toasted nuts, fried onions, crisp herbs or seeds.',
        'Rest before cutting or serving. It is part of the cooking, not a delay to it.',
      ],
    };
  }

  function buildSafety(c) {
    const temps = [];
    if (c.protein) {
      const t = {
        chicken: 'Poultry: 74°C in the thickest part, away from bone.',
        'chicken-thigh': 'Poultry: 74°C in the thickest part, away from bone.',
        mutton: 'Whole cuts of lamb or goat: 63°C, then rest 3 minutes. Minced: 71°C.',
        beef: 'Whole beef cuts: 63°C for medium, then rest 3 minutes. Minced beef: 71°C.',
        pork: 'Pork: 63°C, then rest 3 minutes.',
        fish: 'Fish: 63°C, or until it flakes and turns opaque throughout.',
        prawns: 'Prawns: cook until opaque and curled into a loose C — a tight O means overcooked.',
        egg: 'Eggs: cook until both white and yolk are firm if serving to children, pregnant or elderly diners.',
      }[c.protein.id];
      if (t) temps.push(t);
    }
    temps.push('Reheated leftovers: 74°C throughout, steaming hot rather than merely warm.');
    if (c.technique.id === 'fried') temps.push('Frying oil: 175–180°C. Above 190°C oil begins to break down and taste acrid.');
    temps.push('The danger zone is 5–60°C. Cooked food should not sit in it for more than two hours in total.');

    const cross = [
      'Use a separate board and knife for raw protein, or do all your vegetable prep first.',
      'Wash hands, boards and knives with hot soapy water immediately after handling raw meat, poultry, fish or eggs.',
      'Never put cooked food back onto the plate that held it raw.',
      'Do not rinse raw chicken — it aerosolises bacteria across your sink and worktop without making it safer.',
    ];
    if (c.allergies.length) {
      cross.push(`Allergen note: you flagged ${c.allergies.map((a) => (AFR.data.wizard.optionFor('allergies', a) || {}).label || a).join(', ')}. Use clean equipment and check the labels of every packaged ingredient — traces are common in shared production lines.`);
    }

    return {
      temps,
      storage: [
        'Refrigerate leftovers within 90 minutes of cooking; within 60 in a warm kitchen.',
        'Store raw protein on the bottom shelf of the fridge so nothing can drip onto ready-to-eat food.',
        'Keep the fridge at or below 4°C and the freezer at or below −18°C.',
        'Thaw in the fridge overnight, not on the counter.',
      ],
      crossContamination: cross,
      expiry: [
        'Cooked leftovers: eat within the fridge window given in the storage section, and reheat only once.',
        'Trust your senses, but not blindly — some pathogens leave no smell or taste. If in doubt, throw it out.',
        'Dairy and seafood spoil fastest; cooked grains and pulses are next.',
        'Whole spices keep their aroma for around a year, ground spices for about six months. Old spices are not unsafe, just disappointing.',
      ],
    };
  }

  function buildCustomization(c) {
    const W = AFR.data.wizard;
    const list = (v) => (Array.isArray(v) && v.length ? v : null);

    const rows = [
      { label: 'Dish', value: c.dish, icon: 'fa-utensils' },
      { label: 'Servings', value: `${c.servings} ${c.servings === 1 ? 'person' : 'people'}`, icon: 'fa-users' },
      { label: 'Experience', value: W.labelFor('experience', c.experience), icon: 'fa-graduation-cap' },
      { label: 'Time preference', value: W.labelFor('time', c.answers.time), icon: 'fa-clock' },
      { label: 'Cuisine', value: `${c.cuisine.flag} ${c.cuisine.name}${(!c.answers.cuisine || c.answers.cuisine === 'auto') ? ' (auto-detected)' : ''}`, icon: 'fa-earth-asia' },
      { label: 'Diet', value: list(c.diet) ? c.diet.map((d) => W.labelFor('diet', d)).join(', ') : 'No restriction', icon: 'fa-seedling' },
      { label: 'Spice level', value: `${c.heat.label} (${c.heat.level}/6)`, icon: 'fa-pepper-hot' },
      { label: 'Sweetness', value: c.sweet.label, icon: 'fa-candy-cane' },
      { label: 'Salt', value: c.salt.label, icon: 'fa-cubes-stacked' },
      { label: 'Oil', value: c.oil.label, icon: 'fa-bottle-droplet' },
      { label: 'Cooking style', value: W.labelFor('style', c.style), icon: 'fa-palette' },
      { label: 'Appliances', value: c.appliances.map((a) => W.labelFor('appliances', a)).join(', ') || 'Gas Stove', icon: 'fa-blender' },
      { label: 'Ingredients you have', value: list(c.available) ? c.available.join(', ') : 'None specified', icon: 'fa-basket-shopping' },
      { label: 'Avoiding', value: list(c.avoid) ? c.avoid.join(', ') : 'Nothing', icon: 'fa-ban' },
      { label: 'Allergies', value: list(c.allergies) ? c.allergies.map((a) => W.labelFor('allergies', a)).join(', ') : 'None declared', icon: 'fa-triangle-exclamation' },
      { label: 'Special instructions', value: c.notes || 'None', icon: 'fa-pen-to-square' },
    ];
    return rows;
  }

  /** Turn free-text special instructions into concrete, visible adjustments. */
  function applyNotes(c, recipe) {
    const notes = (c.notes || '').toLowerCase();
    if (!notes) return;
    const applied = [];

    const rules = [
      [/less oil|not oily|low.?fat|light/, 'Reduced the visible fat and added a note to drain excess oil before serving.'],
      [/extra crispy|crisp|crunch/, 'Added a double-fry / high-heat finish and a wire-rack rest so the crust survives to the table.'],
      [/restaurant|hotel|dhaba/, 'Finished with butter and cream off the heat, and sieved the sauce for a smoother texture.'],
      [/no coriander|without coriander|hate coriander/, 'Left coriander out — mint and parsley are used as the fresh finish instead.'],
      [/kids|child|children/, 'Kept the heat gentle, cut everything to child-friendly sizes, and avoided whole spices that need picking out.'],
      [/festival|celebration|guest|party/, 'Enriched the base, added a garnish layer, and split the method so most can be done in advance.'],
      [/high.?protein|protein/, 'Increased the protein portion and suggested a yogurt or legume side.'],
      [/budget|cheap|economical/, 'Substituted the expensive ingredients and suggested bulking with seasonal vegetables.'],
      [/meal.?prep|lunchbox|tiffin|travel/, 'Adjusted for a dish that holds: slightly drier finish, garnish packed separately.'],
      [/one.?pot|single pan|less washing/, 'Sequenced the method so it can be done in one pan.'],
      [/gravy|curry.?more|extra sauce/, 'Increased the liquid so there is enough gravy to go round.'],
      [/make ahead|advance/, 'Split into a make-ahead base and a finish-on-the-day stage.'],
    ];

    rules.forEach(([re, action]) => { if (re.test(notes)) applied.push(action); });

    if (applied.length) {
      recipe.tips.chef.unshift(...applied.map((a) => `From your instructions: ${a}`));
    } else {
      recipe.tips.chef.unshift(`Your note — "${c.notes}" — has been carried into the brief and reflected in the seasoning and finishing choices.`);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Assembly                                                               */
  /* ---------------------------------------------------------------------- */

  function describe(c) {
    const styleWord = {
      healthy: 'a lighter, cleaner', traditional: 'a traditional', restaurant: 'a rich, restaurant-style',
      street: 'a bold, street-food', authentic: 'an authentic regional', fusion: 'a modern fusion',
    }[c.style] || 'a well-balanced';

    const dietBit = c.diet.length && !c.diet.includes('none')
      ? ` It is built to be ${c.diet.map((d) => AFR.data.wizard.labelFor('diet', d).toLowerCase()).join(' and ')}.`
      : '';

    const heatBit = c.heat.level === 0 ? ' There is no chilli in it at all — the depth comes from aromatics and slow cooking.'
      : c.heat.level >= 5 ? ' The heat is deliberately assertive, layered in at two separate stages.'
        : ` The heat sits at ${c.heat.label.toLowerCase()}, warm enough to notice without dominating.`;

    /* A dish we actually know deserves its own description; the generic one
       would describe the technique rather than the dish. */
    const opening = c.known
      ? `${c.known.summary} This version is scaled for ${c.servings} ${c.servings === 1 ? 'person' : 'people'}`
        + `${c.known.region ? `, in the ${c.known.region} style` : ''}.`
      : `${styleWord.charAt(0).toUpperCase()}${styleWord.slice(1)} take on ${c.dish}, scaled for ${c.servings} `
        + `${c.servings === 1 ? 'person' : 'people'} and cooked `
        + `${c.cuisine.id === 'global' ? 'with a global approach' : `in the ${c.cuisine.name} tradition`}.`;

    return `${opening}${dietBit}${heatBit} Every quantity below is calculated for your serving count, and the nutrition panel is worked out from the actual ingredient list rather than a generic estimate.`;
  }

  function difficultyOf(c) {
    const techniqueWeight = { salad: 1, drink: 1, breakfast: 2, stirFry: 2, curry: 2, soup: 2, assembly: 2, pasta: 2, fried: 3, grilled: 3, riceDish: 3, baked: 3, dessert: 3 }[c.technique.id] || 2;
    const adjusted = techniqueWeight + (c.experience === 'beginner' ? 0.5 : c.experience === 'expert' ? -0.5 : 0);
    return adjusted <= 1.6 ? 'Easy' : adjusted <= 2.6 ? 'Medium' : 'Hard';
  }

  /**
   * Generate a complete recipe. Async to match the remote-provider signature
   * so the orchestrator can treat every provider identically.
   */
  async function generate(answers, hooks = {}) {
    const report = hooks.onProgress || (() => {});
    const c = buildContext(answers);
    const warnings = [];

    report('Understanding your dish and cuisine…', 0.15);
    const times = c.technique.times(c);

    report('Selecting and scaling ingredients…', 0.35);
    const lines = buildIngredients(c, warnings);

    report('Writing the method…', 0.55);
    const { preparation, steps, timeNote } = buildSteps(c, warnings);

    report('Calculating nutrition for your serving size…', 0.75);
    const absorbedOil = c.technique.id === 'fried' ? 8 * c.servings * c.oil.factor : 0;
    const ps = AFR.nutrition.perServing(lines, c.servings, { absorbedOilGrams: absorbedOil });
    const health = AFR.nutrition.healthScore(ps, {
      oil: c.oil.id, salt: c.answers.salt, style: c.style, diet: c.diet,
    });
    const suitability = AFR.nutrition.suitability(ps, {
      diet: c.diet, spiceLevel: c.heat.level,
      hasGluten: lines.some((l) => ['wheat-flour', 'all-purpose-flour', 'pasta', 'bread', 'noodles', 'semolina'].includes(l.item.id)),
      hasRaw: c.technique.id === 'salad' && Boolean(c.protein && ['seafood'].includes(c.protein.category)),
      hasAlcohol: /wine|beer|rum|vodka|whisk/.test((c.notes || '').toLowerCase()),
    });

    report('Adding tips, storage and safety…', 0.9);

    const prepTotal = preparation.reduce((s, x) => s + x.minutes, 0) || times.prep;
    const cookTotal = steps.reduce((s, x) => s + x.minutes, 0) || times.cook;

    const recipe = AFR.schema.normalise({
      id: `${U.slug(c.dish)}-${U.hash(JSON.stringify(answers)).toString(36)}`,
      name: c.dish,
      dish: c.dishRaw,
      cuisine: { id: c.cuisine.id, name: c.cuisine.name, flag: c.cuisine.flag },
      technique: { id: c.technique.id, name: c.technique.name },
      description: describe(c),
      image: AFR.images.dish(c.dish),
      difficulty: difficultyOf(c),
      prepTime: prepTotal,
      cookTime: cookTotal,
      totalTime: prepTotal + cookTotal,
      servings: c.servings,

      gallery: buildGallery(c),

      ingredients: lines,
      ingredientNote: `Quantities are calculated for ${c.servings} ${c.servings === 1 ? 'serving' : 'servings'}. Spices, herbs and cooking fat are scaled slightly below the serving count on purpose — that is how a larger batch is actually seasoned, since flavour concentration does not rise in a straight line with volume.`,

      equipment: buildEquipment(c),
      preparation,
      steps,

      serving: {
        image: AFR.images.serving(`${c.dish} served`),
        sides: c.cuisine.sides,
        drinks: c.cuisine.drinks,
        garnish: c.cuisine.garnish,
        plating: c.cuisine.plating,
      },

      nutrition: ps,
      nutritionNote: `Per serving, calculated from this exact ingredient list divided by ${c.servings}. Values are estimates from reference food-composition data and include an allowance for vitamin loss during cooking${absorbedOil ? ' and for oil absorbed during frying' : ''}. Treat them as a good guide, not a clinical measurement.`,

      health: { score: health.score, band: health.band, pros: health.pros, cons: health.cons, suitability },

      customization: buildCustomization(c),
      variations: buildVariations(c),
      storage: buildStorage(c),
      mealPlan: buildMealPlan(c, ps),
      cost: Object.assign(AFR.nutrition.cost(lines, c.servings), {
        note: 'Estimated from typical retail prices. Actual cost varies with your region, season and where you shop.',
      }),
      shopping: buildShopping(lines),
      tips: buildTips(c),
      safety: buildSafety(c),

      meta: {
        provider: 'local',
        mode: 'generated',
        warnings: warnings.concat(timeNote ? [] : []),
        knownDish: c.known ? c.known.id : null,
        context: {
          techniqueId: c.technique.id, cuisineId: c.cuisine.id,
          heatLevel: c.heat.level, servings: c.servings,
        },
      },
    });

    applyNotes(c, recipe);

    /* Keep the honest-labelling promise: the local engine is not the internet.
       The most important case is a dish it does not know. It will still return
       something coherent, because a technique and a cuisine profile always
       compose — but coherent is not the same as correct, and presenting a
       guess as a recipe is the one failure worth warning about every time. */
    if (!c.known && !AFR.config.isLive('ai')) {
      recipe.meta.confidence = c.speculative ? 'unknown' : 'composed';
      recipe.meta.unknownDish = {
        dish: c.dish,
        /* `speculative` means the name told us nothing either — not even which
           vegetable or protein it centres on. That is a materially weaker
           answer than a composed one and should not be presented the same way. */
        speculative: c.speculative,
        technique: c.technique.name.toLowerCase(),
        cuisine: c.cuisine.name,
      };
      recipe.meta.warnings.push(c.speculative
        ? `This is NOT a recipe for ${c.dish}. The app does not know this dish, and its name does `
          + 'not identify a main ingredient either, so what follows is a generic '
          + `${c.technique.name.toLowerCase()} in the ${c.cuisine.name} style. Treat it as a template, not an answer.`
        : `"${c.dish}" is not in the built-in recipe collection, so this was composed from its `
          + `${c.technique.name.toLowerCase()} technique and the ${c.cuisine.name} flavour profile. `
          + 'It will cook, but it may not be the authentic version of this dish.');
    } else {
      recipe.meta.confidence = c.known ? 'known' : 'ai';
    }

    recipe.meta.warnings = U.unique(recipe.meta.warnings);

    if (AFR.config.generation.simulateLatencyMs) {
      await U.sleep(AFR.config.generation.simulateLatencyMs);
    }
    report('Finishing up…', 1);
    return recipe;
  }

  /* Registered under the 'local' key for the ai capability. */
  AFR.providers = AFR.providers || {};
  AFR.providers.aiLocal = {
    id: 'local',
    capability: 'ai',
    label: 'Built-in recipe engine (offline)',
    generate,
    /* Exposed for testing and for remote adapters that want the same context. */
    _internal: { buildContext, buildIngredients, buildSteps, scaleFactor, buildCustomization },
  };
})(window);
