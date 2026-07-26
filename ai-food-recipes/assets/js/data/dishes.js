/* ==========================================================================
 * dishes.js — what the app actually KNOWS about specific dishes.
 *
 * Why this exists
 * ---------------
 * The composition engine builds a dish from a TECHNIQUE and a CUISINE, which
 * is what lets it answer for anything at all. But it identifies the subject
 * from keywords, so a name it has never been told about ("Puran Poli") matched
 * nothing and fell through to a generic curry — confidently, and wrongly.
 *
 * A large model answers those correctly because it was trained on them. This
 * file is that knowledge written down: the real ingredients, in real
 * proportions, with the steps that actually define the dish.
 *
 * It does NOT replace the engine. A known dish supplies its identity; the
 * engine still scales quantities to the table, applies diet swaps and
 * allergies, computes nutrition and cost, and adapts to equipment. So this
 * stays a generator, not a copied recipe book.
 *
 * Quantities are PER SERVING. `ref` is a pantry id where one exists; anything
 * else is resolved by name and nutrition-estimated by category.
 *
 * Adding a dish is a data change, nothing more — no engine code to touch.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  const ing = (ref, per, unit, purpose, opts = {}) =>
    Object.assign({ ref, per, unit, purpose }, opts);

  const step = (title, desc, opts = {}) =>
    Object.assign({ title, desc, min: 5, flame: 'Medium', temp: '', tips: [], mistakes: [] }, opts);

  /* ====================================================================== */
  /* The catalogue                                                           */
  /* ====================================================================== */

  const DISHES = [

    /* ------------------------------------------------ Maharashtra: sweets */
    {
      id: 'puran-poli',
      name: 'Puran Poli',
      aka: ['puran poli', 'puranpoli', 'pooran poli', 'pooranpoli', 'holige', 'obbattu',
        'bobbatlu', 'bobbatlu poli', 'vedmi'],
      cuisine: 'indian', region: 'Maharashtra / Karnataka', technique: 'breakfast',
      veg: true, vegan: false,
      summary: 'A festival flatbread stuffed with a sweet chana dal and jaggery filling — the '
        + '"puran" — rolled thin and griddled in ghee. Made for Holi and Gudi Padwa.',
      ingredients: [
        ing('chana-dal', 0.35, 'cup', 'The puran itself — cooked soft, then ground with jaggery',
          { star: true, substitute: 'Toor dal', healthy: 'Split moong dal, lighter to digest' }),
        ing('jaggery', 0.35, 'cup', 'Sweetness and the deep caramel colour of a good puran',
          { star: true, substitute: 'Palm jaggery', healthy: 'Dates paste, less refined' }),
        ing('wheat-flour', 0.4, 'cup', 'The pari — the outer dough, kept soft and stretchy'),
        ing('all-purpose-flour', 0.1, 'cup', 'A little maida makes the cover roll thinner without tearing',
          { substitute: 'All wheat flour', healthy: 'Skip it and rest the dough longer' }),
        ing('ghee', 1.5, 'tbsp', 'Kneaded into the dough and brushed on while griddling'),
        ing('cardamom', 0.2, 'tsp', 'The signature warm note of the filling'),
        ing('nutmeg', 0.05, 'tsp', 'A scrape only — it rounds the jaggery'),
        ing('turmeric', 0.03, 'tsp', 'A pinch in the dough for colour'),
        ing('salt', 0.08, 'tsp', 'In the dough — it makes the sweetness taste like more'),
        ing('water', 0.4, 'cup', 'For cooking the dal and binding the dough'),
      ],
      prep: [
        step('Soak and cook the dal',
          'Rinse the chana dal well and pressure-cook it with water until completely soft — 3 to 4 whistles. It must crush between your fingers with no resistance at all.',
          { min: 25 }),
        step('Drain it properly',
          'Drain thoroughly and keep the liquid. Wet dal makes a puran that will not hold, and that cooking water is katachi amti, the traditional accompaniment — do not throw it away.',
          { min: 5 }),
        step('Knead a soft dough',
          'Mix both flours with salt, turmeric and a tablespoon of ghee. Add water a little at a time to a soft, sticky dough. Coat with ghee, cover, and rest at least 30 minutes.',
          { min: 10 }),
      ],
      steps: [
        step('Cook the puran',
          'Mash the drained dal into a pan with the jaggery. Cook on medium, stirring constantly, until the jaggery melts and the mixture thickens into a mass that leaves the sides of the pan.',
          { min: 12, flame: 'Medium',
            tips: ['It is ready when a spoon stood upright in it does not fall over.'],
            mistakes: ['Undercooking leaves it loose and it will burst the poli while rolling.'] }),
        step('Flavour and grind it smooth',
          'Take it off the heat, stir in the cardamom and nutmeg, and pass it through a puran yantra or mash it very smooth while warm. Cool completely.',
          { min: 8, flame: 'Off',
            tips: ['Grind it warm — cold puran turns stiff and grainy.'] }),
        step('Stuff the poli',
          'Divide dough and puran into equal balls, with slightly more puran than dough. Flatten a dough ball, place the puran in the centre, gather the edges over it and pinch shut.',
          { min: 8, flame: 'Off',
            mistakes: ['Leaving air inside — it expands on the tawa and splits the poli.'] }),
        step('Roll it thin',
          'Dust with rice flour and roll gently from the centre outward, turning as you go. Even pressure is everything: press hard in one spot and the puran breaks through.',
          { min: 8, flame: 'Off',
            tips: ['Rice flour dusts better than wheat here and keeps the surface dry.'] }),
        step('Griddle it',
          'Cook on a medium-hot tawa until pale brown spots appear, about a minute a side. Brush ghee on both sides and press the edges down with a cloth so they cook through.',
          { min: 6, flame: 'Medium', temp: 'Medium-hot tawa',
            tips: ['High heat browns the outside before the puran warms through — keep it moderate.'],
            mistakes: ['Adding ghee before the first flip makes it fry rather than griddle.'] }),
        step('Serve warm',
          'Serve hot with a spoon of ghee, and katachi amti or plain milk alongside. Puran poli keeps two days and is often eaten at room temperature the next day.',
          { min: 2, flame: 'Off' }),
      ],
      serveWith: ['Katachi amti (spiced dal broth)', 'A spoon of warm ghee', 'Cold milk'],
    },

    {
      id: 'modak',
      name: 'Ukadiche Modak',
      aka: ['modak', 'ukadiche modak', 'ukadiche modak recipe', 'kozhukattai', 'kudumu'],
      cuisine: 'indian', region: 'Maharashtra', technique: 'dessert',
      veg: true, vegan: false,
      summary: 'Steamed rice-flour dumplings pleated by hand around a coconut and jaggery '
        + 'filling. Ganpati\'s offering, and the reason every Maharashtrian kitchen owns a modak mould.',
      ingredients: [
        ing('rice-flour', 0.4, 'cup', 'The shell — fine rice flour only', { star: true }),
        ing('coconut', 0.4, 'cup', 'Fresh grated coconut for the saran filling', { star: true }),
        ing('jaggery', 0.3, 'cup', 'Melted into the coconut', { star: true, healthy: 'Palm jaggery' }),
        ing('ghee', 1, 'tsp', 'In the water for the dough, and to serve'),
        ing('cardamom', 0.15, 'tsp', 'Warm spice in the filling'),
        ing('nutmeg', 0.03, 'tsp', 'A scrape, traditional with coconut'),
        ing('poppy-seeds', 0.5, 'tsp', 'Khus khus — texture in the filling', { substitute: 'Sesame seeds' }),
        ing('salt', 0.05, 'tsp', 'A pinch in the dough'),
        ing('water', 0.45, 'cup', 'Boiling, for the rice dough'),
      ],
      prep: [
        step('Make the saran',
          'Cook the grated coconut and jaggery together on low until the jaggery melts and the mixture is moist but not wet — about 8 minutes. Stir in cardamom, nutmeg and poppy seeds. Cool.',
          { min: 12 }),
      ],
      steps: [
        step('Scald the rice flour',
          'Bring water to a rolling boil with ghee and salt. Take it off the heat, tip in the rice flour all at once, stir hard, cover and leave 5 minutes. The steam cooks the flour.',
          { min: 8, flame: 'High',
            tips: ['The water must be truly boiling — lukewarm water gives a dough that cracks.'],
            mistakes: ['Adding flour to water still on the flame makes lumps you cannot knead out.'] }),
        step('Knead it hot',
          'Tip onto a greased plate and knead while as hot as you can bear, greasing your palms. Keep going until it is completely smooth and pliable, like soft clay.',
          { min: 6, flame: 'Off',
            tips: ['Kneading cold dough is the single most common reason modak crack.'] }),
        step('Shape the shells',
          'Take a lime-sized ball and press it into a shallow cup with your thumb, thinning the edges. Pinch 9 or 11 evenly spaced pleats around the rim — always an odd number.',
          { min: 12, flame: 'Off',
            tips: ['A greased modak mould gives the same result in a fraction of the time.'] }),
        step('Fill and seal',
          'Spoon in the coconut filling, gather the pleats up to a point and twist gently to close. The peak should be sharp, not squashed.',
          { min: 8, flame: 'Off',
            mistakes: ['Overfilling — the shell splits open in the steamer.'] }),
        step('Steam',
          'Line a steamer with a damp cloth or banana leaf, arrange the modak without touching, and steam 10 to 12 minutes until the shells turn glossy.',
          { min: 12, flame: 'Medium', temp: 'Steam, ~100°C',
            tips: ['Glossy and slightly translucent means done; chalky means they need longer.'] }),
        step('Serve with ghee',
          'Serve warm with a spoon of ghee poured over. Modak are at their best within a few hours of steaming.',
          { min: 2, flame: 'Off' }),
      ],
      serveWith: ['Warm ghee'],
    },

    /* ---------------------------------------- Maharashtra: everyday plates */
    {
      id: 'sabudana-khichdi',
      name: 'Sabudana Khichdi',
      aka: ['sabudana khichdi', 'sabudana khichadi', 'sago khichdi', 'javvarisi upma'],
      cuisine: 'indian', region: 'Maharashtra', technique: 'breakfast',
      veg: true, vegan: false,
      summary: 'Soaked sago pearls tossed with peanuts, potato and green chilli until every '
        + 'pearl is separate and translucent. The classic upvas (fasting) dish.',
      ingredients: [
        ing('sabudana', 0.5, 'cup', 'Soaked overnight until a pearl crushes easily', { star: true }),
        ing('peanut', 3, 'tbsp', 'Roasted and coarsely ground — this is what makes it taste right',
          { star: true, substitute: 'Roasted cashew' }),
        ing('potato', 0.5, 'pieces', 'Diced small, fried until it holds its shape'),
        ing('green-chilli', 1, 'pieces', 'Fresh heat'),
        ing('cumin', 0.4, 'tsp', 'Bloomed in the ghee at the start'),
        ing('ghee', 1, 'tbsp', 'Traditional fat here', { substitute: 'Peanut oil for a vegan version' }),
        ing('curry-leaves', 4, 'pieces', 'Tempered with the cumin'),
        ing('lemon', 0.3, 'pieces', 'Squeezed over at the end — essential, not optional'),
        ing('coriander-leaves', 1, 'tbsp', 'Fresh finish'),
        ing('sugar', 0.3, 'tsp', 'A little sugar balances the lemon and salt'),
        ing('salt', 0.4, 'tsp', 'Seasoning — rock salt if cooking for a fast'),
      ],
      prep: [
        step('Soak the sabudana properly',
          'Rinse the pearls until the water runs clear, then soak in just enough water to cover — no more — for 5 hours or overnight. Drained, a pearl should crush to powder between finger and thumb.',
          { min: 15 }),
        step('Roast and grind the peanuts',
          'Dry-roast the peanuts until they smell nutty and the skins slip, rub them off and grind coarsely. Coarse, not a paste — you want texture.',
          { min: 10 }),
      ],
      steps: [
        step('Mix before you cook',
          'Toss the drained sabudana with the ground peanuts, salt and sugar until every pearl is coated. Doing this now, off the heat, is what stops the khichdi turning sticky.',
          { min: 4, flame: 'Off',
            tips: ['This single step separates good sabudana khichdi from a gluey one.'] }),
        step('Temper',
          'Heat ghee, add cumin and let it crackle, then curry leaves and green chilli. Stand back — the leaves spit.',
          { min: 2, flame: 'Medium' }),
        step('Fry the potato',
          'Add the diced potato and cook until the edges are golden and it is cooked through, 6 to 8 minutes. Cover for part of it if the pieces are thick.',
          { min: 8, flame: 'Medium' }),
        step('Add the sabudana',
          'Tip in the coated sabudana and toss on medium heat until the pearls turn translucent and start to look glossy, about 5 minutes.',
          { min: 6, flame: 'Medium',
            tips: ['Translucent means done. Keep going and they turn to glue.'],
            mistakes: ['Stirring constantly breaks the pearls — fold gently instead.'] }),
        step('Finish off the heat',
          'Take it off the flame, squeeze the lemon over, scatter coriander and toss once. Serve immediately with a spoon of curd.',
          { min: 2, flame: 'Off' }),
      ],
      serveWith: ['Plain curd', 'A wedge of lemon'],
    },

    {
      id: 'poha',
      name: 'Kanda Poha',
      aka: ['poha', 'kanda poha', 'pohe', 'batata poha', 'aval upma'],
      cuisine: 'indian', region: 'Maharashtra / Madhya Pradesh', technique: 'breakfast',
      veg: true, vegan: true,
      summary: 'Flattened rice rinsed, not soaked, then steamed through with onion, turmeric '
        + 'and mustard seeds. Ten-minute breakfast across western India.',
      ingredients: [
        ing('poha', 1, 'cup', 'Thick poha only — thin poha dissolves', { star: true }),
        ing('onion', 0.6, 'pieces', 'The kanda — softened, not browned', { star: true }),
        ing('potato', 0.3, 'pieces', 'Optional, for batata poha'),
        ing('mustard-seeds', 0.4, 'tsp', 'Popped in hot oil to start'),
        ing('turmeric', 0.25, 'tsp', 'Colour and earthiness'),
        ing('green-chilli', 1, 'pieces', 'Slit, for gentle heat'),
        ing('curry-leaves', 5, 'pieces', 'Tempered at the start'),
        ing('peanut', 1.5, 'tbsp', 'Fried crisp — the crunch through the soft poha'),
        ing('oil', 1, 'tbsp', 'Neutral oil'),
        ing('sugar', 0.4, 'tsp', 'A Maharashtrian touch that lifts the whole plate'),
        ing('lemon', 0.3, 'pieces', 'Squeezed at the end'),
        ing('coriander-leaves', 1.5, 'tbsp', 'Generous, at the end'),
        ing('coconut', 1, 'tbsp', 'Grated, scattered over to serve'),
        ing('salt', 0.4, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Rinse the poha — do not soak it',
          'Put the poha in a colander and run water through it for about 30 seconds, tossing gently. Leave it to drain 10 minutes. It should be damp and separate, never sitting in water.',
          { min: 12 }),
        step('Season it now',
          'Sprinkle the turmeric, salt and sugar over the drained poha and fold gently until evenly yellow. Seasoning now means you will not have to stir hard later.',
          { min: 3 }),
      ],
      steps: [
        step('Fry the peanuts',
          'Heat the oil and fry the peanuts until they darken a shade. Lift them out and keep aside so they stay crisp.',
          { min: 3, flame: 'Medium' }),
        step('Temper',
          'In the same oil pop the mustard seeds, then add curry leaves and green chilli.',
          { min: 2, flame: 'Medium',
            mistakes: ['Adding everything before the mustard pops leaves a raw, bitter note.'] }),
        step('Soften the onion',
          'Add the onion (and potato, if using) with a pinch of salt and cook until translucent and sweet — not browned. About 5 minutes.',
          { min: 6, flame: 'Medium' }),
        step('Fold in the poha',
          'Add the seasoned poha and fold gently to coat. Sprinkle over a tablespoon of water, cover and steam on low for 2 to 3 minutes.',
          { min: 4, flame: 'Low',
            tips: ['That covered minute is what makes poha fluffy rather than dry.'],
            mistakes: ['Stirring vigorously mashes it — fold from the bottom up.'] }),
        step('Finish',
          'Take off the heat. Squeeze lemon over, return the peanuts, and scatter coriander and coconut. Serve straight away.',
          { min: 2, flame: 'Off' }),
      ],
      serveWith: ['Hot chai', 'Sev sprinkled over', 'A wedge of lemon'],
    },

    {
      id: 'thalipeeth',
      name: 'Thalipeeth',
      aka: ['thalipeeth', 'thalipith', 'bhajani thalipeeth'],
      cuisine: 'indian', region: 'Maharashtra', technique: 'breakfast',
      veg: true, vegan: true,
      summary: 'A savoury multigrain flatbread patted out by hand, made from bhajani — a '
        + 'roasted mix of jowar, bajra, rice and pulses — with onion and coriander worked in.',
      ingredients: [
        ing('jowar-flour', 0.35, 'cup', 'The backbone of bhajani', { star: true, substitute: 'Bajra flour' }),
        ing('besan', 0.15, 'cup', 'Binds the dough and adds savour', { star: true }),
        ing('rice-flour', 0.1, 'cup', 'Crispness at the edges'),
        ing('wheat-flour', 0.1, 'cup', 'Makes it easier to pat out'),
        ing('onion', 0.5, 'pieces', 'Finely chopped, worked into the dough'),
        ing('coriander-leaves', 2, 'tbsp', 'Generously, into the dough'),
        ing('green-chilli', 1, 'pieces', 'Minced'),
        ing('cumin', 0.3, 'tsp', 'Whole, in the dough'),
        ing('coriander-powder', 0.3, 'tsp', 'Warmth'),
        ing('turmeric', 0.2, 'tsp', 'Colour'),
        ing('sesame-seeds', 0.5, 'tsp', 'Pressed onto the underside'),
        ing('oil', 1.5, 'tbsp', 'For the griddle'),
        ing('salt', 0.4, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Mix the dough',
          'Combine all the flours with the onion, coriander, chilli and spices. Add water little by little to a soft dough — softer than chapati dough, closer to a thick paste that holds.',
          { min: 10 }),
        step('Rest briefly',
          'Let it sit 10 minutes so the flours hydrate. Do not rest it long — the onion releases water and the dough goes slack.',
          { min: 10 }),
      ],
      steps: [
        step('Pat it out by hand',
          'Take a ball onto a greased sheet of banana leaf, parchment or a wet cloth and pat it flat with wet fingers to about 5mm. Thalipeeth is patted, never rolled.',
          { min: 6, flame: 'Off',
            tips: ['Keep wetting your fingers — dry hands drag and tear the dough.'] }),
        step('Make the holes',
          'Poke four or five holes right through with your finger. They let the middle cook and take the oil.',
          { min: 1, flame: 'Off',
            mistakes: ['Skipping the holes leaves a raw, doughy centre.'] }),
        step('Griddle the first side',
          'Slide it onto a medium-hot tawa, sesame side down. Drizzle oil into the holes and around the edge. Cook until the underside is set with brown spots, 3 to 4 minutes.',
          { min: 5, flame: 'Medium', temp: 'Medium-hot tawa' }),
        step('Flip and crisp',
          'Turn it, drizzle a little more oil, and press down at the edges. Cook until both sides are crisp and the thalipeeth smells toasted, another 3 minutes.',
          { min: 4, flame: 'Medium',
            tips: ['Cook it slower than you think — multigrain flours need time or they taste raw.'] }),
        step('Serve hot',
          'Serve straight off the tawa with a lump of white butter, thick curd or lasun chutney.',
          { min: 1, flame: 'Off' }),
      ],
      serveWith: ['White butter (loni)', 'Thick curd', 'Garlic chutney'],
    },

    {
      id: 'misal-pav',
      name: 'Misal Pav',
      aka: ['misal', 'misal pav', 'missal pav', 'kolhapuri misal', 'puneri misal'],
      cuisine: 'indian', region: 'Maharashtra', technique: 'curry',
      veg: true, vegan: true,
      summary: 'Sprouted moth beans in a dark, fiery gravy, topped with farsan, onion and '
        + 'coriander, with a slick of red kat oil floating on top and pav to mop it up.',
      ingredients: [
        ing('moth-beans', 0.5, 'cup', 'Matki — sprouted, the heart of the dish',
          { star: true, substitute: 'Sprouted moong' }),
        ing('onion', 1, 'pieces', 'Half in the masala, half raw on top', { star: true }),
        ing('coconut', 2, 'tbsp', 'Dry coconut, roasted dark, for the kala masala'),
        ing('tomato', 0.5, 'pieces', 'Body in the gravy'),
        ing('garlic', 3, 'cloves', 'Roasted into the paste'),
        ing('ginger', 0.5, 'inch', 'Into the paste'),
        ing('red-chilli-powder', 1.2, 'tsp', 'Kashmiri for colour, Lavangi for the real heat'),
        ing('garam-masala', 0.5, 'tsp', 'Goda or kala masala is the authentic choice'),
        ing('turmeric', 0.25, 'tsp', 'Colour'),
        ing('mustard-seeds', 0.3, 'tsp', 'Tempering'),
        ing('curry-leaves', 5, 'pieces', 'Tempering'),
        ing('oil', 2, 'tbsp', 'Some of it becomes the red kat on top'),
        ing('farsan', 0.4, 'cup', 'The crunchy topping — non-negotiable', { substitute: 'Sev' }),
        ing('bread', 2, 'pieces', 'Pav, to serve'),
        ing('lemon', 0.3, 'pieces', 'To finish'),
        ing('coriander-leaves', 2, 'tbsp', 'To finish'),
        ing('salt', 0.5, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Sprout the matki',
          'Soak the moth beans 8 hours, drain, tie in a damp cloth and leave 12 hours until small tails appear. Sprouting is what gives misal its character.',
          { min: 20 }),
        step('Roast the kala masala',
          'Dry-roast the dry coconut until deep brown, then the onion, ginger and garlic. Grind with a little water into a dark, smooth paste.',
          { min: 15 }),
      ],
      steps: [
        step('Cook the sprouts',
          'Boil the sprouted matki with turmeric and salt until just tender but still holding shape, about 15 minutes. Keep the cooking water.',
          { min: 16, flame: 'Medium',
            mistakes: ['Boiling them to mush — the beans should have bite.'] }),
        step('Build the tarri',
          'Temper mustard seeds and curry leaves in oil, add the ground masala and fry on medium-low until the oil separates and floats — 8 to 10 minutes. This is the whole flavour of the dish.',
          { min: 10, flame: 'Medium-low',
            tips: ['Wait for the oil to visibly separate. Rushing this leaves it tasting raw.'] }),
        step('Add chilli and tomato',
          'Stir in the chilli powder and garam masala off the heat for a few seconds, then the tomato. Cook until the tomato collapses.',
          { min: 6, flame: 'Medium' }),
        step('Simmer the usal',
          'Add the cooked sprouts and their water, plus more water to a loose gravy. Simmer 12 minutes so the beans take on the masala.',
          { min: 12, flame: 'Low' }),
        step('Separate the kat',
          'Ladle off the red, oily layer that rises to the top — that is the kat, and it is served over the assembled plate for heat.',
          { min: 2, flame: 'Off' }),
        step('Assemble at the table',
          'Spoon usal into a bowl, pile farsan over it, then raw onion and coriander, then a ladle of hot kat. Serve with pav and lemon, and eat immediately before the farsan softens.',
          { min: 3, flame: 'Off',
            tips: ['Assemble only as you serve — assembled early, it turns to sludge.'] }),
      ],
      serveWith: ['Pav', 'Raw onion and lemon', 'Extra farsan'],
    },

    {
      id: 'pav-bhaji',
      name: 'Pav Bhaji',
      aka: ['pav bhaji', 'pao bhaji', 'pavbhaji'],
      cuisine: 'indian', region: 'Mumbai', technique: 'curry',
      veg: true, vegan: false,
      summary: 'A griddle-mashed mixed vegetable curry, heavy on butter and pav bhaji masala, '
        + 'served with soft rolls toasted in yet more butter. Mumbai street food.',
      ingredients: [
        ing('potato', 1, 'pieces', 'Boiled and mashed — the body of the bhaji', { star: true }),
        ing('cauliflower', 0.5, 'cup', 'Boiled and mashed in', { star: true }),
        ing('peas', 0.3, 'cup', 'Boiled and mashed in'),
        ing('tomato', 1.5, 'pieces', 'Cooked down hard — the bhaji should taste of tomato'),
        ing('onion', 0.8, 'pieces', 'Half cooked in, half raw to serve'),
        ing('bell-pepper', 0.3, 'pieces', 'Capsicum, finely chopped'),
        ing('butter', 2, 'tbsp', 'Generously — this is not a dish to be shy with', { star: true }),
        ing('pav-bhaji-masala', 1.5, 'tsp', 'The defining spice blend', { star: true }),
        ing('red-chilli-powder', 0.8, 'tsp', 'Kashmiri, for the red colour'),
        ing('ginger', 0.5, 'inch', 'Paste, with the garlic'),
        ing('garlic', 3, 'cloves', 'Paste, with the ginger'),
        ing('lemon', 0.3, 'pieces', 'Squeezed over to serve'),
        ing('coriander-leaves', 2, 'tbsp', 'To finish'),
        ing('bread', 2, 'pieces', 'Pav, split and toasted in butter'),
        ing('salt', 0.5, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Boil the vegetables',
          'Pressure-cook the potato, cauliflower and peas together until very soft. Mash them coarsely and keep aside with a little of the water.',
          { min: 18 }),
      ],
      steps: [
        step('Start the base',
          'Melt half the butter on a wide tawa. Cook the ginger-garlic paste briefly, then the onion until soft, then the capsicum.',
          { min: 7, flame: 'Medium' }),
        step('Cook the tomato down hard',
          'Add the tomato with salt and cook, mashing as you go, until it completely breaks down and the mixture darkens — 8 to 10 minutes. This is where the flavour is made.',
          { min: 10, flame: 'Medium',
            mistakes: ['Moving on while the tomato is still chunky leaves the bhaji tasting sharp.'] }),
        step('Add the masala',
          'Stir in the pav bhaji masala and chilli powder and cook a minute in the fat so they lose their raw edge.',
          { min: 2, flame: 'Low' }),
        step('Mash it all together',
          'Add the boiled vegetables and their water. Now mash continuously with a flat masher on medium heat for 8 to 10 minutes, adding water as needed. The mashing is the technique.',
          { min: 10, flame: 'Medium',
            tips: ['A potato masher on the tawa, not a blender — blended bhaji goes gluey.'] }),
        step('Finish with butter',
          'Stir in the rest of the butter, most of the coriander and a squeeze of lemon. It should be thick but scoopable.',
          { min: 3, flame: 'Low' }),
        step('Toast the pav',
          'Split the pav, smear the cut sides with butter and a pinch of the masala, and toast on the same tawa until golden.',
          { min: 4, flame: 'Medium',
            tips: ['Toasting on the bhaji tawa picks up the leftover masala — that is the point.'] }),
        step('Serve',
          'Serve the bhaji topped with butter, raw onion, coriander and lemon, pav alongside.',
          { min: 2, flame: 'Off' }),
      ],
      serveWith: ['Buttered pav', 'Raw onion with lemon'],
    },

    /* ------------------------------------------------ North Indian staples */
    {
      id: 'chole',
      name: 'Chole',
      aka: ['chole', 'chana masala', 'chole masala', 'chholay', 'punjabi chole', 'chole bhature'],
      cuisine: 'indian', region: 'Punjab', technique: 'curry',
      veg: true, vegan: true,
      summary: 'Chickpeas simmered dark in a tomato and onion masala with amchur and a '
        + 'chole-specific spice blend. The tea-bag trick is what makes it that colour.',
      ingredients: [
        ing('chickpeas', 0.5, 'cup', 'Soaked overnight and pressure-cooked', { star: true }),
        ing('onion', 1, 'pieces', 'Browned deeply for the base', { star: true }),
        ing('tomato', 1.5, 'pieces', 'Cooked until the oil separates'),
        ing('ginger', 0.6, 'inch', 'Half in the paste, half julienned on top'),
        ing('garlic', 4, 'cloves', 'In the paste'),
        ing('green-chilli', 1, 'pieces', 'Slit'),
        ing('chole-masala', 1.5, 'tsp', 'The defining blend', { star: true, substitute: 'Garam masala plus amchur' }),
        ing('coriander-powder', 1, 'tsp', 'Body'),
        ing('cumin', 0.5, 'tsp', 'Whole, to start'),
        ing('turmeric', 0.25, 'tsp', 'Colour'),
        ing('red-chilli-powder', 0.6, 'tsp', 'Heat'),
        ing('amchur', 0.5, 'tsp', 'Dried mango powder — the sourness that defines chole',
          { substitute: 'Lemon juice at the end' }),
        ing('tea-bag', 1, 'pieces', 'Boiled with the chickpeas for the dark colour',
          { substitute: 'A piece of dried amla' }),
        ing('oil', 1.5, 'tbsp', 'Cooking fat'),
        ing('coriander-leaves', 2, 'tbsp', 'To finish'),
        ing('salt', 0.5, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Soak overnight',
          'Soak the chickpeas at least 8 hours with a pinch of soda. They should double in size and a nail should press into one easily.',
          { min: 10 }),
        step('Pressure-cook with tea',
          'Cook the drained chickpeas with fresh water, salt and the tea bag until completely soft — 5 to 6 whistles. Remove the tea bag. Keep the cooking liquid.',
          { min: 25 }),
      ],
      steps: [
        step('Brown the onion properly',
          'Fry cumin in oil, then the onion, and keep going until it is genuinely deep brown — 10 to 12 minutes. Pale onion gives pale, flat chole.',
          { min: 12, flame: 'Medium',
            tips: ['A pinch of salt draws out water and speeds the browning.'],
            mistakes: ['Stopping at golden. Chole needs the onion darker than most curries.'] }),
        step('Ginger, garlic, tomato',
          'Add the ginger-garlic paste and cook out the raw smell, then the tomato and green chilli. Cook until the oil separates at the edges.',
          { min: 9, flame: 'Medium' }),
        step('Add the ground spices',
          'Lower the heat, add the coriander powder, turmeric, chilli powder and chole masala with a splash of the chickpea water so nothing burns. Fry a minute.',
          { min: 2, flame: 'Low' }),
        step('Simmer the chickpeas in',
          'Add the chickpeas with their dark cooking liquid. Simmer uncovered 15 minutes, crushing a handful of chickpeas against the pan to thicken the gravy naturally.',
          { min: 16, flame: 'Low',
            tips: ['Crushing some of the chickpeas is how you thicken chole without flour or cream.'] }),
        step('Finish with amchur',
          'Stir in the amchur, taste for salt and sourness, and finish with julienned ginger and coriander. Rest 10 minutes before serving — chole improves.',
          { min: 4, flame: 'Off' }),
      ],
      serveWith: ['Bhature', 'Kulcha or naan', 'Sliced onion with lemon'],
    },

    {
      id: 'rajma',
      name: 'Rajma',
      aka: ['rajma', 'rajma masala', 'rajma chawal', 'kidney bean curry'],
      cuisine: 'indian', region: 'Punjab / Jammu', technique: 'curry',
      veg: true, vegan: true,
      summary: 'Red kidney beans simmered slowly in an onion-tomato masala until the gravy '
        + 'thickens on its own. Sunday lunch with rice across north India.',
      ingredients: [
        ing('kidney-beans', 0.5, 'cup', 'Soaked overnight, cooked completely soft', { star: true }),
        ing('onion', 1, 'pieces', 'Browned for the base', { star: true }),
        ing('tomato', 1.5, 'pieces', 'Pureed, cooked until the oil separates'),
        ing('ginger', 0.5, 'inch', 'Paste'),
        ing('garlic', 4, 'cloves', 'Paste'),
        ing('cumin', 0.5, 'tsp', 'Whole, to start'),
        ing('coriander-powder', 1, 'tsp', 'Body'),
        ing('garam-masala', 0.5, 'tsp', 'Stirred in at the end'),
        ing('red-chilli-powder', 0.7, 'tsp', 'Heat and colour'),
        ing('turmeric', 0.25, 'tsp', 'Colour'),
        ing('bay-leaf', 1, 'pieces', 'In the tempering'),
        ing('oil', 1.5, 'tbsp', 'Cooking fat'),
        ing('coriander-leaves', 1.5, 'tbsp', 'To finish'),
        ing('salt', 0.5, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Soak overnight',
          'Soak the beans 8 to 10 hours. Undersoaked rajma will never soften properly however long you cook it.',
          { min: 10 }),
        step('Pressure-cook until truly soft',
          'Cook with salt and fresh water for 6 to 7 whistles, then 10 minutes on low. A bean should collapse when pressed. Keep every drop of the cooking liquid.',
          { min: 30 }),
      ],
      steps: [
        step('Brown the onion',
          'Fry the bay leaf and cumin in oil, then the onion until deep golden brown, about 10 minutes.',
          { min: 11, flame: 'Medium' }),
        step('Ginger-garlic and tomato',
          'Cook the ginger-garlic paste until it stops smelling raw, then add the tomato puree. Cook down until it darkens and the oil pools at the edges — 10 minutes.',
          { min: 10, flame: 'Medium',
            mistakes: ['Adding the beans before the masala is properly cooked leaves a raw tomato taste.'] }),
        step('Spices',
          'Lower the heat and add coriander powder, chilli powder and turmeric with a splash of bean water. Fry a minute.',
          { min: 2, flame: 'Low' }),
        step('Simmer long and slow',
          'Add the beans with all their liquid. Simmer uncovered at least 20 minutes, mashing a ladleful of beans against the side. The gravy should turn thick and glossy.',
          { min: 22, flame: 'Low',
            tips: ['Rajma needs longer simmering than it looks like it does. That is where the texture comes from.'] }),
        step('Finish',
          'Stir in garam masala and coriander, rest 10 minutes, and serve with steamed rice.',
          { min: 4, flame: 'Off' }),
      ],
      serveWith: ['Steamed basmati rice', 'Sliced onion', 'A spoon of curd'],
    },

    {
      id: 'palak-paneer',
      name: 'Palak Paneer',
      aka: ['palak paneer', 'saag paneer', 'spinach paneer'],
      cuisine: 'indian', region: 'Punjab', technique: 'curry',
      veg: true, vegan: false,
      summary: 'Blanched spinach blended to a bright green puree, cooked briefly in a mild '
        + 'onion masala with cubes of paneer. Blanch and shock — that is the whole secret.',
      ingredients: [
        ing('spinach', 2.5, 'cups', 'Blanched and pureed — the dish is named for it', { star: true }),
        ing('paneer', 80, 'grams', 'Cubed, added at the very end', { star: true, substitute: 'Tofu for a vegan version' }),
        ing('onion', 0.6, 'pieces', 'Cooked soft, kept pale'),
        ing('tomato', 0.5, 'pieces', 'Just enough for balance — too much dulls the green'),
        ing('garlic', 3, 'cloves', 'Paste'),
        ing('ginger', 0.5, 'inch', 'Paste'),
        ing('green-chilli', 1, 'pieces', 'Blended with the spinach'),
        ing('cream', 1, 'tbsp', 'Swirled in at the end', { healthy: 'Cashew paste or thick curd' }),
        ing('cumin', 0.4, 'tsp', 'Whole, to start'),
        ing('garam-masala', 0.3, 'tsp', 'Light hand — this is a delicate curry'),
        ing('ghee', 1, 'tbsp', 'Cooking fat', { substitute: 'Oil' }),
        ing('salt', 0.4, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Blanch and shock the spinach',
          'Drop the spinach into boiling water for 90 seconds, then straight into iced water. This sets the colour — skip it and the curry turns olive brown.',
          { min: 8,
            tips: ['Ninety seconds, no more. Overcooked spinach is what makes palak paneer look dull.'] }),
        step('Puree it',
          'Squeeze out the water and blend with the green chilli to a smooth puree. Do not add hot water.',
          { min: 4 }),
        step('Soften the paneer',
          'If the paneer is firm, soak the cubes in warm salted water for 10 minutes so they stay soft in the curry.',
          { min: 10 }),
      ],
      steps: [
        step('Build a pale base',
          'Fry cumin in ghee, add ginger-garlic paste, then the onion. Cook until soft and translucent but NOT browned — colour here muddies the green.',
          { min: 7, flame: 'Medium',
            mistakes: ['Browning the onion. This is one curry where you want it pale.'] }),
        step('Cook the tomato briefly',
          'Add the tomato and cook just until it softens, about 4 minutes. Keep it restrained.',
          { min: 5, flame: 'Medium' }),
        step('Add the puree — and stop cooking it',
          'Stir in the spinach puree and salt and cook only 4 to 5 minutes on low. Long cooking here is exactly what kills the colour and the fresh taste.',
          { min: 5, flame: 'Low',
            tips: ['Keep the lid off. Trapped steam dulls the green.'] }),
        step('Add the paneer last',
          'Fold in the paneer cubes and warm through for 2 minutes only, so they stay soft.',
          { min: 3, flame: 'Low',
            mistakes: ['Simmering paneer for long makes it rubbery.'] }),
        step('Finish',
          'Swirl in the cream, a pinch of garam masala, and serve immediately with roti or rice.',
          { min: 2, flame: 'Off' }),
      ],
      serveWith: ['Roti or naan', 'Jeera rice', 'Sliced onion'],
    },

    {
      id: 'baingan-bharta',
      name: 'Baingan Bharta',
      aka: ['baingan bharta', 'bharta', 'begun bharta', 'smoked eggplant curry'],
      cuisine: 'indian', region: 'Punjab', technique: 'curry',
      veg: true, vegan: true,
      summary: 'A whole aubergine charred over an open flame until the skin blisters and the '
        + 'flesh turns smoky, then mashed into a simple onion-tomato masala.',
      ingredients: [
        ing('eggplant', 1, 'pieces', 'One large one, charred whole — the smoke is the dish', { star: true }),
        ing('onion', 0.8, 'pieces', 'Finely chopped', { star: true }),
        ing('tomato', 1, 'pieces', 'Cooked down'),
        ing('garlic', 4, 'cloves', 'Some slivers pushed into the aubergine before roasting'),
        ing('ginger', 0.5, 'inch', 'Minced'),
        ing('green-chilli', 1, 'pieces', 'Chopped'),
        ing('cumin', 0.5, 'tsp', 'Whole, to start'),
        ing('coriander-powder', 0.6, 'tsp', 'Body'),
        ing('turmeric', 0.2, 'tsp', 'Colour'),
        ing('red-chilli-powder', 0.5, 'tsp', 'Heat'),
        ing('garam-masala', 0.3, 'tsp', 'At the end'),
        ing('oil', 1.5, 'tbsp', 'Mustard oil is traditional', { substitute: 'Any neutral oil' }),
        ing('coriander-leaves', 2, 'tbsp', 'Generously, to finish'),
        ing('salt', 0.4, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Char the aubergine',
          'Rub the aubergine with oil, push slivers of garlic into slits, and roast directly on a gas flame, turning, until the skin is blackened all over and it collapses — 12 to 15 minutes.',
          { min: 15,
            tips: ['Open flame gives smoke an oven cannot. If you must use an oven, 240°C and finish under the grill.'],
            mistakes: ['Taking it off while still firm — it must be completely soft inside.'] }),
        step('Peel and mash',
          'Rest it in a covered bowl 5 minutes, then the skin slips off. Discard the skin and any bitter liquid, and mash the flesh coarsely.',
          { min: 8 }),
      ],
      steps: [
        step('Start the masala',
          'Fry cumin in the oil, then the onion with a pinch of salt until golden, 8 minutes.',
          { min: 9, flame: 'Medium' }),
        step('Ginger, garlic, chilli',
          'Add the ginger, remaining garlic and green chilli, and cook until fragrant.',
          { min: 2, flame: 'Medium' }),
        step('Cook the tomato right down',
          'Add tomato, turmeric, coriander and chilli powder. Cook until the tomato completely breaks down and the oil separates, about 8 minutes.',
          { min: 9, flame: 'Medium' }),
        step('Fold in the aubergine',
          'Add the mashed aubergine and cook on medium, stirring often, for 8 to 10 minutes so the moisture cooks off and the smoke marries the masala.',
          { min: 10, flame: 'Medium',
            tips: ['Keep going until it pulls away from the pan — watery bharta tastes thin.'] }),
        step('Finish',
          'Stir in garam masala and a lot of coriander. Serve hot with roti or paratha.',
          { min: 3, flame: 'Off' }),
      ],
      serveWith: ['Roti or paratha', 'Curd', 'Sliced onion'],
    },

    {
      id: 'dal-tadka',
      name: 'Dal Tadka',
      aka: ['dal tadka', 'daal tadka', 'yellow dal', 'dal fry', 'toor dal tadka'],
      cuisine: 'indian', region: 'North India', technique: 'curry',
      veg: true, vegan: false,
      summary: 'Toor dal cooked soft and finished with a tadka of ghee, cumin, garlic and dried '
        + 'chilli poured over at the table while it still crackles.',
      ingredients: [
        ing('toor-dal', 0.4, 'cup', 'Cooked until completely soft', { star: true, substitute: 'Moong dal' }),
        ing('ghee', 1, 'tbsp', 'For the tadka — this is where the flavour lives', { star: true, substitute: 'Oil for vegan' }),
        ing('cumin', 0.5, 'tsp', 'First into the hot ghee'),
        ing('garlic', 4, 'cloves', 'Sliced, fried golden in the tadka'),
        ing('dried-red-chilli', 2, 'pieces', 'Whole, in the tadka'),
        ing('onion', 0.4, 'pieces', 'In the base'),
        ing('tomato', 0.6, 'pieces', 'In the base'),
        ing('ginger', 0.4, 'inch', 'Minced'),
        ing('turmeric', 0.3, 'tsp', 'Cooked with the dal'),
        ing('red-chilli-powder', 0.4, 'tsp', 'In the tadka, off the heat'),
        ing('asafoetida', 0.05, 'tsp', 'A pinch — it makes dal taste like dal'),
        ing('coriander-leaves', 1.5, 'tbsp', 'To finish'),
        ing('lemon', 0.25, 'pieces', 'Squeezed at the table'),
        ing('salt', 0.4, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Rinse and cook the dal',
          'Rinse until the water runs clear, then pressure-cook with turmeric, salt and plenty of water for 4 whistles. Whisk it smooth — dal should be creamy, not soupy with whole lentils.',
          { min: 22 }),
      ],
      steps: [
        step('Build a light base',
          'Cook the onion, ginger and tomato in a little ghee until soft, about 6 minutes.',
          { min: 7, flame: 'Medium' }),
        step('Combine and simmer',
          'Add the cooked dal, adjust with hot water to a pourable consistency, and simmer 8 minutes so it comes together.',
          { min: 9, flame: 'Low',
            tips: ['Add hot water, never cold — cold water makes dal taste flat.'] }),
        step('Make the tadka',
          'In a small pan heat the ghee until shimmering. Add cumin, then the sliced garlic, and fry until the garlic is golden. Add the dried chillies for a few seconds.',
          { min: 3, flame: 'Medium-high',
            mistakes: ['Burnt garlic turns the whole pot bitter — pull it at golden, not brown.'] }),
        step('Pour it over',
          'Take the tadka off the heat, stir in the chilli powder and asafoetida, and pour it over the dal while it is still crackling. Do not stir it in fully.',
          { min: 1, flame: 'Off',
            tips: ['The sound when it hits the dal is the point. Serve immediately.'] }),
        step('Finish',
          'Scatter coriander, squeeze lemon, and serve with rice or roti.',
          { min: 1, flame: 'Off' }),
      ],
      serveWith: ['Steamed rice', 'Roti', 'A wedge of lemon'],
    },

    /* ------------------------------------------------------- South Indian */
    {
      id: 'masala-dosa',
      name: 'Masala Dosa',
      aka: ['masala dosa', 'dosa', 'dose', 'masale dose', 'plain dosa'],
      cuisine: 'indian', region: 'Karnataka / Tamil Nadu', technique: 'breakfast',
      veg: true, vegan: true,
      summary: 'A fermented rice and urad dal crepe spread paper-thin on a hot griddle, folded '
        + 'around a turmeric-yellow potato filling.',
      ingredients: [
        ing('rice', 0.4, 'cup', 'Par-boiled rice for the batter', { star: true }),
        ing('urad-dal', 0.1, 'cup', 'Skinned black gram — what makes it ferment and crisp', { star: true }),
        ing('fenugreek', 0.15, 'tsp', 'A few seeds with the dal, for fermentation and colour'),
        ing('potato', 1, 'pieces', 'Boiled, for the masala filling', { star: true }),
        ing('onion', 0.5, 'pieces', 'Sliced, in the filling'),
        ing('mustard-seeds', 0.3, 'tsp', 'Tempering the filling'),
        ing('curry-leaves', 5, 'pieces', 'Tempering the filling'),
        ing('turmeric', 0.3, 'tsp', 'The yellow of the filling'),
        ing('green-chilli', 1, 'pieces', 'In the filling'),
        ing('ginger', 0.3, 'inch', 'In the filling'),
        ing('oil', 1.5, 'tbsp', 'For the griddle and the filling'),
        ing('salt', 0.5, 'tsp', 'In batter and filling'),
      ],
      prep: [
        step('Soak separately',
          'Soak the rice 5 hours. Soak the urad dal and fenugreek separately for 4 hours. Separate soaking matters — they grind differently.',
          { min: 15 }),
        step('Grind and combine',
          'Grind the urad dal first to a light, fluffy batter, then the rice to a slightly grainy one. Combine by hand with salt — your hands carry the wild yeasts.',
          { min: 20 }),
        step('Ferment',
          'Cover and leave somewhere warm 8 to 12 hours until the batter has risen and smells pleasantly sour with bubbles on top.',
          { min: 30,
            tips: ['In a cold kitchen, use the oven with only the light on.'],
            mistakes: ['Salting heavily before fermenting slows it right down.'] }),
        step('Make the potato masala',
          'Temper mustard seeds and curry leaves in oil, add onion, ginger and chilli, then turmeric and the coarsely mashed potato with salt. Cook 5 minutes.',
          { min: 12 }),
      ],
      steps: [
        step('Heat the tawa correctly',
          'Get a flat tawa hot, then rub it with a halved onion dipped in oil and sprinkle water — it should hiss off instantly. Wipe it and lower the heat slightly.',
          { min: 4, flame: 'Medium-high', temp: 'Very hot, then medium',
            tips: ['Too cool and it sticks; too hot and you cannot spread it. Water hissing off in 2 seconds is right.'] }),
        step('Spread thin',
          'Pour a ladle in the centre and spread outward in a continuous spiral with the back of the ladle, working quickly before it sets.',
          { min: 2, flame: 'Medium',
            mistakes: ['Hesitating mid-spiral leaves ridges the dosa tears along.'] }),
        step('Crisp it',
          'Drizzle oil around the edge and cook until the underside is deep golden and the edges lift by themselves — about 2 minutes. A dosa is cooked on one side only.',
          { min: 3, flame: 'Medium' }),
        step('Fill and fold',
          'Spoon potato masala along the centre and fold the dosa over it. Slide it off onto a hot plate.',
          { min: 2, flame: 'Off' }),
        step('Serve immediately',
          'Serve with coconut chutney and sambar. A dosa waits for no one — it softens within minutes.',
          { min: 1, flame: 'Off' }),
      ],
      serveWith: ['Coconut chutney', 'Sambar', 'Podi with sesame oil'],
    },

    {
      id: 'sambar',
      name: 'Sambar',
      aka: ['sambar', 'sambhar', 'saambar', 'tiffin sambar'],
      cuisine: 'indian', region: 'Tamil Nadu', technique: 'soup',
      veg: true, vegan: true,
      summary: 'Toor dal and vegetables in a tamarind broth seasoned with sambar powder, '
        + 'finished with a mustard-seed tadka. Different in every south Indian household.',
      ingredients: [
        ing('toor-dal', 0.35, 'cup', 'Cooked soft and whisked smooth', { star: true }),
        ing('tamarind', 1, 'tbsp', 'Pulp — the sourness that defines sambar', { star: true }),
        ing('sambar-powder', 1.5, 'tsp', 'The defining spice blend', { star: true }),
        ing('drumstick', 1, 'pieces', 'The classic sambar vegetable', { substitute: 'Aubergine, pumpkin or okra' }),
        ing('onion', 0.5, 'pieces', 'Small shallots are best'),
        ing('tomato', 0.7, 'pieces', 'Body'),
        ing('turmeric', 0.25, 'tsp', 'With the dal'),
        ing('mustard-seeds', 0.4, 'tsp', 'Tadka'),
        ing('fenugreek', 0.1, 'tsp', 'A few seeds in the tadka'),
        ing('curry-leaves', 6, 'pieces', 'Tadka'),
        ing('asafoetida', 0.08, 'tsp', 'Tadka — essential here'),
        ing('dried-red-chilli', 2, 'pieces', 'Tadka'),
        ing('sesame-oil', 1, 'tbsp', 'Gingelly oil is traditional'),
        ing('coriander-leaves', 1.5, 'tbsp', 'To finish'),
        ing('salt', 0.5, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Cook the dal',
          'Pressure-cook the toor dal with turmeric until completely soft, then whisk it smooth.',
          { min: 20 }),
        step('Extract the tamarind',
          'Soak the tamarind in warm water 10 minutes and squeeze out the pulp. Discard the fibres.',
          { min: 10 }),
      ],
      steps: [
        step('Cook the vegetables in tamarind water',
          'Simmer the drumstick, onion and tomato in the tamarind water with salt until tender — 10 to 12 minutes. Cooking them in the sour water is what flavours them through.',
          { min: 12, flame: 'Medium',
            tips: ['Harder vegetables first, quick ones later, so nothing turns to mush.'] }),
        step('Add sambar powder',
          'Stir in the sambar powder and simmer 5 minutes so it loses its raw edge.',
          { min: 6, flame: 'Medium',
            mistakes: ['Adding it at the very end leaves a dusty, raw taste.'] }),
        step('Combine with the dal',
          'Add the whisked dal and enough hot water for a pourable consistency. Simmer 6 to 8 minutes — do not boil hard once the dal is in.',
          { min: 8, flame: 'Low' }),
        step('The tadka',
          'Heat sesame oil, pop the mustard seeds, add fenugreek, dried chilli, curry leaves and asafoetida. Pour over the sambar.',
          { min: 3, flame: 'Medium',
            tips: ['Fenugreek burns fast and turns bitter — seconds, not minutes.'] }),
        step('Rest and serve',
          'Scatter coriander and let it sit 10 minutes before serving. Sambar tastes noticeably better after a rest.',
          { min: 3, flame: 'Off' }),
      ],
      serveWith: ['Steamed rice with ghee', 'Idli or dosa', 'Vadai'],
    },

    {
      id: 'idli',
      name: 'Idli',
      aka: ['idli', 'idly', 'steamed idli', 'rice cake'],
      cuisine: 'indian', region: 'South India', technique: 'breakfast',
      veg: true, vegan: true,
      summary: 'Steamed cakes of fermented rice and urad dal batter — soft, faintly sour, and '
        + 'among the most digestible breakfasts there is.',
      ingredients: [
        ing('idli-rice', 0.5, 'cup', 'Par-boiled idli rice, not raw rice', { star: true, substitute: 'Rice rava' }),
        ing('urad-dal', 0.15, 'cup', 'Whole skinned urad — the lift comes from here', { star: true }),
        ing('fenugreek', 0.15, 'tsp', 'Soaked with the dal, aids fermentation'),
        ing('poha', 2, 'tbsp', 'Softens the idli', { substitute: 'Cooked rice' }),
        ing('salt', 0.4, 'tsp', 'Added after fermentation in cold weather'),
        ing('oil', 0.5, 'tsp', 'For greasing the moulds'),
      ],
      prep: [
        step('Soak',
          'Soak the rice and poha together, and the urad dal with fenugreek separately, for 5 hours.',
          { min: 15 }),
        step('Grind the dal light',
          'Grind the urad dal with cold water, a little at a time, until white, fluffy and doubled. Test it: a drop should float in water.',
          { min: 15,
            tips: ['Cold water keeps the grinder from heating the batter and killing the fermentation.'] }),
        step('Grind the rice and combine',
          'Grind the rice to a slightly grainy batter, then fold the two together with your hand until uniform.',
          { min: 12 }),
        step('Ferment',
          'Cover loosely and leave warm 8 to 12 hours until doubled and bubbly.',
          { min: 30,
            mistakes: ['Stirring the batter hard after fermenting knocks all the air out.'] }),
      ],
      steps: [
        step('Prepare the steamer',
          'Bring 2 inches of water to a rolling boil in the idli pot. Grease the moulds lightly.',
          { min: 5, flame: 'High' }),
        step('Fill the moulds',
          'Ladle batter into each mould to about three-quarters — they need room to rise.',
          { min: 3, flame: 'Off' }),
        step('Steam',
          'Steam covered for 10 to 12 minutes. A skewer should come out clean; the surface should be dry and springy.',
          { min: 12, flame: 'Medium-high', temp: 'Steam, ~100°C',
            mistakes: ['Opening the lid early collapses them.'] }),
        step('Rest before unmoulding',
          'Let them stand 3 minutes off the heat, then loosen with a wet spoon. Unmoulding straight away tears them.',
          { min: 4, flame: 'Off' }),
        step('Serve hot',
          'Serve immediately with sambar and chutney.',
          { min: 1, flame: 'Off' }),
      ],
      serveWith: ['Sambar', 'Coconut chutney', 'Milagai podi with sesame oil'],
    },

    {
      id: 'upma',
      name: 'Upma',
      aka: ['upma', 'uppuma', 'rava upma', 'sooji upma'],
      cuisine: 'indian', region: 'South India', technique: 'breakfast',
      veg: true, vegan: true,
      summary: 'Roasted semolina cooked in seasoned water until it swells into a soft, fluffy '
        + 'mound. The whole dish depends on roasting the rava properly.',
      ingredients: [
        ing('semolina', 0.5, 'cup', 'Coarse rava, dry-roasted until fragrant', { star: true }),
        ing('onion', 0.5, 'pieces', 'Softened in the tempering'),
        ing('mustard-seeds', 0.4, 'tsp', 'Tempering'),
        ing('urad-dal', 0.5, 'tsp', 'Tempering — adds a nutty crunch'),
        ing('curry-leaves', 6, 'pieces', 'Tempering'),
        ing('green-chilli', 1, 'pieces', 'Slit'),
        ing('ginger', 0.3, 'inch', 'Minced'),
        ing('cashew', 1, 'tbsp', 'Fried golden in ghee'),
        ing('ghee', 1, 'tbsp', 'Or oil for a vegan version'),
        ing('lemon', 0.25, 'pieces', 'At the end'),
        ing('coriander-leaves', 1.5, 'tbsp', 'To finish'),
        ing('water', 1.25, 'cups', 'Two and a half times the rava, by volume'),
        ing('salt', 0.4, 'tsp', 'In the water'),
      ],
      prep: [
        step('Roast the rava',
          'Dry-roast the semolina on medium, stirring constantly, until it smells nutty and the grains move freely — 6 to 8 minutes. Do not let it colour much. Tip it out to cool.',
          { min: 9,
            tips: ['This is the step that decides whether upma is fluffy or a lump.'],
            mistakes: ['Unroasted rava turns pasty the moment it meets water.'] }),
      ],
      steps: [
        step('Temper',
          'Heat ghee, fry the cashews golden and lift them out. Pop the mustard seeds, add urad dal until it turns light brown, then curry leaves, chilli and ginger.',
          { min: 4, flame: 'Medium' }),
        step('Soften the onion',
          'Add the onion and cook until translucent, 4 minutes.',
          { min: 5, flame: 'Medium' }),
        step('Boil the water',
          'Pour in the water with salt and bring to a full rolling boil. It must be boiling hard before the rava goes in.',
          { min: 5, flame: 'High' }),
        step('Add the rava in a stream',
          'Lower the heat and add the roasted rava in a slow stream with one hand while stirring constantly with the other. This is where lumps are prevented.',
          { min: 4, flame: 'Low',
            mistakes: ['Dumping it in at once guarantees lumps no amount of stirring will fix.'] }),
        step('Steam it through',
          'Cover and cook on low 3 to 4 minutes until the water is absorbed and the upma pulls away from the pan.',
          { min: 5, flame: 'Low' }),
        step('Finish',
          'Take off the heat, fold in the cashews, lemon juice and coriander, and rest 2 minutes before serving.',
          { min: 3, flame: 'Off' }),
      ],
      serveWith: ['Coconut chutney', 'Sugar on the side', 'Hot filter coffee'],
    },

    /* ------------------------------------------------------------ Gujarati */
    {
      id: 'dhokla',
      name: 'Khaman Dhokla',
      aka: ['dhokla', 'khaman', 'khaman dhokla', 'besan dhokla'],
      cuisine: 'indian', region: 'Gujarat', technique: 'breakfast',
      veg: true, vegan: true,
      summary: 'A steamed, spongy besan cake, sweet-sour and topped with a tempering of '
        + 'mustard seeds, green chilli and curry leaves in sugared water.',
      ingredients: [
        ing('besan', 0.6, 'cup', 'Gram flour — the whole body of the dish', { star: true }),
        ing('semolina', 1, 'tbsp', 'A little rava improves the texture'),
        ing('lemon', 0.4, 'pieces', 'Acid to react with the soda'),
        ing('sugar', 1.5, 'tsp', 'In the batter, and more in the tempering water'),
        ing('eno', 1, 'tsp', 'Fruit salt, added at the last second', { star: true, substitute: 'Baking soda plus extra lemon' }),
        ing('turmeric', 0.15, 'tsp', 'Colour'),
        ing('ginger', 0.3, 'inch', 'Paste, in the batter'),
        ing('green-chilli', 1, 'pieces', 'Paste in the batter, slit in the tempering'),
        ing('mustard-seeds', 0.4, 'tsp', 'Tempering'),
        ing('curry-leaves', 6, 'pieces', 'Tempering'),
        ing('sesame-seeds', 0.5, 'tsp', 'Tempering'),
        ing('oil', 1, 'tbsp', 'Tempering'),
        ing('coriander-leaves', 2, 'tbsp', 'To finish'),
        ing('coconut', 1, 'tbsp', 'Grated, to finish'),
        ing('salt', 0.3, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Make the batter',
          'Whisk the besan, semolina, turmeric, salt, sugar, ginger-chilli paste, lemon juice and water into a smooth, lump-free batter of thick pouring consistency. Rest 15 minutes.',
          { min: 18 }),
        step('Get the steamer ready first',
          'Bring the steamer to a full boil and grease the tin BEFORE you add the eno. Once it goes in you have seconds, not minutes.',
          { min: 5 }),
      ],
      steps: [
        step('Activate and pour',
          'Add the eno, sprinkle a few drops of water over it, and whisk in one direction for 20 seconds only — the batter will froth and lighten. Pour straight into the tin.',
          { min: 2, flame: 'Off',
            tips: ['One direction, quickly, then stop. Over-mixing knocks the gas straight back out.'],
            mistakes: ['Letting the batter stand after adding eno gives a flat, dense dhokla.'] }),
        step('Steam',
          'Steam covered on medium-high for 15 to 18 minutes until a skewer comes out clean and the top springs back.',
          { min: 18, flame: 'Medium-high', temp: 'Steam, ~100°C',
            mistakes: ['Opening the lid in the first 10 minutes collapses it.'] }),
        step('Cool, then cut',
          'Rest 10 minutes before cutting into diamonds. Cutting it hot tears the sponge.',
          { min: 10, flame: 'Off' }),
        step('Make the tempering',
          'Heat oil, pop mustard seeds, add sesame, curry leaves and slit chillies. Add half a cup of water with 2 teaspoons of sugar and bring to a boil.',
          { min: 4, flame: 'Medium' }),
        step('Soak and serve',
          'Pour the hot sweet tempering evenly over the cut dhokla and leave 10 minutes to soak it all up. Finish with coriander and coconut.',
          { min: 10, flame: 'Off',
            tips: ['That sugared water is what makes khaman moist rather than dry and crumbly.'] }),
      ],
      serveWith: ['Green chutney', 'Fried green chillies', 'Hot chai'],
    },

    /* ------------------------------------------- Non-vegetarian benchmarks */
    {
      id: 'butter-chicken',
      name: 'Butter Chicken',
      aka: ['butter chicken', 'murgh makhani', 'makhani chicken'],
      cuisine: 'indian', region: 'Delhi', technique: 'curry',
      veg: false, vegan: false,
      summary: 'Yoghurt-marinated chicken charred hard, then folded into a tomato and cashew '
        + 'gravy finished with butter and cream. The char is what separates it from a tomato curry.',
      ingredients: [
        ing('chicken-thigh', 120, 'grams', 'Thigh, not breast — it survives the char', { star: true }),
        ing('yogurt', 2, 'tbsp', 'The marinade base'),
        ing('tomato', 2, 'pieces', 'The gravy — cooked down and blended smooth', { star: true }),
        ing('cashew', 1.5, 'tbsp', 'Soaked and blended — the body, in place of flour', { star: true }),
        ing('butter', 1.5, 'tbsp', 'The makhan in makhani', { star: true }),
        ing('cream', 1.5, 'tbsp', 'Finished off the heat', { healthy: 'Blended cashew and milk' }),
        ing('ginger', 0.6, 'inch', 'Half in the marinade, half in the gravy'),
        ing('garlic', 4, 'cloves', 'Half in the marinade, half in the gravy'),
        ing('red-chilli-powder', 1, 'tsp', 'Kashmiri, for colour more than heat'),
        ing('garam-masala', 0.5, 'tsp', 'In the gravy'),
        ing('kasuri-methi', 0.6, 'tsp', 'Crushed in at the end — the signature aroma', { star: true }),
        ing('sugar', 0.4, 'tsp', 'Balances the tomato acidity'),
        ing('lemon', 0.25, 'pieces', 'In the marinade'),
        ing('salt', 0.5, 'tsp', 'Seasoning'),
      ],
      prep: [
        step('Marinate',
          'Mix the chicken with yoghurt, half the ginger-garlic, chilli powder, lemon and salt. Refrigerate at least 4 hours, overnight if you can.',
          { min: 15,
            tips: ['The yoghurt tenderises as well as flavours — do not cut this short.'] }),
        step('Soak the cashews',
          'Soak the cashews in hot water 20 minutes so they blend completely smooth.',
          { min: 20 }),
      ],
      steps: [
        step('Char the chicken hard',
          'Grill, or sear in a very hot pan in batches, until the edges are properly blackened in places and the chicken is just cooked. Do not crowd the pan.',
          { min: 10, flame: 'High', temp: 'Very hot — 220°C grill or a smoking pan',
            tips: ['Those charred edges are the entire difference from an ordinary tomato curry.'],
            mistakes: ['Gentle cooking gives no char, and the dish tastes flat however good the gravy is.'] }),
        step('Cook the tomato base',
          'Simmer the tomatoes with the remaining ginger-garlic and a little water until completely collapsed, 15 minutes.',
          { min: 16, flame: 'Medium' }),
        step('Blend it silky',
          'Blend the tomato mixture with the soaked cashews until absolutely smooth, then pass it through a sieve. The sieve is what makes it restaurant-smooth.',
          { min: 6, flame: 'Off' }),
        step('Build the makhani',
          'Melt the butter, add the sieved puree with chilli powder, sugar and salt, and simmer gently 10 minutes until it thickens and deepens in colour.',
          { min: 11, flame: 'Low',
            mistakes: ['Boiling hard splits the sauce — keep it at a bare simmer.'] }),
        step('Return the chicken',
          'Add the charred chicken with any resting juices and simmer 5 minutes so it takes on the gravy.',
          { min: 6, flame: 'Low', temp: 'Chicken must reach 74°C internal' }),
        step('Finish off the heat',
          'Take off the flame. Stir in the cream, garam masala and the kasuri methi crushed between your palms. Rest 5 minutes before serving.',
          { min: 3, flame: 'Off',
            tips: ['Crushing the kasuri methi as it goes in releases far more aroma.'] }),
      ],
      serveWith: ['Naan or roti', 'Jeera rice', 'Sliced onion with lemon'],
    },

    {
      id: 'biryani',
      name: 'Biryani',
      aka: ['biryani', 'biriyani', 'dum biryani', 'hyderabadi biryani', 'chicken biryani', 'veg biryani'],
      cuisine: 'indian', region: 'Hyderabad / Lucknow', technique: 'riceDish',
      veg: false, vegan: false,
      summary: 'Par-cooked basmati layered over marinated meat and sealed to cook on dum, so '
        + 'the rice steams in the aromas rising through it. Layering is the dish.',
      ingredients: [
        ing('rice', 0.5, 'cup', 'Long-grain basmati, aged if possible', { star: true }),
        ing('chicken-thigh', 110, 'grams', 'On the bone for flavour', { star: true, substitute: 'Mixed vegetables or paneer' }),
        ing('yogurt', 2.5, 'tbsp', 'The marinade'),
        ing('onion', 1.2, 'pieces', 'Fried into birista — most of the sweetness', { star: true }),
        ing('ghee', 1.5, 'tbsp', 'For the layers'),
        ing('saffron', 0.03, 'tsp', 'Soaked in warm milk, drizzled over the top layer'),
        ing('milk', 2, 'tbsp', 'To bloom the saffron'),
        ing('mint', 3, 'tbsp', 'Layered generously'),
        ing('coriander-leaves', 3, 'tbsp', 'Layered generously'),
        ing('ginger', 0.6, 'inch', 'Paste, in the marinade'),
        ing('garlic', 4, 'cloves', 'Paste, in the marinade'),
        ing('garam-masala', 0.6, 'tsp', 'In the marinade'),
        ing('red-chilli-powder', 0.8, 'tsp', 'In the marinade'),
        ing('bay-leaf', 1, 'pieces', 'In the rice water'),
        ing('cardamom', 0.2, 'tsp', 'In the rice water'),
        ing('cinnamon', 0.15, 'tsp', 'In the rice water'),
        ing('lemon', 0.3, 'pieces', 'Over the layers'),
        ing('salt', 0.7, 'tsp', 'Mostly in the rice water'),
      ],
      prep: [
        step('Marinate the meat',
          'Mix the chicken with yoghurt, ginger-garlic, chilli, garam masala, salt and half the fried onion. Rest at least 2 hours, ideally overnight.',
          { min: 15 }),
        step('Soak the rice',
          'Rinse the basmati until the water runs clear, then soak exactly 30 minutes. Longer and the grains break during layering.',
          { min: 30 }),
        step('Fry the birista',
          'Fry the sliced onion slowly in ghee until deep golden and crisp. Drain on paper — it crisps as it cools. Reserve some for the top.',
          { min: 18,
            mistakes: ['Rushing on high heat gives onion that is burnt outside and raw inside.'] }),
      ],
      steps: [
        step('Par-cook the rice to 70%',
          'Boil plenty of water with salt and whole spices. Add the drained rice and cook only until a grain breaks into three when pressed — about 5 minutes. Drain immediately.',
          { min: 7, flame: 'High',
            tips: ['70% is the number. Fully cooked rice turns to paste under dum.'],
            mistakes: ['Overcooking here is the single most common way biryani fails.'] }),
        step('Cook the marinated meat',
          'Cook the marinade down in a heavy pot until the chicken is nearly done and the masala has thickened, about 12 minutes.',
          { min: 13, flame: 'Medium' }),
        step('Layer it',
          'Spread the meat flat. Layer the rice over it. Scatter birista, mint, coriander, lemon juice, ghee and the saffron milk over the top. Do not stir — ever.',
          { min: 6, flame: 'Off',
            tips: ['Distinct layers are the whole point; you mix it only on the plate.'] }),
        step('Seal and dum',
          'Seal the lid with dough or foil, cook 2 minutes on high, then on the lowest possible heat over a tawa for 20 to 25 minutes.',
          { min: 25, flame: 'Very low', temp: 'Chicken must reach 74°C internal',
            tips: ['A tawa under the pot stops the bottom layer catching.'],
            mistakes: ['Peeking releases the steam that is doing all the cooking.'] }),
        step('Rest before opening',
          'Take it off the heat and leave it sealed another 10 minutes. Open, and lift portions out from top to bottom so each plate gets both layers.',
          { min: 10, flame: 'Off' }),
      ],
      serveWith: ['Raita', 'Mirchi ka salan', 'Sliced onion with lemon'],
    },
  ];

  /* ====================================================================== */
  /* Matching                                                                */
  /* ====================================================================== */

  /* Words that carry no identifying information, so "puran poli recipe" and
     "easy puran poli" both find the same dish. */
  const NOISE = /\b(recipe|recipes|easy|quick|simple|best|authentic|homemade|style|restaurant|dish|how|to|make|at|home)\b/g;

  const normalise = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(NOISE, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let INDEX = [];

  /** Rebuild the lookup index. Called once here and again by any file that
   *  registers more dishes, so the catalogue can grow across several files
   *  without this one turning into a single unreadable wall of data. */
  function reindex() {
    INDEX = DISHES.map((dish) => ({
      dish,
      keys: [dish.name].concat(dish.aka || []).map(normalise).filter(Boolean),
    }));
  }
  reindex();

  /** Append more dishes. The whole point of the data-driven design. */
  function register(list) {
    (list || []).forEach((dish) => {
      if (!dish || !dish.id) return;
      if (DISHES.some((d) => d.id === dish.id)) return;   // never silently duplicate
      DISHES.push(dish);
    });
    reindex();
    AFR.data.dishes.count = DISHES.length;
    AFR.data.dishes.byId = DISHES.reduce((acc, d) => { acc[d.id] = d; return acc; }, {});
  }

  /**
   * Find the dish a name refers to.
   *
   * Exact-ish matching only. A loose match here would be worse than no match:
   * serving someone a confident Puran Poli when they asked for something else
   * is exactly the failure this file exists to fix.
   *
   * @returns {{dish: object, confidence: number}|null}
   */
  function match(name) {
    const text = normalise(name);
    if (!text || text.length < 3) return null;

    let best = null;

    INDEX.forEach(({ dish, keys }) => {
      keys.forEach((key) => {
        let score = 0;
        if (text === key) score = 1;
        /* "chicken biryani" contains "biryani"; require the key to be a whole
           phrase in the text, not merely a substring of some longer word. */
        else if (new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) {
          score = 0.8 * (key.length / Math.max(text.length, key.length)) + 0.2;
        }
        if (score > (best ? best.confidence : 0)) best = { dish, confidence: score };
      });
    });

    return best && best.confidence >= 0.45 ? best : null;
  }

  /**
   * Present a known dish as something the composition engine can consume.
   * The engine calls `.ingredients(c)`, `.prep(c)` and `.steps(c)` on whatever
   * it is given, so a dish record wearing this shape flows through scaling,
   * diet swaps, nutrition and costing untouched.
   */
  function toTechnique(dish) {
    const base = (AFR.data.techniques && AFR.data.techniques.all[dish.technique])
      || (AFR.data.techniques && AFR.data.techniques.all.curry);

    const prep = () => (dish.prep || []).map((s) => Object.assign({}, s));
    const cook = () => dish.steps.map((s) => Object.assign({}, s));

    return Object.assign({}, base, {
      id: dish.technique,
      name: base ? base.name : 'Traditional method',
      knownDish: dish.id,
      ingredients: () => dish.ingredients.map((line) => Object.assign({}, line)),
      /* The engine asks for `prep` and `cook` — `steps` is the name used in the
         data above, so both are exposed rather than relying on either. */
      prep,
      cook,
      steps: cook,
      /* Times come from this dish's own method, not the generic technique's. */
      times: () => {
        const sum = (list) => list.reduce((total, s) => total + (s.min || 0), 0);
        return { prep: sum(prep()), cook: sum(cook()) };
      },
    });
  }

  AFR.data = AFR.data || {};
  AFR.data.dishes = {
    all: DISHES,
    byId: DISHES.reduce((acc, d) => { acc[d.id] = d; return acc; }, {}),
    match,
    toTechnique,
    normalise,
    register,
    ing,
    step,
    count: DISHES.length,
  };
})(window);
