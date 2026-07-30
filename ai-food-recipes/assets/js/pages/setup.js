/* ==========================================================================
 * setup.js — live connection tester for the external providers.
 *
 * Paste a key, press Test, and this runs the real request the app would make
 * and shows you exactly what came back: the parsed results on success, or the
 * HTTP status and body on failure. That turns "it doesn't work" into a
 * specific, fixable error.
 *
 * Keys typed here are held in this browser only (localStorage) and are applied
 * to AFR.config at runtime, so you can try a provider without editing files.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  const STORE_KEY = 'setup:keys';

  /* Everything the page can test, described once.
     Gemini is first because it is the one that changes the answers themselves:
     the built-in engine only knows dishes whose names match its keyword
     tables, while a hosted model knows the dish. */
  const TESTS = [
    {
      id: 'sharedModel',
      name: 'Shared model backend \u2014 run this first if recipes look wrong',
      what: 'Calls the endpoint in endpoints.ai exactly the way the app does, and prints '
        + 'what came back. This is the fastest way to tell a working backend from a silent '
        + 'fallback: if this fails, every recipe quietly comes from the offline engine '
        + 'instead, which is what makes the app look like it simply gives wrong answers.',
      keyField: null,
      where: 'Nothing to paste \u2014 the key lives on the server, not here.',
      free: 'Depends on the account behind the endpoint.',
      enables: "providers.ai = 'proxy'",
      async run() {
        const url = AFR.config.endpoints.ai;
        if (!url) throw new Error('No shared backend is configured (AFR.config.endpoints.ai is empty).');

        const lines = [`Endpoint: ${url}`];

        /* Step 1: is anything there at all? A GET should be refused by our
           worker with a specific message — that alone proves the right code
           is deployed, before any key is involved. */
        let reachable = false;
        try {
          const probe = await fetch(url, { method: 'GET' });
          const body = (await probe.text()).slice(0, 200);
          lines.push(`GET  -> HTTP ${probe.status}  ${body}`);
          reachable = true;
          if (/Send a POST request/i.test(body)) {
            lines.push('   \u2713 the correct worker code is deployed');
          } else if (/hello world/i.test(body)) {
            throw new Error('The endpoint is still running Cloudflare\'s "Hello World" placeholder. '
              + 'The worker.js paste did not take \u2014 redo the Edit code step.');
          } else {
            lines.push('   ? unexpected reply \u2014 the deployed code may not be worker.js');
          }
        } catch (err) {
          if (!reachable) {
            throw new Error(`Could not reach the endpoint at all: ${err.message}. `
              + 'Check the URL, and that the worker is deployed.');
          }
          throw err;
        }

        /* Step 2: the real thing \u2014 the exact request the wizard sends. */
        const answers = {
          dish: 'Kothimbir Vadi', servings: 4, experience: 'intermediate', time: '60',
          cuisine: 'auto', diet: [], spice: 'medium', sweetness: 'medium', salt: 'normal',
          oil: 'moderate', style: 'traditional', appliances: ['gas'], available: [],
          avoid: [], allergies: [], notes: '', language: 'en',
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers,
            brief: AFR.prompt.brief(answers),
            system: AFR.prompt.SYSTEM,
            user: AFR.prompt.build(answers),
          }),
        });
        const raw = await res.text();
        lines.push(`POST -> HTTP ${res.status}`);

        if (!res.ok) {
          let hint = '';
          if (res.status === 500 && /missing its model key/i.test(raw)) {
            hint = ' \u2014 GROQ_API_KEY is not set. Cloudflare dashboard \u2192 your worker '
              + '\u2192 Settings \u2192 Variables and Secrets \u2192 Add \u2192 Secret.';
          } else if (res.status === 403) {
            hint = ' \u2014 this origin is not in the worker\'s allowedOrigins list.';
          } else if (res.status === 429) {
            hint = ' \u2014 rate limited. Wait a minute.';
          }
          throw new Error(`${raw.slice(0, 300)}${hint}`);
        }

        let data;
        try { data = JSON.parse(raw); } catch (err) {
          throw new Error(`The reply was not JSON: ${raw.slice(0, 200)}`);
        }
        const text = data.text || (data.recipe && JSON.stringify(data.recipe)) || '';
        if (!text) throw new Error(`The reply had no recipe in it: ${raw.slice(0, 200)}`);

        /* Parse it the way the app does, so a pass here means a pass there. */
        const recipe = AFR.providers._hydrate(AFR.providers._extractJSON(text), answers);
        lines.push('   \u2713 the model answered and the recipe parsed');
        lines.push(`${recipe.name} \u2014 ${recipe.ingredients.length} ingredients, `
          + `${recipe.preparation.length} prep + ${recipe.steps.length} cooking steps`);
        lines.push(...recipe.ingredients.slice(0, 5).map((i) => `    ${i.qty} ${i.unit} ${i.name}`));
        return lines;
      },
    },
    {
      id: 'gemini',
      name: 'Google Gemini — writes the recipe itself',
      what: 'Replaces the built-in offline engine. It knows dishes the keyword '
        + 'tables have never heard of (Puran Poli, Thalipeeth, Kothimbir Vadi), and it '
        + 'writes all 20 sections directly in your chosen language — no machine '
        + 'translation step. This is the single biggest upgrade to answer quality.',
      keyField: 'gemini',
      keyLabel: 'API key',
      where: 'aistudio.google.com/apikey -> Create API key (no billing card needed to start)',
      free: 'Free tier covers roughly 1,500 requests/day — about 1,500 recipes.',
      enables: "providers.ai = 'gemini'",
      async run() {
        const recipe = await AFR.providers.aiGemini.generate({
          dish: 'Puran Poli', servings: 4, experience: 'intermediate', time: '60',
          cuisine: 'auto', diet: [], spice: 'medium', sweetness: 'medium', salt: 'normal',
          oil: 'moderate', style: 'traditional', appliances: ['stovetop'],
          available: [], avoid: [], allergies: [], notes: '', language: 'en',
        });
        if (!recipe || !recipe.ingredients.length) throw new Error('The call succeeded but returned no recipe.');
        /* Showing the ingredients is the point: this is how you check it knows
           the dish rather than inventing a generic curry. */
        return [
          `${recipe.name} — ${recipe.ingredients.length} ingredients, ${recipe.steps.length} steps`,
          ...recipe.ingredients.slice(0, 6).map((i) => `    ${i.qty} ${i.unit} ${i.name}`),
        ];
      },
    },
    {
      id: 'openModel',
      name: 'Open-source model (Llama via Groq) — free alternative to Gemini',
      what: 'Same result as Gemini, using open weights instead. Groq serves Llama and '
        + 'other open models free and very fast, and speaks the standard OpenAI protocol — '
        + 'so OpenRouter, Together, DeepInfra, or your own Ollama server all work by '
        + 'changing one line in config.js. Use this if you would rather not depend on Google.',
      keyField: 'openModel',
      keyLabel: 'API key',
      where: 'console.groq.com/keys -> Create API Key (free, no card). '
        + 'Or openrouter.ai/keys for a wider choice of open models.',
      free: 'Groq\'s free tier is thousands of requests a day, and it is the fastest option here.',
      enables: "providers.ai = 'openModel'",
      async run() {
        const recipe = await AFR.providers.aiOpenModel.generate({
          dish: 'Puran Poli', servings: 4, experience: 'intermediate', time: '60',
          cuisine: 'auto', diet: [], spice: 'medium', sweetness: 'medium', salt: 'normal',
          oil: 'moderate', style: 'traditional', appliances: ['stovetop'],
          available: [], avoid: [], allergies: [], notes: '', language: 'en',
        });
        if (!recipe || !recipe.ingredients.length) throw new Error('The call succeeded but returned no recipe.');
        return [
          `${recipe.name} — ${recipe.ingredients.length} ingredients, ${recipe.steps.length} steps`,
          ...recipe.ingredients.slice(0, 6).map((i) => `    ${i.qty} ${i.unit} ${i.name}`),
        ];
      },
    },
    {
      id: 'youtube',
      name: 'YouTube Data API v3',
      what: 'Searches YouTube for the dish and returns real titles, channels, durations, view counts and thumbnails.',
      keyField: 'youtube',
      keyLabel: 'API key',
      where: 'console.cloud.google.com -> APIs & Services -> Library -> "YouTube Data API v3" -> Enable -> Credentials -> Create API key',
      free: '10,000 quota units/day. A search costs 100 units, so roughly 90 recipe generations a day.',
      enables: "providers.video = 'youtube'",
      async run() {
        const videos = await AFR.providers.videoYoutube.search('chicken biryani recipe', { max: 3 });
        if (!videos.length) throw new Error('The call succeeded but returned no videos.');
        return videos.map((v) => `${v.title}\n    ${v.channel} - ${v.duration} - ${v.views} views - ${v.published}`);
      },
    },
    {
      id: 'pexels',
      name: 'Pexels photos',
      what: 'Real food photography for the hero image, gallery and cooking steps.',
      keyField: 'pexels',
      keyLabel: 'API key',
      where: 'pexels.com/api -> Get Started -> your key appears on the dashboard',
      free: '200 requests/hour, 20,000/month. One request per recipe.',
      enables: "providers.photo = 'pexels'",
      async run() {
        const photos = await AFR.providers.photoPexels.search('chicken biryani food dish', { count: 3 });
        if (!photos.length) throw new Error('The call succeeded but returned no photos.');
        return photos.map((p) => `${p.url}\n    credit: ${p.credit}`);
      },
    },
    {
      id: 'unsplash',
      name: 'Unsplash photos',
      what: 'Alternative photography source. Requires crediting the photographer, which the app does automatically.',
      keyField: 'unsplash',
      keyLabel: 'Access key',
      where: 'unsplash.com/developers -> New Application -> copy the Access Key',
      free: '50 requests/hour in demo mode; 5,000/hour once approved for production.',
      enables: "providers.photo = 'unsplash'",
      async run() {
        const photos = await AFR.providers.photoUnsplash.search('chicken biryani food dish', { count: 3 });
        if (!photos.length) throw new Error('The call succeeded but returned no photos.');
        return photos.map((p) => `${p.url}\n    credit: ${p.credit}`);
      },
    },
    {
      id: 'wikimedia',
      name: 'Wikimedia Commons photographs — run this if pictures look drawn',
      what: 'The keyless source behind every photograph in the app: the dish picture on '
        + 'each browsing card, the recipe hero, and the ingredient tiles. Needs no key, so '
        + 'it should pass immediately. This runs the exact searches the app runs and prints '
        + 'what came back, which is the fastest way to see why a picture stayed a drawing.',
      keyField: null,
      where: 'Nothing to do - it is keyless.',
      free: 'Unlimited, within polite use.',
      enables: "providers.photo and providers.ingredientPhoto (both already the default)",
      async run() {
        /* A dish name, a plain ingredient and an Indian vegetable — the three
           shapes of query the app makes, so a failure says which shape broke. */
        const probes = ['Paneer Butter Masala', 'Tomato', 'Okra'];
        const lines = [];
        let found = 0;

        for (const probe of probes) {
          const photos = await AFR.images.searchPhotos(AFR.providers.photoWikimedia, probe,
            { count: 2, width: 320 });
          if (photos.length) {
            found += 1;
            lines.push(`${probe}: ${photos.length} found`);
            lines.push(`    ${photos[0].url}`);
            lines.push(`    credit: ${photos[0].credit}`);
          } else {
            lines.push(`${probe}: NO RESULTS — Commons has nothing matching this name`);
          }
        }

        if (!found) {
          throw new Error(`The API answered but returned no images for any of ${probes.join(', ')}. `
            + 'That points at the search terms rather than the connection.');
        }
        lines.unshift(`${found} of ${probes.length} searches returned photographs.`);
        return lines;
      },
    },
    {
      id: 'spoonacular',
      name: 'Spoonacular recipes',
      what: 'Structured recipe references used to cross-check cooking times.',
      keyField: 'spoonacular',
      keyLabel: 'API key',
      where: 'spoonacular.com/food-api -> Start Now -> Profile -> Show/Hide API Key',
      free: '150 points/day.',
      enables: "providers.recipe = 'spoonacular'",
      async run() {
        const hits = await AFR.providers.recipeSpoonacular.search('chicken biryani', { max: 3 });
        if (!hits.length) throw new Error('The call succeeded but returned no recipes.');
        return hits.map((h) => `${h.title}\n    ${h.note}`);
      },
    },
  ];

  /* ------------------------------------------------------------- key store */

  function savedKeys() { return AFR.store.get(STORE_KEY, {}) || {}; }

  /** Push saved keys into the live config so the adapters can use them. */
  function applyKeys() {
    const keys = savedKeys();
    Object.entries(keys).forEach(([field, value]) => {
      if (value) AFR.config.keys[field] = value;
    });
    return keys;
  }

  function setKey(field, value) {
    const keys = savedKeys();
    if (value) keys[field] = value; else delete keys[field];
    AFR.store.set(STORE_KEY, keys);
    AFR.config.keys[field] = value || '';

    /* Saving a key has to switch the capability on, otherwise it tests green
       here and changes nothing on the page that generates recipes. Only touch
       providers still on their default, so an explicit choice is respected. */
    const implied = (AFR.config.KEY_IMPLIES || {})[field] || {};
    Object.keys(implied).forEach((capability) => {
      if (value && AFR.config.providers[capability] === 'local') {
        AFR.config.providers[capability] = implied[capability];
      } else if (!value && AFR.config.providers[capability] === implied[capability]) {
        AFR.config.providers[capability] = 'local';
      }
    });
  }

  /* ---------------------------------------------------------------- render */

  function card(test) {
    const keys = savedKeys();
    const node = UI.el('article', { class: 'afr-acc' });
    node.innerHTML = `
      <div class="afr-acc__head" style="cursor:default">
        <span class="afr-acc__idx" aria-hidden="true">${test.keyField ? '\u{1F511}' : '\u{2713}'}</span>
        <span>${U.esc(test.name)}</span>
        <span class="afr-chip" data-status style="margin-left:auto">Not tested</span>
      </div>
      <div class="afr-acc__body">
        <p style="color:var(--afr-text-muted);margin-bottom:14px">${U.esc(test.what)}</p>

        <div class="afr-grid afr-grid--wide" style="margin-bottom:14px">
          <div class="afr-stat" style="text-align:left">
            <span>Where to get it</span>
            <strong style="font-family:var(--afr-font-body);font-size:.88rem;font-weight:500">${U.esc(test.where)}</strong>
          </div>
          <div class="afr-stat" style="text-align:left">
            <span>Free tier</span>
            <strong style="font-family:var(--afr-font-body);font-size:.88rem;font-weight:500">${U.esc(test.free)}</strong>
          </div>
          <div class="afr-stat" style="text-align:left">
            <span>Then set in config.js</span>
            <strong style="font-family:var(--afr-font-body);font-size:.88rem;font-weight:500">
              <code>${U.esc(test.enables)}</code></strong>
          </div>
        </div>

        ${test.keyField ? `
          <label class="afr-field">
            <span>${U.esc(test.keyLabel)}</span>
            <input class="afr-input" type="password" data-key autocomplete="off" spellcheck="false"
                   placeholder="Paste your key to test it"
                   value="${U.esc(keys[test.keyField] || '')}">
          </label>` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="afr-btn afr-btn--primary afr-btn--sm" type="button" data-test>
            <i class="fa-solid fa-plug" aria-hidden="true"></i> Test connection
          </button>
          ${test.keyField ? `
            <button class="afr-btn afr-btn--ghost afr-btn--sm" type="button" data-forget>
              <i class="fa-solid fa-trash" aria-hidden="true"></i> Forget key
            </button>` : ''}
        </div>

        <pre data-output hidden style="margin-top:14px;padding:14px;border-radius:var(--afr-radius);
             background:var(--afr-bg-alt);border:1px solid var(--afr-border);overflow-x:auto;
             font-size:.82rem;white-space:pre-wrap;word-break:break-word"></pre>
      </div>`;

    const status = UI.qs('[data-status]', node);
    const output = UI.qs('[data-output]', node);
    const input = UI.qs('[data-key]', node);

    if (input) {
      input.addEventListener('change', () => setKey(test.keyField, U.clean(input.value)));
    }

    UI.qs('[data-test]', node).addEventListener('click', async (event) => {
      const btn = event.currentTarget;
      if (input) setKey(test.keyField, U.clean(input.value));

      btn.disabled = true;
      status.textContent = 'Testing...';
      status.className = 'afr-chip';
      output.hidden = false;
      output.textContent = 'Sending the request the app would send...';

      try {
        const lines = await test.run();
        status.textContent = 'Working';
        status.className = 'afr-chip afr-chip--veg';
        output.textContent = `SUCCESS - ${lines.length} results\n\n`
          + lines.map((l, i) => `${i + 1}. ${l}`).join('\n\n');
      } catch (err) {
        status.textContent = 'Failed';
        status.className = 'afr-chip afr-chip--nonveg';
        output.textContent = `FAILED\n\n${err.message}\n\n${hint(err.message)}`;
      } finally {
        btn.disabled = false;
      }
    });

    const forget = UI.qs('[data-forget]', node);
    if (forget) {
      forget.addEventListener('click', () => {
        setKey(test.keyField, '');
        if (input) input.value = '';
        status.textContent = 'Not tested';
        status.className = 'afr-chip';
        output.hidden = true;
        UI.toast('Key removed from this browser.', 'info');
      });
    }

    return node;
  }

  /** Turn the common failure modes into something actionable. */
  function hint(message) {
    const m = String(message).toLowerCase();
    if (m.includes('failed to fetch') || m.includes('networkerror')) {
      return 'LIKELY CAUSE: the browser blocked the request.\n'
        + '  - If you opened this file directly (file://), serve it over http instead:\n'
        + '      python3 -m http.server 8080\n'
        + '  - If you are on a published Artifact page, external requests are blocked\n'
        + '    by its content-security policy and cannot be enabled. Run the app yourself.';
    }
    if (m.includes('403')) {
      return 'LIKELY CAUSE: the key is rejected or restricted.\n'
        + '  - YouTube: confirm "YouTube Data API v3" is ENABLED for the project.\n'
        + '  - If the key has an HTTP-referrer restriction, add the exact origin you\n'
        + '    are serving from (e.g. http://localhost:8080/*).\n'
        + '  - Check you have not exhausted the daily quota.';
    }
    if (m.includes('400')) return 'LIKELY CAUSE: malformed key, or a stray space when pasting.';
    if (m.includes('401')) return 'LIKELY CAUSE: the key is wrong or has been revoked.';
    if (m.includes('429')) return 'LIKELY CAUSE: rate limited. Wait a minute and try again.';
    if (m.includes('timed out')) return 'LIKELY CAUSE: the network is slow or blocked by a proxy or firewall.';
    return 'Copy this message when reporting the problem - it identifies the cause.';
  }

  /* ------------------------------------------------------------------ boot */

  /** Describe the AI capability in words rather than a provider id. */
  function aiLabel() {
    const conn = AFR.llm && AFR.llm.connection();
    if (AFR.config.providers.ai === 'universal' && conn) {
      const spec = AFR.data.llmProviders.resolve(conn);
      return `${spec.name.split(' — ')[0]} / ${spec.model}`;
    }
    /* "proxy" is an implementation detail; what a visitor needs to know is
       that a model is running and it costs them nothing to set up. */
    if (AFR.config.providers.ai === 'proxy') return 'shared model (no key needed)';
    return AFR.config.providers.ai;
  }

  function renderCurrent() {
    const summary = UI.qs('[data-setup="current"]');
    if (!summary) return;

    const rows = [
      ['Recipe text', aiLabel()],
      ['Videos', AFR.config.providers.video],
      ['Photos', AFR.config.providers.photo],
      ['Ingredient photos', AFR.config.providers.ingredientPhoto],
      ['Recipe references', AFR.config.providers.recipe],
    ];
    summary.innerHTML = rows.map(([label, value]) => `
      <div class="afr-stat" style="text-align:left">
        <span>${U.esc(label)}</span>
        <strong style="font-family:var(--afr-font-body);font-size:.95rem">
          ${U.esc(value)}${value === 'local' ? ' <span style="font-weight:400;color:var(--afr-text-muted)">(offline)</span>' : ''}
        </strong>
      </div>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyKeys();

    /* The connector goes in first: it is the change that matters most, and
       everything below it is a per-service detail. */
    const llmHost = UI.qs('[data-setup="llm"]');
    if (llmHost && AFR.components && AFR.components.llmConnect) {
      AFR.components.llmConnect.render(llmHost);
    }

    const host = UI.qs('[data-setup="tests"]');
    if (host) TESTS.forEach((test) => host.appendChild(card(test)));

    renderCurrent();
    /* Connecting or disconnecting a model changes the summary above. */
    document.addEventListener('afr:llmchange', renderCurrent);
  });
})(window);
