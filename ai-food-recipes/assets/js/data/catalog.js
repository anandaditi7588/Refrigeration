/* ==========================================================================
 * catalog.js — the browsable content on the home page.
 *
 * These are curated *starting points*, not stored recipes: every card hands
 * its dish name to the wizard, which then generates a full recipe tailored to
 * the visitor's servings, diet, spice level and equipment. That keeps one
 * generation path for the whole app instead of two.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  /* Row: name, cuisineId, diet, minutes, difficulty, rating, tags, description */
  const r = (name, cuisine, diet, minutes, difficulty, rating, tags, desc) =>
    ({ id: AFR.utils.slug(name), name, cuisine, diet, minutes, difficulty, rating, tags, desc });

  const RECIPES = [
    /* ------------------------------------------------------------- Indian */
    r('Chicken Biryani', 'indian', 'nonveg', 75, 'Medium', 4.9, ['trending', 'regional', 'festive'],
      'Long-grain rice layered with spiced chicken and crisp fried onions, finished under a sealed lid.'),
    r('Paneer Butter Masala', 'indian', 'veg', 40, 'Easy', 4.8, ['trending', 'latest', 'regional'],
      'Silky tomato-cashew gravy with soft paneer — the restaurant favourite, rebuilt for a home kitchen.'),
    r('Masala Dosa', 'indian', 'veg', 45, 'Medium', 4.7, ['regional', 'breakfast', 'snacks'],
      'Fermented rice crepe, crisp at the edges, wrapped around spiced potato.'),
    r('Chole Bhature', 'indian', 'veg', 60, 'Medium', 4.6, ['regional', 'street'],
      'Slow-spiced chickpeas with a pillowy fried bread. Punchy, tangy, unapologetic.'),
    r('Palak Paneer', 'indian', 'veg', 35, 'Easy', 4.6, ['healthy', 'veg', 'latest'],
      'Bright green spinach gravy that stays vivid — the trick is a fast blanch and an ice bath.'),
    r('Dal Tadka', 'indian', 'veg', 30, 'Easy', 4.7, ['healthy', 'quick', 'veg'],
      'Everyday lentils finished with a sizzling ghee tempering poured over at the table.'),
    r('Tandoori Chicken', 'indian', 'nonveg', 50, 'Medium', 4.8, ['trending', 'nonveg', 'highprotein'],
      'Yogurt-marinated chicken with a blistered, deeply spiced crust.'),
    r('Vegetable Pulao', 'indian', 'veg', 35, 'Easy', 4.4, ['quick', 'veg', 'kids'],
      'A one-pot rice dish where every grain stays separate and lightly perfumed.'),
    r('Rajma Chawal', 'indian', 'veg', 55, 'Easy', 4.6, ['regional', 'highprotein', 'veg'],
      'Kidney beans simmered until creamy, spooned over hot rice. Comfort food, north Indian style.'),
    r('Gulab Jamun', 'indian', 'veg', 45, 'Medium', 4.8, ['desserts', 'festive'],
      'Milk-solid dumplings soaked warm in cardamom syrup until they double in size.'),
    r('Mango Lassi', 'indian', 'veg', 10, 'Easy', 4.7, ['drinks', 'quick', 'kids'],
      'Thick yogurt and ripe mango, blended cold with a whisper of cardamom.'),
    r('Samosa', 'indian', 'veg', 60, 'Medium', 4.7, ['snacks', 'street'],
      'Flaky pastry triangles with spiced potato and peas, fried low and slow for a blistered shell.'),

    /* ------------------------------------------------------------ Italian */
    r('Margherita Pizza', 'italian', 'veg', 90, 'Medium', 4.9, ['trending', 'regional', 'kids'],
      'Three ingredients on a blistered base — which is exactly why the dough and the oven matter.'),
    r('Spaghetti Carbonara', 'italian', 'nonveg', 25, 'Medium', 4.8, ['trending', 'quick', 'nonveg'],
      'Egg, hard cheese, cured pork and pepper. No cream, ever — the emulsion does the work.'),
    r('Mushroom Risotto', 'italian', 'veg', 45, 'Medium', 4.6, ['latest', 'veg'],
      'Slow-stirred rice that releases its own starch into a glossy, spoon-coating sauce.'),
    r('Lasagna', 'italian', 'nonveg', 100, 'Hard', 4.8, ['regional', 'festive', 'nonveg'],
      'Layered pasta, slow ragù and béchamel, rested before cutting so it holds its shape.'),
    r('Pesto Pasta', 'italian', 'veg', 20, 'Easy', 4.5, ['quick', 'veg', 'latest'],
      'Raw basil sauce tossed through hot pasta off the heat, so the herbs stay green.'),
    r('Tiramisu', 'italian', 'veg', 30, 'Easy', 4.9, ['desserts', 'trending'],
      'Coffee-soaked sponge under whipped mascarpone. No bake, all patience.'),

    /* ------------------------------------------------------- East & SE Asia */
    r('Chicken Fried Rice', 'chinese', 'nonveg', 25, 'Easy', 4.6, ['quick', 'nonveg', 'trending'],
      'Day-old rice, a screaming hot wok, and everything prepped before you start.'),
    r('Veg Manchurian', 'chinese', 'veg', 40, 'Medium', 4.5, ['street', 'veg', 'snacks'],
      'Crisp vegetable dumplings tossed in a glossy garlic-soy sauce.'),
    r('Kung Pao Chicken', 'chinese', 'nonveg', 30, 'Medium', 4.6, ['nonveg', 'latest'],
      'Numbing, sweet and sharp all at once, with peanuts for the crunch.'),
    r('Chicken Ramen', 'japanese', 'nonveg', 120, 'Hard', 4.8, ['trending', 'regional', 'nonveg'],
      'A patiently built broth, springy noodles, and toppings that each earn their place.'),
    r('Vegetable Sushi Rolls', 'japanese', 'veg', 50, 'Medium', 4.5, ['regional', 'healthy', 'veg'],
      'Properly seasoned rice is 80% of good sushi — the filling is almost the easy part.'),
    r('Chicken Katsu Curry', 'japanese', 'nonveg', 45, 'Medium', 4.7, ['latest', 'nonveg', 'kids'],
      'Panko-crusted cutlet with a mellow, faintly sweet curry sauce.'),
    r('Pad Thai', 'thai', 'nonveg', 30, 'Medium', 4.8, ['trending', 'regional'],
      'Tamarind, fish sauce and palm sugar in balance — taste and adjust before it leaves the pan.'),
    r('Thai Green Curry', 'thai', 'veg', 35, 'Easy', 4.7, ['regional', 'veg', 'latest'],
      'Coconut milk kept at a bare simmer so it never splits, with the paste fried first.'),
    r('Tom Yum Soup', 'thai', 'nonveg', 25, 'Easy', 4.6, ['healthy', 'quick', 'nonveg'],
      'Hot, sour and aromatic. Lemongrass and lime leaf do the heavy lifting.'),
    r('Bibimbap', 'korean', 'veg', 40, 'Medium', 4.7, ['healthy', 'regional', 'veg'],
      'A bowl of separately seasoned components, mixed hard at the table with gochujang.'),
    r('Korean Fried Chicken', 'korean', 'nonveg', 50, 'Medium', 4.8, ['trending', 'nonveg', 'street'],
      'Double-fried for a shatteringly crisp shell that survives the sauce.'),
    r('Pho Bo', 'vietnamese', 'nonveg', 180, 'Hard', 4.8, ['regional', 'nonveg', 'healthy'],
      'Charred aromatics and a long, gentle simmer make a broth that is clear and deeply savoury.'),
    r('Vietnamese Banh Mi', 'vietnamese', 'nonveg', 30, 'Easy', 4.6, ['quick', 'street', 'nonveg'],
      'A colonial baguette holding pickled vegetables, herbs, pâté and chilli.'),
    r('Vegetable Spring Rolls', 'chinese', 'veg', 40, 'Medium', 4.4, ['snacks', 'veg', 'street'],
      'Wrapped tight, fried twice, and served the moment they come out.'),

    /* -------------------------------------------------------- Americas */
    r('Classic Beef Burger', 'american', 'nonveg', 30, 'Easy', 4.7, ['trending', 'nonveg', 'kids'],
      'Coarse mince, a hard sear, and no pressing down with the spatula.'),
    r('BBQ Pulled Pork', 'american', 'nonveg', 240, 'Medium', 4.7, ['regional', 'nonveg'],
      'Low, slow and patient until it pulls apart under a fork.'),
    r('Buffalo Cauliflower Wings', 'american', 'vegan', 40, 'Easy', 4.5, ['vegan', 'snacks', 'healthy'],
      'All the sticky heat of the original with a batter that actually stays crisp.'),
    r('Blueberry Pancakes', 'american', 'veg', 20, 'Easy', 4.6, ['breakfast', 'quick', 'kids'],
      'Rested batter and a moderate pan — the two things that separate fluffy from flat.'),
    r('New York Cheesecake', 'american', 'veg', 90, 'Hard', 4.8, ['desserts', 'festive'],
      'Baked in a water bath and cooled slowly so the top never cracks.'),
    r('Tacos al Pastor', 'mexican', 'nonveg', 60, 'Medium', 4.8, ['trending', 'regional', 'street'],
      'Chilli-marinated pork with charred pineapple, on warm corn tortillas.'),
    r('Chicken Quesadilla', 'mexican', 'nonveg', 20, 'Easy', 4.5, ['quick', 'nonveg', 'kids'],
      'Crisp on the outside, molten in the middle. Restraint with the filling is the whole trick.'),
    r('Guacamole', 'mexican', 'vegan', 10, 'Easy', 4.7, ['quick', 'vegan', 'snacks', 'healthy'],
      'Ripe avocado, lime, salt, onion. Mashed with a fork, never a blender.'),
    r('Black Bean Burrito Bowl', 'mexican', 'vegan', 25, 'Easy', 4.5, ['healthy', 'vegan', 'quick', 'highprotein'],
      'Every component seasoned separately, then built in one bowl.'),

    /* ------------------------------------------- Europe, Middle East, Africa */
    r('Ratatouille', 'french', 'vegan', 60, 'Medium', 4.6, ['healthy', 'vegan', 'regional'],
      'Each vegetable cooked separately before they meet — that is why it tastes of everything at once.'),
    r('French Onion Soup', 'french', 'veg', 75, 'Medium', 4.7, ['regional', 'veg'],
      'Forty-five patient minutes of caramelising onions, and no shortcut that works.'),
    r('Chocolate Soufflé', 'french', 'veg', 45, 'Hard', 4.7, ['desserts', 'festive'],
      'Folded gently, baked immediately, served within ninety seconds of leaving the oven.'),
    r('Spanish Paella', 'spanish', 'nonveg', 60, 'Medium', 4.7, ['regional', 'festive', 'nonveg'],
      'Never stirred once the stock goes in — that is how you get the socarrat at the base.'),
    r('Greek Salad', 'mediterranean', 'veg', 15, 'Easy', 4.6, ['healthy', 'quick', 'veg'],
      'No lettuce, big chunks, good oil, and salt only at the very end.'),
    r('Falafel Wrap', 'middle-eastern', 'vegan', 45, 'Medium', 4.7, ['vegan', 'street', 'highprotein'],
      'Made from soaked, never cooked, chickpeas — the difference between crisp and pasty.'),
    r('Chicken Shawarma', 'middle-eastern', 'nonveg', 50, 'Medium', 4.8, ['trending', 'nonveg', 'street'],
      'Layered, spiced and roasted, then shaved thin and packed into warm flatbread.'),
    r('Hummus', 'middle-eastern', 'vegan', 20, 'Easy', 4.7, ['healthy', 'vegan', 'quick', 'snacks'],
      'Over-cook the chickpeas, blend far longer than feels sensible, and use ice water.'),
    r('Shakshuka', 'middle-eastern', 'veg', 30, 'Easy', 4.7, ['breakfast', 'quick', 'veg', 'healthy'],
      'Eggs poached in a spiced pepper and tomato sauce, straight from pan to table.'),
    r('Turkish Lahmacun', 'turkish', 'nonveg', 60, 'Medium', 4.6, ['regional', 'street', 'nonveg'],
      'Paper-thin dough with a spiced lamb topping, blasted in the hottest oven you have.'),
    r('Baklava', 'turkish', 'veg', 90, 'Hard', 4.7, ['desserts', 'festive'],
      'Hot syrup onto cold pastry (or the reverse) — never both the same temperature.'),
    r('Jollof Rice', 'african', 'veg', 55, 'Medium', 4.8, ['regional', 'trending', 'veg'],
      'The pepper base cooked right down until the oil separates. That stage is the entire dish.'),
    r('Moroccan Vegetable Tagine', 'african', 'vegan', 65, 'Easy', 4.6, ['vegan', 'healthy', 'regional'],
      'Warm spice, dried fruit and a long gentle braise under a conical lid.'),
    r('Peri Peri Chicken', 'african', 'nonveg', 45, 'Medium', 4.7, ['nonveg', 'trending', 'highprotein'],
      'A vinegary chilli marinade with real bite, grilled hard and basted throughout.'),

    /* ----------------------------------------------- Healthy / quick / drinks */
    r('Overnight Oats', 'global', 'veg', 10, 'Easy', 4.4, ['breakfast', 'healthy', 'quick'],
      'Assembled in two minutes at night, ready before you are awake enough to cook.'),
    r('Quinoa Buddha Bowl', 'global', 'vegan', 30, 'Easy', 4.6, ['healthy', 'vegan', 'highprotein'],
      'Grain, greens, protein, crunch and a sharp dressing — the formula works with anything.'),
    r('Green Detox Smoothie', 'global', 'vegan', 8, 'Easy', 4.3, ['drinks', 'healthy', 'quick', 'vegan'],
      'Spinach, green apple, lemon and ginger. Blended cold and drunk immediately.'),
    r('Cold Brew Coffee', 'global', 'vegan', 15, 'Easy', 4.6, ['drinks', 'quick'],
      'Twelve hours in cold water gives you a smoother, far less bitter cup.'),
    r('Masala Chai', 'indian', 'veg', 12, 'Easy', 4.9, ['drinks', 'quick', 'trending'],
      'Spices bruised and simmered in water first, milk added only at the end.'),
    r('Watermelon Mint Cooler', 'global', 'vegan', 8, 'Easy', 4.4, ['drinks', 'quick', 'healthy', 'vegan'],
      'Three ingredients, no added sugar, and best over a lot of ice.'),
    r('Air Fryer Potato Wedges', 'global', 'vegan', 30, 'Easy', 4.5, ['snacks', 'quick', 'vegan', 'healthy'],
      'Par-boiled then air-fried, which is the only way to get a fluffy inside.'),
    r('Chocolate Brownies', 'american', 'veg', 40, 'Easy', 4.8, ['desserts', 'kids', 'trending'],
      'Pulled from the oven while the centre still looks slightly underdone.'),
  ];

  /* Sections shown on the home page, each backed by a tag or a predicate. */
  const SECTIONS = [
    { id: 'trending', title: 'Trending Recipes', icon: 'fa-fire', tag: 'trending',
      blurb: 'What people are cooking most this week, across every cuisine we cover.' },
    { id: 'latest', title: 'Latest Recipes', icon: 'fa-sparkles', tag: 'latest',
      blurb: 'Freshly added to the collection.' },
    { id: 'healthy', title: 'Healthy Recipes', icon: 'fa-heart-pulse', tag: 'healthy',
      blurb: 'Lighter cooking that still tastes like a proper meal.' },
    { id: 'vegetarian', title: 'Vegetarian', icon: 'fa-leaf', filter: (x) => x.diet === 'veg' || x.diet === 'vegan',
      blurb: 'No meat, no compromise on flavour.' },
    { id: 'vegan', title: 'Vegan', icon: 'fa-seedling', filter: (x) => x.diet === 'vegan',
      blurb: 'Entirely plant-based, from every corner of the world.' },
    { id: 'nonveg', title: 'Non Vegetarian', icon: 'fa-drumstick-bite', filter: (x) => x.diet === 'nonveg',
      blurb: 'Meat, poultry and seafood done properly.' },
    { id: 'quick', title: 'Quick Recipes', icon: 'fa-bolt', filter: (x) => x.minutes <= 30,
      blurb: 'On the table in 30 minutes or less.' },
    { id: 'desserts', title: 'Desserts', icon: 'fa-cake-candles', tag: 'desserts',
      blurb: 'The sweet end of every cuisine.' },
    { id: 'drinks', title: 'Drinks', icon: 'fa-mug-hot', tag: 'drinks',
      blurb: 'Hot, cold, blended and brewed.' },
    { id: 'snacks', title: 'Snacks', icon: 'fa-cookie-bite', tag: 'snacks',
      blurb: 'Small plates, street food and things to eat standing up.' },
  ];

  /* Category tiles under the hero. */
  const CATEGORIES = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🍳', query: 'breakfast' },
    { id: 'lunch', label: 'Lunch', emoji: '🍱', query: 'lunch' },
    { id: 'dinner', label: 'Dinner', emoji: '🍲', query: 'dinner' },
    { id: 'quick', label: 'Under 30 Min', emoji: '⚡', query: 'quick' },
    { id: 'healthy', label: 'Healthy', emoji: '🥗', query: 'healthy' },
    { id: 'veg', label: 'Vegetarian', emoji: '🥦', query: 'vegetarian' },
    { id: 'vegan', label: 'Vegan', emoji: '🌱', query: 'vegan' },
    { id: 'nonveg', label: 'Non Veg', emoji: '🍗', query: 'non vegetarian' },
    { id: 'desserts', label: 'Desserts', emoji: '🍰', query: 'dessert' },
    { id: 'drinks', label: 'Drinks', emoji: '🥤', query: 'drink' },
    { id: 'snacks', label: 'Snacks', emoji: '🍿', query: 'snack' },
    { id: 'highprotein', label: 'High Protein', emoji: '💪', query: 'high protein' },
  ];

  /** Recipes for a section definition. */
  function forSection(section, limit) {
    const list = section.filter
      ? RECIPES.filter(section.filter)
      : RECIPES.filter((x) => x.tags.includes(section.tag));
    return limit ? list.slice(0, limit) : list;
  }

  /** Simple weighted search across name, cuisine, tags and description. */
  function search(term, limit = 8) {
    const q = String(term || '').toLowerCase().trim();
    if (!q) return [];
    const scored = RECIPES.map((item) => {
      const name = item.name.toLowerCase();
      let score = 0;
      if (name === q) score += 100;
      if (name.startsWith(q)) score += 50;
      if (name.includes(q)) score += 30;
      if (item.cuisine.includes(q)) score += 12;
      if (item.tags.some((t) => t.includes(q))) score += 10;
      if (item.desc.toLowerCase().includes(q)) score += 4;
      return { item, score };
    }).filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score || b.item.rating - a.item.rating);
    return scored.slice(0, limit).map((x) => x.item);
  }

  AFR.data = AFR.data || {};
  AFR.data.catalog = { recipes: RECIPES, sections: SECTIONS, categories: CATEGORIES, forSection, search };
})(window);
