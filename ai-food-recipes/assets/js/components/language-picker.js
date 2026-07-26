/* ==========================================================================
 * language-picker.js — the country-wise language selector in the navigation.
 *
 * Grouped by country because that is how people look for their language:
 * someone in India wants to see Hindi, Bengali, Tamil, Marathi and Gujarati
 * together, not scattered through an alphabetical list of forty.
 *
 * The panel is honest about what each choice actually changes, since the
 * answer depends on which recipe provider is configured.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  function panelMarkup() {
    const groups = AFR.data.languages.byCountry();
    const currentCode = AFR.i18n.current;

    /* Languages built into the page work with no connection at all. The rest
       need the translator, which a published Artifact page cannot reach — so
       say which is which rather than letting someone pick and see English. */
    const offline = new Set(AFR.uiCatalogLanguages || []);

    const options = groups.map((group) => `
      <div class="afr-lang__group">
        <h4>${U.esc(group.country)}</h4>
        ${group.languages.map((lang) => `
          <button class="afr-lang__option" type="button" data-lang="${U.esc(lang.code)}"
                  aria-pressed="${lang.code === currentCode}">
            <span class="afr-lang__native" ${lang.rtl ? 'dir="rtl"' : ''}>${U.esc(lang.native)}</span>
            <span class="afr-lang__name">${U.esc(lang.name)}</span>
            ${lang.code === 'en' || offline.has(lang.code)
              ? '<span class="afr-chip afr-chip--veg">Built in</span>'
              : '<span class="afr-chip">Needs connection</span>'}
          </button>`).join('')}
      </div>`).join('');

    /* What the choice does depends entirely on the configured provider, and
       there are now three genuinely different answers. */
    const aiLive = AFR.config.isLive('ai');
    const translateOn = AFR.providers.resolveTranslate
      && AFR.providers.resolveTranslate().id !== 'none';

    let notice;
    if (aiLive) {
      notice = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        <span>All 20 sections are written in the language you pick, natively.</span>`;
    } else if (translateOn) {
      notice = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        <span><strong>Interface and recipes both switch.</strong> The recipe is composed in
        English and then machine-translated, so ingredient names, every cooking step, tips
        and the shopping list all arrive in your language. Needs an internet connection —
        a published Artifact page blocks the request.</span>`;
    } else {
      notice = `<i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span><strong>Only the interface switches.</strong> Translation is turned off
        (<code>providers.translate: 'none'</code>), so recipe text stays in English.</span>`;
    }

    return `
      <div class="afr-lang__head">
        <strong data-i18n="nav.chooseLanguage">Choose your language</strong>
        <button class="afr-btn afr-btn--ghost afr-btn--icon afr-btn--sm" type="button"
                data-lang-close aria-label="Close language menu">
          <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="afr-banner" style="margin:12px 0">${notice}</div>
      <div class="afr-lang__list">${options}</div>`;
  }

  function mount(host) {
    if (!host) return;

    const button = UI.el('button', {
      class: 'afr-btn afr-btn--ghost afr-btn--sm afr-lang__toggle',
      type: 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
    });

    const panel = UI.el('div', {
      class: 'afr-lang__panel afr-glass',
      role: 'dialog',
      'aria-label': 'Choose your language',
      hidden: true,
    });

    const label = () => {
      const lang = AFR.i18n.language;
      button.innerHTML = `<i class="fa-solid fa-language" aria-hidden="true"></i>
        <span class="afr-lang__current">${U.esc(lang.native)}</span>`;
      button.setAttribute('aria-label', `${AFR.i18n.t('nav.language')}: ${lang.name}`);
    };

    const close = () => {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    };

    const open = () => {
      panel.innerHTML = panelMarkup();
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      const active = UI.qs('[aria-pressed="true"]', panel);
      if (active) active.scrollIntoView({ block: 'center' });
    };

    button.addEventListener('click', () => (panel.hidden ? open() : close()));

    panel.addEventListener('click', (event) => {
      if (event.target.closest('[data-lang-close]')) return close();
      const option = event.target.closest('[data-lang]');
      if (!option) return;

      const lang = AFR.i18n.setLanguage(option.dataset.lang);
      label();
      close();
      const recipesToo = AFR.config.isLive('ai')
        || (AFR.providers.resolveTranslate && AFR.providers.resolveTranslate().id !== 'none');
      UI.toast(
        lang.uiReady
          ? `Language set to ${lang.native}.${recipesToo ? ' New recipes will be in this language too.' : ''}`
          : `Recipes will be written in ${lang.name}. ${AFR.i18n.t('lang.uiPartial')}`,
        'ok', 4200);
    });

    /* Click-away and Escape, as any menu should. */
    document.addEventListener('click', (event) => {
      if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) { close(); button.focus(); }
    });

    const wrap = UI.el('div', { class: 'afr-lang' }, button, panel);
    host.insertBefore(wrap, host.firstChild);
    label();

    document.addEventListener('afr:languagechange', label);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!AFR.i18n || !AFR.data.languages) return;
    AFR.i18n.init();
    mount(UI.qs('.afr-nav__actions'));
  });

  AFR.components = AFR.components || {};
  AFR.components.languagePicker = { mount };
})(window);
