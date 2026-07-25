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

  /* Everything the page can test, described once. */
  const TESTS = [
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
      name: 'Wikimedia Commons',
      what: 'Ingredient photographs. No key needed at all, so this should pass immediately.',
      keyField: null,
      where: 'Nothing to do - it is keyless.',
      free: 'Unlimited, within polite use.',
      enables: "providers.ingredientPhoto = 'wikimedia' (already the default)",
      async run() {
        const photos = await AFR.providers.photoWikimedia.search('tomato food ingredient', { count: 2 });
        if (!photos.length) throw new Error('The call succeeded but returned no images.');
        return photos.map((p) => `${p.url}\n    credit: ${p.credit}`);
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

  document.addEventListener('DOMContentLoaded', () => {
    const host = UI.qs('[data-setup="tests"]');
    if (!host) return;

    applyKeys();
    TESTS.forEach((test) => host.appendChild(card(test)));

    /* Show what the app is currently configured to use. */
    const summary = UI.qs('[data-setup="current"]');
    if (summary) {
      const rows = [
        ['Recipe text', AFR.config.providers.ai],
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
  });
})(window);
