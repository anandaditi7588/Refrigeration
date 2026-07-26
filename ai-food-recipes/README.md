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
| `setup.html`  | Connect live data — tests your API keys against the real endpoints |

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
        │   ├── i18n.js        interface translation, text direction
        │   └── ui.js          DOM kit: theming, toasts, accordions, tabs, reveal, print
        ├── data/
        │   ├── ingredients.js ~145-item pantry: units, nutrition, cost, substitutes
        │   ├── languages.js   35 languages grouped by country, RTL flags
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
        │   ├── photo-providers.js       Pexels · Unsplash · Wikimedia · YouTube thumbs
        │   ├── recipe-api-providers.js  Spoonacular · Edamam · your aggregator
        │   └── registry.js              capability → provider lookup
        ├── components/  recipe-card · wizard · recipe-view · language-picker
        └── pages/       home · create · saved · setup
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

## Live data: real YouTube results and real photographs

**Ingredient photographs work out of the box, with no key and no setup.** Two openly-licensed
sources are chained: TheMealDB's ingredient CDN first (predictable URLs, so there is no API
call at all — just a probe to check the image exists), then Wikimedia Commons for anything it
lacks, which is most regional produce. So the ingredient table shows real vegetables the first
time you run the app online. Everything else — the hero shot, step photos and
YouTube results — needs a free key.

To go completely network-free, set `images.ingredientPhotos: false` in `config.js`; the app
then falls back to its drawn plates and makes no requests at all.

Open **`setup.html`** in the running app: it lists every provider, tells you where to get the
key and what the free tier allows, and **tests your key against the real API**, showing the
actual response or the actual error. Start there rather than editing files blind.

> It must be served over `http://`, not opened as a `file://` page — browsers block API calls
> from `file://`, and a published Artifact page blocks them too.

### What each key gives you

| Provider | Key | Free tier | Gives you |
|---|---|---|---|
| **YouTube Data API v3** | required | 10,000 units/day ≈ 90 searches | Real videos: titles, channels, durations, view counts, publish dates, thumbnails |
| **Pexels** | required | 200/hour | Real food photography for the hero, gallery and every cooking step |
| **Unsplash** | required | 50/hour (demo) | Same, alternative source. Credits the photographer automatically |
| **TheMealDB** | **none** | unlimited | Ingredient photographs, first choice. **On by default** |
| **Wikimedia Commons** | **none** | unlimited | Ingredient fallback for regional produce |
| **Spoonacular / Edamam** | required | 150 points/day | Recipe references and cooking-time cross-checks |

### Getting a YouTube key

1. <https://console.cloud.google.com> → create or pick a project
2. **APIs & Services → Library** → search "YouTube Data API v3" → **Enable**
3. **APIs & Services → Credentials → Create credentials → API key**
4. Recommended: **Restrict key → Application restrictions → HTTP referrers**, and add the
   origin you serve from (`http://localhost:8080/*`, or your domain). This is what makes a
   browser-side key safe to ship.
5. Paste it into `setup.html` and press **Test connection**.

### Then make it permanent

In `assets/js/core/config.js`:

```js
providers: {
  ai:              'local',      // or 'openai' | 'gemini' | 'claude' | 'proxy'
  video:           'youtube',    // real YouTube search
  photo:           'pexels',     // real photography
  ingredientPhoto: 'wikimedia',  // keyless ingredient photos
  recipe:          'local',      // or 'spoonacular' | 'edamam'
},
keys: { youtube: 'AIza...', pexels: '...' },
```

**No key for photos?** Set `photo: 'youtube'`. It reuses the thumbnails from the video search
you are already doing, so it costs nothing extra — and the picture is genuinely of that dish,
because it comes from a video about it.

### Which images come from where

| Image | Source | Needs a key? |
|---|---|---|
| Ingredient table tiles | `providers.ingredientPhoto` (TheMealDB → Wikimedia) | **No** — works immediately |
| Hero, gallery, prep and cooking steps | `providers.photo` | Yes, unless you use `youtube` |
| Video thumbnails | `providers.video` | Yes (YouTube) |

The two are deliberately independent: ingredient photos do **not** require a dish photo
provider to be configured.

### How the images actually work

Photo APIs are async, but the renderer asks for image URLs synchronously while building the
recipe. So the orchestrator fetches a pool of dish photos **before** generation and the
lookups afterwards are cache hits. Ingredient photos run **after** generation, once we know
which ~18 the recipe actually uses, and persist in `localStorage` — so a repeated dish costs
zero lookups and a new dish only fetches ingredients it has not seen.

Anything that fails — no key, rate limit, a 404 on one image — falls back to the drawn plate
for that picture and records a visible warning. A photo outage never blocks a recipe.

Photographers are credited in Section 17. Unsplash's API terms require this; it is carried
through for Pexels and Wikimedia too.

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

`AFR.schema.normalise()` is deliberately forgiving — a model that omits a field or returns a
string where an array belongs degrades to an empty section rather than a blank page. Fields a
language model shouldn't waste tokens on (images, cost, shopping list, customisation summary)
are filled in locally, and nutrition is recomputed if the model's figures contradict its own
ingredient list.

Remote providers fall back to the built-in engine automatically if the network call fails,
with a visible note explaining what happened.

### Keys in front-end code

Anything in `config.js` ships to every visitor. That is fine for a YouTube key restricted to
your own domain, and fine for a personal or local project. For anything public and billable,
point `endpoints.ai` / `endpoints.video` at a small server of your own that holds the secrets
and set the matching provider to `proxy`.

---

## Language

A country-wise language picker sits in the navigation. Languages are grouped by country,
because that is how people look for them — someone in India sees Hindi, Bengali, Tamil,
Marathi, Gujarati, Kannada, Malayalam, Punjabi and Urdu together rather than scattered
through an alphabetical list of thirty-five.

**Two different things get translated, and it is worth being precise about which:**

| What | How | Works offline? |
|---|---|---|
| The interface — nav, wizard, buttons, headings | `core/i18n.js` string catalogue | Yes |
| **The recipe itself** — all 20 sections | An instruction in the prompt sent to the AI provider | **No** |

The recipe is the part that matters, and it is translated by whichever model writes it.
`prompt-builder.js` appends an explicit instruction to write every human-readable string in
the chosen language while keeping the JSON keys and numeric values intact. Set
`providers.ai` to `openai`, `gemini` or `claude` and the whole recipe arrives in that language.

**The built-in offline engine cannot translate itself** — it composes English prose from
templates. When a non-English language is selected and the local engine is active, the app
says so in the language panel and adds a warning to the recipe, rather than silently
returning English.

Interface strings are currently translated for English, Hindi, Spanish, French, German and
Arabic. Every other language still drives the recipe output; the picker labels these
"Recipe only" so the distinction is visible before you choose. Right-to-left languages
(Arabic, Urdu, Persian, Hebrew) flip the document direction and mirror the layout.

Adding a language is two steps: an entry in `data/languages.js`, and a catalogue block in
`core/i18n.js`. Missing keys fall back to English one at a time, so a partial translation is
always safe to ship.

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

Out of the box the image provider paints deterministic SVG plates as data URIs: no network
requests, no broken images, no licensing questions, and the same dish always looks the same.
Set `providers.photo` to `pexels`, `unsplash` or `youtube` for real photography — see
**Live data** above. Every caller goes through `AFR.images.*`, so nothing else changes.

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
