/* ==========================================================================
 * wizard.js — the "Create Your Own Dish" multi-step form.
 *
 * Driven entirely by AFR.data.wizard.steps, so the UI, validation, keyboard
 * support and draft-saving all come for free when a step is added there.
 *
 * Accessibility notes:
 *  - the step rail is a real list of buttons with aria-current="step"
 *  - each panel is labelled by its question heading
 *  - option groups are native radio/checkbox inputs (so arrow keys, screen
 *    readers and form semantics work), visually restyled via the label
 *  - the panel announces itself politely on change
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  function Wizard(root, options = {}) {
    this.root = root;
    this.steps = AFR.data.wizard.steps;
    this.answers = Object.assign(AFR.data.wizard.defaults(), options.initial || {});
    this.index = 0;
    this.onSubmit = options.onSubmit || (() => {});
    this.autoDetectedCuisine = null;
    this.build();
  }

  Wizard.prototype.build = function build() {
    this.root.innerHTML = `
      <div class="afr-wizard">
        <aside class="afr-wizard__rail afr-glass" aria-label="Recipe builder steps">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
            <strong style="font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;color:var(--afr-text-muted)">Progress</strong>
            <span data-wz="counter" style="font-size:.82rem;color:var(--afr-text-muted)"></span>
          </div>
          <div class="afr-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
               aria-label="Recipe builder progress" data-wz="progress">
            <div class="afr-progress__bar" data-wz="bar"></div>
          </div>
          <ul class="afr-wizard__steps" data-wz="rail"></ul>
          <button class="afr-btn afr-btn--ghost afr-btn--sm afr-btn--block" type="button" data-wz="reset"
                  style="margin-top:12px">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Start over
          </button>
        </aside>

        <form class="afr-wizard__panel afr-glass" data-wz="panel" novalidate>
          <div data-wz="body" class="afr-wizard__body"></div>
          <div class="afr-wizard__nav">
            <button class="afr-btn afr-btn--ghost" type="button" data-wz="prev">
              <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back
            </button>
            <div style="display:flex;gap:10px">
              <button class="afr-btn afr-btn--ghost" type="button" data-wz="skip">Skip</button>
              <button class="afr-btn afr-btn--primary" type="submit" data-wz="next">
                Next <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </form>
      </div>
      <p class="afr-sr" role="status" aria-live="polite" data-wz="announce"></p>`;

    this.els = {
      rail: UI.qs('[data-wz="rail"]', this.root),
      panel: UI.qs('[data-wz="panel"]', this.root),
      body: UI.qs('[data-wz="body"]', this.root),
      bar: UI.qs('[data-wz="bar"]', this.root),
      progress: UI.qs('[data-wz="progress"]', this.root),
      counter: UI.qs('[data-wz="counter"]', this.root),
      prev: UI.qs('[data-wz="prev"]', this.root),
      next: UI.qs('[data-wz="next"]', this.root),
      skip: UI.qs('[data-wz="skip"]', this.root),
      reset: UI.qs('[data-wz="reset"]', this.root),
      announce: UI.qs('[data-wz="announce"]', this.root),
    };

    this.buildRail();

    this.els.panel.addEventListener('submit', (e) => { e.preventDefault(); this.next(); });
    this.els.prev.addEventListener('click', () => this.go(this.index - 1));
    this.els.skip.addEventListener('click', () => this.go(this.index + 1));
    this.els.reset.addEventListener('click', () => this.reset());

    this.render();
  };

  Wizard.prototype.buildRail = function buildRail() {
    this.els.rail.innerHTML = '';
    this.steps.forEach((step, i) => {
      const li = UI.el('li');
      const btn = UI.el('button', {
        class: 'afr-wizard__step', type: 'button', 'data-step': String(i),
        onclick: () => this.go(i),
      },
        UI.el('span', { class: 'afr-wizard__num', text: String(step.number) }),
        UI.el('span', { text: step.title }));
      li.appendChild(btn);
      this.els.rail.appendChild(li);
    });
  };

  /* ------------------------------------------------------------- state */

  Wizard.prototype.isAnswered = function isAnswered(step) {
    const value = this.answers[step.id];
    if (Array.isArray(value)) return value.length > 0;
    return value !== '' && value !== undefined && value !== null;
  };

  Wizard.prototype.set = function set(id, value) {
    this.answers[id] = value;
    AFR.store.saveDraft(this.answers);
    if (id === 'dish') this.refreshCuisineDetection();
    this.updateRail();
  };

  /** Step 5 auto-detects from the dish name; we show what it worked out. */
  Wizard.prototype.refreshCuisineDetection = function refreshCuisineDetection() {
    const detected = AFR.data.cuisines.detect(this.answers.dish || '');
    this.autoDetectedCuisine = detected;
    const hint = UI.qs('[data-wz="autocuisine"]', this.root);
    if (hint) {
      const c = AFR.data.cuisines.get(detected);
      hint.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
        <span>Detected from "<strong>${U.esc(this.answers.dish || '')}</strong>": <strong>${c.flag} ${U.esc(c.name)}</strong>. Pick another below to override it.</span>`;
    }
  };

  /* ----------------------------------------------------------- render */

  Wizard.prototype.render = function render() {
    const step = this.steps[this.index];
    const isLast = this.index === this.steps.length - 1;

    this.els.body.innerHTML = `
      <p class="afr-eyebrow"><i class="fa-solid ${U.esc(step.icon)}" aria-hidden="true"></i>
        Step ${step.number} of ${this.steps.length} · ${U.esc(step.title)}</p>
      <h2 class="afr-wizard__q" id="wz-q-${U.esc(step.id)}">${U.esc(step.question)}</h2>
      <p class="afr-wizard__hint">${U.esc(step.hint)}</p>
      <div data-wz="field"></div>`;

    this.els.panel.setAttribute('aria-labelledby', `wz-q-${step.id}`);
    const field = UI.qs('[data-wz="field"]', this.els.body);
    this.renderField(step, field);

    this.els.panel.setAttribute('data-anim', 'in');
    setTimeout(() => this.els.panel.removeAttribute('data-anim'), 420);

    this.els.prev.disabled = this.index === 0;
    this.els.skip.hidden = Boolean(step.required);
    this.els.next.innerHTML = isLast
      ? '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Generate Recipe'
      : 'Next <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';

    this.updateRail();
    this.els.announce.textContent = `Step ${step.number} of ${this.steps.length}: ${step.question}`;

    /* Move focus to the first control so keyboard users aren't stranded. */
    const focusable = UI.qs('input,textarea,select,button', field);
    if (focusable && this.index > 0) focusable.focus({ preventScroll: true });
  };

  Wizard.prototype.renderField = function renderField(step, host) {
    const value = this.answers[step.id];

    if (step.type === 'text') return this.renderText(step, host, value);
    if (step.type === 'textarea') return this.renderTextarea(step, host, value);
    if (step.type === 'tokens') return this.renderTokens(step, host, value);
    return this.renderOptions(step, host, value);
  };

  /* -------------------------------------------------------- text input */

  Wizard.prototype.renderText = function renderText(step, host, value) {
    host.innerHTML = `
      <label class="afr-field">
        <span class="afr-sr">${U.esc(step.question)}</span>
        <input class="afr-input" type="text" data-wz="input" autocomplete="off"
               placeholder="${U.esc(step.placeholder || '')}" value="${U.esc(value || '')}"
               ${step.required ? 'required' : ''}>
      </label>
      <p style="font-size:.85rem;color:var(--afr-text-muted);margin-bottom:8px">Popular right now — tap to use one:</p>
      <div class="afr-suggest" data-wz="examples"></div>`;

    const input = UI.qs('[data-wz="input"]', host);
    input.addEventListener('input', () => this.set(step.id, input.value));

    const examples = UI.qs('[data-wz="examples"]', host);
    (step.examples || []).forEach((example) => {
      examples.appendChild(UI.el('button', {
        type: 'button',
        onclick: () => { input.value = example; this.set(step.id, example); input.focus(); },
      }, example));
    });
  };

  /* ---------------------------------------------------------- textarea */

  Wizard.prototype.renderTextarea = function renderTextarea(step, host, value) {
    host.innerHTML = `
      <label class="afr-field">
        <span class="afr-sr">${U.esc(step.question)}</span>
        <textarea class="afr-textarea" data-wz="input" rows="5"
                  placeholder="${U.esc(step.placeholder || '')}">${U.esc(value || '')}</textarea>
      </label>
      <p style="font-size:.85rem;color:var(--afr-text-muted);margin-bottom:8px">Common requests — tap to add:</p>
      <div class="afr-suggest" data-wz="chips"></div>`;

    const input = UI.qs('[data-wz="input"]', host);
    input.addEventListener('input', () => this.set(step.id, input.value));

    const chips = UI.qs('[data-wz="chips"]', host);
    (step.chips || []).forEach((chip) => {
      chips.appendChild(UI.el('button', {
        type: 'button',
        onclick: () => {
          const current = U.clean(input.value);
          input.value = current ? `${current}, ${chip.toLowerCase()}` : chip;
          this.set(step.id, input.value);
          input.focus();
        },
      }, chip));
    });
  };

  /* ------------------------------------------------------ token input */

  Wizard.prototype.renderTokens = function renderTokens(step, host, value) {
    const tokens = Array.isArray(value) ? value.slice() : [];

    host.innerHTML = `
      <div class="afr-tokens" data-wz="tokens">
        <input type="text" data-wz="input" placeholder="${U.esc(step.placeholder || '')}"
               aria-label="${U.esc(step.question)}" autocomplete="off" list="wz-ing-list">
      </div>
      <datalist id="wz-ing-list"></datalist>
      <p style="font-size:.85rem;color:var(--afr-text-muted);margin:14px 0 8px">Quick add:</p>
      <div class="afr-suggest" data-wz="suggest"></div>`;

    const box = UI.qs('[data-wz="tokens"]', host);
    const input = UI.qs('[data-wz="input"]', host);
    const datalist = UI.qs('#wz-ing-list', host);

    /* Autocomplete from the pantry so names resolve cleanly downstream. */
    AFR.data.ingredients.names.forEach((name) => {
      datalist.appendChild(UI.el('option', { value: name }));
    });

    const commit = () => {
      this.answers[step.id] = tokens.slice();
      AFR.store.saveDraft(this.answers);
      this.updateRail();
    };

    const paint = () => {
      UI.qsa('.afr-token', box).forEach((n) => n.remove());
      tokens.forEach((token, i) => {
        const chip = UI.el('span', { class: 'afr-token' },
          UI.el('span', { text: token }),
          UI.el('button', {
            type: 'button', 'aria-label': `Remove ${token}`,
            onclick: () => { tokens.splice(i, 1); paint(); commit(); input.focus(); },
          }, '×'));
        box.insertBefore(chip, input);
      });
    };

    const add = (raw) => {
      const clean = U.clean(raw);
      if (!clean) return;
      if (tokens.some((t) => t.toLowerCase() === clean.toLowerCase())) return;
      tokens.push(U.titleCase(clean));
      paint();
      commit();
    };

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        add(input.value);
        input.value = '';
      } else if (event.key === 'Backspace' && !input.value && tokens.length) {
        tokens.pop(); paint(); commit();
      }
    });
    input.addEventListener('blur', () => { add(input.value); input.value = ''; });
    box.addEventListener('click', (e) => { if (e.target === box) input.focus(); });

    const suggest = UI.qs('[data-wz="suggest"]', host);
    (step.suggestions || []).forEach((name) => {
      suggest.appendChild(UI.el('button', { type: 'button', onclick: () => add(name) }, name));
    });

    paint();
  };

  /* --------------------------------------------------- radio / checkbox */

  Wizard.prototype.renderOptions = function renderOptions(step, host, value) {
    const multi = step.type === 'multi';
    const selected = multi ? (Array.isArray(value) ? value : [value]).filter(Boolean) : [value];

    const autoHint = step.autoDetect
      ? '<div class="afr-banner" data-wz="autocuisine"></div>' : '';

    host.innerHTML = `${autoHint}
      <fieldset style="border:0;padding:0;margin:0">
        <legend class="afr-sr">${U.esc(step.question)}</legend>
        <div class="afr-options" data-wz="options"></div>
      </fieldset>
      <div data-wz="custom" style="margin-top:16px"></div>`;

    const grid = UI.qs('[data-wz="options"]', host);

    step.options.forEach((option) => {
      const id = `wz-${step.id}-${option.value}`;
      const checked = selected.includes(option.value);
      const wrap = UI.el('div', { class: 'afr-option' });
      wrap.innerHTML = `
        <input type="${multi ? 'checkbox' : 'radio'}" name="wz-${U.esc(step.id)}" id="${U.esc(id)}"
               value="${U.esc(option.value)}" ${checked ? 'checked' : ''}>
        <label class="afr-option__box" for="${U.esc(id)}">
          <span class="afr-option__emoji" aria-hidden="true">${option.emoji || ''}</span>
          <span>
            <strong>${U.esc(option.label)}</strong>
            ${option.desc ? `<small>${U.esc(option.desc)}</small>` : ''}
          </span>
        </label>`;
      grid.appendChild(wrap);

      const input = wrap.querySelector('input');
      input.addEventListener('change', () => {
        if (!multi) {
          this.set(step.id, option.value);
          if (custom) customInput.value = '';
          return;
        }
        /* Multi-select with an exclusive "none" option. */
        let next = UI.qsa('input:checked', grid).map((n) => n.value);
        if (option.exclusive && input.checked) {
          next = [option.value];
          UI.qsa('input', grid).forEach((n) => { n.checked = n.value === option.value; });
        } else if (input.checked) {
          const exclusiveValues = step.options.filter((o) => o.exclusive).map((o) => o.value);
          next = next.filter((v) => !exclusiveValues.includes(v));
          UI.qsa('input', grid).forEach((n) => {
            if (exclusiveValues.includes(n.value)) n.checked = false;
          });
        }
        this.set(step.id, next);
      });
    });

    /* Optional free-text alternative (custom serving count, other allergy). */
    let custom = null;
    let customInput = null;
    if (step.allowCustom) {
      custom = UI.qs('[data-wz="custom"]', host);
      const known = step.options.map((o) => o.value);
      const currentCustom = !multi && value && !known.includes(value) ? value : '';
      custom.innerHTML = `
        <label class="afr-field" style="margin:0">
          <span>${U.esc(step.customLabel || 'Something else')}</span>
          <input class="afr-input" type="${step.customMin !== undefined ? 'number' : 'text'}"
                 data-wz="custominput" value="${U.esc(currentCustom)}"
                 ${step.customMin !== undefined ? `min="${step.customMin}" max="${step.customMax}"` : ''}
                 placeholder="${step.customMin !== undefined ? `Any number from ${step.customMin} to ${step.customMax}` : 'Type your own'}">
        </label>`;
      customInput = UI.qs('[data-wz="custominput"]', custom);
      customInput.addEventListener('input', () => {
        const v = U.clean(customInput.value);
        if (!v) return;
        if (multi) {
          const base = UI.qsa('input:checked', grid).map((n) => n.value);
          this.set(step.id, U.unique(base.concat([v])));
        } else {
          UI.qsa('input', grid).forEach((n) => { n.checked = false; });
          this.set(step.id, v);
        }
      });
    }

    if (step.autoDetect) this.refreshCuisineDetection();
  };

  /* --------------------------------------------------------- navigation */

  Wizard.prototype.updateRail = function updateRail() {
    const answeredCount = this.steps.filter((s) => this.isAnswered(s)).length;
    const pct = Math.round((answeredCount / this.steps.length) * 100);
    this.els.bar.style.width = `${pct}%`;
    this.els.progress.setAttribute('aria-valuenow', String(pct));
    this.els.counter.textContent = `${answeredCount}/${this.steps.length} answered`;

    UI.qsa('.afr-wizard__step', this.els.rail).forEach((btn, i) => {
      btn.setAttribute('data-done', String(this.isAnswered(this.steps[i])));
      if (i === this.index) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
  };

  Wizard.prototype.go = function go(index) {
    if (index < 0) return;
    if (index >= this.steps.length) return this.submit();
    this.index = index;
    this.render();
    if (this.root.getBoundingClientRect().top < 0) UI.scrollTo(this.root, 90);
  };

  Wizard.prototype.next = function next() {
    const step = this.steps[this.index];
    if (step.required && !this.isAnswered(step)) {
      UI.toast(`${step.title} is needed before we can continue.`, 'err');
      const input = UI.qs('input,textarea', this.els.body);
      if (input) input.focus();
      return;
    }
    this.go(this.index + 1);
  };

  Wizard.prototype.submit = function submit() {
    const missing = this.steps.filter((s) => s.required && !this.isAnswered(s));
    if (missing.length) {
      const first = this.steps.indexOf(missing[0]);
      UI.toast(`Please answer step ${missing[0].number}: ${missing[0].title}.`, 'err');
      this.go(first);
      return;
    }
    this.onSubmit(U.deepClone(this.answers));
  };

  Wizard.prototype.reset = function reset() {
    this.answers = AFR.data.wizard.defaults();
    AFR.store.clearDraft();
    this.index = 0;
    this.render();
    UI.toast('Started over with a blank brief.', 'info');
  };

  /** Merge in external values (deep links, restored drafts) and re-render. */
  Wizard.prototype.prefill = function prefill(values) {
    Object.entries(values || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      const step = this.steps.find((s) => s.id === key);
      if (!step) return;
      this.answers[key] = (step.type === 'multi' || step.type === 'tokens')
        ? (Array.isArray(value) ? value : [value])
        : value;
    });
    this.render();
  };

  AFR.components = AFR.components || {};
  AFR.components.Wizard = Wizard;
})(window);
