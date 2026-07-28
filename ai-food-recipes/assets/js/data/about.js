/* ==========================================================================
 * about.js — the details shown on the About page.
 *
 * EDIT THIS FILE. Everything on /about.html comes from here, so you never have
 * to touch markup to change what it says about you.
 *
 * A note on what is filled in: the only things known for certain are the
 * GitHub account and the repository, so those are set. Everything describing
 * you personally is left as a marked placeholder rather than invented —
 * a made-up job title or biography on your public site would be worse than a
 * blank one. Replace the TODO values and the page updates itself.
 *
 * Anything left empty is simply not rendered, so a half-filled file still
 * produces a clean page.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  AFR.data = AFR.data || {};

  AFR.data.about = {
    /* ---------------------------------------------------------- you ---- */
    person: {
      name: 'Aditi Anand',                    // TODO: confirm the spelling you prefer
      tagline: '',                            // TODO: e.g. "Engineer and home cook"
      role: '',                               // TODO: e.g. "HVAC Engineer" — whatever fits
      location: '',                           // TODO: e.g. "Pune, India"
      /* A few sentences in your own voice. Written as a placeholder describing
         the project honestly; replace with whatever you want people to read. */
      bio: '',
      /* Left blank deliberately: publishing an email address on a public site
         invites spam, and it is not mine to publish. Add it if you want it
         reachable, or use a contact form instead. */
      email: '',
    },

    /* -------------------------------------------------------- links ---- */
    links: [
      { label: 'GitHub', url: 'https://github.com/anandaditi7588', icon: 'fa-link' },
      { label: 'Source code', url: 'https://github.com/anandaditi7588/Refrigeration/tree/claude/ai-food-recipes-app-dobh01/ai-food-recipes', icon: 'fa-book' },
      // { label: 'LinkedIn', url: '', icon: 'fa-link' },   // TODO if you want it
    ],

    /* ------------------------------------------------------ project ---- */
    project: {
      name: 'AI Food Recipes',
      summary: 'A recipe app that takes a sixteen-question brief — servings, diet, spice '
        + 'level, allergies, equipment, what is already in your fridge — and returns a '
        + 'complete recipe built around all of it: scaled quantities, a method with real '
        + 'temperatures and timings, per-serving nutrition, a costed shopping list, and '
        + 'twenty structured sections rather than one long article.',
      /* Stated plainly, because the difference matters to anyone evaluating it. */
      honesty: 'Recipes are generated for your brief, never copied from another site. '
        + 'The built-in engine works offline and knows a set number of dishes by name; '
        + 'when it does not know one, it says so rather than inventing an answer. '
        + 'Connect a model on the Live Data page and it answers for any dish at all.',
      /* What a visitor can actually do, in the order they would meet it. */
      does: [
        { icon: 'fa-wand-magic-sparkles', title: 'A sixteen-question brief',
          text: 'Dish, servings, experience, time, cuisine, diet, spice, sweetness, salt, oil, '
            + 'style, appliances, what you already have, what to avoid, allergies, notes.' },
        { icon: 'fa-list-check', title: 'Twenty structured sections',
          text: 'Ingredients, method, timings, nutrition, shopping list, cost, substitutions, '
            + 'troubleshooting, storage and more — never one long article.' },
        { icon: 'fa-scale-balanced', title: 'Quantities that actually scale',
          text: 'Spices and aromatics grow more slowly than the main ingredients, the way '
            + 'they do when you cook, rather than everything multiplying by the same number.' },
        { icon: 'fa-language', title: 'Thirty-five languages',
          text: 'The interface and the recipe itself, not just the buttons. Eighteen '
            + 'languages are built into the page and work with no network at all.' },
        { icon: 'fa-plug', title: 'Bring your own model',
          text: 'Connect any OpenAI-, Anthropic- or Gemini-compatible endpoint on the Live '
            + 'Data page — including one running on your own machine.' },
        { icon: 'fa-lock', title: 'Your data stays yours',
          text: 'Answers, saved recipes and API keys live in your browser. Nothing is '
            + 'uploaded unless you connect a provider yourself.' },
      ],
      builtWith: [
        'HTML5, CSS3 and vanilla JavaScript — no framework, no build step',
        'A composition engine: technique x cuisine x a food-composition table',
        'A knowledge base of named regional dishes with their real ingredients',
        'Wikimedia Commons and TheMealDB for photography, no key required',
        'Any OpenAI-, Anthropic- or Gemini-compatible model you connect',
        'Thirty-five languages, eighteen of them built into the page',
      ],
    },
  };
})(window);
