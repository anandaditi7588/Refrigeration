/* ==========================================================================
 * wizard-steps.js — the 16-step "Create Your Own Dish" questionnaire.
 *
 * One declarative array drives everything: the rail, the panels, validation,
 * the customisation summary and the prompt sent to whichever AI provider is
 * configured. Adding a step is a matter of adding an object here.
 *
 * Field types: 'text' | 'single' | 'multi' | 'tokens' | 'textarea'
 * Numeric modifiers (`factor`, `level`) are read by the recipe engine so the
 * user's choices genuinely change quantities and instructions.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  const STEPS = [
    /* -------------------------------------------------------------- 1 */
    {
      id: 'dish', number: 1, title: 'Dish Name', icon: 'fa-utensils',
      question: 'What dish would you like to prepare?',
      hint: 'Any dish, from any country. Type it however you say it at home.',
      type: 'text', required: true,
      placeholder: 'e.g. Chicken Biryani, Paneer Butter Masala, Pad Thai…',
      examples: ['Chicken Biryani', 'Paneer Butter Masala', 'Margherita Pizza', 'Sushi Rolls',
        'Pad Thai', 'Classic Burger', 'Lasagna', 'Shakshuka', 'Ramen', 'Tacos al Pastor',
        'Butter Chicken', 'Mushroom Risotto', 'Falafel Wrap', 'Chocolate Brownie'],
    },

    /* -------------------------------------------------------------- 2 */
    {
      id: 'servings', number: 2, title: 'Servings', icon: 'fa-users',
      question: 'How many people are you cooking for?',
      hint: 'Every quantity, the nutrition panel and the cost estimate scale to this number.',
      type: 'single', required: true, allowCustom: true, customLabel: 'Custom number',
      customMin: 1, customMax: 50, default: '4',
      options: [
        { value: '1', label: '1', emoji: '🍽️', desc: 'Just me' },
        { value: '2', label: '2', emoji: '👫', desc: 'A pair' },
        { value: '3', label: '3', emoji: '👨‍👩‍👦', desc: 'Small family' },
        { value: '4', label: '4', emoji: '👨‍👩‍👧‍👦', desc: 'Standard family' },
        { value: '5', label: '5', emoji: '🍲', desc: 'Family plus one' },
        { value: '6', label: '6', emoji: '🥘', desc: 'Big family meal' },
        { value: '8', label: '8', emoji: '🎉', desc: 'Small gathering' },
        { value: '10', label: '10', emoji: '🎊', desc: 'Party' },
      ],
    },

    /* -------------------------------------------------------------- 3 */
    {
      id: 'experience', number: 3, title: 'Cooking Experience', icon: 'fa-graduation-cap',
      question: 'How comfortable are you in the kitchen?',
      hint: 'This changes how much a step explains, and which techniques we ask you to attempt.',
      type: 'single', required: true, default: 'intermediate',
      options: [
        { value: 'beginner', label: 'Beginner', emoji: '🌱', desc: 'Every step spelled out, no assumed knowledge, simpler techniques' },
        { value: 'intermediate', label: 'Intermediate', emoji: '🍳', desc: 'Confident with the basics, happy with a multi-stage recipe' },
        { value: 'expert', label: 'Expert', emoji: '👨‍🍳', desc: 'Concise instructions, advanced technique, professional shortcuts' },
      ],
    },

    /* -------------------------------------------------------------- 4 */
    {
      id: 'time', number: 4, title: 'Cooking Time', icon: 'fa-clock',
      question: 'How much time do you have?',
      hint: 'We adapt the method — pressure cooking, par-cooking or shortcuts — to fit your window.',
      type: 'single', required: true, default: '60',
      options: [
        { value: '15', label: '15 minutes', emoji: '⚡', desc: 'Fast weeknight cooking', minutes: 15 },
        { value: '30', label: '30 minutes', emoji: '⏱️', desc: 'Quick but proper', minutes: 30 },
        { value: '45', label: '45 minutes', emoji: '🕓', desc: 'A relaxed evening meal', minutes: 45 },
        { value: '60', label: '1 hour', emoji: '🕐', desc: 'Time to do it properly', minutes: 60 },
        { value: '120', label: '2 hours', emoji: '🍖', desc: 'Slow cooking, marinades, layering', minutes: 120 },
        { value: 'any', label: 'No preference', emoji: '♾️', desc: 'Give me the best version, however long it takes', minutes: 0 },
      ],
    },

    /* -------------------------------------------------------------- 5 */
    {
      id: 'cuisine', number: 5, title: 'Cuisine', icon: 'fa-earth-asia',
      question: 'Which cuisine should this follow?',
      hint: 'We detect this from your dish automatically — override it if you want a different treatment.',
      type: 'single', required: true, autoDetect: true, default: 'auto',
      options: [
        { value: 'auto', label: 'Auto-detect', emoji: '✨', desc: 'Work it out from the dish name' },
        { value: 'indian', label: 'Indian', emoji: '🇮🇳' },
        { value: 'italian', label: 'Italian', emoji: '🇮🇹' },
        { value: 'chinese', label: 'Chinese', emoji: '🇨🇳' },
        { value: 'japanese', label: 'Japanese', emoji: '🇯🇵' },
        { value: 'thai', label: 'Thai', emoji: '🇹🇭' },
        { value: 'mexican', label: 'Mexican', emoji: '🇲🇽' },
        { value: 'french', label: 'French', emoji: '🇫🇷' },
        { value: 'american', label: 'American', emoji: '🇺🇸' },
        { value: 'mediterranean', label: 'Mediterranean', emoji: '🌊' },
        { value: 'middle-eastern', label: 'Middle Eastern', emoji: '🕌' },
        { value: 'african', label: 'African', emoji: '🌍' },
        { value: 'korean', label: 'Korean', emoji: '🇰🇷' },
        { value: 'vietnamese', label: 'Vietnamese', emoji: '🇻🇳' },
        { value: 'spanish', label: 'Spanish', emoji: '🇪🇸' },
        { value: 'turkish', label: 'Turkish', emoji: '🇹🇷' },
        { value: 'global', label: 'Global / Fusion', emoji: '🌐' },
      ],
    },

    /* -------------------------------------------------------------- 6 */
    {
      id: 'diet', number: 6, title: 'Diet Preference', icon: 'fa-seedling',
      question: 'Any dietary requirements?',
      hint: 'Choose as many as apply. Ingredients are swapped, not just labelled.',
      type: 'multi', required: false, default: ['none'],
      options: [
        { value: 'none', label: 'No restriction', emoji: '🍽️', exclusive: true },
        { value: 'vegetarian', label: 'Vegetarian', emoji: '🥦', excludes: ['meat', 'seafood'] },
        { value: 'vegan', label: 'Vegan', emoji: '🌱', excludes: ['meat', 'seafood', 'dairy', 'egg', 'honey'] },
        { value: 'eggetarian', label: 'Eggetarian', emoji: '🥚', excludes: ['meat', 'seafood'] },
        { value: 'non-vegetarian', label: 'Non Vegetarian', emoji: '🍗' },
        { value: 'jain', label: 'Jain', emoji: '🙏', excludes: ['meat', 'seafood', 'onion', 'garlic', 'root'] },
        { value: 'gluten-free', label: 'Gluten Free', emoji: '🌾', excludes: ['gluten'] },
        { value: 'keto', label: 'Keto', emoji: '🥑', macro: { carbs: 0.25, fat: 1.5 } },
        { value: 'paleo', label: 'Paleo', emoji: '🍖', excludes: ['grains', 'dairy', 'legumes'] },
        { value: 'low-carb', label: 'Low Carb', emoji: '📉', macro: { carbs: 0.5 } },
        { value: 'high-protein', label: 'High Protein', emoji: '💪', macro: { protein: 1.4 } },
        { value: 'diabetic', label: 'Diabetic Friendly', emoji: '🩺', macro: { sugar: 0.3, carbs: 0.75 } },
        { value: 'heart-healthy', label: 'Heart Healthy', emoji: '❤️', macro: { fat: 0.6, sodium: 0.6 } },
        { value: 'weight-loss', label: 'Weight Loss', emoji: '⚖️', macro: { fat: 0.55, carbs: 0.7 } },
        { value: 'muscle-gain', label: 'Muscle Gain', emoji: '🏋️', macro: { protein: 1.5, carbs: 1.2 } },
        { value: 'kids', label: 'Kids Friendly', emoji: '🧒', maxSpice: 1 },
        { value: 'senior', label: 'Senior Friendly', emoji: '👴', maxSpice: 3 },
        { value: 'pregnancy', label: 'Pregnancy Friendly', emoji: '🤰', excludes: ['raw', 'alcohol'], maxSpice: 3 },
      ],
    },

    /* -------------------------------------------------------------- 7 */
    {
      id: 'spice', number: 7, title: 'Spice Level', icon: 'fa-pepper-hot',
      question: 'How hot do you like it?',
      hint: 'This changes chilli quantities and how the heat is layered in, not just a warning label.',
      type: 'single', required: true, default: 'medium',
      options: [
        { value: 'none', label: 'No Spice', emoji: '🚫', level: 0, desc: 'No chilli at all' },
        { value: 'very-mild', label: 'Very Mild', emoji: '🌤️', level: 1, desc: 'Barely a whisper' },
        { value: 'mild', label: 'Mild', emoji: '🙂', level: 2, desc: 'Gentle warmth' },
        { value: 'medium', label: 'Medium', emoji: '🌶️', level: 3, desc: 'Noticeable but comfortable' },
        { value: 'hot', label: 'Hot', emoji: '🔥', level: 4, desc: 'Properly spicy' },
        { value: 'very-hot', label: 'Very Hot', emoji: '🥵', level: 5, desc: 'You want to feel it' },
        { value: 'extra-spicy', label: 'Indian Extra Spicy', emoji: '💀', level: 6, desc: 'Full street-stall heat' },
      ],
    },

    /* -------------------------------------------------------------- 8 */
    {
      id: 'sweetness', number: 8, title: 'Sweetness', icon: 'fa-candy-cane',
      question: 'How sweet should it be?',
      hint: 'Affects sugar quantities and which sweetener we reach for.',
      type: 'single', required: true, default: 'medium',
      options: [
        { value: 'none', label: 'No Sugar', emoji: '🚫', factor: 0 },
        { value: 'very-low', label: 'Very Low', emoji: '🍃', factor: 0.2 },
        { value: 'low', label: 'Low', emoji: '🙂', factor: 0.4 },
        { value: 'medium', label: 'Medium', emoji: '⚖️', factor: 0.7 },
        { value: 'sweet', label: 'Sweet', emoji: '🍯', factor: 1 },
        { value: 'extra-sweet', label: 'Extra Sweet', emoji: '🍰', factor: 1.4 },
        { value: 'natural', label: 'Natural Sweeteners Only', emoji: '🌿', factor: 0.7, natural: true,
          desc: 'Dates, honey, jaggery and fruit instead of refined sugar' },
      ],
    },

    /* -------------------------------------------------------------- 9 */
    {
      id: 'salt', number: 9, title: 'Salt Preference', icon: 'fa-cubes-stacked',
      question: 'How much salt?',
      hint: 'Low-salt recipes get extra acid and aromatics so they still taste seasoned.',
      type: 'single', required: true, default: 'normal',
      options: [
        { value: 'low', label: 'Low Salt', emoji: '📉', factor: 0.55, desc: 'Heart and blood-pressure friendly' },
        { value: 'normal', label: 'Normal', emoji: '⚖️', factor: 1, desc: 'Standard seasoning' },
        { value: 'high', label: 'High', emoji: '📈', factor: 1.3, desc: 'Boldly seasoned' },
      ],
    },

    /* ------------------------------------------------------------- 10 */
    {
      id: 'oil', number: 10, title: 'Oil Preference', icon: 'fa-bottle-droplet',
      question: 'How much fat should the recipe use?',
      hint: 'We adjust the cooking method too — oil-free recipes switch to dry or steam techniques.',
      type: 'single', required: true, default: 'normal',
      options: [
        { value: 'none', label: 'Oil Free', emoji: '🚫', factor: 0.05, desc: 'Water sauté, steam, air-fry' },
        { value: 'low', label: 'Low Oil', emoji: '💧', factor: 0.5, desc: 'Just enough to cook' },
        { value: 'normal', label: 'Normal', emoji: '⚖️', factor: 1, desc: 'Balanced everyday cooking' },
        { value: 'rich', label: 'Rich', emoji: '🧈', factor: 1.6, desc: 'Restaurant-style indulgence' },
      ],
    },

    /* ------------------------------------------------------------- 11 */
    {
      id: 'style', number: 11, title: 'Cooking Style', icon: 'fa-palette',
      question: 'What kind of version do you want?',
      hint: 'The same dish, cooked with a different intent.',
      type: 'single', required: true, default: 'traditional',
      options: [
        { value: 'healthy', label: 'Healthy', emoji: '🥗', desc: 'Lighter fat, more vegetables, gentler techniques' },
        { value: 'traditional', label: 'Traditional', emoji: '🏠', desc: 'The way it is cooked at home' },
        { value: 'restaurant', label: 'Restaurant Style', emoji: '🍴', desc: 'Richer, glossier, professionally finished' },
        { value: 'street', label: 'Street Food Style', emoji: '🛺', desc: 'Bold, fast, unapologetically punchy' },
        { value: 'authentic', label: 'Authentic', emoji: '📜', desc: 'Regional technique, no substitutions' },
        { value: 'fusion', label: 'Fusion', emoji: '🎨', desc: 'Cross-cultural twist on the original' },
      ],
    },

    /* ------------------------------------------------------------- 12 */
    {
      id: 'appliances', number: 12, title: 'Available Appliances', icon: 'fa-blender',
      question: 'What can you cook with?',
      hint: 'Pick everything you have — the method adapts to your actual kitchen.',
      type: 'multi', required: false, default: ['gas'],
      options: [
        { value: 'gas', label: 'Gas Stove', emoji: '🔥' },
        { value: 'induction', label: 'Induction', emoji: '🔌' },
        { value: 'microwave', label: 'Microwave', emoji: '📡' },
        { value: 'otg', label: 'OTG', emoji: '🍞' },
        { value: 'oven', label: 'Oven', emoji: '🔥' },
        { value: 'air-fryer', label: 'Air Fryer', emoji: '🌀' },
        { value: 'pressure-cooker', label: 'Pressure Cooker', emoji: '⏲️' },
        { value: 'slow-cooker', label: 'Slow Cooker', emoji: '🐢' },
        { value: 'instant-pot', label: 'Instant Pot', emoji: '🍲' },
        { value: 'rice-cooker', label: 'Rice Cooker', emoji: '🍚' },
      ],
    },

    /* ------------------------------------------------------------- 13 */
    {
      id: 'available', number: 13, title: 'Available Ingredients', icon: 'fa-basket-shopping',
      question: 'What do you already have?',
      hint: 'These get priority — we build the recipe around your fridge and flag only what you actually need to buy.',
      type: 'tokens', required: false,
      placeholder: 'Type an ingredient and press Enter…',
      suggestions: ['Onion', 'Tomato', 'Garlic', 'Ginger', 'Potato', 'Rice', 'Eggs', 'Chicken',
        'Paneer', 'Yogurt', 'Milk', 'Butter', 'Cheese', 'Spinach', 'Bell Pepper', 'Lemon',
        'Coriander Leaves', 'Green Chilli', 'Chickpeas', 'Pasta'],
    },

    /* ------------------------------------------------------------- 14 */
    {
      id: 'avoid', number: 14, title: 'Ingredients to Avoid', icon: 'fa-ban',
      question: 'Anything you would rather not eat?',
      hint: 'A preference, not an allergy — these are swapped for something that plays the same role.',
      type: 'tokens', required: false,
      placeholder: 'Type an ingredient and press Enter…',
      suggestions: ['Garlic', 'Onion', 'Nuts', 'Soy', 'Milk', 'Cheese', 'Egg', 'Mushroom',
        'Seafood', 'Coriander', 'Capsicum', 'Coconut', 'Ginger', 'Tomato', 'Chilli', 'Beef', 'Pork'],
    },

    /* ------------------------------------------------------------- 15 */
    {
      id: 'allergies', number: 15, title: 'Allergies', icon: 'fa-triangle-exclamation',
      question: 'Any allergies we must design around?',
      hint: 'Treated as hard exclusions — the ingredient and its derivatives are removed, and cross-contamination warnings are added.',
      type: 'multi', required: false, allowCustom: true, customLabel: 'Other allergy',
      options: [
        { value: 'nuts', label: 'Nut Allergy', emoji: '🥜', blocks: ['nuts', 'cashew', 'almond', 'peanut', 'walnut', 'peanut-butter'] },
        { value: 'gluten', label: 'Gluten Allergy', emoji: '🌾', blocks: ['wheat-flour', 'all-purpose-flour', 'pasta', 'bread', 'noodles', 'semolina', 'soy-sauce'] },
        { value: 'milk', label: 'Milk Allergy', emoji: '🥛', blocks: ['milk', 'yogurt', 'cream', 'butter', 'ghee', 'paneer', 'cheese', 'condensed-milk'] },
        { value: 'egg', label: 'Egg Allergy', emoji: '🥚', blocks: ['egg', 'mayonnaise'] },
        { value: 'soy', label: 'Soy Allergy', emoji: '🫘', blocks: ['soy-sauce', 'tofu', 'soy-chunks'] },
        { value: 'shellfish', label: 'Shellfish Allergy', emoji: '🦐', blocks: ['prawns', 'squid', 'fish-sauce'] },
        { value: 'fish', label: 'Fish Allergy', emoji: '🐟', blocks: ['fish', 'fish-sauce'] },
        { value: 'sesame', label: 'Sesame Allergy', emoji: '🌰', blocks: ['sesame-seeds', 'sesame-oil'] },
      ],
    },

    /* ------------------------------------------------------------- 16 */
    {
      id: 'notes', number: 16, title: 'Special Instructions', icon: 'fa-pen-to-square',
      question: 'Anything else we should know?',
      hint: 'Write it however you like — this goes straight into the recipe brief.',
      type: 'textarea', required: false,
      placeholder: 'e.g. "less oily, extra crispy, kids will eat it, needs to travel well in a lunchbox"',
      chips: ['Less oily', 'Extra crispy', 'Restaurant taste', 'No coriander', 'Kids will eat it',
        'Festival recipe', 'High protein', 'Budget recipe', 'Meal prep friendly', 'One pot only',
        'Lunchbox friendly', 'Extra gravy', 'Make ahead'],
    },
  ];

  /** Look up the option object the user selected for a given step. */
  function optionFor(stepId, value) {
    const step = STEPS.find((s) => s.id === stepId);
    if (!step || !step.options) return null;
    return step.options.find((o) => o.value === value) || null;
  }

  /** Human-readable label for any answer value (used in the summary section). */
  function labelFor(stepId, value) {
    const opt = optionFor(stepId, value);
    if (opt) return opt.label;
    if (stepId === 'cuisine' && AFR.data.cuisines) return AFR.data.cuisines.get(value).name;
    return AFR.utils ? AFR.utils.titleCase(String(value)) : String(value);
  }

  /** Defaults for a fresh wizard run. */
  function defaults() {
    const out = {};
    STEPS.forEach((step) => {
      if (step.default !== undefined) out[step.id] = AFR.utils.deepClone(step.default);
      else if (step.type === 'multi' || step.type === 'tokens') out[step.id] = [];
      else out[step.id] = '';
    });
    return out;
  }

  AFR.data = AFR.data || {};
  AFR.data.wizard = { steps: STEPS, optionFor, labelFor, defaults, count: STEPS.length };
})(window);
