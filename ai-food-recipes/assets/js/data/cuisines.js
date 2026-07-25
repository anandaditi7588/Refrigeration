/* ==========================================================================
 * cuisines.js — regional flavour profiles.
 *
 * Each profile describes how a kitchen in that region actually builds flavour:
 * the fat it starts with, the aromatics that hit the pan first, the spices,
 * the acid and finish, plus what lands on the table beside it. The recipe
 * engine composes these with a technique template (see dishes.js) so the same
 * dish name produces a genuinely Thai / Mexican / Turkish result.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  const CUISINES = {
    indian: {
      id: 'indian', name: 'Indian', flag: '🇮🇳',
      fats: ['ghee', 'oil'],
      aromatics: ['onion', 'garlic', 'ginger', 'green-chilli'],
      wholeSpices: ['cumin', 'bay-leaf', 'cardamom', 'cinnamon', 'cloves'],
      groundSpices: ['turmeric', 'red-chilli-powder', 'coriander-powder', 'garam-masala'],
      acids: ['tomato', 'lemon', 'yogurt'],
      finishers: ['coriander-leaves', 'garam-masala', 'fenugreek', 'cream'],
      staples: ['rice', 'wheat-flour'],
      sides: ['Steamed basmati rice', 'Hot phulka roti', 'Cucumber raita', 'Kachumber salad', 'Papad', 'Pickle'],
      drinks: ['Masala chai', 'Sweet or salted lassi', 'Jal jeera', 'Buttermilk (chaas)', 'Nimbu pani'],
      garnish: 'Chopped coriander, a swirl of cream and julienned ginger',
      plating: 'Serve in a warm kadai or copper handi with the rice mounded alongside and a lemon wedge on the rim.',
      signature: 'Bloom whole spices in hot fat first — that tadka is the whole personality of the dish.',
      temperature: 'Medium-high for the bhuna stage, then low and covered so the masala releases oil.',
    },

    italian: {
      id: 'italian', name: 'Italian', flag: '🇮🇹',
      fats: ['olive-oil', 'butter'],
      aromatics: ['garlic', 'onion'],
      wholeSpices: ['black-pepper'],
      groundSpices: ['oregano', 'basil'],
      acids: ['tomato', 'vinegar', 'lemon'],
      finishers: ['basil', 'olive-oil', 'cheese', 'black-pepper'],
      staples: ['pasta', 'all-purpose-flour'],
      sides: ['Garlic bread', 'Rocket and parmesan salad', 'Roasted vegetables', 'Focaccia', 'Caprese'],
      drinks: ['Chianti or a light red', 'Sparkling water with lemon', 'Espresso to finish', 'Aperol spritz'],
      garnish: 'Torn basil, a grating of parmesan and a thread of good olive oil',
      plating: 'Wide shallow bowl, sauce clinging to the pasta rather than pooled beneath it.',
      signature: 'Finish the pasta in the sauce with a ladle of starchy cooking water — that is what makes it glossy.',
      temperature: 'Gentle heat for soffritto; never brown the garlic.',
    },

    chinese: {
      id: 'chinese', name: 'Chinese', flag: '🇨🇳',
      fats: ['oil', 'sesame-oil'],
      aromatics: ['garlic', 'ginger', 'spring-onion'],
      wholeSpices: ['star-anise', 'black-pepper'],
      groundSpices: ['black-pepper'],
      acids: ['vinegar', 'soy-sauce'],
      finishers: ['spring-onion', 'sesame-oil', 'sesame-seeds'],
      staples: ['rice', 'noodles'],
      sides: ['Steamed jasmine rice', 'Stir-fried greens with garlic', 'Hot and sour soup', 'Spring rolls'],
      drinks: ['Jasmine tea', 'Oolong tea', 'Chilled soy milk', 'Light lager'],
      garnish: 'Sliced spring onion greens, toasted sesame and a few drops of sesame oil',
      plating: 'Serve family-style on a shared platter, rice in individual bowls.',
      signature: 'Get the wok smoking before anything goes in — wok hei is heat, not seasoning.',
      temperature: 'Very high heat, constant motion, everything prepped before you start.',
    },

    japanese: {
      id: 'japanese', name: 'Japanese', flag: '🇯🇵',
      fats: ['sesame-oil', 'oil'],
      aromatics: ['ginger', 'spring-onion', 'garlic'],
      wholeSpices: ['sesame-seeds'],
      groundSpices: ['black-pepper'],
      acids: ['vinegar', 'soy-sauce'],
      finishers: ['sesame-seeds', 'spring-onion'],
      staples: ['rice', 'noodles'],
      sides: ['Miso soup', 'Steamed short-grain rice', 'Pickled ginger', 'Edamame', 'Sunomono salad'],
      drinks: ['Green tea', 'Chilled barley tea', 'Sake', 'Ramune'],
      garnish: 'Toasted sesame, fine spring onion rings and a sliver of nori',
      plating: 'Restraint and negative space — small vessels, one focal point per plate.',
      signature: 'Balance is the technique: sweet, salt and acid measured, never guessed.',
      temperature: 'Precise moderate heat; overcooking is the main risk.',
    },

    thai: {
      id: 'thai', name: 'Thai', flag: '🇹🇭',
      fats: ['oil', 'coconut-oil'],
      aromatics: ['garlic', 'green-chilli', 'ginger', 'spring-onion'],
      wholeSpices: ['black-pepper'],
      groundSpices: ['coriander-powder'],
      acids: ['lime', 'tamarind', 'fish-sauce'],
      finishers: ['basil', 'peanut', 'lime', 'coriander-leaves'],
      staples: ['rice', 'noodles'],
      sides: ['Jasmine rice', 'Som tam (green papaya salad)', 'Thai cucumber relish', 'Prawn crackers'],
      drinks: ['Thai iced tea', 'Fresh coconut water', 'Lemongrass cooler', 'Singha beer'],
      garnish: 'Crushed peanuts, Thai basil, lime wedge and a scatter of chilli',
      plating: 'Bright and layered — the garnish is part of the seasoning, not decoration.',
      signature: 'Chase the four-way balance: salty, sour, sweet, spicy. Taste and adjust at the end.',
      temperature: 'High heat and fast for stir-fries; a bare simmer for coconut curries so they never split.',
    },

    mexican: {
      id: 'mexican', name: 'Mexican', flag: '🇲🇽',
      fats: ['oil', 'olive-oil'],
      aromatics: ['onion', 'garlic', 'green-chilli'],
      wholeSpices: ['cumin', 'black-pepper'],
      groundSpices: ['paprika', 'red-chilli-powder', 'oregano'],
      acids: ['lime', 'tomato', 'vinegar'],
      finishers: ['coriander-leaves', 'lime', 'cheese'],
      staples: ['tortilla', 'black-beans', 'rice'],
      sides: ['Mexican red rice', 'Refried beans', 'Pico de gallo', 'Guacamole', 'Warm tortillas'],
      drinks: ['Horchata', 'Agua fresca', 'Michelada', 'Fresh lime soda'],
      garnish: 'Coriander, diced white onion, crumbled cheese and a lime wedge',
      plating: 'Rustic and generous — colour contrast does the work.',
      signature: 'Toast and rehydrate dried chillies rather than reaching for powder; the depth is incomparable.',
      temperature: 'High heat for the char, then low to let the sauce settle.',
    },

    french: {
      id: 'french', name: 'French', flag: '🇫🇷',
      fats: ['butter', 'olive-oil'],
      aromatics: ['onion', 'garlic', 'carrot'],
      wholeSpices: ['bay-leaf', 'black-pepper', 'thyme'],
      groundSpices: ['thyme', 'black-pepper'],
      acids: ['vinegar', 'lemon'],
      finishers: ['butter', 'parsley', 'cream'],
      staples: ['bread', 'all-purpose-flour'],
      sides: ['Crusty baguette', 'Gratin dauphinois', 'Green beans amandine', 'Simple green salad'],
      drinks: ['Dry white wine', 'Red Burgundy', 'Sparkling water', 'Café noir'],
      garnish: 'Chopped parsley, a knob of cold butter swirled in at the end',
      plating: 'Clean plate, sauce spooned deliberately, one clear focal point.',
      signature: 'Build a proper mirepoix and deglaze the fond — the browned bits are the sauce.',
      temperature: 'Patient medium-low; French cooking rewards time, not heat.',
    },

    american: {
      id: 'american', name: 'American', flag: '🇺🇸',
      fats: ['butter', 'oil'],
      aromatics: ['onion', 'garlic'],
      wholeSpices: ['black-pepper'],
      groundSpices: ['paprika', 'black-pepper', 'oregano'],
      acids: ['vinegar', 'ketchup', 'lemon'],
      finishers: ['cheese', 'butter', 'parsley'],
      staples: ['bread', 'potato'],
      sides: ['Skin-on fries', 'Coleslaw', 'Corn on the cob', 'Mac and cheese', 'Pickles'],
      drinks: ['Iced tea', 'Lemonade', 'Craft soda', 'Cold beer'],
      garnish: 'Melted cheese, crisp pickles and a dusting of paprika',
      plating: 'Generous and stacked — height and abundance are the aesthetic.',
      signature: 'Season in layers and let roasted or grilled surfaces develop real colour before turning.',
      temperature: 'High for the sear, moderate to carry it through.',
    },

    mediterranean: {
      id: 'mediterranean', name: 'Mediterranean', flag: '🌊',
      fats: ['olive-oil'],
      aromatics: ['garlic', 'onion'],
      wholeSpices: ['black-pepper', 'oregano'],
      groundSpices: ['oregano', 'paprika', 'thyme'],
      acids: ['lemon', 'vinegar', 'tomato'],
      finishers: ['olive-oil', 'parsley', 'lemon', 'cheese'],
      staples: ['bread', 'chickpeas', 'quinoa'],
      sides: ['Greek salad', 'Hummus and pita', 'Roasted vegetables', 'Tabbouleh', 'Tzatziki'],
      drinks: ['Mint lemonade', 'Chilled rosé', 'Ayran', 'Sparkling water with lemon'],
      garnish: 'Lemon zest, parsley, olive oil and crumbled feta',
      plating: 'Sun-bleached palette — lots of green and white, served warm rather than hot.',
      signature: 'Good olive oil used twice: once to cook, once raw at the very end.',
      temperature: 'Moderate; the point is ingredient clarity, not caramelisation.',
    },

    'middle-eastern': {
      id: 'middle-eastern', name: 'Middle Eastern', flag: '🕌',
      fats: ['olive-oil', 'ghee'],
      aromatics: ['onion', 'garlic'],
      wholeSpices: ['cumin', 'cinnamon', 'cardamom', 'black-pepper'],
      groundSpices: ['cumin', 'coriander-powder', 'paprika', 'turmeric'],
      acids: ['lemon', 'yogurt', 'tamarind'],
      finishers: ['parsley', 'sesame-seeds', 'lemon', 'mint'],
      staples: ['rice', 'chickpeas', 'bread'],
      sides: ['Saffron rice', 'Fattoush', 'Hummus', 'Warm flatbread', 'Pickled turnips'],
      drinks: ['Mint tea', 'Ayran', 'Jallab', 'Fresh pomegranate juice'],
      garnish: 'Toasted nuts, pomegranate seeds, parsley and a drizzle of tahini',
      plating: 'Large communal platters, layered rice, garnish scattered edge to edge.',
      signature: 'Warm spice used with a light hand and balanced by a sharp yogurt or lemon element.',
      temperature: 'Low and slow for braises; blistering heat for grilled meats.',
    },

    korean: {
      id: 'korean', name: 'Korean', flag: '🇰🇷',
      fats: ['sesame-oil', 'oil'],
      aromatics: ['garlic', 'ginger', 'spring-onion'],
      wholeSpices: ['sesame-seeds', 'black-pepper'],
      groundSpices: ['red-chilli-powder', 'paprika'],
      acids: ['vinegar', 'soy-sauce'],
      finishers: ['sesame-seeds', 'sesame-oil', 'spring-onion'],
      staples: ['rice', 'noodles'],
      sides: ['Steamed short-grain rice', 'Kimchi', 'Seasoned spinach namul', 'Pickled radish'],
      drinks: ['Barley tea', 'Soju', 'Sikhye', 'Citron tea'],
      garnish: 'Toasted sesame seeds, sesame oil and finely sliced spring onion',
      plating: 'Main dish centre, a constellation of small banchan around it.',
      signature: 'Marinate properly — Korean flavour is built before the pan, not in it.',
      temperature: 'Hard sear for grilled dishes; steady simmer for stews.',
    },

    vietnamese: {
      id: 'vietnamese', name: 'Vietnamese', flag: '🇻🇳',
      fats: ['oil'],
      aromatics: ['garlic', 'ginger', 'spring-onion', 'green-chilli'],
      wholeSpices: ['star-anise', 'cinnamon', 'black-pepper'],
      groundSpices: ['black-pepper', 'coriander-powder'],
      acids: ['lime', 'vinegar', 'fish-sauce'],
      finishers: ['mint', 'basil', 'peanut', 'lime', 'coriander-leaves'],
      staples: ['noodles', 'rice'],
      sides: ['Fresh herb plate', 'Pickled carrot and daikon', 'Rice paper rolls', 'Steamed rice'],
      drinks: ['Vietnamese iced coffee', 'Fresh coconut', 'Sugarcane juice', 'Jasmine tea'],
      garnish: 'A mountain of fresh herbs, bean sprouts, lime and sliced chilli',
      plating: 'Broth or base in the bowl, raw herbs served alongside for the diner to add.',
      signature: 'Freshness over richness — raw herbs and lime added at the table, never cooked in.',
      temperature: 'Long gentle simmer for broths; the rest is barely cooked at all.',
    },

    spanish: {
      id: 'spanish', name: 'Spanish', flag: '🇪🇸',
      fats: ['olive-oil'],
      aromatics: ['garlic', 'onion', 'bell-pepper'],
      wholeSpices: ['bay-leaf', 'black-pepper', 'saffron'],
      groundSpices: ['paprika', 'saffron'],
      acids: ['tomato', 'vinegar', 'lemon'],
      finishers: ['parsley', 'olive-oil', 'lemon'],
      staples: ['rice', 'bread'],
      sides: ['Pan con tomate', 'Patatas bravas', 'Green olives', 'Mixed leaf salad'],
      drinks: ['Sangria', 'Tinto de verano', 'Dry sherry', 'Cava'],
      garnish: 'Lemon wedges, parsley and a dusting of smoked paprika',
      plating: 'Straight from the pan to the table — the paellera is the serving dish.',
      signature: 'Sofrito cooked down slowly until jammy, and smoked paprika added off the heat so it never burns.',
      temperature: 'Confident medium heat; the socarrat needs the last two minutes on full.',
    },

    turkish: {
      id: 'turkish', name: 'Turkish', flag: '🇹🇷',
      fats: ['olive-oil', 'butter'],
      aromatics: ['onion', 'garlic', 'bell-pepper'],
      wholeSpices: ['cumin', 'black-pepper'],
      groundSpices: ['paprika', 'cumin', 'oregano'],
      acids: ['lemon', 'yogurt', 'tomato'],
      finishers: ['parsley', 'yogurt', 'mint', 'lemon'],
      staples: ['bread', 'rice', 'lentils'],
      sides: ['Pilav', 'Shepherd salad (çoban salatası)', 'Cacık', 'Warm pide bread'],
      drinks: ['Ayran', 'Turkish tea', 'Turkish coffee', 'Şalgam'],
      garnish: 'Sumac-dusted onions, parsley and a spoon of thick yogurt',
      plating: 'Yogurt beneath, meat above, melted spiced butter poured over at the table.',
      signature: 'Pepper paste and a spoonful of yogurt do more for a Turkish dish than any spice blend.',
      temperature: 'Charcoal-hot for kebabs; slow and low for the stews.',
    },

    african: {
      id: 'african', name: 'African', flag: '🌍',
      fats: ['oil', 'coconut-oil'],
      aromatics: ['onion', 'garlic', 'ginger', 'green-chilli'],
      wholeSpices: ['cumin', 'cardamom', 'cloves', 'black-pepper'],
      groundSpices: ['paprika', 'turmeric', 'coriander-powder', 'red-chilli-powder'],
      acids: ['tomato', 'lemon', 'tamarind'],
      finishers: ['coriander-leaves', 'peanut', 'lemon'],
      staples: ['rice', 'corn', 'sweet-potato'],
      sides: ['Jollof rice', 'Fried plantain', 'Injera', 'Kachumbari salad', 'Ugali'],
      drinks: ['Hibiscus tea (zobo)', 'Ginger beer', 'Fresh baobab juice', 'Rooibos tea'],
      garnish: 'Coriander, sliced chilli and crushed roasted peanuts',
      plating: 'Communal bowls, the staple as the base and stew ladled generously over.',
      signature: 'Cook the tomato-pepper base right down until the oil separates — that is the flavour foundation.',
      temperature: 'Long, steady heat; most dishes improve on the second day.',
    },

    global: {
      id: 'global', name: 'Global / Fusion', flag: '🌐',
      fats: ['olive-oil', 'butter', 'oil'],
      aromatics: ['onion', 'garlic', 'ginger'],
      wholeSpices: ['black-pepper', 'cumin'],
      groundSpices: ['paprika', 'oregano', 'black-pepper'],
      acids: ['lemon', 'vinegar', 'tomato'],
      finishers: ['parsley', 'olive-oil', 'lemon'],
      staples: ['rice', 'pasta', 'bread'],
      sides: ['Green salad', 'Roasted seasonal vegetables', 'Crusty bread', 'Steamed rice'],
      drinks: ['Sparkling water with citrus', 'Iced tea', 'House wine', 'Fresh juice'],
      garnish: 'Fresh herbs, citrus zest and a finishing drizzle of good oil',
      plating: 'Let the ingredients lead — clean plate, clear focal point, one textural contrast.',
      signature: 'Season in layers and taste at every stage; that single habit outperforms any recipe.',
      temperature: 'Match the heat to the goal: high to colour, low to cook through.',
    },
  };

  /* Keyword → cuisine, used to auto-detect from a dish name (Step 5).
     Ordered longest/most-specific first at match time. */
  const DETECTION = {
    indian: ['biryani', 'masala', 'paneer', 'tikka', 'curry', 'dal', 'daal', 'tandoori', 'samosa', 'dosa',
      'idli', 'chaat', 'korma', 'vindaloo', 'butter chicken', 'rogan josh', 'chole', 'rajma', 'palak',
      'pulao', 'raita', 'naan', 'roti', 'paratha', 'halwa', 'kheer', 'lassi', 'pakora', 'bhaji', 'sambar',
      'rasam', 'upma', 'poha', 'kadai', 'malai', 'jalebi', 'gulab jamun', 'vada', 'uttapam', 'thali'],
    italian: ['pasta', 'pizza', 'risotto', 'lasagna', 'lasagne', 'carbonara', 'bolognese', 'gnocchi',
      'bruschetta', 'tiramisu', 'focaccia', 'pesto', 'ravioli', 'penne', 'spaghetti', 'alfredo',
      'minestrone', 'caprese', 'panna cotta', 'arancini', 'calzone'],
    chinese: ['fried rice', 'chow mein', 'manchurian', 'szechuan', 'sichuan', 'kung pao', 'dim sum',
      'spring roll', 'sweet and sour', 'hakka', 'wonton', 'mapo', 'char siu', 'dumpling', 'bao',
      'hot pot', 'lo mein', 'chop suey', 'peking'],
    japanese: ['sushi', 'ramen', 'tempura', 'teriyaki', 'miso', 'udon', 'katsu curry', 'katsu', 'donburi', 'yakitori',
      'onigiri', 'gyoza', 'okonomiyaki', 'sashimi', 'matcha', 'takoyaki', 'soba'],
    thai: ['pad thai', 'tom yum', 'green curry', 'red curry', 'massaman', 'som tam', 'thai', 'panang',
      'tom kha', 'satay', 'larb', 'khao soi'],
    mexican: ['taco', 'burrito', 'quesadilla', 'enchilada', 'guacamole', 'nachos', 'salsa', 'fajita',
      'churro', 'tamale', 'pozole', 'elote', 'chilaquiles', 'mole'],
    french: ['ratatouille', 'croissant', 'quiche', 'crepe', 'crêpe', 'baguette', 'coq au vin',
      'bouillabaisse', 'souffle', 'soufflé', 'macaron', 'cassoulet', 'confit', 'gratin', 'bourguignon',
      'creme brulee', 'crème brûlée', 'tarte'],
    american: ['burger', 'hot dog', 'bbq', 'barbecue', 'mac and cheese', 'pancake', 'brownie', 'cheesecake',
      'cornbread', 'meatloaf', 'buffalo', 'buffalo wing', 'clam chowder', 'pulled pork', 'apple pie', 'waffle', 'grits'],
    mediterranean: ['greek', 'gyro', 'souvlaki', 'moussaka', 'tzatziki', 'feta', 'mediterranean',
      'spanakopita', 'dolma', 'orzo'],
    'middle-eastern': ['hummus', 'falafel', 'shawarma', 'kebab', 'kofta', 'tabbouleh', 'baba ganoush',
      'tahini', 'shakshuka', 'mansaf', 'fattoush', 'manakish'],
    korean: ['kimchi', 'bibimbap', 'bulgogi', 'tteokbokki', 'japchae', 'korean', 'gochujang', 'samgyeopsal',
      'kimbap', 'sundubu'],
    vietnamese: ['pho', 'phở', 'banh mi', 'bánh mì', 'fresh spring roll', 'vietnamese', 'bun cha', 'goi cuon'],
    spanish: ['paella', 'tapas', 'gazpacho', 'tortilla espanola', 'churros', 'patatas', 'sangria',
      'croquetas', 'jamon'],
    turkish: ['turkish', 'baklava', 'pide', 'lahmacun', 'menemen', 'borek', 'köfte', 'kofte', 'iskender',
      'simit', 'dolma'],
    african: ['jollof', 'injera', 'doro wat', 'bobotie', 'tagine', 'couscous', 'suya', 'egusi', 'fufu',
      'chakalaka', 'bunny chow', 'piri piri', 'peri peri'],
  };

  /** Auto-detect a cuisine id from a free-text dish name. */
  function detect(dishName) {
    const text = String(dishName || '').toLowerCase();
    if (!text.trim()) return 'global';

    let best = null;
    let bestLen = 0;
    Object.entries(DETECTION).forEach(([cuisineId, keywords]) => {
      keywords.forEach((kw) => {
        if (AFR.utils.matchesKeyword(text, kw) && kw.length > bestLen) {
          best = cuisineId;
          bestLen = kw.length;
        }
      });
    });

    // A bare cuisine name in the dish string ("french onion soup") also counts.
    if (!best) {
      const named = Object.keys(CUISINES).find((id) =>
        AFR.utils.matchesKeyword(text, CUISINES[id].name.toLowerCase())
        || AFR.utils.matchesKeyword(text, id.replace('-', ' ')));
      if (named) best = named;
    }
    return best || 'global';
  }

  function get(id) { return CUISINES[id] || CUISINES.global; }

  AFR.data = AFR.data || {};
  AFR.data.cuisines = {
    all: CUISINES,
    list: Object.values(CUISINES),
    detection: DETECTION,
    detect,
    get,
  };
})(window);
