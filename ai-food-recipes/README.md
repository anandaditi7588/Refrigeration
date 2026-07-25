# AI Food Recipes

A recipe application for **any dish, from any country, in any cuisine**. You describe the meal you
actually want — servings, diet, spice level, allergies, equipment, what's already in your fridge —
and it produces a complete, structured recipe built around all of it.

Built with HTML5, CSS3, Bootstrap 5, Font Awesome, Google Fonts and vanilla JavaScript.
**No frameworks, no build step, no server.** Open `index.html` and it works.

---

## Running it

```bash
# any static server works
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly from the filesystem also works — scripts are classic `<script>` tags
rather than ES modules specifically so that `file://` doesn't break on CORS.

---

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Hero, search, categories, 10 curated recipe rails, regional cuisines, footer |
| `create.html` | **Create Your Own Dish** — the 16-step wizard and the 20-section recipe output |
| `saved.html`  | Bookmarked recipes (localStorage only) |

Home page cards are *starting points*, not stored recipes: every card hands its dish to the wizard,
so there is exactly one generation path in the app.

---

## The 16-step brief

1. Dish name · 2. Servings · 3. Cooking experience · 4. Cooking time · 5. Cuisine (auto-detected,
overridable) · 6. Diet preference · 7. Spice level · 8. Sweetness · 9. Salt · 10. Oil ·
11. Cooking style · 12. Available appliances · 13. Available ingredients · 14. Ingredients to avoid ·
15. Allergies · 16. Special instructions

Every answer is a real transformation, not a label:

- **Servings** scales every quantity, the nutrition panel, the cost estimate and the step durations.
  Spices, herbs and cooking fat scale *sub-linearly* (`servings^0.78`–`^0.92`), because a pot for
  eight does not need eight times the cumin — that's how a larger batch is actually seasoned.
- **Diet** swaps ingredients (vegan → dairy becomes coconut milk, keto → rice becomes cauliflower,
  Jain → onion/garlic/root vegetables are replaced, gluten-free → wheat is substituted).
- **Allergies** are hard exclusions: the ingredient is swapped or removed outright, a warning is
  recorded, and a cross-contamination note is added to the food-safety section.
- **Oil-free** drops added fats entirely and rewrites the sauté steps to water/stock.
- **Appliances** rewrite the method — a pressure cooker collapses the simmer stage, a slow cooker
  becomes a 5–6 hour low braise, an air fryer replaces deep frying.
- **Time budget** compresses marinating, soaking and resting, and says plainly when a dish genuinely
  cannot be rushed further.
- **Experience** changes how much each step explains.
- **Special instructions** are pattern-matched into concrete adjustments listed back to you.

---

## The 20 output sections

Overview · Images · Ingredient table · Equipment · Preparation · Cooking steps · Serving suggestions ·
Nutrition · Health analysis · Customisation summary · Variations · Storage · Meal planning · Cost ·
Shopping list · YouTube videos · Source references · Chef tips · Food safety · Printable recipe

Nothing is ever a wall of prose: every section is a card, a table, a timeline, a numbered step or a
checklist. Every ingredient row carries an image, quantity, unit, purpose, substitute and healthy
alternative. Every cooking step carries an image, duration, temperature, flame level, a tip and a
common mistake.

---

## Architecture

```
ai-food-recipes/
├── index.html · create.html · saved.html
└── assets/
    ├── css/
    │   ├── theme.css          design tokens, light/dark themes, layout primitives
    │   ├── components.css     every .afr-* component
    │   └── print.css          print / "Save as PDF" stylesheet
    └── js/
        ├── core/
        │   ├── config.js      ← the only file you edit to go live
        │   ├── utils.js       pure helpers (formatting, seeded RNG, keyword matching)
        │   ├── store.js       namespaced localStorage with an in-memory fallback
        │   └── ui.js          DOM kit: theming, toasts, accordions, tabs, reveal, print
        ├── data/
        │   ├── ingredients.js ~120-item pantry: units, nutrition, cost, substitutes
        │   ├── cuisines.js    16 regional flavour profiles + cuisine detection
        │   ├── techniques.js  13 cooking techniques: components + prep/cook steps
        │   ├── wizard-steps.js the 16-step questionnaire, declaratively
        │   └── catalog.js     home-page browse content
        ├── services/
        │   ├── image-service.js    deterministic SVG artwork (swappable for a photo API)
        │   ├── nutrition-service.js per-serving maths, health score, suitability, cost
        │   ├── prompt-builder.js   model-agnostic brief + JSON schema hint
        │   └── recipe-service.js   the orchestrator
        ├── providers/
        │   ├── recipe-schema.js         the contract every provider returns
        │   ├── ai-local.js              built-in offline engine (default)
        │   ├── ai-remote.js             OpenAI · Gemini · Claude · your proxy
        │   ├── video-providers.js       YouTube Data API · offline search links
        │   ├── recipe-api-providers.js  Spoonacular · Edamam · your aggregator
        │   └── registry.js              capability → provider lookup
        ├── components/  recipe-card · wizard · recipe-view
        └── pages/       home · create · saved
```

