/* ==========================================================================
 * techniques.js — how a dish is actually built.
 *
 * A "technique" is the structural skeleton of a dish: which components it
 * needs, in what quantity per serving, and the ordered prep/cook steps with
 * their heat, timing, tips and classic mistakes.
 *
 * Combining a TECHNIQUE (this file) with a CUISINE profile (cuisines.js) is
 * what lets one engine produce a credible Thai green curry, a Turkish kebab
 * and a French gratin without hard-coding a single recipe.
 *
 * Every step function receives the generation context `c`:
 *   c.dish        display name of the dish
 *   c.cuisine     cuisine profile object
 *   c.protein     resolved protein ingredient (or null for vegetarian bases)
 *   c.base        resolved primary vegetable / starch
 *   c.servings    number of eaters
 *   c.heat        { label, level 0-6 }
 *   c.oil         { label, factor }   oil preference
 *   c.salt        { label, factor }
 *   c.sweet       { label, factor }
 *   c.style       cooking style id ('healthy' | 'restaurant' | ...)
 *   c.appliance   the primary appliance chosen by the user
 *   c.experience  'beginner' | 'intermediate' | 'expert'
 *   c.rand        seeded PRNG
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  /* Shorthand builders --------------------------------------------------- */

  /** An ingredient line. `per` is the quantity for ONE serving. */
  const ing = (ref, per, unit, purpose, opts = {}) =>
    Object.assign({ ref, per, unit, purpose }, opts);

  /**
   * A line for an ingredient we think about by weight (proteins, vegetable
   * bases), converted into whatever unit that pantry entry actually uses.
   * Without this, "80" would mean 80 grams of paneer but 80 CUPS of chickpeas,
   * because the two entries are measured differently.
   */
  const byWeight = (item, gramsPerServing, purpose) => {
    if (!item) return null;
    const perUnit = item.gramsPerUnit || 1;
    return ing(item.id, gramsPerServing / perUnit, item.unit, purpose);
  };

  /** A step. `min` is minutes; `flat: true` keeps duration fixed regardless of batch size. */
  const step = (title, desc, opts = {}) =>
    Object.assign({ title, desc, min: 5, temp: '', flame: 'Medium', tips: [], mistakes: [] }, opts);

  /* Small helpers used inside step text ---------------------------------- */
  const fatOf = (c) => c.cuisine.fats[0];
  const fatName = (c) => (AFR.data.ingredients.byId[fatOf(c)] || { name: 'oil' }).name.toLowerCase();
  const aromaticNames = (c) => c.cuisine.aromatics
    .slice(0, 3)
    .map((id) => (AFR.data.ingredients.byId[id] || { name: id }).name.toLowerCase())
    .join(', ');
  const proteinName = (c) => (c.protein ? c.protein.name.toLowerCase() : (c.base ? c.base.name.toLowerCase() : 'the main ingredient'));
  const heatLine = (c) => {
    if (c.heat.level === 0) return 'Skip the chilli entirely — build flavour with aromatics and a little extra acid instead.';
    if (c.heat.level <= 2) return 'Keep the chilli gentle; deseed it so you get flavour without the burn.';
    if (c.heat.level >= 5) return 'This is the heat stage — add the chilli in two goes and taste between them.';
    return 'Add the chilli now so its heat has time to round out.';
  };

  /* ====================================================================== */
  /* Technique catalogue                                                     */
  /* ====================================================================== */

  const TECHNIQUES = {

    /* ------------------------------------------------------------- curry */
    curry: {
      id: 'curry', name: 'Simmered curry / gravy', kind: 'main', icon: 'fa-bowl-food',
      match: ['curry', 'masala', 'gravy', 'korma', 'tikka masala', 'butter chicken', 'vindaloo',
        'rogan josh', 'kadai', 'stew', 'braise', 'wat', 'tagine', 'goulash', 'chana', 'rajma', 'dal',
        'sambar', 'kofta', 'makhani', 'saag', 'palak', 'green curry', 'red curry', 'massaman'],
      times: (c) => ({ prep: 18, cook: c.protein && c.protein.category === 'meat' ? 35 : 25 }),

      ingredients: (c) => [
        byWeight(c.protein, c.protein && (c.protein.category === 'meat' || c.protein.category === 'seafood') ? 150 : 80,
          'The protein centrepiece — cooked through in the gravy so it takes on the masala'),
        /* The named vegetable belongs in the pot whether or not there is also
           a protein -- dropping it is what made "Palak Paneer" arrive without
           any spinach. */
        byWeight(c.base, c.protein ? 90 : 170,
          c.protein ? 'Vegetable cooked alongside the protein' : 'The vegetable heart of the dish'),
        ing(fatOf(c), 0.6, 'tbsp', 'Carries the fat-soluble spice flavour into everything else'),
        ing('onion', 0.7, 'pieces', 'Cooked down to a sweet, jammy base'),
        ing('garlic', 1.6, 'cloves', 'Pungent depth in the base'),
        ing('ginger', 0.22, 'inch', 'Warmth and a clean finish'),
        ing('tomato', 1, 'pieces', 'Acidity and body — the sauce itself'),
        c.heat.level > 0 && ing('green-chilli', 0.5, 'pieces', 'Fresh heat'),
        ...c.cuisine.groundSpices.slice(0, 3).map((id) =>
          ing(id, 0.35, null, 'Layered ground spice — the colour and character of the dish')),
        ...c.cuisine.wholeSpices.slice(0, 2).map((id) =>
          ing(id, 0.3, null, 'Bloomed in hot fat at the very start')),
        ing('salt', 0.28, 'tsp', 'Seasoning, added in layers'),
        ing('water', 0.45, 'cups', 'Brings the gravy to the consistency you want'),
        c.style !== 'healthy' && c.cuisine.finishers.includes('cream') &&
          ing('cream', 0.7, 'tbsp', 'Silky richness stirred in at the end'),
        ing(c.cuisine.finishers[0], 0.5, 'tbsp', 'Fresh finish, added off the heat'),
      ].filter(Boolean),

      prep: (c) => [
        step('Prep the aromatics',
          `Finely chop the onion, ${aromaticNames(c)}. Uniform pieces matter more than speed — they cook evenly and melt into the base instead of staying stringy.`,
          { min: 8, tips: ['A sharp knife bruises the onion less, which means less bitterness in the finished gravy.'] }),
        c.protein && step(`Prepare the ${proteinName(c)}`,
          c.protein.category === 'meat' || c.protein.category === 'seafood'
            ? `Cut into even bite-size pieces, pat dry, and toss with a pinch of salt, turmeric and a squeeze of lemon. Let it sit for 15 minutes — this seasons it from the inside.`
            : `Cut into 2 cm cubes. If using paneer or tofu, soak briefly in warm salted water so it stays soft in the gravy.`,
          { min: 10, tips: ['Patting the surface dry is what lets it brown instead of steam.'] }),
        step('Purée the tomato',
          `Blend the tomatoes to a smooth purée${c.style === 'restaurant' ? ' and pass it through a sieve — that is the trick behind a restaurant’s glossy gravy' : ''}. Keep the spice powders measured out in one small bowl so you are not fumbling with jars over a hot pan.`,
          { min: 5, tips: ['Mise en place is the single biggest difference between a calm cook and a rushed one.'] }),
      ].filter(Boolean),

      cook: (c) => [
        step('Bloom the whole spices',
          `Heat ${fatName(c)} in a heavy pan until it shimmers. Add the whole spices and wait for them to sizzle and release their perfume — about 30 seconds. ${c.cuisine.signature}`,
          {
            min: 2, temp: '160–170°C', flame: 'Medium',
            tips: ['The moment you can smell them across the kitchen, they are ready.'],
            mistakes: ['Adding spices to cold fat — they will taste raw and dusty rather than aromatic.'],
          }),
        step('Build the onion base',
          `Add the onions with a pinch of salt and cook until deep golden — ${c.experience === 'beginner' ? 'this takes longer than you think, usually 8–10 minutes; do not rush it' : '8–10 minutes, stirring occasionally'}. The salt draws out moisture and speeds up the browning.`,
          {
            min: 10, temp: '150–160°C', flame: 'Medium',
            tips: ['If they catch, a splash of water lifts the browning off the pan and back into the onions.'],
            mistakes: ['High heat here gives you burnt edges and raw centres — a bitter base you cannot fix later.'],
          }),
        step('Ginger, garlic and chilli',
          `Stir in the ginger and garlic and cook for 60–90 seconds, until the raw smell disappears. ${heatLine(c)}`,
          {
            min: 2, temp: '150°C', flame: 'Medium-low',
            tips: ['Garlic burns in seconds at this stage — keep it moving.'],
            mistakes: ['Under-cooking the garlic leaves a sharp, raw edge through the whole dish.'],
          }),
        step('Add the ground spices',
          `Lower the heat and add the ground spices with a splash of water so they cannot scorch. Fry for 40–60 seconds — the water evaporates and the spices toast in the fat rather than burning.`,
          {
            min: 2, temp: '130–140°C', flame: 'Low',
            tips: ['That splash of water is the safety net every experienced cook uses here.'],
            mistakes: ['Burnt ground spice is irreversibly bitter — if it happens, start the base again.'],
          }),
        step('Cook out the tomato (bhuna)',
          `Pour in the tomato purée and cook it down until it darkens and the fat visibly separates at the edges — 8–12 minutes. This stage is what separates a flat curry from a deep one.`,
          {
            min: 11, temp: '140–150°C', flame: 'Medium-low',
            tips: ['Look for oil pooling at the sides of the pan. That is the signal, not the clock.'],
            mistakes: ['Moving on while the masala is still watery and raw-tasting — the most common curry mistake there is.'],
          }),
        step(`Add the ${proteinName(c)}`,
          c.protein && (c.protein.category === 'meat' || c.protein.category === 'seafood')
            ? `Add the ${proteinName(c)} and turn it in the masala until every piece is coated and sealed, 4–5 minutes. Coating before liquid means flavour on the surface, not just around it.`
            : `Add the ${proteinName(c)} and turn gently in the masala for 3–4 minutes so every piece is coated.`,
          {
            min: 5, temp: '160°C', flame: 'Medium',
            tips: ['Give it space. A crowded pan steams instead of searing.'],
            mistakes: ['Stirring paneer or fish too hard — they break up and cloud the gravy.'],
          }),
        step('Simmer to finish',
          `Add hot water to reach the consistency you like, bring to a gentle simmer, cover and cook${c.protein && c.protein.category === 'meat' ? ' for 20–25 minutes until the meat is fork-tender' : ' for 8–12 minutes'}. ${c.appliance === 'pressure-cooker' ? 'In a pressure cooker this is 2–3 whistles, then let the pressure drop naturally.' : 'Stir once or twice so nothing catches on the base.'}`,
          {
            min: c.protein && c.protein.category === 'meat' ? 24 : 12,
            temp: '95–100°C', flame: 'Low',
            tips: ['Hot water, not cold — cold water tightens meat and stalls the simmer.'],
            mistakes: ['A hard boil breaks dairy-based gravies and toughens the protein.'],
          }),
        step('Season, rest and finish',
          `Taste and correct the salt and acid. ${c.style === 'healthy' ? 'Skip the cream and finish with a spoon of yogurt off the heat instead.' : 'Stir through the cream or butter off the heat.'} Scatter the ${(AFR.data.ingredients.byId[c.cuisine.finishers[0]] || { name: 'fresh herbs' }).name.toLowerCase()} over the top and rest, covered, for 5 minutes before serving.`,
          {
            min: 6, temp: 'Off heat', flame: 'Off',
            tips: ['Resting lets the gravy thicken slightly and the flavours settle — genuinely worth the five minutes.'],
            mistakes: ['Adding delicate herbs or garam masala while the pan is still on the flame — you cook the aroma straight off.'],
          }),
      ],
    },

    /* --------------------------------------------------------- rice dish */
    riceDish: {
      id: 'riceDish', name: 'Layered / cooked rice dish', kind: 'main', icon: 'fa-bowl-rice',
      match: ['biryani', 'pulao', 'pilaf', 'fried rice', 'risotto', 'paella', 'jollof', 'bibimbap',
        'khichdi', 'jambalaya', 'congee', 'donburi', 'rice bowl', 'kedgeree', 'arroz'],
      times: () => ({ prep: 25, cook: 35 }),

      ingredients: (c) => [
        ing('rice', 0.4, 'cups', 'The staple — soaked and part-cooked so every grain stays separate'),
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 130 : 70,
          'Marinated and layered through the rice'),
        byWeight(c.base, 110, 'The named vegetable, layered through the rice'),
        ing(fatOf(c), 0.75, 'tbsp', 'Coats the grains and stops them clumping'),
        ing('onion', 0.8, 'pieces', 'Half for the base, half fried crisp for layering'),
        ing('garlic', 1.5, 'cloves', 'Aromatic base'),
        ing('ginger', 0.2, 'inch', 'Aromatic base'),
        c.heat.level > 0 && ing('green-chilli', 0.45, 'pieces', 'Heat through the layers'),
        ...c.cuisine.wholeSpices.slice(0, 3).map((id) => ing(id, 0.35, null, 'Perfumes the cooking water')),
        ...c.cuisine.groundSpices.slice(0, 2).map((id) => ing(id, 0.3, null, 'Colour and warmth in the marinade')),
        ing('yogurt', 0.15, 'cups', 'Tenderises the protein and keeps the layers moist'),
        ing('salt', 0.35, 'tsp', 'Season the water generously — this is the only chance to season the rice'),
        ing('water', 0.9, 'cups', 'Cooking liquid'),
        ing(c.cuisine.finishers[0], 0.5, 'tbsp', 'Fresh green finish between the layers'),
        c.cuisine.id === 'indian' && ing('saffron', 0.15, 'pinch', 'Bloomed in warm milk for aroma and golden streaks'),
      ].filter(Boolean),

      prep: (c) => [
        step('Rinse and soak the rice',
          `Rinse the rice until the water runs clear — that removes the loose surface starch that makes rice gluey. Soak for 20–30 minutes, then drain completely.`,
          { min: 25, tips: ['Soaked grains cook faster and elongate instead of breaking.'],
            mistakes: ['Skipping the rinse is the single most common cause of sticky, clumped rice.'] }),
        c.protein && step('Marinate the protein',
          `Mix the ${proteinName(c)} with yogurt, the ground spices, salt and half the ginger-garlic. Rest for at least 30 minutes${c.protein.category === 'meat' ? ' — overnight in the fridge is genuinely better' : ''}.`,
          { min: 30, tips: ['Yogurt is doing chemistry here, not just flavour: its acid tenderises.'] }),
        step('Fry the crisp onions (birista)',
          `Slice half the onion paper-thin and fry slowly in ${fatName(c)} until evenly deep golden. Drain on paper. These go between the layers and are most of the sweetness in the finished dish.`,
          { min: 12, tips: ['Pull them out just before they look done — they darken as they cool.'],
            mistakes: ['Crowding the pan steams them limp instead of crisping them.'] }),
      ].filter(Boolean),

      cook: (c) => [
        step('Par-boil the rice',
          `Bring a large pot of well-salted water to a rolling boil with the whole spices. Add the drained rice and cook for just 5–6 minutes — the grain should still snap in the middle. Drain immediately.`,
          { min: 7, temp: '100°C', flame: 'High',
            tips: ['70% cooked is the target. It finishes in the steam.'],
            mistakes: ['Fully cooking the rice here guarantees mush after the layering stage.'] }),
        step('Cook the base',
          `In a heavy-bottomed pot, cook the remaining onion in ${fatName(c)} until golden, add the ginger-garlic and chilli, then the marinated ${proteinName(c)}. Cook until the fat separates and the mixture is thick, not watery.`,
          { min: 14, temp: '160°C', flame: 'Medium',
            tips: ['A thick base is essential — excess liquid pools at the bottom and turns the rice to porridge.'],
            mistakes: ['A wet masala is the reason home biryani so often has a soggy bottom layer.'] }),
        step('Layer it up',
          `Spread the base flat. Layer the drained rice over it, then scatter the fried onions, herbs${c.cuisine.id === 'indian' ? ', saffron milk' : ''} and a drizzle of ${fatName(c)}. Repeat if you have enough for two layers. Do not stir.`,
          { min: 5, temp: '—', flame: 'Off',
            tips: ['Layering, not mixing, is what gives you distinct pockets of flavour in every spoonful.'] }),
        step('Seal and steam (dum)',
          `Cover tightly — foil under the lid, or a dough seal if you want to be traditional. Cook on the lowest possible heat for 20–25 minutes. ${c.appliance === 'oven' || c.appliance === 'otg' ? 'In an oven, 180°C for 25 minutes does the same job more evenly.' : 'A flat tawa under the pot protects the base from direct flame.'}`,
          { min: 24, temp: '110–120°C (180°C in oven)', flame: 'Lowest',
            tips: ['Trapped steam is the entire cooking mechanism here. Every peek costs you.'],
            mistakes: ['Lifting the lid to check — you lose the steam that is doing the work.'] }),
        step('Rest, then fold',
          `Take it off the heat and let it stand, sealed, for 10 minutes. Then open and fold gently from the edges inward with a flat spoon, bringing the base up through the rice.`,
          { min: 10, temp: 'Off heat', flame: 'Off',
            tips: ['Fold, never stir — a spoon dragged through hot rice breaks every grain it touches.'] }),
      ],
    },

    /* --------------------------------------------------------- stir-fry */
    stirFry: {
      id: 'stirFry', name: 'High-heat stir-fry', kind: 'main', icon: 'fa-fire-burner',
      match: ['stir fry', 'stir-fry', 'chow mein', 'hakka', 'manchurian', 'kung pao', 'szechuan',
        'sichuan', 'pad thai', 'pad see ew', 'teriyaki', 'sweet and sour', 'chilli chicken', 'bulgogi',
        'japchae', 'lo mein', 'noodles', 'schezwan', 'stirfry'],
      times: () => ({ prep: 20, cook: 12 }),

      ingredients: (c) => [
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 120 : 70, 'Velveted and seared fast'),
        byWeight(c.base, 100, 'The vegetable body — cut for fast, even cooking'),
        ing('bell-pepper', 0.4, 'pieces', 'Crunch and colour'),
        ing('spring-onion', 1.2, 'stalks', 'Whites in early, greens at the very end'),
        ing('garlic', 2, 'cloves', 'Aromatic hit in the first ten seconds'),
        ing('ginger', 0.25, 'inch', 'Aromatic hit in the first ten seconds'),
        ing(fatOf(c), 0.7, 'tbsp', 'High-smoke-point fat for the sear'),
        ing('soy-sauce', 0.7, 'tbsp', 'Salt, colour and umami'),
        ing('vinegar', 0.3, 'tbsp', 'Cuts the richness and lifts the sauce'),
        c.heat.level > 0 && ing('chilli-sauce', 0.5, 'tbsp', 'Heat and tang'),
        ing('cornflour', 0.4, 'tbsp', 'Velvets the protein and thickens the sauce to a glossy coat'),
        c.sweet.factor > 0.2 && ing('sugar', 0.3, 'tsp', 'Balances the salt and acid'),
        ing('sesame-oil', 0.2, 'tsp', 'Finishing aroma — never a cooking fat'),
      ].filter(Boolean),

      prep: (c) => [
        step('Cut everything first',
          `Slice the ${proteinName(c)} thinly against the grain and cut the vegetables to a matching size. A stir-fry gives you no time to chop mid-cook — everything must be in bowls beside the stove before the pan gets hot.`,
          { min: 12, tips: ['Uniform size is what makes everything finish at the same moment.'],
            mistakes: ['Prepping as you go — the first ingredient overcooks while you chop the second.'] }),
        c.protein && step('Velvet the protein',
          `Toss the ${proteinName(c)} with cornflour, a splash of soy and a teaspoon of oil. Rest 15 minutes. This is velveting: the starch shields the surface so it stays tender under brutal heat.`,
          { min: 15, tips: ['This one restaurant trick is the difference between silky and rubbery.'] }),
        step('Mix the sauce',
          `Whisk the soy, vinegar${c.sweet.factor > 0.2 ? ', sugar' : ''}${c.heat.level > 0 ? ', chilli sauce' : ''} and the remaining cornflour with 3 tbsp water. Having it premixed means one clean pour instead of six panicked ones.`,
          { min: 4, tips: ['Taste the sauce cold — it should be slightly too strong, since it will coat and dilute.'] }),
      ].filter(Boolean),

      cook: (c) => [
        step('Get the pan properly hot',
          `Heat the wok or widest pan you own until a drop of water vanishes on contact. Add ${fatName(c)} and swirl to coat. ${c.appliance === 'induction' ? 'On induction, preheat for a full 2 minutes — it heats the base only, so give it time.' : 'You want the oil just short of smoking.'}`,
          { min: 3, temp: '200–230°C', flame: 'High',
            tips: ['Almost every disappointing home stir-fry is an under-heated pan.'],
            mistakes: ['Adding food to a lukewarm pan — it releases water and boils instead of searing.'] }),
        c.protein ? step(`Sear the ${proteinName(c)}`,
          `Add the ${proteinName(c)} in a single layer and leave it completely alone for 60 seconds to take colour. Then toss for another minute and remove it to a plate — it goes back in at the end.`,
          { min: 3, temp: '210°C', flame: 'High',
            tips: ['Cook in two batches if the pan looks crowded. Two fast batches beat one steamed one.'],
            mistakes: ['Constant stirring at this stage prevents any browning at all.'] }) : null,
        step('Aromatics, ten seconds',
          `Add the garlic, ginger and spring onion whites. Ten to fifteen seconds is all they need — you are after aroma, not colour.`,
          { min: 1, temp: '200°C', flame: 'High',
            mistakes: ['Burnt garlic at high heat turns the entire dish acrid; it happens in under 30 seconds.'] }),
        step('Vegetables, hardest first',
          `Add the vegetables in order of density — carrot and beans before peppers, leaves last. Keep everything moving. 2–3 minutes total; they should stay bright and audibly crisp.`,
          { min: 3, temp: '200°C', flame: 'High',
            tips: ['If the pan cools and liquid appears, raise the heat and let it boil off.'],
            mistakes: ['Cooking every vegetable for the same length of time — the delicate ones collapse.'] }),
        step('Sauce and finish',
          `Return the ${proteinName(c)}, stir the sauce (the starch settles) and pour it around the hot edge of the pan. It will thicken and turn glossy in under a minute. Kill the heat, fold in the spring onion greens and the sesame oil.`,
          { min: 2, temp: '200°C', flame: 'High → off',
            tips: ['Sauce down the side of the pan, not into the middle: it hits hot metal and thickens instantly.'],
            mistakes: ['Adding sesame oil while cooking — its aroma is delicate and burns off immediately.'] }),
      ].filter(Boolean),
    },

    /* ------------------------------------------------------------- baked */
    baked: {
      id: 'baked', name: 'Oven-baked', kind: 'main', icon: 'fa-fire',
      match: ['pizza', 'lasagna', 'lasagne', 'casserole', 'gratin', 'bake', 'baked', 'quiche',
        'bread', 'focaccia', 'pie', 'roast', 'moussaka', 'shepherd', 'calzone', 'enchilada', 'strata'],
      times: () => ({ prep: 30, cook: 40 }),

      ingredients: (c) => [
        ing(c.base && c.base.category === 'grains' ? c.base.id : 'all-purpose-flour', 0.5, 'cups',
          'The structural base — dough, pasta or starch layer'),
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 110 : 60, 'The filling'),
        c.base && c.base.category === 'vegetables' && byWeight(c.base, 90, 'Vegetable through the filling'),
        ing('tomato', 1.2, 'pieces', 'The sauce layer'),
        ing('onion', 0.5, 'pieces', 'Sweet base for the sauce'),
        ing('garlic', 1.5, 'cloves', 'Aromatic depth'),
        ing('cheese', 35, 'grams', 'Melt, browning and the savoury top'),
        ing(fatOf(c), 0.6, 'tbsp', 'Stops sticking and helps the top colour'),
        ...c.cuisine.groundSpices.slice(0, 2).map((id) => ing(id, 0.3, null, 'Seasons the sauce')),
        ing('salt', 0.28, 'tsp', 'Season each layer, not just the top'),
        ing(c.cuisine.finishers[0], 0.4, 'tbsp', 'Fresh finish after baking'),
      ].filter(Boolean),

      prep: (c) => [
        step('Preheat properly',
          `Set the oven to ${c.dish.toLowerCase().includes('pizza') ? '250°C (or the highest it goes) with a stone or upturned tray inside' : '190°C'} and give it a full 20 minutes. Ovens lie — they announce temperature long before the walls are actually hot.`,
          { min: 20, tips: ['An oven thermometer costs very little and fixes years of inconsistent baking.'],
            mistakes: ['Putting food into an oven that has only just beeped.'] }),
        step('Make the sauce',
          `Cook the onion and garlic in ${fatName(c)} until soft, add the tomato and spices, and simmer 12–15 minutes until thick enough to hold a line when you drag a spoon through it.`,
          { min: 15, tips: ['A watery sauce makes a soggy bake. Reduce it further than feels necessary.'],
            mistakes: ['Using raw tomato straight into the layers — it releases water in the oven.'] }),
        step('Prepare the components',
          `Par-cook the ${c.base ? c.base.name.toLowerCase() : 'base'} if it needs it, grate the cheese, and season each element separately. ${c.protein ? `Brown the ${proteinName(c)} first — it will not colour under a layer of sauce.` : ''}`,
          { min: 15, tips: ['Grate cheese yourself; pre-grated is coated in starch and melts poorly.'] }),
      ],

      cook: (c) => [
        step('Assemble the layers',
          `Start with a thin smear of sauce (it stops sticking), then alternate base, filling and sauce, finishing with sauce and then cheese. Press each layer down gently to remove air pockets.`,
          { min: 12, temp: '—', flame: 'Off',
            tips: ['Sauce on top, cheese above it — cheese directly on a dry layer scorches.'],
            mistakes: ['Overfilling the dish; it bubbles over and burns onto the oven floor.'] }),
        step('Bake covered',
          `Cover with foil and bake at 190°C for 25 minutes. The foil traps steam so the inside cooks through before the top starts to colour.`,
          { min: 25, temp: '190°C', flame: 'Oven — middle shelf',
            tips: ['Tent the foil so it does not touch the cheese and tear it off later.'] }),
        step('Uncover and brown',
          `Remove the foil, raise to 210°C and bake another 12–15 minutes until the top is blistered and deep golden with the sauce bubbling at the edges.`,
          { min: 15, temp: '210°C', flame: 'Oven — upper shelf',
            tips: ['The last 2 minutes under the grill gives you those dark blistered spots.'],
            mistakes: ['Walking away during the grill stage — it goes from golden to black in about 90 seconds.'] }),
        step('Rest before cutting',
          `Rest for 10–15 minutes out of the oven. ${c.dish.toLowerCase().includes('lasagna') || c.dish.toLowerCase().includes('lasagne') ? 'A lasagna cut straight from the oven slides apart on the plate.' : 'Resting lets everything set so it holds its shape.'}`,
          { min: 12, temp: 'Room temperature', flame: 'Off',
            tips: ['Resting is part of the cooking, not a delay to it.'] }),
      ],
    },

    /* ------------------------------------------------------- grill/roast */
    grilled: {
      id: 'grilled', name: 'Grilled / roasted', kind: 'main', icon: 'fa-fire-flame-curved',
      match: ['tandoori', 'tikka', 'kebab', 'kabab', 'grill', 'grilled', 'bbq', 'barbecue', 'roast',
        'roasted', 'skewer', 'satay', 'shawarma', 'souvlaki', 'yakitori', 'steak', 'seekh', 'shashlik'],
      times: () => ({ prep: 25, cook: 22 }),

      ingredients: (c) => [
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 160 : 90, 'The star — marinated, then cooked hard and fast'),
        byWeight(c.base, c.protein ? 100 : 170, c.protein ? 'Charred alongside' : 'The vegetable centrepiece'),
        ing('yogurt', 0.18, 'cups', 'Marinade base — its acid tenderises and its protein helps the char'),
        ing('garlic', 2, 'cloves', 'Marinade depth'),
        ing('ginger', 0.25, 'inch', 'Marinade depth'),
        ing('lemon', 0.3, 'pieces', 'Acid in the marinade and a squeeze at the table'),
        ...c.cuisine.groundSpices.slice(0, 3).map((id) => ing(id, 0.35, null, 'The spice crust')),
        ing(fatOf(c), 0.5, 'tbsp', 'Keeps the surface from drying out under high heat'),
        ing('salt', 0.3, 'tsp', 'Seasons through the marinade'),
        ing('onion', 0.4, 'pieces', 'Charred alongside and served with it'),
        ing(c.cuisine.finishers[0], 0.4, 'tbsp', 'Fresh finish'),
      ].filter(Boolean),

      prep: (c) => [
        step('Build the marinade',
          `Whisk the yogurt with garlic, ginger, lemon, spices, salt and oil. Thick, not runny — it should cling to a spoon. A thin marinade slides off and burns in the pan instead of on the food.`,
          { min: 8, tips: ['Hang the yogurt in a cloth for 20 minutes if it looks watery.'] }),
        step('Score and marinate',
          `Make shallow cuts in the ${proteinName(c)} so the marinade reaches inside, then coat thoroughly. Rest at least 2 hours; ${c.protein && c.protein.category === 'meat' ? 'overnight is meaningfully better' : '1 hour is enough for vegetables and paneer'}.`,
          { min: 20, tips: ['Bring it back to room temperature 20 minutes before cooking — fridge-cold food cooks unevenly.'],
            mistakes: ['Marinating dairy-based mixes for more than 24 hours turns the surface mushy.'] }),
        step('Prepare the heat source',
          `${c.appliance === 'air-fryer' ? 'Preheat the air fryer to 200°C for 5 minutes.' : c.appliance === 'oven' || c.appliance === 'otg' ? 'Preheat the oven to 220°C with the grill element on and the rack in the upper third.' : 'Get a heavy grill pan smoking hot, or the coals to a white ash.'} High, dry heat is the entire point — anything less and you steam instead of char.`,
          { min: 8, tips: ['Oil the grate, not the food, to stop sticking.'] }),
      ].filter(Boolean),

      cook: (c) => [
        step('First contact — do not move it',
          `Lay the pieces down with space between them and leave them completely alone for 4–5 minutes. The crust releases itself when it is ready; if it sticks, it is not done.`,
          { min: 5, temp: '220–240°C', flame: 'High',
            tips: ['Space between pieces is what lets moisture escape instead of pooling.'],
            mistakes: ['Prodding and flipping early tears the crust off and leaves it in the pan.'] }),
        step('Turn and baste',
          `Turn once, brush with the leftover marinade and a little ${fatName(c)}, and cook the second side 4–5 minutes. Baste again as it goes.`,
          { min: 6, temp: '220°C', flame: 'High',
            tips: ['Basting builds layers of glaze — three thin coats beat one thick one.'],
            mistakes: ['Basting with raw meat marinade at the very end; boil it first or discard it.'] }),
        step('Finish and char',
          `Move to a hotter spot (or switch the grill element on) for a final 2–3 minutes to get the blistered edges. ${c.protein && c.protein.category === 'meat' ? `Check the internal temperature: ${c.protein.id === 'chicken' || c.protein.id === 'chicken-thigh' ? '74°C for poultry' : '71°C for minced meat, 63°C for whole cuts'}.` : 'The vegetables should be blackened in patches and yielding in the centre.'}`,
          { min: 4, temp: '240°C+', flame: 'High',
            tips: ['A £5 probe thermometer removes all guesswork here and is the single best cooking purchase you can make.'],
            mistakes: ['Judging doneness by colour — a dark crust can sit on an undercooked centre.'] }),
        step('Rest, then finish',
          `Rest for 5 minutes so the juices redistribute — cutting straight away pours them onto the board. Finish with lemon, ${(AFR.data.ingredients.byId[c.cuisine.finishers[0]] || { name: 'herbs' }).name.toLowerCase()} and the charred onion.`,
          { min: 6, temp: 'Room temperature', flame: 'Off',
            tips: ['Rest uncovered or loosely tented — sealed foil steams the crust you just built.'] }),
      ],
    },

    /* -------------------------------------------------------------- fried */
    fried: {
      id: 'fried', name: 'Fried / crisp snack', kind: 'snack', icon: 'fa-drumstick-bite',
      match: ['fried', 'fry', 'pakora', 'bhaji', 'samosa', 'tempura', 'fritter', 'cutlet', 'nugget',
        'katsu', 'croquette', 'spring roll', 'crispy', 'chips', 'fries', 'vada', 'donut', 'doughnut',
        'churro', 'wings', 'popcorn chicken'],
      times: () => ({ prep: 20, cook: 18 }),

      ingredients: (c) => [
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 110 : 70, 'The filling or the piece being coated'),
        byWeight(c.base, 90, 'Body of the fritter or filling'),
        ing('all-purpose-flour', 0.3, 'cups', 'The coating that crisps'),
        ing('cornflour', 0.6, 'tbsp', 'Mixed into the coating — this is what keeps it crisp as it cools'),
        ing('oil', 1.2, 'tbsp', 'For frying (most is not absorbed and can be strained and reused)'),
        ...c.cuisine.groundSpices.slice(0, 2).map((id) => ing(id, 0.3, null, 'Seasons the coating')),
        c.heat.level > 0 && ing('red-chilli-powder', 0.35, 'tsp', 'Heat in the crust'),
        ing('salt', 0.28, 'tsp', 'Season the coating AND the food underneath it'),
        ing('water', 0.2, 'cups', 'Batter consistency'),
      ].filter(Boolean),

      prep: (c) => [
        step('Prepare the pieces',
          `Cut everything to an even size — around 3 cm. Uneven pieces mean some are raw while others are burnt, and there is no fixing that after the fact.`,
          { min: 10, tips: ['Pat everything dry. Surface water is what makes hot oil spit violently.'] }),
        step('Mix the batter or coating',
          `Combine the flour, cornflour, spices and salt. Add cold water gradually to a coating consistency — thick enough to cling, thin enough to drip in a steady ribbon. ${c.style === 'restaurant' ? 'Ice-cold sparkling water gives a noticeably lighter, more brittle crust.' : ''}`,
          { min: 6, tips: ['Cold batter into hot oil is the whole secret to a light crust — the temperature shock creates steam pockets.'],
            mistakes: ['Over-mixing develops gluten and gives you a bready, heavy coating.'] }),
        step('Heat the oil to temperature',
          `Bring the oil to 175–180°C. ${c.appliance === 'air-fryer' ? 'For an air fryer: brush the pieces with oil instead and preheat to 200°C.' : 'No thermometer? A drop of batter should sink then rise and sizzle within 2 seconds.'}`,
          { min: 8, temp: '175–180°C',
            tips: ['Oil temperature is the whole game. Too cool and it drinks oil; too hot and it burns raw.'],
            mistakes: ['Guessing the temperature is the number one cause of greasy fried food.'] }),
      ].filter(Boolean),

      cook: (c) => [
        step('Fry in small batches',
          `Slide pieces in away from you, a few at a time. Never fill more than half the surface — every piece you add drops the oil temperature, and a crowded pan means soggy results.`,
          { min: 6, temp: '175°C', flame: 'Medium-high',
            tips: ['Let the oil come back up to temperature between batches.'],
            mistakes: ['Crowding the pan — the single most common frying mistake.'] }),
        step('Fry to a deep golden',
          `Fry 3–4 minutes, turning once, until deep golden and audibly crisp. ${c.protein && c.protein.category === 'meat' ? 'For meat, check that the centre has reached 74°C — coating colour tells you nothing about the inside.' : ''}`,
          { min: 5, temp: '175°C', flame: 'Medium-high',
            tips: ['Listen to the pan: a loud, sharp sizzle means water is still escaping. Quieter means nearly done.'],
            mistakes: ['Pulling them out pale — they will go limp within a minute.'] }),
        step('Double-fry for real crunch',
          `Rest the pieces 5 minutes, raise the oil to 190°C, and fry again for 60–90 seconds. This second pass drives off surface moisture and is why restaurant fried food stays crisp on the plate.`,
          { min: 4, temp: '190°C', flame: 'High',
            tips: ['This step is optional for taste, essential for texture.'] }),
        step('Drain and season immediately',
          `Drain on a wire rack, never on paper — paper traps steam and softens the base. Season with salt the moment they come out, while the surface is still hot enough to hold it.`,
          { min: 2, temp: '—', flame: 'Off',
            tips: ['Salt sticks to hot oil-slicked surfaces and slides off cooled ones.'],
            mistakes: ['Stacking fried pieces — the trapped steam undoes all your work.'] }),
      ],
    },

    /* --------------------------------------------------------------- soup */
    soup: {
      id: 'soup', name: 'Soup / broth', kind: 'soup', icon: 'fa-mug-hot',
      match: ['soup', 'broth', 'pho', 'ramen', 'tom yum', 'tom kha', 'chowder', 'bisque', 'rasam',
        'minestrone', 'gazpacho', 'consomme', 'stock', 'shorba', 'miso soup', 'sundubu'],
      times: () => ({ prep: 15, cook: 30 }),

      ingredients: (c) => [
        ing('stock', 1.1, 'cups', 'The body of the soup — everything else is seasoning'),
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 80 : 50, 'Protein and depth'),
        byWeight(c.base, 90, 'The main vegetable'),
        ing('onion', 0.5, 'pieces', 'Sweet aromatic base'),
        ing('garlic', 1.5, 'cloves', 'Aromatic base'),
        ing('carrot', 0.5, 'pieces', 'Sweetness and body'),
        ing(fatOf(c), 0.4, 'tbsp', 'For sweating the aromatics'),
        ...c.cuisine.wholeSpices.slice(0, 2).map((id) => ing(id, 0.25, null, 'Infuses the broth')),
        ing('salt', 0.3, 'tsp', 'Season at the end — the broth reduces and concentrates'),
        ing('black-pepper', 0.2, 'tsp', 'Warmth'),
        ing(c.cuisine.acids[0], 0.3, c.cuisine.acids[0] === 'lemon' || c.cuisine.acids[0] === 'lime' ? 'pieces' : 'tbsp',
          'Acid at the end — this is what makes a soup taste finished rather than flat'),
        ing(c.cuisine.finishers[0], 0.4, 'tbsp', 'Fresh garnish'),
      ].filter(Boolean),

      prep: () => [
        step('Chop for the spoon',
          `Cut everything to roughly the size that fits comfortably on a spoon. A soup with awkward chunks is unpleasant to eat no matter how good it tastes.`,
          { min: 10, tips: ['Keep the vegetable trimmings — they can go into the stock and come out before serving.'] }),
        step('Warm the stock',
          `Heat the stock separately and keep it warm. Adding cold liquid to a hot pan stalls the cooking and dulls the flavours you just built.`,
          { min: 5, tips: ['Homemade stock transforms a soup more than any other single change.'] }),
      ],

      cook: (c) => [
        step('Sweat the aromatics',
          `Cook the onion, garlic and carrot gently in ${fatName(c)} with a pinch of salt for 8 minutes — soft and translucent, no colour. You want sweetness here, not caramelisation.`,
          { min: 8, temp: '120–130°C', flame: 'Low',
            tips: ['A lid helps them sweat rather than fry.'],
            mistakes: ['Browning the base gives a heavier, less clean-tasting soup than most recipes want.'] }),
        step('Toast the spices',
          `Add the whole spices and stir for 30 seconds until fragrant. This is a short window — bloom them in the fat before any liquid arrives.`,
          { min: 1, temp: '140°C', flame: 'Medium-low',
            mistakes: ['Adding spices after the stock — they never fully release their flavour into water alone.'] }),
        step('Add liquid and simmer',
          `Pour in the warm stock, bring to a bare simmer${c.protein ? ` and add the ${proteinName(c)}` : ''}. Cook uncovered for 20–25 minutes. Never let it boil — a boil clouds the broth and toughens the protein.`,
          { min: 24, temp: '85–95°C', flame: 'Low',
            tips: ['Skim the foam in the first five minutes for a clear, clean-tasting broth.'],
            mistakes: ['A rolling boil is the most common reason home broths turn cloudy and greasy.'] }),
        step('Season and brighten',
          `Take it off the heat. Season with salt and pepper, then add the acid — lemon, lime or vinegar. Taste again. ${c.style === 'restaurant' ? 'A knob of cold butter whisked in gives it body and shine.' : ''}`,
          { min: 4, temp: 'Off heat', flame: 'Off',
            tips: ['If a soup tastes flat, it almost always needs acid, not more salt.'],
            mistakes: ['Salting early and heavily; the soup concentrates as it reduces and ends up inedible.'] }),
      ],
    },

    /* -------------------------------------------------------------- salad */
    salad: {
      id: 'salad', name: 'Fresh salad / cold assembly', kind: 'salad', icon: 'fa-leaf',
      match: ['salad', 'slaw', 'coleslaw', 'tabbouleh', 'som tam', 'kachumber', 'caprese', 'raita',
        'sunomono', 'ceviche', 'poke', 'chaat', 'fattoush', 'bowl'],
      times: () => ({ prep: 20, cook: 5 }),

      ingredients: (c) => [
        byWeight(c.base, 110, 'The bulk of the salad'),
        ing('cucumber', 0.4, 'pieces', 'Cooling crunch'),
        ing('tomato', 0.8, 'pieces', 'Juice and acidity'),
        ing('onion', 0.3, 'pieces', 'Sharpness — soaked in cold water to take the harsh edge off'),
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 80 : 50, 'Protein that makes it a meal'),
        ing(c.cuisine.fats.includes('olive-oil') ? 'olive-oil' : fatOf(c), 0.5, 'tbsp', 'The dressing base'),
        ing(c.cuisine.acids[0] === 'yogurt' ? 'lemon' : c.cuisine.acids[0], 0.4,
          ['lemon', 'lime', 'tomato'].includes(c.cuisine.acids[0]) ? 'pieces' : 'tbsp', 'The acid in the dressing'),
        ing('salt', 0.2, 'tsp', 'Added at the last moment so the vegetables stay crisp'),
        ing('black-pepper', 0.15, 'tsp', 'Sharpness'),
        ing(c.cuisine.finishers[0], 0.6, 'tbsp', 'Fresh herbs — used generously, as an ingredient not a garnish'),
        c.style !== 'healthy' && ing(c.cuisine.id === 'mediterranean' ? 'cheese' : 'peanut', 12, 'grams', 'Texture and richness'),
      ].filter(Boolean),

      prep: (c) => [
        step('Wash and dry thoroughly',
          `Wash the leaves and vegetables in cold water, then dry them completely — a salad spinner or a clean cloth. Dressing slides straight off wet leaves and pools at the bottom of the bowl.`,
          { min: 8, tips: ['Dry leaves are the difference between a dressed salad and a soggy one.'],
            mistakes: ['Dressing wet leaves — you get a watery puddle and bland greens.'] }),
        step('Cut with intent',
          `Slice the vegetables so each forkful gets a bit of everything. Soak the sliced onion in cold water for 10 minutes to soften its bite.`,
          { min: 8, tips: ['Cut soft ingredients last so their juice does not soak everything else in the meantime.'] }),
        step('Whisk the dressing',
          `Whisk the ${c.cuisine.fats.includes('olive-oil') ? 'olive oil' : 'oil'} into the acid in a 3:1 ratio with salt and pepper until it thickens slightly. Taste it on a leaf, not a spoon — it should be a touch sharper than you think.`,
          { min: 4, tips: ['Emulsify by adding oil slowly while whisking; it clings much better.'] }),
      ],

      cook: (c) => [
        c.protein ? step(`Cook and cool the ${proteinName(c)}`,
          `Season and cook the ${proteinName(c)} until just done, then let it cool to room temperature before it meets the leaves. Hot protein wilts everything it touches.`,
          { min: 10, temp: '180°C', flame: 'Medium-high',
            tips: ['Slice it after resting so it stays juicy.'] }) : null,
        step('Toast the texture element',
          `Toast the nuts or seeds in a dry pan for 2–3 minutes until they smell nutty. Cool them completely — warm nuts go soft in a dressed salad.`,
          { min: 4, temp: '150°C', flame: 'Medium-low',
            mistakes: ['Toasting nuts at high heat: the outside burns while the inside stays raw.'] }),
        step('Dress at the last moment',
          `Combine everything in a wide bowl and add the dressing only when you are ready to serve. Toss with your hands, from underneath — a spoon bruises leaves.`,
          { min: 3, temp: 'Cold', flame: 'Off',
            tips: ['Dress less than you think, taste, then add more. You cannot un-dress a salad.'],
            mistakes: ['Dressing early — 10 minutes is enough to wilt the whole bowl.'] }),
        step('Season and serve immediately',
          `Add salt and pepper at the very end, scatter the herbs and the toasted element over the top, and take it to the table straight away.`,
          { min: 2, temp: 'Cold', flame: 'Off',
            tips: ['Salt draws water out of vegetables within minutes — this is why it goes last.'] }),
      ].filter(Boolean),
    },

    /* ------------------------------------------------------------ dessert */
    dessert: {
      id: 'dessert', name: 'Dessert', kind: 'dessert', icon: 'fa-cake-candles',
      match: ['cake', 'dessert', 'pudding', 'halwa', 'kheer', 'brownie', 'cookie', 'biscuit', 'pie',
        'tart', 'ice cream', 'kulfi', 'mousse', 'cheesecake', 'tiramisu', 'baklava', 'gulab jamun',
        'jalebi', 'ladoo', 'barfi', 'custard', 'creme brulee', 'crème brûlée', 'panna cotta', 'macaron',
        'pancake', 'waffle', 'muffin', 'sweet', 'payasam', 'flan', 'churro'],
      times: () => ({ prep: 25, cook: 30 }),

      ingredients: (c) => [
        ing(c.base && ['grains', 'dairy', 'nuts'].includes(c.base.category) ? c.base.id : 'all-purpose-flour',
          0.35, 'cups', 'The structural base'),
        ing(c.sweet.factor <= 0.35 ? 'dates' : 'sugar', c.sweet.factor <= 0.35 ? 2 : 2.2,
          c.sweet.factor <= 0.35 ? 'pieces' : 'tbsp', 'Sweetness — scaled to your preference'),
        ing('milk', 0.3, 'cups', 'Moisture and tenderness'),
        ing(c.cuisine.fats.includes('butter') ? 'butter' : 'ghee', 0.8, 'tbsp', 'Richness and a tender crumb'),
        ing('cardamom', 0.6, 'pods', 'Aroma'),
        c.base && c.base.category === 'nuts' ? null : ing('cashew', 4, 'pieces', 'Crunch and garnish'),
        ing('baking-powder', 0.2, 'tsp', 'Lift'),
        ing('salt', 0.06, 'tsp', 'A pinch — it makes the sweetness taste like more, not less'),
      ].filter(Boolean),

      prep: (c) => [
        step('Bring everything to room temperature',
          `Take the dairy and eggs out 30 minutes ahead. Cold ingredients do not emulsify — this is why batters split and why cakes come out dense.`,
          { min: 30, tips: ['This one habit fixes more baking problems than any other.'],
            mistakes: ['Using fridge-cold butter in a creaming method — it will not aerate.'] }),
        step('Measure precisely',
          `Weigh rather than scoop. Baking is chemistry: a cup of flour can vary by 20% depending on how you fill it, and that is the difference between tender and tough.`,
          { min: 8, tips: ['Scales cost little and remove most baking failures at a stroke.'] }),
        step('Prepare the tin and oven',
          `Grease and line the tin, and preheat to 180°C. ${c.appliance === 'otg' ? 'In an OTG use both rods and place the rack in the middle.' : c.appliance === 'microwave' ? 'For microwave versions, use a microwave-safe dish and cook in short 60-second bursts.' : ''}`,
          { min: 10, tips: ['Line the base with paper even in a non-stick tin — sugar sticks to everything.'] }),
      ],

      cook: (c) => [
        step('Combine wet and dry separately',
          `Whisk the dry ingredients in one bowl and the wet in another, then fold them together in three additions. Stop the moment you no longer see dry flour.`,
          { min: 8, temp: 'Room temperature', flame: 'Off',
            tips: ['A few small lumps are fine and will hydrate in the oven.'],
            mistakes: ['Over-mixing develops gluten — the main cause of tough, rubbery bakes.'] }),
        step('Cook gently',
          `${c.dish.toLowerCase().match(/halwa|kheer|pudding|custard|payasam/) ? 'Cook over low heat, stirring constantly, until it thickens enough to coat the back of a spoon. Constant motion stops it catching and scrambling.' : 'Bake at 180°C for 25–30 minutes. Resist opening the door for the first 20 minutes — the rush of cold air collapses the rise.'}`,
          { min: 28, temp: '180°C (or low on the hob)', flame: 'Low',
            tips: ['Rotate the tin once at the two-thirds mark; almost no oven heats evenly.'],
            mistakes: ['Opening the oven early — the classic cause of a sunken middle.'] }),
        step('Test for doneness',
          `A skewer in the centre should come out with a few moist crumbs, not wet batter and not bone dry. ${c.dish.toLowerCase().includes('brownie') ? 'For brownies, moist crumbs are exactly right — a clean skewer means overbaked.' : ''}`,
          { min: 3, temp: '—', flame: 'Off',
            tips: ['Carryover cooking continues for several minutes after it leaves the oven. Pull it slightly early.'] }),
        step('Cool completely before finishing',
          `Cool in the tin for 10 minutes, then on a rack. Frosting or slicing a warm dessert gives you a melted, crumbling mess.`,
          { min: 20, temp: 'Room temperature', flame: 'Off',
            tips: ['Patience is a technique here, not a virtue.'] }),
      ],
    },

    /* --------------------------------------------------------------- drink */
    drink: {
      id: 'drink', name: 'Drink / beverage', kind: 'drink', icon: 'fa-mug-saucer',
      match: ['smoothie', 'juice', 'lassi', 'shake', 'milkshake', 'tea', 'chai', 'coffee', 'latte',
        'mojito', 'cocktail', 'mocktail', 'lemonade', 'sharbat', 'cooler', 'punch', 'drink', 'beverage',
        'iced tea', 'horchata', 'ayran', 'matcha'],
      times: () => ({ prep: 10, cook: 6 }),

      ingredients: (c) => [
        ing(c.base && ['fruits', 'dairy'].includes(c.base.category) ? c.base.id : 'milk', 0.8,
          c.base && c.base.category === 'fruits' ? 'cups' : 'cups', 'The body of the drink'),
        ing('ice', 0.4, 'cups', 'Chill and dilution'),
        c.sweet.factor > 0.2 && ing(c.sweet.factor < 0.4 ? 'honey' : 'sugar', c.sweet.factor * 2.5,
          c.sweet.factor < 0.4 ? 'tbsp' : 'tsp', 'Sweetness — taste before you add all of it'),
        ing('lemon', 0.25, 'pieces', 'Acidity that makes the flavours pop'),
        ing('mint', 0.5, 'tbsp', 'Aroma — bruised, not shredded'),
        ing('water', 0.5, 'cups', 'Adjusts strength and consistency'),
        c.cuisine.id === 'indian' && ing('cardamom', 0.8, 'pods', 'Warm aromatic note'),
      ].filter(Boolean),

      prep: () => [
        step('Measure everything out',
          `Measure the base, sweetener and citrus into separate glasses before you start. Drinks are built on ratios, and adjusting them by eye mid-pour is how a balanced recipe turns into a sugary one.`,
          { min: 5, tips: ['Write down what you actually used — a drink you like is worth being able to repeat.'] }),
        step('Chill everything first',
          `Put the glasses and the liquid ingredients in the fridge for 20 minutes. Cold ingredients mean less ice melt, which means a drink that stays flavourful instead of turning watery.`,
          { min: 20, tips: ['Chilled glassware is the easiest upgrade to any cold drink.'] }),
        step('Prepare the flavour base',
          `Bruise the mint by pressing it — do not shred it, which releases bitter chlorophyll. Juice the citrus fresh; bottled juice tastes cooked and flat.`,
          { min: 6, tips: ['Roll citrus firmly on the counter before juicing to get noticeably more out of it.'],
            mistakes: ['Muddling mint aggressively makes the whole drink taste grassy and bitter.'] }),
      ],

      cook: (c) => [
        step('Combine and blend',
          `${c.dish.toLowerCase().match(/tea|chai|coffee|latte/) ? 'Bring the water to a boil, add the aromatics and simmer 3–4 minutes, then add the milk and bring it back just to the edge of a boil — never let it fully boil over.' : 'Blend the base with the sweetener and citrus until completely smooth, about 45 seconds.'}`,
          { min: 5, temp: c.dish.toLowerCase().match(/tea|chai|coffee/) ? '90–95°C' : 'Cold', flame: 'Medium',
            tips: ['Blend the solids with a little liquid first, then add the rest — you get a smoother result.'],
            mistakes: ['Boiling milk-based drinks hard: it scalds and gives a distinct burnt-milk taste.'] }),
        step('Taste and adjust',
          `Taste before you strain. Sweetness reads differently when cold, so a drink that tastes right warm will taste under-sweet over ice. Adjust now.`,
          { min: 2, temp: '—', flame: 'Off',
            tips: ['Balance is sweet against acid. If it tastes flat and cloying, add citrus rather than more sugar.'] }),
        step('Strain, pour and garnish',
          `Strain over fresh ice into the chilled glass, filling it. Garnish with mint and a citrus wheel${c.style === 'restaurant' ? ' and run the citrus peel around the rim first for the aroma' : ''}.`,
          { min: 3, temp: 'Cold', flame: 'Off',
            tips: ['Fresh ice, never the ice you blended with — melted ice dilutes as you drink.'] }),
      ],
    },

    /* ------------------------------------------------------------ assembly */
    assembly: {
      id: 'assembly', name: 'Sandwich / wrap / assembled dish', kind: 'main', icon: 'fa-burger',
      match: ['burger', 'sandwich', 'wrap', 'taco', 'burrito', 'roll', 'sub', 'bagel', 'toast',
        'quesadilla', 'banh mi', 'shawarma roll', 'kathi', 'club', 'panini', 'sushi', 'kimbap',
        'onigiri', 'dumpling', 'momo', 'gyoza', 'samosa roll', 'pizza slice'],
      times: () => ({ prep: 25, cook: 15 }),

      ingredients: (c) => [
        ing(c.cuisine.staples.find((s) => ['bread', 'tortilla', 'rice'].includes(s)) || 'bread',
          c.cuisine.staples.includes('rice') ? 0.35 : 2,
          c.cuisine.staples.includes('rice') ? 'cups' : 'slices', 'The wrapper or base'),
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 110 : 70, 'The filling'),
        byWeight(c.base, 70, 'Bulk and texture in the filling'),
        ing('onion', 0.3, 'pieces', 'Sharp crunch'),
        ing('tomato', 0.5, 'pieces', 'Juice and freshness'),
        ing('lettuce', 0.5, 'cups', 'Crunch and a moisture barrier'),
        ing('cheese', 20, 'grams', 'Melt and savoury binding'),
        ing('mayonnaise', 0.7, 'tbsp', 'Creamy binding and a seal against sogginess'),
        ...c.cuisine.groundSpices.slice(0, 2).map((id) => ing(id, 0.25, null, 'Seasons the filling')),
        ing(fatOf(c), 0.4, 'tbsp', 'For toasting and cooking'),
        ing('salt', 0.2, 'tsp', 'Season the filling, not just the surface'),
      ].filter(Boolean),

      prep: (c) => [
        step('Season and prepare the filling',
          `Season the ${proteinName(c)} generously and mix with the spices. Salt it 15 minutes ahead if it is minced — it changes the texture and helps it hold together.`,
          { min: 10, tips: ['Under-seasoned filling is the most common flaw in a home-made burger or wrap.'] }),
        step('Prep the fresh elements',
          `Slice the vegetables thinly and evenly. Keep wet ingredients (tomato) separate until assembly so they do not soak the bread early.`,
          { min: 8, tips: ['Salt the tomato slices and drain them for 10 minutes — much less water in the finished sandwich.'] }),
        step('Mix the sauce',
          `Combine the mayonnaise with a little acid and spice. This layer is both flavour and waterproofing — spread edge to edge on both surfaces.`,
          { min: 4, tips: ['A fat layer against the bread is the classic defence against a soggy sandwich.'] }),
      ],

      cook: (c) => [
        step(`Cook the ${proteinName(c)}`,
          `Cook it hard and fast for colour — 3–4 minutes a side. Do not press it down; that squeezes out exactly the juice you want to keep.`,
          { min: 8, temp: '200°C', flame: 'Medium-high',
            tips: ['Let it rest 3 minutes before it goes into the assembly.'],
            mistakes: ['Pressing a patty with a spatula — it costs you juice and gains you nothing.'] }),
        step('Toast the bread',
          `Toast the cut faces in a little ${fatName(c)} until golden. This gives you structure and a barrier against the sauce, and takes under two minutes.`,
          { min: 3, temp: '180°C', flame: 'Medium',
            tips: ['Toasted bread holds up; untoasted bread disintegrates by the third bite.'],
            mistakes: ['Skipping this step is why home sandwiches fall apart.'] }),
        step('Melt the cheese onto the hot filling',
          `Lay the cheese on the ${proteinName(c)} while it is still in the hot pan and cover for 30 seconds. Residual heat melts it properly onto the surface instead of sitting on top in a cold slab.`,
          { min: 2, temp: '—', flame: 'Low',
            tips: ['A splash of water under the lid creates steam and melts it faster.'] }),
        step('Assemble in the right order',
          `Sauce, lettuce, ${proteinName(c)}, cheese, tomato, onion, sauce, top. Lettuce beneath the wet ingredients acts as a barrier. Press gently, ${c.dish.toLowerCase().match(/wrap|burrito|roll|kathi|sushi|kimbap/) ? 'roll tightly and slice on the diagonal with a sharp wet knife' : 'skewer it if it is tall, and cut clean through in one motion'}.`,
          { min: 4, temp: '—', flame: 'Off',
            tips: ['Order is a real technique in an assembled dish, not an aesthetic choice.'],
            mistakes: ['Putting tomato directly against bread — it soaks through within minutes.'] }),
      ],
    },

    /* ---------------------------------------------------------- breakfast */
    breakfast: {
      id: 'breakfast', name: 'Breakfast / griddle', kind: 'breakfast', icon: 'fa-egg',
      match: ['omelette', 'omelet', 'scrambled', 'dosa', 'idli', 'uttapam', 'poha', 'upma', 'paratha',
        'crepe', 'crêpe', 'french toast', 'shakshuka', 'congee', 'porridge', 'oatmeal', 'granola',
        'breakfast', 'menemen', 'chilla', 'appam'],
      times: () => ({ prep: 12, cook: 15 }),

      ingredients: (c) => [
        /* Only fall back to eggs when the dish names no base of its own --
           "Poha" is flattened rice, not an omelette. */
        c.base ? byWeight(c.base, c.base.category === 'grains' ? 70 : 130, 'The base of the dish')
          : ing(c.isVeg ? 'semolina' : 'egg', c.isVeg ? 0.35 : 2,
            c.isVeg ? 'cups' : 'pieces', 'The base of the dish'),
        ing('onion', 0.4, 'pieces', 'Aromatic base'),
        c.heat.level > 0 && ing('green-chilli', 0.4, 'pieces', 'Morning heat'),
        ing(fatOf(c), 0.5, 'tbsp', 'Cooking fat'),
        ...c.cuisine.groundSpices.slice(0, 2).map((id) => ing(id, 0.25, null, 'Seasoning')),
        ing('salt', 0.22, 'tsp', 'Seasoning'),
        ing(c.cuisine.finishers[0], 0.5, 'tbsp', 'Fresh finish'),
        ing('tomato', 0.5, 'pieces', 'Freshness and acidity'),
      ].filter(Boolean),

      prep: () => [
        step('Prep everything before the pan',
          `Breakfast cooking is fast and unforgiving. Chop the aromatics, measure the spices and have the plates out before anything hits the heat.`,
          { min: 8, tips: ['Warm the plates. Breakfast goes cold faster than any other meal.'] }),
        step('Bring ingredients to room temperature',
          `Cold eggs or batter straight from the fridge cook unevenly — set them out while you prep everything else.`,
          { min: 5, tips: ['Room-temperature eggs make a noticeably more tender omelette.'] }),
      ],

      cook: (c) => [
        step('Heat the pan correctly',
          `Warm the pan over medium heat for a full minute before the fat goes in. ${c.dish.toLowerCase().match(/dosa|crepe|chilla|appam/) ? 'For a crepe or dosa, sprinkle water on the surface — it should skitter and evaporate in 2 seconds.' : 'The fat should shimmer but not smoke.'}`,
          { min: 3, temp: '160–180°C', flame: 'Medium',
            tips: ['A properly preheated non-stick pan is what stops things sticking, not more oil.'],
            mistakes: ['A cold start is why the first dosa or pancake is always the sacrificial one.'] }),
        step('Cook the aromatics',
          `Soften the onion and chilli for 2–3 minutes until translucent, then add the spices for 30 seconds. Short and gentle — you want them soft, not browned.`,
          { min: 4, temp: '160°C', flame: 'Medium' }),
        step('Cook the base gently',
          `${c.dish.toLowerCase().match(/omelette|omelet|scrambl|egg/) ? 'Pour in the eggs and stir slowly with a spatula, pushing the set curds to the centre. Take it off the heat while it still looks slightly underdone — it keeps cooking on the plate.' : 'Spread the batter or mixture evenly and cook undisturbed until the underside is set and golden, 3–4 minutes.'}`,
          { min: 6, temp: '150–160°C', flame: 'Medium-low',
            tips: ['Low and slow gives you a tender result; high heat gives you rubber.'],
            mistakes: ['Overcooking eggs is the most common breakfast error — they go from creamy to squeaky in 20 seconds.'] }),
        step('Finish and serve immediately',
          `Fold or plate, scatter over the herbs and tomato, and take it to the table at once. Breakfast does not wait, and this dish is at its best in the first two minutes.`,
          { min: 2, temp: 'Off heat', flame: 'Off',
            tips: ['Have everyone seated before the pan goes on — genuinely part of the technique.'] }),
      ],
    },

    /* --------------------------------------------------------------- pasta */
    pasta: {
      id: 'pasta', name: 'Pasta', kind: 'main', icon: 'fa-wheat-awn',
      match: ['pasta', 'spaghetti', 'penne', 'carbonara', 'alfredo', 'bolognese', 'aglio', 'pesto',
        'macaroni', 'fettuccine', 'ravioli', 'gnocchi', 'linguine', 'arrabbiata', 'primavera'],
      times: () => ({ prep: 12, cook: 20 }),

      ingredients: (c) => [
        ing('pasta', 90, 'grams', 'The base — cooked al dente and finished in the sauce'),
        ing('olive-oil', 0.6, 'tbsp', 'The fat that carries the sauce'),
        ing('garlic', 2, 'cloves', 'The aromatic backbone'),
        byWeight(c.protein, c.protein && c.protein.category === 'meat' ? 90 : 55, 'Protein through the sauce'),
        ing('tomato', 1.3, 'pieces', 'The sauce'),
        ing('onion', 0.4, 'pieces', 'Sweetness in the base'),
        ing('cheese', 20, 'grams', 'Salt, umami and the emulsifier that makes the sauce cling'),
        ing('basil', 0.5, 'tbsp', 'Fresh finish, torn in off the heat'),
        c.heat.level > 2 && ing('red-chilli-powder', 0.25, 'tsp', 'Warmth through the sauce'),
        ing('salt', 0.4, 'tsp', 'Most of this goes into the pasta water'),
        ing('black-pepper', 0.2, 'tsp', 'Sharpness'),
      ].filter(Boolean),

      prep: () => [
        step('Salt the water like the sea',
          `Bring a large pot of water to a rolling boil and salt it heavily — around 10 g per litre. This is the only opportunity to season the pasta itself, and unsalted pasta cannot be rescued by sauce.`,
          { min: 8, tips: ['Taste the water. It should taste properly seasoned, close to seawater.'],
            mistakes: ['Under-salting the water — the most common pasta mistake by a wide margin.'] }),
        step('Prep while the water heats',
          `Slice the garlic thinly, chop the onion, grate the cheese. Pasta sauce comes together in the time the pasta cooks, so everything must be ready.`,
          { min: 6, tips: ['Sliced garlic gives a mellower flavour than crushed; crushed is sharper and faster.'] }),
      ],

      cook: (c) => [
        step('Start the sauce',
          `Warm the olive oil over medium-low heat and cook the garlic gently until pale gold and fragrant — never brown. ${c.protein ? `Add the ${proteinName(c)} and brown it properly.` : ''} Then add the onion and soften.`,
          { min: 7, temp: '140–150°C', flame: 'Medium-low',
            tips: ['Gentle heat coaxes sweetness out of garlic; high heat makes it bitter.'],
            mistakes: ['Browning the garlic — bitterness that runs through the entire dish.'] }),
        step('Build and reduce the sauce',
          `Add the tomatoes and simmer for 12–15 minutes until thickened and no longer tasting raw. Season now, and remember the cheese will add salt later.`,
          { min: 14, temp: '95°C', flame: 'Low',
            tips: ['A pinch of sugar rounds off overly acidic tomatoes.'] }),
        step('Cook the pasta 1 minute under',
          `Cook the pasta 1 minute less than the packet says. Before draining, reserve a full cup of the cooking water — that starchy liquid is the emulsifier that makes the sauce cling.`,
          { min: 9, temp: '100°C', flame: 'High',
            tips: ['Set a timer. Pasta goes from al dente to soft in under 60 seconds.'],
            mistakes: ['Throwing away the pasta water — you have just discarded the most useful ingredient in the dish.'] }),
        step('Marry them in the pan',
          `Transfer the pasta straight into the sauce with a splash of the pasta water. Toss hard over medium heat for 60–90 seconds, adding the cheese off the heat. The sauce should turn glossy and coat every strand.`,
          { min: 3, temp: '90°C', flame: 'Medium → off',
            tips: ['This final emulsion is the entire difference between Italian pasta and pasta with sauce poured on top.'],
            mistakes: ['Adding cheese over direct heat — it splits into strings and oil.'] }),
      ],
    },
  };

  /**
   * Priority order, most specific first. A technique earlier in this list wins
   * a close contest — which is how "Masala Chai" becomes a drink rather than a
   * curry, even though "masala" is the longer keyword.
   */
  const MATCH_ORDER = ['drink', 'dessert', 'salad', 'soup', 'pasta', 'riceDish', 'assembly',
    'breakfast', 'stirFry', 'grilled', 'fried', 'baked', 'curry'];

  /**
   * Choose a technique from the dish name.
   * Score = keyword length + a priority bonus, so a long keyword still beats a
   * short one within a tier ("chicken fried rice" → riceDish, not fried) while
   * the tier ordering settles genuinely ambiguous names.
   */
  function detect(dishName) {
    const text = String(dishName || '').toLowerCase();
    let best = null;
    let bestScore = 0;

    MATCH_ORDER.forEach((id, tier) => {
      const bonus = (MATCH_ORDER.length - tier) * 1.2;
      TECHNIQUES[id].match.forEach((kw) => {
        if (!AFR.utils.matchesKeyword(text, kw)) return;
        const score = kw.length + bonus;
        if (score > bestScore) { best = id; bestScore = score; }
      });
    });

    return TECHNIQUES[best || 'curry'];
  }

  AFR.data = AFR.data || {};
  AFR.data.techniques = { all: TECHNIQUES, list: Object.values(TECHNIQUES), detect, order: MATCH_ORDER };
})(window);
