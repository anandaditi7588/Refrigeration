/* ==========================================================================
 * ingredients.js — the pantry knowledge base.
 *
 * Powers: the ingredient table (unit, purpose, substitute, healthy swap),
 * nutrition maths, cost estimation and the grouped shopping list.
 *
 * NUMBERS ARE ESTIMATES. Macros are per 100 g, rounded from public food
 * composition references; micronutrients come from a per-category baseline
 * with per-ingredient overrides where an ingredient is a notable source
 * (spinach → iron, dairy → calcium/B12, oily fish → omega-3, citrus → C).
 * The UI always labels the resulting panel as estimated — this is a cooking
 * aid, not a clinical tool.
 *
 * Row format (compact on purpose — expanded into objects at load):
 *   [id, name, category, unit, gramsPerUnit, kcal, protein, carbs, fat,
 *    fiber, sugar, sodium(mg), cholesterol(mg), costPer100g, substitute,
 *    healthyAlternative, purpose, microOverrides?]
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  /* Micronutrient baselines per 100 g by category (mg unless noted).
     vitA in µg RAE, vitD/b12 in µg, everything else mg. */
  const MICRO_BASELINE = {
    vegetables: { calcium: 35, iron: 0.8, potassium: 260, vitA: 40, vitC: 20, vitD: 0, b12: 0, magnesium: 22, zinc: 0.3, omega3: 0.02 },
    fruits:     { calcium: 15, iron: 0.3, potassium: 190, vitA: 20, vitC: 30, vitD: 0, b12: 0, magnesium: 12, zinc: 0.1, omega3: 0.01 },
    herbs:      { calcium: 120, iron: 2.5, potassium: 400, vitA: 260, vitC: 45, vitD: 0, b12: 0, magnesium: 45, zinc: 0.5, omega3: 0.05 },
    spices:     { calcium: 180, iron: 8, potassium: 1100, vitA: 30, vitC: 3, vitD: 0, b12: 0, magnesium: 150, zinc: 2.5, omega3: 0.2 },
    dairy:      { calcium: 180, iron: 0.1, potassium: 140, vitA: 60, vitC: 0, vitD: 0.6, b12: 0.5, magnesium: 12, zinc: 0.5, omega3: 0.05 },
    meat:       { calcium: 12, iron: 1.4, potassium: 300, vitA: 8, vitC: 0, vitD: 0.2, b12: 1.2, magnesium: 24, zinc: 2.5, omega3: 0.06 },
    seafood:    { calcium: 40, iron: 0.8, potassium: 330, vitA: 15, vitC: 0, vitD: 6, b12: 3, magnesium: 30, zinc: 1, omega3: 0.9 },
    grains:     { calcium: 20, iron: 1.5, potassium: 130, vitA: 0, vitC: 0, vitD: 0, b12: 0, magnesium: 45, zinc: 1.2, omega3: 0.03 },
    legumes:    { calcium: 55, iron: 3.2, potassium: 500, vitA: 2, vitC: 2, vitD: 0, b12: 0, magnesium: 90, zinc: 1.8, omega3: 0.1 },
    nuts:       { calcium: 90, iron: 3, potassium: 550, vitA: 2, vitC: 1, vitD: 0, b12: 0, magnesium: 200, zinc: 3, omega3: 0.5 },
    oils:       { calcium: 2, iron: 0.1, potassium: 2, vitA: 5, vitC: 0, vitD: 0, b12: 0, magnesium: 0, zinc: 0, omega3: 0.6 },
    sweeteners: { calcium: 8, iron: 0.3, potassium: 30, vitA: 0, vitC: 0, vitD: 0, b12: 0, magnesium: 3, zinc: 0.1, omega3: 0 },
    condiments: { calcium: 25, iron: 0.9, potassium: 180, vitA: 10, vitC: 4, vitD: 0, b12: 0, magnesium: 18, zinc: 0.3, omega3: 0.05 },
    others:     { calcium: 20, iron: 0.6, potassium: 120, vitA: 5, vitC: 2, vitD: 0, b12: 0, magnesium: 15, zinc: 0.3, omega3: 0.02 },
  };

  /* Shopping-list bucket per pantry category (matches the spec's grouping). */
  const SHOPPING_GROUP = {
    vegetables: 'Vegetables', fruits: 'Vegetables', herbs: 'Vegetables',
    spices: 'Spices',
    dairy: 'Dairy',
    meat: 'Meat', seafood: 'Meat',
    grains: 'Grains', legumes: 'Grains',
    nuts: 'Others', oils: 'Others', sweeteners: 'Others',
    condiments: 'Others', others: 'Others',
  };

  /* eslint-disable max-len */
  const ROWS = [
    // ---------------------------------------------------------- vegetables
    ['tomato', 'Tomato', 'vegetables', 'pieces', 100, 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 0, 4, 'Cherry tomatoes or 2 tbsp tomato purée', 'Vine-ripened organic tomato', 'Body, acidity and colour for the gravy', { vitC: 14, vitA: 42 }],
    ['onion', 'Onion', 'vegetables', 'pieces', 110, 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4, 0, 3.5, 'Shallots or leek whites', 'Red onion (higher quercetin)', 'Sweet aromatic base'],
    ['garlic', 'Garlic', 'vegetables', 'cloves', 5, 149, 6.4, 33, 0.5, 2.1, 1, 17, 0, 25, 'Asafoetida (¼ tsp) or garlic powder', 'Fresh-crushed garlic, rested 10 min', 'Pungent depth in the base'],
    ['ginger', 'Ginger', 'vegetables', 'inch', 12, 80, 1.8, 18, 0.8, 2, 1.7, 13, 0, 20, 'Ginger paste (1 tsp) or galangal', 'Fresh young ginger', 'Warmth and digestive lift'],
    ['potato', 'Potato', 'vegetables', 'pieces', 150, 77, 2, 17, 0.1, 2.2, 0.8, 6, 0, 3, 'Sweet potato or parsnip', 'Baby potatoes with skin on', 'Starchy body that soaks up flavour', { potassium: 425, vitC: 20 }],
    ['carrot', 'Carrot', 'vegetables', 'pieces', 70, 41, 0.9, 10, 0.2, 2.8, 4.7, 69, 0, 5, 'Pumpkin or red bell pepper', 'Rainbow heirloom carrot', 'Natural sweetness and colour', { vitA: 835 }],
    ['bell-pepper', 'Bell Pepper', 'vegetables', 'pieces', 120, 31, 1, 6, 0.3, 2.1, 4.2, 4, 0, 8, 'Any colour capsicum or poblano', 'Red pepper (ripest, most vitamin C)', 'Crunch, sweetness and colour', { vitC: 128, vitA: 157 }],
    ['green-chilli', 'Green Chilli', 'vegetables', 'pieces', 8, 40, 1.9, 9, 0.4, 1.5, 5, 7, 0, 15, 'Serrano, jalapeño or ¼ tsp chilli flakes', 'Deseeded chilli (heat without harshness)', 'Fresh, sharp heat', { vitC: 144 }],
    ['spinach', 'Spinach', 'vegetables', 'cups', 30, 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, 0, 6, 'Kale, chard or amaranth leaves', 'Baby spinach, briefly blanched', 'Colour, minerals and volume', { iron: 2.7, calcium: 99, vitA: 469, magnesium: 79 }],
    ['broccoli', 'Broccoli', 'vegetables', 'cups', 90, 34, 2.8, 7, 0.4, 2.6, 1.7, 33, 0, 12, 'Cauliflower or romanesco', 'Steamed broccoli (retains more C)', 'Bite and bulk', { vitC: 89, calcium: 47 }],
    ['cauliflower', 'Cauliflower', 'vegetables', 'cups', 100, 25, 1.9, 5, 0.3, 2, 1.9, 30, 0, 5, 'Broccoli or cabbage', 'Whole roasted florets', 'Mild body that carries spice', { vitC: 48 }],
    ['cabbage', 'Cabbage', 'vegetables', 'cups', 90, 25, 1.3, 6, 0.1, 2.5, 3.2, 18, 0, 3, 'Napa cabbage or pak choi', 'Purple cabbage (anthocyanins)', 'Crunch and volume', { vitC: 37 }],
    ['mushroom', 'Mushroom', 'vegetables', 'cups', 70, 22, 3.1, 3.3, 0.3, 1, 2, 5, 0, 18, 'Zucchini or paneer cubes (for texture)', 'Sun-exposed mushrooms (vitamin D)', 'Umami and meaty texture', { vitD: 0.2, potassium: 318 }],
    ['peas', 'Green Peas', 'vegetables', 'cups', 145, 81, 5.4, 14, 0.4, 5.7, 5.7, 5, 0, 9, 'Edamame or diced green beans', 'Fresh-shelled peas', 'Sweet pops of colour and protein'],
    ['zucchini', 'Zucchini', 'vegetables', 'pieces', 200, 17, 1.2, 3.1, 0.3, 1, 2.5, 8, 0, 10, 'Bottle gourd or cucumber', 'Skin-on zucchini', 'Light body, soaks up sauce'],
    ['eggplant', 'Eggplant', 'vegetables', 'pieces', 250, 25, 1, 6, 0.2, 3, 3.5, 2, 0, 6, 'Zucchini or mushroom', 'Small purple brinjal (fewer seeds)', 'Silky texture when cooked through'],
    ['corn', 'Sweet Corn', 'vegetables', 'cups', 150, 86, 3.2, 19, 1.2, 2.7, 6.3, 15, 0, 8, 'Green peas or diced carrot', 'Fresh cob corn', 'Sweetness and texture'],
    ['cucumber', 'Cucumber', 'vegetables', 'pieces', 200, 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2, 0, 5, 'Zucchini or celery', 'Persian cucumber, skin on', 'Cooling crunch for sides'],
    ['lettuce', 'Lettuce', 'vegetables', 'cups', 40, 15, 1.4, 2.9, 0.2, 1.3, 0.8, 28, 0, 12, 'Rocket, spinach or napa cabbage', 'Romaine (more nutrients than iceberg)', 'Fresh crunch in the assembly'],
    ['spring-onion', 'Spring Onion', 'vegetables', 'stalks', 15, 32, 1.8, 7.3, 0.2, 2.6, 2.3, 16, 0, 12, 'Chives or thinly sliced shallot', 'Whole stalk, greens included', 'Bright finish and garnish'],
    ['pumpkin', 'Pumpkin', 'vegetables', 'cups', 120, 26, 1, 6.5, 0.1, 0.5, 2.8, 1, 0, 4, 'Butternut squash or carrot', 'Deep-orange pumpkin', 'Sweet, creamy body', { vitA: 426 }],
    ['beetroot', 'Beetroot', 'vegetables', 'pieces', 130, 43, 1.6, 10, 0.2, 2.8, 6.8, 78, 0, 5, 'Carrot or red cabbage', 'Roasted whole beet', 'Earthy sweetness and colour'],
    ['sweet-potato', 'Sweet Potato', 'vegetables', 'pieces', 150, 86, 1.6, 20, 0.1, 3, 4.2, 55, 0, 6, 'Potato or pumpkin', 'Skin-on baked sweet potato', 'Low-GI starch with natural sweetness', { vitA: 709 }],

    // -------------------------------------------------------------- fruits
    ['lemon', 'Lemon', 'fruits', 'pieces', 60, 29, 1.1, 9, 0.3, 2.8, 2.5, 2, 0, 10, 'Lime, or 1 tsp vinegar', 'Fresh lemon juice, added off-heat', 'Acidity that lifts every other flavour', { vitC: 53 }],
    ['lime', 'Lime', 'fruits', 'pieces', 50, 30, 0.7, 11, 0.2, 2.8, 1.7, 2, 0, 12, 'Lemon or tamarind paste', 'Fresh lime, zested too', 'Sharp citrus finish', { vitC: 29 }],
    ['coconut', 'Fresh Coconut', 'fruits', 'cups', 80, 354, 3.3, 15, 33, 9, 6.2, 20, 0, 18, 'Desiccated coconut or coconut milk', 'Fresh grated coconut', 'Sweet richness and texture'],
    ['mango', 'Mango', 'fruits', 'pieces', 200, 60, 0.8, 15, 0.4, 1.6, 14, 1, 0, 8, 'Peach or papaya', 'Ripe seasonal mango', 'Tropical sweetness', { vitC: 36, vitA: 54 }],
    ['banana', 'Banana', 'fruits', 'pieces', 120, 89, 1.1, 23, 0.3, 2.6, 12, 1, 0, 5, 'Plantain or apple purée', 'Slightly under-ripe (lower sugar)', 'Natural sweetener and binder', { potassium: 358 }],
    ['apple', 'Apple', 'fruits', 'pieces', 180, 52, 0.3, 14, 0.2, 2.4, 10, 1, 0, 15, 'Pear or firm mango', 'Skin-on apple', 'Sweet-tart crunch'],
    ['pineapple', 'Pineapple', 'fruits', 'cups', 165, 50, 0.5, 13, 0.1, 1.4, 10, 1, 0, 9, 'Mango or green apple', 'Fresh pineapple (bromelain intact)', 'Sweet acidity, tenderises meat', { vitC: 48 }],
    ['strawberry', 'Strawberry', 'fruits', 'cups', 150, 32, 0.7, 7.7, 0.3, 2, 4.9, 1, 0, 40, 'Raspberry or chopped plum', 'Seasonal berries', 'Bright acidity and colour', { vitC: 59 }],
    ['orange', 'Orange', 'fruits', 'pieces', 150, 47, 0.9, 12, 0.1, 2.4, 9, 0, 0, 8, 'Mandarin or grapefruit', 'Whole segments over juice', 'Citrus sweetness', { vitC: 53 }],
    ['dates', 'Dates', 'fruits', 'pieces', 8, 277, 1.8, 75, 0.2, 6.7, 66, 1, 0, 55, 'Raisins or figs', 'Medjool dates (unsulphured)', 'Whole-food sweetener', { potassium: 656 }],

    // --------------------------------------------------------------- herbs
    ['coriander-leaves', 'Coriander Leaves', 'herbs', 'tbsp', 4, 23, 2.1, 3.7, 0.5, 2.8, 0.9, 46, 0, 25, 'Flat-leaf parsley or celery leaves', 'Stems included (more aroma)', 'Fresh green finish'],
    ['mint', 'Mint Leaves', 'herbs', 'tbsp', 4, 44, 3.3, 8.4, 0.7, 6.8, 0, 30, 0, 30, 'Basil or coriander', 'Fresh mint, torn not chopped', 'Cooling aroma'],
    ['basil', 'Basil', 'herbs', 'tbsp', 3, 23, 3.2, 2.7, 0.6, 1.6, 0.3, 4, 0, 40, 'Thai basil or oregano', 'Fresh basil added off-heat', 'Sweet herbal top note'],
    ['curry-leaves', 'Curry Leaves', 'herbs', 'sprigs', 2, 108, 6, 19, 1, 6.4, 0, 5, 0, 35, 'Bay leaf (different but aromatic)', 'Fresh curry leaves', 'Signature South Indian aroma'],
    ['parsley', 'Parsley', 'herbs', 'tbsp', 4, 36, 3, 6.3, 0.8, 3.3, 0.9, 56, 0, 35, 'Coriander or celery leaves', 'Flat-leaf parsley', 'Clean herbal lift'],
    ['oregano', 'Oregano', 'herbs', 'tsp', 1, 265, 9, 69, 4.3, 42, 4.1, 25, 0, 90, 'Italian seasoning or marjoram', 'Dried wild oregano', 'Mediterranean backbone'],
    ['thyme', 'Thyme', 'herbs', 'tsp', 1, 276, 9.1, 64, 7.4, 37, 1.7, 55, 0, 95, 'Oregano or herbes de Provence', 'Fresh thyme sprigs', 'Woody aromatic depth'],
    ['rosemary', 'Rosemary', 'herbs', 'tsp', 1, 331, 4.9, 64, 15, 43, 0, 50, 0, 95, 'Thyme or sage', 'Fresh rosemary sprig', 'Resinous aroma for roasts'],
    ['bay-leaf', 'Bay Leaf', 'herbs', 'pieces', 0.5, 313, 7.6, 75, 8.4, 26, 0, 23, 0, 80, 'Curry leaf or a pinch of oregano', 'Whole leaf, removed before serving', 'Background warmth in the braise'],

    // -------------------------------------------------------------- spices
    ['salt', 'Salt', 'spices', 'tsp', 6, 0, 0, 0, 0, 0, 0, 38758, 0, 2, 'Low-sodium salt or a squeeze of lemon', 'Rock salt / low-sodium blend', 'Seasoning — makes every flavour legible'],
    ['black-pepper', 'Black Pepper', 'spices', 'tsp', 2.3, 251, 10, 64, 3.3, 25, 0.6, 20, 0, 90, 'White pepper or long pepper', 'Freshly cracked peppercorns', 'Sharp aromatic heat'],
    ['turmeric', 'Turmeric Powder', 'spices', 'tsp', 3, 312, 9.7, 67, 3.3, 22, 3.2, 27, 0, 45, 'Fresh turmeric root (1 inch)', 'Organic high-curcumin turmeric', 'Colour, earthiness, anti-inflammatory'],
    ['cumin', 'Cumin Seeds', 'spices', 'tsp', 2.5, 375, 18, 44, 22, 11, 2.3, 168, 0, 60, 'Ground cumin (¾ tsp)', 'Whole seeds, toasted fresh', 'Nutty aroma released in hot fat', { iron: 66 }],
    ['coriander-powder', 'Coriander Powder', 'spices', 'tsp', 2.5, 298, 12, 55, 18, 42, 0, 35, 0, 40, 'Toasted, ground coriander seeds', 'Freshly ground seeds', 'Body and mellow citrus tone'],
    ['garam-masala', 'Garam Masala', 'spices', 'tsp', 2.5, 379, 14, 45, 15, 24, 2, 60, 0, 120, 'Curry powder or allspice + cinnamon', 'Home-ground fresh blend', 'Finishing warmth — added late'],
    ['red-chilli-powder', 'Red Chilli Powder', 'spices', 'tsp', 2.5, 282, 13, 50, 14, 35, 7, 30, 0, 70, 'Paprika (for colour) or cayenne (for heat)', 'Kashmiri chilli — colour without burn', 'Heat and deep red colour'],
    ['paprika', 'Paprika', 'spices', 'tsp', 2.3, 282, 14, 54, 13, 35, 10, 68, 0, 85, 'Kashmiri chilli powder', 'Smoked paprika', 'Colour with gentle warmth'],
    ['cinnamon', 'Cinnamon', 'spices', 'pieces', 2, 247, 4, 81, 1.2, 53, 2.2, 10, 0, 100, 'Cassia bark or ¼ tsp ground', 'Ceylon cinnamon', 'Sweet warm spice'],
    ['cardamom', 'Green Cardamom', 'spices', 'pods', 1, 311, 11, 68, 6.7, 28, 0, 18, 0, 400, 'A pinch of ground cardamom', 'Whole green pods, crushed fresh', 'Floral aroma'],
    ['cloves', 'Cloves', 'spices', 'pieces', 0.2, 274, 6, 66, 13, 34, 2.4, 277, 0, 250, 'Allspice berries', 'Whole cloves', 'Pungent sweet heat'],
    ['mustard-seeds', 'Mustard Seeds', 'spices', 'tsp', 3, 508, 26, 28, 36, 12, 6.8, 13, 0, 35, 'Cumin seeds', 'Whole seeds, popped in hot oil', 'Nutty pop in the tempering'],
    ['fenugreek', 'Fenugreek (Kasuri Methi)', 'spices', 'tsp', 1.5, 323, 23, 58, 6.4, 25, 0, 67, 0, 90, 'Dried fenugreek leaves or celery leaf', 'Hand-crushed kasuri methi', 'Restaurant-style bitter-sweet finish'],
    ['asafoetida', 'Asafoetida (Hing)', 'spices', 'pinch', 0.3, 297, 4, 68, 1.1, 4.1, 0, 50, 0, 300, 'A little garlic or onion powder', 'Compounded hing (gluten-free grade)', 'Onion-garlic depth for no-onion cooking'],
    ['soy-free-seasoning', 'Mixed Herbs', 'spices', 'tsp', 1.5, 271, 9, 60, 5, 30, 3, 40, 0, 80, 'Italian seasoning', 'Salt-free herb blend', 'All-purpose aromatic lift'],
    ['star-anise', 'Star Anise', 'spices', 'pieces', 2, 337, 18, 50, 16, 15, 0, 16, 0, 200, 'A small piece of cinnamon + fennel', 'Whole star, removed before serving', 'Liquorice warmth for braises'],
    ['saffron', 'Saffron', 'spices', 'pinch', 0.1, 310, 11, 65, 6, 4, 0, 148, 0, 40000, 'A pinch of turmeric (colour only)', 'Grade-1 threads bloomed in warm milk', 'Luxury aroma and golden colour'],
    ['sesame-seeds', 'Sesame Seeds', 'spices', 'tbsp', 9, 573, 18, 23, 50, 12, 0.3, 11, 0, 60, 'Sunflower seeds or poppy seeds', 'Unhulled sesame', 'Nutty crunch and calcium', { calcium: 975, iron: 14.6 }],

    // --------------------------------------------------------------- dairy
    ['milk', 'Milk', 'dairy', 'cups', 240, 61, 3.2, 4.8, 3.3, 0, 5.1, 43, 10, 6, 'Oat, soy or almond milk', 'Toned / low-fat milk', 'Creaminess and body', { calcium: 113, b12: 0.5, vitD: 1.3 }],
    ['yogurt', 'Yogurt (Curd)', 'dairy', 'cups', 245, 61, 3.5, 4.7, 3.3, 0, 4.7, 46, 13, 8, 'Coconut or soy yogurt', 'Greek yogurt (more protein)', 'Tang, tenderising, cooling body', { calcium: 121, b12: 0.4 }],
    ['cream', 'Fresh Cream', 'dairy', 'tbsp', 15, 340, 2.1, 2.8, 36, 0, 2.9, 38, 113, 30, 'Cashew paste or coconut cream', 'Evaporated milk or cashew cream', 'Silky richness in the finish'],
    ['butter', 'Butter', 'dairy', 'tbsp', 14, 717, 0.9, 0.1, 81, 0, 0.1, 11, 215, 55, 'Ghee or olive oil', 'Unsalted grass-fed butter', 'Rounded fat and gloss'],
    ['ghee', 'Ghee', 'dairy', 'tbsp', 14, 900, 0, 0, 100, 0, 0, 2, 256, 70, 'Butter or a neutral oil', 'A2 / grass-fed ghee, used sparingly', 'High-smoke-point fat with nutty aroma'],
    ['paneer', 'Paneer', 'dairy', 'grams', 1, 265, 18, 3.6, 21, 0, 2.6, 22, 60, 45, 'Firm tofu or halloumi', 'Low-fat paneer or tofu', 'Protein-rich, holds shape in gravy', { calcium: 480 }],
    ['cheese', 'Cheese', 'dairy', 'grams', 1, 402, 25, 1.3, 33, 0, 0.5, 621, 105, 60, 'Vegan cheese or nutritional yeast', 'Part-skim mozzarella', 'Melt, stretch and savoury depth', { calcium: 721, b12: 0.8 }],
    ['condensed-milk', 'Condensed Milk', 'dairy', 'tbsp', 20, 321, 7.9, 54, 8.7, 0, 54, 127, 34, 40, 'Milk reduced with a sweetener', 'Evaporated milk + dates', 'Sweetness and body in desserts'],

    // ---------------------------------------------------------------- meat
    ['chicken', 'Chicken', 'meat', 'grams', 1, 165, 31, 0, 3.6, 0, 0, 74, 85, 25, 'Firm tofu, soy chunks or jackfruit', 'Skinless breast, trimmed', 'Lean protein centrepiece', { b12: 0.3, zinc: 1 }],
    ['chicken-thigh', 'Chicken Thigh', 'meat', 'grams', 1, 209, 26, 0, 11, 0, 0, 84, 95, 22, 'Chicken breast or mushrooms', 'Skinless thigh', 'Juicier dark meat that resists drying', { b12: 0.6 }],
    ['mutton', 'Mutton / Lamb', 'meat', 'grams', 1, 258, 25, 0, 17, 0, 0, 72, 97, 75, 'Chicken, jackfruit or soy chunks', 'Lean leg cut, fat trimmed', 'Deep, slow-cooked flavour', { iron: 1.9, b12: 2.6, zinc: 4.5 }],
    ['beef', 'Beef', 'meat', 'grams', 1, 250, 26, 0, 15, 0, 0, 72, 90, 60, 'Mushroom + lentil mix or lamb', 'Grass-fed lean cut', 'Rich savoury protein', { iron: 2.6, b12: 2.6, zinc: 4.8 }],
    ['pork', 'Pork', 'meat', 'grams', 1, 242, 27, 0, 14, 0, 0, 62, 80, 45, 'Chicken thigh or jackfruit', 'Lean loin', 'Sweet, fatty protein'],
    ['egg', 'Egg', 'meat', 'pieces', 50, 155, 13, 1.1, 11, 0, 1.1, 124, 373, 12, 'Flax egg (1 tbsp flax + 3 tbsp water)', 'Free-range egg; whites only for less fat', 'Binding, richness and protein', { b12: 1.1, vitD: 2 }],

    // ------------------------------------------------------------- seafood
    ['fish', 'Fish Fillet', 'seafood', 'grams', 1, 206, 22, 0, 12, 0, 0, 61, 63, 55, 'Chicken breast or firm tofu', 'Wild-caught oily fish', 'Delicate protein, quick cooking', { omega3: 2.3, vitD: 11, b12: 3.2 }],
    ['prawns', 'Prawns', 'seafood', 'grams', 1, 99, 24, 0.2, 0.3, 0, 0, 111, 189, 80, 'Firm fish cubes or mushrooms', 'Sustainably sourced prawns', 'Sweet, springy protein', { b12: 1.1, zinc: 1.6 }],
    ['squid', 'Squid', 'seafood', 'grams', 1, 92, 16, 3.1, 1.4, 0, 0, 44, 233, 70, 'Prawns or firm fish', 'Fresh squid, cooked fast or slow', 'Springy texture'],

    // -------------------------------------------------------------- grains
    ['rice', 'Basmati Rice', 'grains', 'cups', 185, 356, 7.5, 78, 0.9, 1.3, 0.1, 5, 0, 12, 'Any long-grain rice or quinoa', 'Brown basmati (more fibre)', 'The staple that carries the dish'],
    ['brown-rice', 'Brown Rice', 'grains', 'cups', 185, 370, 7.9, 77, 2.9, 3.5, 0.9, 7, 0, 16, 'White rice or barley', 'Sprouted brown rice', 'Higher-fibre, lower-GI staple'],
    ['wheat-flour', 'Wheat Flour (Atta)', 'grains', 'cups', 120, 340, 13, 72, 2.5, 11, 0.4, 2, 0, 5, 'All-purpose flour or millet flour', 'Whole-wheat stone-ground atta', 'Structure for breads and doughs'],
    ['all-purpose-flour', 'All-Purpose Flour (Maida)', 'grains', 'cups', 125, 364, 10, 76, 1, 2.7, 0.3, 2, 0, 6, 'Whole-wheat flour (add 10% more water)', 'Whole-wheat or spelt flour', 'Soft, elastic structure'],
    ['pasta', 'Pasta', 'grains', 'grams', 1, 371, 13, 75, 1.5, 3.2, 2.7, 6, 0, 25, 'Any dried pasta shape or noodles', 'Whole-wheat or lentil pasta', 'The carbohydrate base'],
    ['noodles', 'Noodles', 'grains', 'grams', 1, 384, 14, 71, 5, 3, 2, 380, 0, 22, 'Rice noodles or spaghetti', 'Whole-grain or buckwheat noodles', 'Slurpable base'],
    ['bread', 'Bread', 'grains', 'slices', 30, 265, 9, 49, 3.2, 2.7, 5, 491, 0, 15, 'Any loaf, or lettuce wraps', 'Whole-grain sourdough', 'Structure for the assembly'],
    ['oats', 'Oats', 'grains', 'cups', 90, 389, 17, 66, 6.9, 11, 0.99, 2, 0, 14, 'Quinoa flakes or broken wheat', 'Steel-cut oats', 'Fibre-rich body', { magnesium: 177 }],
    ['quinoa', 'Quinoa', 'grains', 'cups', 170, 368, 14, 64, 6.1, 7, 0, 5, 0, 60, 'Couscous or brown rice', 'Rinsed white quinoa', 'Complete-protein grain'],
    ['semolina', 'Semolina (Rava)', 'grains', 'cups', 167, 360, 13, 73, 1.1, 3.9, 0.6, 1, 0, 8, 'Cream of wheat or fine cornmeal', 'Whole-wheat semolina', 'Crisp texture and body'],
    ['cornflour', 'Cornflour', 'grains', 'tbsp', 8, 381, 0.3, 91, 0.1, 0.9, 0, 9, 0, 12, 'Arrowroot or potato starch', 'Arrowroot powder', 'Thickens sauces to a glossy coat'],
    ['tortilla', 'Tortilla', 'grains', 'pieces', 45, 306, 8, 51, 7.7, 3, 1.5, 550, 0, 20, 'Roti, pita or lettuce leaves', 'Whole-corn tortilla', 'The wrap'],

    // ------------------------------------------------------------- legumes
    ['toor-dal', 'Toor Dal', 'legumes', 'cups', 200, 343, 22, 63, 1.5, 15, 2, 17, 0, 14, 'Masoor or moong dal', 'Split pigeon peas, unpolished', 'Creamy protein base'],
    ['moong-dal', 'Moong Dal', 'legumes', 'cups', 200, 347, 24, 63, 1.2, 16, 6.6, 15, 0, 15, 'Toor or masoor dal', 'Whole green moong (more fibre)', 'Light, easily digested protein'],
    ['chickpeas', 'Chickpeas', 'legumes', 'cups', 164, 364, 19, 61, 6, 17, 11, 24, 0, 12, 'White beans or black chana', 'Home-soaked dried chickpeas', 'Hearty plant protein', { iron: 6.2, magnesium: 115 }],
    ['kidney-beans', 'Kidney Beans (Rajma)', 'legumes', 'cups', 177, 333, 24, 60, 0.8, 25, 2.1, 12, 0, 13, 'Black beans or chickpeas', 'Soaked overnight, well boiled', 'Meaty plant protein', { iron: 8.2, potassium: 1406 }],
    ['lentils', 'Red Lentils', 'legumes', 'cups', 192, 352, 25, 63, 1.1, 11, 2, 6, 0, 12, 'Any split lentil', 'Whole masoor (more fibre)', 'Quick-cooking protein and body'],
    ['black-beans', 'Black Beans', 'legumes', 'cups', 172, 341, 21, 62, 1.4, 15, 2.1, 5, 0, 20, 'Kidney or pinto beans', 'Dried, home-cooked beans', 'Earthy protein for Latin dishes'],
    ['tofu', 'Tofu', 'legumes', 'grams', 1, 76, 8, 1.9, 4.8, 0.3, 0.6, 7, 0, 30, 'Paneer or tempeh', 'Organic firm tofu, pressed', 'Neutral protein that takes on flavour', { calcium: 350 }],
    ['soy-chunks', 'Soy Chunks', 'legumes', 'cups', 40, 345, 52, 33, 0.5, 13, 9, 5, 0, 18, 'Tofu, tempeh or mushrooms', 'Non-GMO soy protein', 'High-protein meat substitute'],

    // ---------------------------------------------------------------- nuts
    ['cashew', 'Cashews', 'nuts', 'pieces', 1.5, 553, 18, 30, 44, 3.3, 5.9, 12, 0, 90, 'Blanched almonds or sunflower seeds', 'Raw unsalted cashews', 'Creamy thickener and richness', { magnesium: 292 }],
    ['almond', 'Almonds', 'nuts', 'pieces', 1.2, 579, 21, 22, 50, 12, 4.4, 1, 0, 95, 'Cashews or sunflower seeds', 'Soaked, peeled almonds', 'Crunch, protein and good fats', { calcium: 269, magnesium: 270 }],
    ['peanut', 'Peanuts', 'nuts', 'tbsp', 10, 567, 26, 16, 49, 8.5, 4.7, 18, 0, 25, 'Roasted chana or sunflower seeds', 'Unsalted dry-roasted peanuts', 'Crunch and nutty depth'],
    ['walnut', 'Walnuts', 'nuts', 'pieces', 4, 654, 15, 14, 65, 6.7, 2.6, 2, 0, 130, 'Pecans or almonds', 'Raw walnut halves', 'Omega-3-rich crunch', { omega3: 9 }],
    ['peanut-butter', 'Peanut Butter', 'nuts', 'tbsp', 16, 588, 25, 20, 50, 6, 9, 17, 0, 45, 'Tahini or almond butter', 'No-sugar natural peanut butter', 'Creamy body for sauces'],

    // ---------------------------------------------------------------- oils
    ['oil', 'Cooking Oil', 'oils', 'tbsp', 14, 884, 0, 0, 100, 0, 0, 0, 0, 15, 'Any neutral oil', 'Cold-pressed rice bran or canola', 'The cooking medium'],
    ['olive-oil', 'Olive Oil', 'oils', 'tbsp', 14, 884, 0, 0, 100, 0, 0, 2, 0, 60, 'Any neutral oil', 'Extra-virgin, finished off-heat', 'Fruity fat and finish'],
    ['sesame-oil', 'Sesame Oil', 'oils', 'tsp', 5, 884, 0, 0, 100, 0, 0, 0, 0, 55, 'Any neutral oil + a pinch of sesame seeds', 'Toasted sesame oil, used as a finisher', 'Nutty aroma for East Asian dishes'],
    ['coconut-oil', 'Coconut Oil', 'oils', 'tbsp', 14, 892, 0, 0, 99, 0, 0, 0, 0, 40, 'Any neutral oil', 'Virgin cold-pressed coconut oil', 'Tropical aroma and high smoke point'],

    // ---------------------------------------------------------- sweeteners
    ['sugar', 'Sugar', 'sweeteners', 'tsp', 4, 387, 0, 100, 0, 0, 100, 1, 0, 5, 'Jaggery or honey', 'Coconut sugar or dates', 'Sweetness and browning'],
    ['jaggery', 'Jaggery', 'sweeteners', 'tbsp', 15, 383, 0.4, 98, 0.1, 0, 85, 30, 0, 8, 'Brown sugar or palm sugar', 'Organic dark jaggery', 'Mineral-rich caramel sweetness'],
    ['honey', 'Honey', 'sweeteners', 'tbsp', 21, 304, 0.3, 82, 0, 0.2, 82, 4, 0, 45, 'Maple syrup or jaggery syrup', 'Raw unfiltered honey (off-heat)', 'Floral sweetness and gloss'],
    ['maple-syrup', 'Maple Syrup', 'sweeteners', 'tbsp', 20, 260, 0, 67, 0.1, 0, 60, 12, 0, 90, 'Honey or date syrup', 'Grade-A dark maple', 'Clean sweetness for vegan bakes'],
    ['stevia', 'Stevia', 'sweeteners', 'tsp', 2, 0, 0, 0, 0, 0, 0, 0, 0, 200, 'Monk fruit sweetener', 'Pure leaf stevia, no fillers', 'Zero-calorie sweetness'],

    // ---------------------------------------------------------- condiments
    ['tomato-puree', 'Tomato Purée', 'condiments', 'tbsp', 16, 38, 1.6, 8.9, 0.2, 1.9, 5, 28, 0, 12, '2 fresh tomatoes, blended', 'No-salt-added passata', 'Concentrated tomato body'],
    ['soy-sauce', 'Soy Sauce', 'condiments', 'tbsp', 16, 53, 8, 4.9, 0.6, 0.8, 0.4, 5493, 0, 30, 'Tamari (gluten-free) or coconut aminos', 'Low-sodium soy sauce', 'Salty umami backbone'],
    ['vinegar', 'Vinegar', 'condiments', 'tbsp', 15, 21, 0, 0.9, 0, 0, 0.4, 5, 0, 12, 'Lemon juice or rice vinegar', 'Apple cider vinegar', 'Acidity and balance'],
    ['tamarind', 'Tamarind Paste', 'condiments', 'tbsp', 15, 239, 2.8, 63, 0.6, 5.1, 57, 28, 0, 30, 'Lemon juice or amchur powder', 'Seedless tamarind pulp', 'Sour-sweet depth'],
    ['coconut-milk', 'Coconut Milk', 'condiments', 'cups', 240, 230, 2.3, 5.5, 24, 2.2, 3.3, 15, 0, 25, 'Cashew cream or dairy cream', 'Light coconut milk', 'Creamy, dairy-free richness'],
    ['stock', 'Vegetable Stock', 'condiments', 'cups', 240, 12, 0.5, 2.1, 0.2, 0, 1.2, 300, 0, 8, 'Water + a pinch of salt', 'Home-made low-sodium stock', 'Savoury cooking liquid'],
    ['chilli-sauce', 'Chilli Sauce', 'condiments', 'tbsp', 15, 93, 1, 22, 0.4, 1.5, 15, 1100, 0, 30, 'Sriracha or chilli paste', 'No-added-sugar hot sauce', 'Heat with tang'],
    ['mayonnaise', 'Mayonnaise', 'condiments', 'tbsp', 14, 680, 1, 0.6, 75, 0, 0.6, 635, 42, 35, 'Greek yogurt or hung curd', 'Yogurt-based light mayo', 'Creamy binding for assemblies'],
    ['ketchup', 'Tomato Ketchup', 'condiments', 'tbsp', 17, 101, 1.3, 27, 0.1, 0.3, 22, 907, 0, 20, 'Tomato purée + a little sweetener', 'No-added-sugar ketchup', 'Sweet-tangy accent'],
    ['fish-sauce', 'Fish Sauce', 'condiments', 'tbsp', 18, 35, 5, 3.6, 0, 0, 3.6, 7851, 0, 40, 'Soy sauce + a squeeze of lime', 'Low-sodium fish sauce', 'Deep Southeast Asian umami'],

    // -------------------------------------------------------------- others
    ['water', 'Water', 'others', 'cups', 240, 0, 0, 0, 0, 0, 0, 2, 0, 0, '—', 'Filtered water', 'Cooking liquid and consistency control'],
    ['baking-powder', 'Baking Powder', 'others', 'tsp', 4, 53, 0, 28, 0, 0.2, 0, 10600, 0, 25, '¼ tsp baking soda + ½ tsp lemon juice', 'Aluminium-free baking powder', 'Lift and lightness'],
    ['yeast', 'Active Dry Yeast', 'others', 'tsp', 3, 325, 40, 41, 7.6, 27, 0, 51, 0, 60, 'Instant yeast (use ¾ the amount)', 'Fresh instant yeast', 'Fermentation, flavour and rise'],
    ['chocolate', 'Dark Chocolate', 'others', 'grams', 1, 546, 4.9, 61, 31, 7, 48, 24, 8, 90, 'Cocoa powder + a little fat', '70%+ dark chocolate', 'Deep bittersweet flavour', { iron: 8, magnesium: 146 }],
    ['cocoa', 'Cocoa Powder', 'others', 'tbsp', 5, 228, 20, 58, 14, 33, 1.8, 21, 0, 70, 'Grated dark chocolate', 'Unsweetened raw cacao', 'Chocolate flavour without sugar', { iron: 13.9, magnesium: 499 }],
    ['gelatin-agar', 'Agar Agar', 'others', 'tsp', 2, 306, 6, 81, 0.3, 78, 0, 102, 0, 150, 'Gelatin (non-vegetarian)', 'Plant-based agar', 'Sets desserts without animal products'],
    ['ice', 'Ice Cubes', 'others', 'cups', 150, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Chilled water', 'Filtered-water ice', 'Chills and dilutes drinks'],
  ];
  /* eslint-enable max-len */

  const FIELDS = ['id', 'name', 'category', 'unit', 'gramsPerUnit', 'kcal', 'protein', 'carbs', 'fat',
    'fiber', 'sugar', 'sodium', 'cholesterol', 'costPer100g', 'substitute', 'healthy', 'purpose', 'micro'];

  /** Expand a compact row into a full ingredient object with merged micros. */
  function expand(row) {
    const obj = {};
    FIELDS.forEach((field, i) => { obj[field] = row[i]; });
    obj.micro = Object.assign({}, MICRO_BASELINE[obj.category] || MICRO_BASELINE.others, obj.micro || {});
    obj.group = SHOPPING_GROUP[obj.category] || 'Others';
    obj.emoji = AFR.images ? AFR.images.glyphFor(obj.name) : '🍽️';
    return obj;
  }

  const byId = {};
  const all = ROWS.map((row) => {
    const item = expand(row);
    byId[item.id] = item;
    return item;
  });

  /* Alias table so free-text ingredient names resolve to a known entry. */
  const ALIASES = {
    'curd': 'yogurt', 'dahi': 'yogurt', 'greek yogurt': 'yogurt',
    'capsicum': 'bell-pepper', 'sweet pepper': 'bell-pepper',
    'brinjal': 'eggplant', 'aubergine': 'eggplant',
    'cilantro': 'coriander-leaves', 'dhania': 'coriander-leaves',
    'scallion': 'spring-onion', 'green onion': 'spring-onion',
    'maida': 'all-purpose-flour', 'plain flour': 'all-purpose-flour',
    'atta': 'wheat-flour', 'whole wheat flour': 'wheat-flour',
    'rava': 'semolina', 'sooji': 'semolina',
    'chana': 'chickpeas', 'garbanzo': 'chickpeas', 'kabuli chana': 'chickpeas',
    'rajma': 'kidney-beans', 'masoor': 'lentils', 'dal': 'toor-dal', 'daal': 'toor-dal',
    'cottage cheese': 'paneer', 'mozzarella': 'cheese', 'cheddar': 'cheese', 'parmesan': 'cheese',
    'mutton': 'mutton', 'lamb': 'mutton', 'goat': 'mutton',
    'shrimp': 'prawns', 'jhinga': 'prawns', 'salmon': 'fish', 'tuna': 'fish', 'cod': 'fish',
    'cornstarch': 'cornflour', 'corn starch': 'cornflour',
    'chilli powder': 'red-chilli-powder', 'chili powder': 'red-chilli-powder', 'cayenne': 'red-chilli-powder',
    'jeera': 'cumin', 'haldi': 'turmeric', 'namak': 'salt', 'kali mirch': 'black-pepper',
    'elaichi': 'cardamom', 'dalchini': 'cinnamon', 'laung': 'cloves', 'hing': 'asafoetida',
    'kasuri methi': 'fenugreek', 'methi': 'fenugreek',
    'malai': 'cream', 'heavy cream': 'cream', 'double cream': 'cream',
    'vegetable oil': 'oil', 'sunflower oil': 'oil', 'canola oil': 'oil', 'mustard oil': 'oil',
    'gur': 'jaggery', 'brown sugar': 'sugar', 'caster sugar': 'sugar',
    'tamarind': 'tamarind', 'imli': 'tamarind',
    'stock cube': 'stock', 'broth': 'stock', 'chicken stock': 'stock',
    'noodle': 'noodles', 'spaghetti': 'pasta', 'penne': 'pasta', 'macaroni': 'pasta',
    'basmati': 'rice', 'white rice': 'rice', 'jasmine rice': 'rice', 'sushi rice': 'rice',
    'tortillas': 'tortilla', 'roti': 'tortilla', 'pita': 'tortilla',
    'soya chunks': 'soy-chunks', 'soya': 'soy-chunks', 'tvp': 'soy-chunks',
    'nuts': 'cashew', 'kaju': 'cashew', 'badam': 'almond',
    'eggs': 'egg', 'anda': 'egg',
  };

  /**
   * Look an ingredient up by id, alias or fuzzy name.
   * Always returns something usable — unknown names get a category-guessed
   * synthetic entry so an exotic dish never breaks the nutrition maths.
   */
  function find(name) {
    if (!name) return null;
    const key = String(name).toLowerCase().trim();
    if (byId[key]) return byId[key];
    if (ALIASES[key] && byId[ALIASES[key]]) return byId[ALIASES[key]];

    // Alias containment (e.g. "boneless chicken thigh" → chicken-thigh)
    const aliasHit = Object.keys(ALIASES).find((alias) => key.includes(alias));
    if (aliasHit) return byId[ALIASES[aliasHit]];

    // Longest-name-first exact-ish match, so "chicken thigh" beats "chicken".
    const direct = all
      .filter((item) => key.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(key))
      .sort((a, b) => b.name.length - a.name.length)[0];
    return direct || null;
  }

  /** Guess a category for an unknown ingredient from its name. */
  function guessCategory(name) {
    const n = String(name).toLowerCase();
    const rules = [
      [/(masala|powder|seed|spice|pepper|chilli|chili|cumin|coriander seed)/, 'spices'],
      [/(oil|ghee|butter|fat)/, 'oils'],
      [/(milk|cream|cheese|yogurt|curd|paneer|dairy)/, 'dairy'],
      [/(chicken|mutton|lamb|beef|pork|meat|egg|bacon)/, 'meat'],
      [/(fish|prawn|shrimp|crab|squid|seafood|clam)/, 'seafood'],
      [/(rice|flour|bread|pasta|noodle|oat|quinoa|wheat|grain)/, 'grains'],
      [/(dal|lentil|bean|chickpea|pea|tofu|soy)/, 'legumes'],
      [/(nut|almond|cashew|walnut|seed)/, 'nuts'],
      [/(sugar|honey|syrup|jaggery|sweet)/, 'sweeteners'],
      [/(sauce|vinegar|paste|stock|broth|ketchup)/, 'condiments'],
      [/(leaf|leaves|herb|mint|basil|thyme|parsley)/, 'herbs'],
      [/(fruit|apple|berry|mango|banana|orange|melon)/, 'fruits'],
    ];
    const hit = rules.find(([re]) => re.test(n));
    return hit ? hit[1] : 'vegetables';
  }

  /**
   * Resolve to a usable ingredient, synthesising a conservative entry when the
   * pantry has never heard of it. Estimates are intentionally middle-of-road.
   */
  function resolve(name) {
    const hit = find(name);
    if (hit) return hit;

    const category = guessCategory(name);
    const defaults = {
      vegetables: { unit: 'cups', gramsPerUnit: 100, kcal: 35, protein: 1.5, carbs: 7, fat: 0.3, fiber: 2, sugar: 3, sodium: 10, cost: 8 },
      fruits: { unit: 'cups', gramsPerUnit: 140, kcal: 60, protein: 0.8, carbs: 15, fat: 0.3, fiber: 2.4, sugar: 11, sodium: 2, cost: 15 },
      herbs: { unit: 'tbsp', gramsPerUnit: 4, kcal: 40, protein: 3, carbs: 6, fat: 0.7, fiber: 3, sugar: 1, sodium: 30, cost: 30 },
      spices: { unit: 'tsp', gramsPerUnit: 2.5, kcal: 300, protein: 11, carbs: 55, fat: 12, fiber: 25, sugar: 3, sodium: 40, cost: 80 },
      dairy: { unit: 'cups', gramsPerUnit: 200, kcal: 120, protein: 6, carbs: 6, fat: 8, fiber: 0, sugar: 5, sodium: 60, cost: 30 },
      meat: { unit: 'grams', gramsPerUnit: 1, kcal: 200, protein: 25, carbs: 0, fat: 11, fiber: 0, sugar: 0, sodium: 70, cost: 40 },
      seafood: { unit: 'grams', gramsPerUnit: 1, kcal: 130, protein: 21, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 90, cost: 65 },
      grains: { unit: 'cups', gramsPerUnit: 160, kcal: 350, protein: 10, carbs: 73, fat: 2, fiber: 3, sugar: 2, sodium: 5, cost: 12 },
      legumes: { unit: 'cups', gramsPerUnit: 180, kcal: 340, protein: 22, carbs: 60, fat: 1.5, fiber: 15, sugar: 4, sodium: 12, cost: 15 },
      nuts: { unit: 'tbsp', gramsPerUnit: 10, kcal: 590, protein: 20, carbs: 22, fat: 50, fiber: 8, sugar: 5, sodium: 5, cost: 90 },
      oils: { unit: 'tbsp', gramsPerUnit: 14, kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0, cost: 20 },
      sweeteners: { unit: 'tsp', gramsPerUnit: 4, kcal: 380, protein: 0, carbs: 97, fat: 0, fiber: 0, sugar: 95, sodium: 5, cost: 10 },
      condiments: { unit: 'tbsp', gramsPerUnit: 16, kcal: 90, protein: 2, carbs: 12, fat: 3, fiber: 1, sugar: 6, sodium: 600, cost: 25 },
      others: { unit: 'tbsp', gramsPerUnit: 12, kcal: 120, protein: 3, carbs: 20, fat: 3, fiber: 2, sugar: 5, sodium: 40, cost: 25 },
    }[category];

    return {
      id: `custom-${(AFR.utils && AFR.utils.slug(name)) || 'item'}`,
      name: AFR.utils ? AFR.utils.titleCase(name) : name,
      category,
      unit: defaults.unit,
      gramsPerUnit: defaults.gramsPerUnit,
      kcal: defaults.kcal, protein: defaults.protein, carbs: defaults.carbs, fat: defaults.fat,
      fiber: defaults.fiber, sugar: defaults.sugar, sodium: defaults.sodium, cholesterol: 0,
      costPer100g: defaults.cost,
      substitute: 'Closest ingredient you already have',
      healthy: 'Fresh, minimally processed version',
      purpose: 'Flavour and body',
      micro: Object.assign({}, MICRO_BASELINE[category]),
      group: SHOPPING_GROUP[category] || 'Others',
      emoji: AFR.images ? AFR.images.glyphFor(name) : '🍽️',
      estimated: true, // flagged so the UI can be honest about it
    };
  }

  AFR.data = AFR.data || {};
  AFR.data.ingredients = {
    all,
    byId,
    aliases: ALIASES,
    microBaseline: MICRO_BASELINE,
    shoppingGroup: SHOPPING_GROUP,
    find,
    resolve,
    guessCategory,
    /** Names for the wizard's ingredient autocomplete. */
    names: all.map((i) => i.name),
  };
})(window);