### How a recipe gets made

`recipe-service.js` implements the source priority from the brief:

1. **YouTube** — video references (section 16)
2. **Trusted websites** — reading references (section 17)
3. **Public recipe APIs** — structured cross-checks (timings, servings, ratings)
4. **AI** — the recipe body itself

Video and reference lookups run in parallel with generation, and any of them may fail without taking
the page down — a failed source becomes a visible warning, not an error.

**External sources inform the recipe; they are never copied into it.** The method is always freshly
generated. Where an API reports that published versions of a dish typically take a different amount
of time, that discrepancy is surfaced to the reader rather than silently overwriting the method.

### The built-in engine

With no API keys configured, `ai-local.js` generates everything in-browser by composing:

```
technique (techniques.js) × cuisine (cuisines.js) × pantry (ingredients.js)
```

It is **deterministic** — the same answers always produce the same recipe — which makes it testable
and keeps bookmarks stable. Nutrition is computed by summing the actual ingredient list and dividing
by the serving count, with retention factors applied to heat-sensitive vitamins and an allowance for
oil absorbed during frying.

---

## Wiring up a real API

Everything lives in `assets/js/core/config.js`. Nothing else in the app reads a key.

```js
AFR.config.providers.ai     = 'openai';   // 'openai' | 'gemini' | 'claude' | 'proxy' | 'local'
AFR.config.providers.video  = 'youtube';  // 'youtube' | 'local'
AFR.config.providers.recipe = 'spoonacular'; // 'spoonacular' | 'edamam' | 'proxy' | 'local'
```

**In production, do not put vendor keys in this file** — it ships to every visitor. Point the app at
a small server of your own that holds the secrets:

```js
AFR.config.endpoints.ai = 'https://api.example.com/ai/recipe';
AFR.config.providers.ai = 'proxy';
```

Your endpoint receives `{ answers, brief }` and returns the recipe JSON (or `{ recipe: {...} }`).
The `keys` block exists for local development only.

### Adding your own provider

```js
AFR.registry.register('ai', {
  id: 'my-model',
  async generate(answers, hooks) {
    hooks.onProgress('Thinking…', 0.5);
    const json = await myBackend(AFR.prompt.build(answers));
    return AFR.schema.normalise(json);
  },
});
AFR.config.providers.ai = 'my-model';
```

`AFR.schema.normalise()` is deliberately forgiving — a model that omits a field or returns a string
where an array belongs degrades to an empty section rather than a blank page. Fields a language model
shouldn't waste tokens on (images, cost, shopping list, customisation summary) are filled in locally,
and nutrition is recomputed if the model's figures contradict its own ingredient list.

Remote providers fall back to the built-in engine automatically if the network call fails, with a
visible note explaining what happened.

---

## Design

Glassmorphism, sticky navigation, smooth animations, light and dark themes, skeleton loaders, a
staged progress bar during generation, accordion sections, lazy-loaded images, print/share/PDF/bookmark
actions, and a tickable shopping list.

- **Accessibility**: skip link, one consistent focus ring, ARIA-correct accordions/tabs/progress,
  native radio/checkbox semantics behind the styled option cards, live-region step announcements,
  keyboard-navigable search, and `prefers-reduced-motion` honoured globally.
- **Robustness**: Bootstrap is used for grid and utility classes only. Every interactive widget —
  accordions, tabs, toasts, the mobile nav — is implemented in the app's own JavaScript, so a blocked
  CDN degrades styling, never behaviour.
- **Performance**: no framework, no build, lazy images, accordion bodies render only when opened.

### Images

The default image provider paints deterministic SVG plates as data URIs: no network requests, no
broken images, no licensing questions, and the same dish always looks the same. Swap
`AFR.config.providers.image` to serve real photography instead — every caller goes through
`AFR.images.*`, so nothing else changes.

---

## Honesty notes

These matter, and the UI states them where they appear:

- **Nutrition and cost are estimates.** Macros come from public food-composition references; some
  micronutrients come from per-category baselines with per-ingredient overrides. It's a cooking aid,
  not a clinical tool, and the health analysis is general guidance rather than medical advice.
- **Without a YouTube API key, the video section shows real, working YouTube *searches*** — clearly
  labelled as such — rather than inventing channel names, view counts and publish dates for videos
  that may not exist.
- **Source references list what informed the recipe**, and say plainly when the built-in engine wrote
  it from its own knowledge base rather than from external pages.

---

## Testing

The engine is plain functions over plain data, so it can be exercised in Node with a small `window`
shim (no DOM needed for anything under `data/`, `services/` or `providers/`). The build was verified
against all 63 catalog dishes plus 20 constraint scenarios — diet enforcement, allergy exclusion,
avoid-lists, oil-free, no-spice, serving scaling — and in a real browser for the full wizard-to-recipe
flow at desktop and mobile widths, in both themes.
