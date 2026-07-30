/* ==========================================================================
 * llm-connect.js — the "bring your own model" panel on the Live Data page.
 *
 * Design notes, since this is the one screen that decides whether the app can
 * answer for any dish at all:
 *
 *  - Pick a host, paste a key, choose a model. Three fields, in that order.
 *  - The model list is FETCHED from the host with your key rather than
 *    hard-coded, so it is always current and shows exactly what your account
 *    can reach. A free-text box sits alongside it for anything not listed, or
 *    for a host with no models endpoint.
 *  - Test before saving. The test generates a real recipe for a dish the
 *    offline engine does not know, so a pass means the thing you actually
 *    care about works — not merely that the key authenticates.
 *  - Nothing is saved until it passes, and the key stays in this browser.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  /* The dish the connection test asks for. Deliberately one the built-in
     engine has never heard of, so a pass proves the model is answering. */
  const TEST_DISH = 'Kothimbir Vadi';

  function providerOptions(selected) {
    return AFR.data.llmProviders.all.map((p) =>
      `<option value="${U.esc(p.id)}"${p.id === selected ? ' selected' : ''}>${
        U.esc(p.name)}${p.recommended ? '  ★' : ''}</option>`).join('');
  }

  function render(host) {
    const saved = AFR.llm.connection() || {};
    const current = saved.provider || 'gemini';

    /* Nothing here announces the site's own backend.
       When one is configured, recipes already work for every visitor without
       any action, so saying so would only invite the question of whether they
       need to do something. The panel is then purely an optional override, and
       reads as one. When there is no backend, the offline engine's limits are
       the honest reason to connect something, so that is what it says. */
    const intro = AFR.llm.shared()
      ? 'Optional. Connect your own model if you would rather recipes came from a '
        + 'specific one. Free options are marked &#9733;.'
      : `The built-in engine knows ${AFR.data.dishes ? AFR.data.dishes.count : 'a few dozen'} dishes. `
        + 'Connect a model and it answers for <strong>any</strong> dish, in any of the 35 '
        + 'languages, in the same 20 sections. Free options are marked &#9733;.';

    host.innerHTML = `
      <article class="afr-card afr-llm" style="padding:22px">
        <h3 style="margin-top:0">Connect a model</h3>
        <p style="color:var(--afr-text-muted);font-size:.93rem">${intro}</p>

        <div class="afr-llm__grid">
          <label class="afr-field">
            <span>Provider</span>
            <select class="afr-input" data-llm="provider">${providerOptions(current)}</select>
          </label>

          <label class="afr-field" data-llm="base-wrap" hidden>
            <span>Endpoint URL</span>
            <input class="afr-input" type="url" data-llm="base" spellcheck="false"
                   placeholder="https://your-host.example.com/v1">
          </label>

          <label class="afr-field" data-llm="key-wrap">
            <span data-llm="key-label">API key</span>
            <input class="afr-input" type="password" data-llm="key" autocomplete="off"
                   spellcheck="false" placeholder="Paste your key">
          </label>

          <label class="afr-field">
            <span>Model</span>
            <div class="afr-llm__model">
              <select class="afr-input" data-llm="model-select"></select>
              <button class="afr-btn afr-btn--ghost afr-btn--sm" type="button" data-llm="fetch">
                <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Load models
              </button>
            </div>
          </label>

          <label class="afr-field">
            <span>Or type a model name</span>
            <input class="afr-input" data-llm="model-text" spellcheck="false"
                   placeholder="exact model id, e.g. llama-3.3-70b-versatile">
          </label>
        </div>

        <p class="afr-llm__note" data-llm="note"></p>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button class="afr-btn afr-btn--primary" type="button" data-llm="test">
            <i class="fa-solid fa-flask" aria-hidden="true"></i> Test &amp; save
          </button>
          <button class="afr-btn afr-btn--ghost" type="button" data-llm="clear">
            <i class="fa-solid fa-trash" aria-hidden="true"></i> Disconnect
          </button>
          <a class="afr-btn afr-btn--ghost afr-btn--sm" data-llm="keylink" target="_blank" rel="noopener">
            <i class="fa-solid fa-link" aria-hidden="true"></i> Get a key
          </a>
        </div>

        <pre class="afr-llm__out" data-llm="out" hidden></pre>

        <div class="afr-banner" style="margin-top:16px">
          <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
          <span><strong>Your key stays in this browser.</strong> It is saved in localStorage on
          this device and sent only to the provider you chose. It is never committed to the
          repository and never reaches anyone else who opens the site — which also means each
          visitor connects their own. For a shared deployment where visitors should not need a
          key, run a small proxy that holds one and point the Custom option at it.</span>
        </div>
      </article>`;

    wire(host, saved);
  }

  function wire(host, saved) {
    const $ = (sel) => UI.qs(`[data-llm="${sel}"]`, host);
    const providerEl = $('provider');
    const baseEl = $('base');
    const keyEl = $('key');
    const modelSel = $('model-select');
    const modelText = $('model-text');
    const note = $('note');
    const out = $('out');

    const spec = () => AFR.data.llmProviders.byId[providerEl.value];

    const say = (text, kind) => {
      out.hidden = false;
      out.textContent = text;
      out.className = `afr-llm__out afr-llm__out--${kind || 'info'}`;
    };

    /* Reflect the chosen provider: which fields apply, where to get a key. */
    function syncProvider() {
      const p = spec();
      $('base-wrap').hidden = !p.custom;
      $('key-wrap').hidden = Boolean(p.keyless);
      $('key-label').textContent = p.keyLabel || 'API key';
      $('keylink').href = p.keyUrl || '#';
      $('keylink').hidden = !p.keyUrl;

      note.innerHTML = `<strong>${U.esc(p.free)}</strong>${p.note ? ` ${U.esc(p.note)}` : ''}`;

      modelSel.innerHTML = (p.models || []).map((m) =>
        `<option value="${U.esc(m)}">${U.esc(m)}</option>`).join('')
        || '<option value="">(press Load models)</option>';

      if (saved.provider === p.id) {
        if (saved.baseUrl) baseEl.value = saved.baseUrl;
        if (saved.key) keyEl.value = saved.key;
        if (saved.model) {
          modelText.value = saved.model;
          if ([...modelSel.options].some((o) => o.value === saved.model)) modelSel.value = saved.model;
        }
      }
    }

    /** What the form currently describes. */
    const build = () => ({
      provider: providerEl.value,
      baseUrl: spec().custom ? U.clean(baseEl.value) : '',
      key: U.clean(keyEl.value),
      keyless: Boolean(spec().keyless),
      model: U.clean(modelText.value) || modelSel.value,
    });

    providerEl.addEventListener('change', () => { syncProvider(); out.hidden = true; });
    modelSel.addEventListener('change', () => { modelText.value = modelSel.value; });

    /* Ask the host what it can actually run. Far better than a stale list. */
    $('fetch').addEventListener('click', async () => {
      say('Asking the provider which models your key can use…');
      try {
        const models = await AFR.llm.listModels(build());
        if (!models.length) throw new Error('The provider returned an empty list.');
        modelSel.innerHTML = models.map((m) =>
          `<option value="${U.esc(m)}">${U.esc(m)}</option>`).join('');
        if (models.includes(modelText.value)) modelSel.value = modelText.value;
        else modelText.value = modelSel.value;
        say(`${models.length} models available:\n  ${models.slice(0, 40).join('\n  ')}`
          + (models.length > 40 ? `\n  … and ${models.length - 40} more` : ''), 'ok');
      } catch (err) {
        say(`Could not list models.\n${err.message}\n\n`
          + 'This is not fatal — type the model name in the box below and press Test.', 'warn');
      }
    });

    $('test').addEventListener('click', async () => {
      const conn = build();
      if (!conn.model) return say('Choose a model, or type its name.', 'warn');
      if (!conn.key && !conn.keyless && !conn.baseUrl) {
        return say('Paste your API key first.', 'warn');
      }

      say(`Generating "${TEST_DISH}" with ${spec().name} / ${conn.model}…\n`
        + 'This asks for a full recipe, so it takes a few seconds.');

      /* Test against the live connection without disturbing what is saved. */
      const previous = AFR.store.get(AFR.llm.STORE_KEY, null);
      AFR.store.set(AFR.llm.STORE_KEY, conn);
      try {
        const recipe = await AFR.providers.aiUniversal.generate({
          dish: TEST_DISH, servings: 4, experience: 'intermediate', time: '60', cuisine: 'auto',
          diet: [], spice: 'medium', sweetness: 'medium', salt: 'normal', oil: 'moderate',
          style: 'traditional', appliances: ['gas'], available: [], avoid: [], allergies: [],
          notes: '', language: 'en',
        });
        if (!recipe.ingredients.length) throw new Error('The call succeeded but returned no recipe.');

        AFR.llm.save(conn);
        say(`Connected. ${spec().name} / ${conn.model}\n\n`
          + `${recipe.name} — ${recipe.ingredients.length} ingredients, ${recipe.steps.length} steps\n`
          + recipe.ingredients.slice(0, 6).map((i) => `  ${i.qty} ${i.unit} ${i.name}`).join('\n')
          + '\n\nSaved. Every recipe from now on comes from this model.', 'ok');
        UI.toast(`Connected to ${spec().name}.`, 'ok', 4000);
        document.dispatchEvent(new CustomEvent('afr:llmchange'));
      } catch (err) {
        AFR.store.set(AFR.llm.STORE_KEY, previous);
        say(`Failed — nothing was saved.\n${err.message}\n\n${hintFor(err, spec())}`, 'err');
      }
    });

    $('clear').addEventListener('click', () => {
      AFR.llm.save(null);
      keyEl.value = '';
      say(AFR.llm.shared()
        ? 'Disconnected. Recipes come from the site\'s shared model again.'
        : 'Disconnected. Recipes come from the built-in engine again.', 'info');
      document.dispatchEvent(new CustomEvent('afr:llmchange'));
    });

    syncProvider();
  }

  /** Turn a raw failure into the thing to actually go and do. */
  function hintFor(err, p) {
    const m = String(err.message || '');
    if (/401|403|invalid.*key|unauthor/i.test(m)) {
      return 'That reads like the key being wrong, expired, or lacking permission. '
        + `Check it at ${p.keyUrl || 'your provider dashboard'}.`;
    }
    if (/404|not found|model/i.test(m)) {
      return 'That reads like the model name. Press "Load models" and pick one from the list — '
        + 'names are exact, and they differ between providers.';
    }
    if (/429|rate|quota/i.test(m)) return 'Rate limit or quota. Wait a minute, or try a smaller model.';
    if (/failed to fetch|networkerror|cors/i.test(m)) {
      return 'The browser could not reach the endpoint. Either the URL is wrong, or the provider '
        + 'refuses direct browser calls (CORS). A published Artifact page blocks all of them; '
        + 'use the live site or run it locally.';
    }
    if (/timed out|timeout/i.test(m)) return 'The request took too long. Try a faster or smaller model.';
    return 'Check the endpoint URL and model name, then try again.';
  }

  AFR.components = AFR.components || {};
  AFR.components.llmConnect = { render, TEST_DISH };
})(window);
