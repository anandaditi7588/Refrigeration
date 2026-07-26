/* ==========================================================================
 * home.js — home page controller: hero art, search, categories, the recipe
 * rails and the regional-cuisine grid.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  function heroArt() {
    const host = UI.qs('[data-home="hero-art"]');
    if (!host) return;
    /* Dishes chosen to be visually distinct from each other and easy for a
       photo source to match — this is the first thing anyone sees. */
    const picks = ['Chicken Biryani', 'Margherita Pizza', 'Pad Thai', 'Chocolate Brownie'];
    host.innerHTML = picks.map((name, i) => {
      const drawn = AFR.images.dish(name);
      return `
      <div class="afr-hero__tile">
        <img src="${U.esc(drawn)}" alt="${U.esc(name)}"
             loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async"
             ${drawn.startsWith('data:') ? `data-dish-photo="${U.esc(name)}"` : ''}>
      </div>`;
    }).join('');
  }

  /* ------------------------------------------------------------- search */

  function search() {
    const form = UI.qs('[data-home="search"]');
    if (!form) return;
    const input = UI.qs('input', form);
    const results = UI.qs('[data-home="results"]');
    let active = -1;

    const close = () => { results.hidden = true; active = -1; };

    const open = (items, term) => {
      if (!term) return close();
      results.hidden = false;
      if (!items.length) {
        results.innerHTML = `
          <div class="afr-search__empty">
            <p style="margin-bottom:10px">Nothing in the collection matches "<strong>${U.esc(term)}</strong>".</p>
            <a class="afr-btn afr-btn--primary afr-btn--sm" href="create.html?dish=${encodeURIComponent(term)}#wizard">
              <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
              Create "${U.esc(term)}" with AI
            </a>
          </div>`;
        return;
      }
      results.innerHTML = items.map((item, i) => `
        <a class="afr-search__item" href="${U.esc(AFR.components.recipeCard.wizardHref(item))}" data-idx="${i}">
          <img src="${U.esc(AFR.images.dish(item.name))}" alt="" loading="lazy" decoding="async">
          <span>
            <strong>${U.esc(item.name)}</strong>
            <small>${U.esc(AFR.data.cuisines.get(item.cuisine).name)} · ${U.humanTime(item.minutes)} · ${U.esc(item.difficulty)}</small>
          </span>
        </a>`).join('')
        + `<a class="afr-search__item" href="create.html?dish=${encodeURIComponent(term)}#wizard" data-idx="${items.length}">
             <span style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:var(--afr-brand-100);color:var(--afr-brand-700)">
               <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
             </span>
             <span><strong>Create "${U.esc(term)}" with AI</strong><small>Fully customised in 16 steps</small></span>
           </a>`;
    };

    const run = U.debounce(() => {
      const term = U.clean(input.value);
      open(AFR.data.catalog.search(term, 6), term);
    }, AFR.config.ui.searchDebounceMs);

    input.addEventListener('input', run);
    input.addEventListener('focus', run);

    /* Keyboard support for the suggestion list. */
    input.addEventListener('keydown', (event) => {
      const items = UI.qsa('.afr-search__item', results);
      if (event.key === 'Escape') return close();
      if (!items.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        active = (active + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((n, i) => n.setAttribute('data-active', String(i === active)));
        items[active].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter' && active >= 0) {
        event.preventDefault();
        items[active].click();
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const term = U.clean(input.value);
      if (!term) return;
      const hit = AFR.data.catalog.search(term, 1)[0];
      global.location.href = hit
        ? AFR.components.recipeCard.wizardHref(hit)
        : `create.html?dish=${encodeURIComponent(term)}#wizard`;
    });

    document.addEventListener('click', (event) => {
      if (!form.contains(event.target)) close();
    });
  }

  /* --------------------------------------------------------- categories */

  function categories() {
    const host = UI.qs('[data-home="categories"]');
    if (!host) return;
    const frag = document.createDocumentFragment();
    AFR.data.catalog.categories.forEach((cat) => frag.appendChild(AFR.components.recipeCard.tile(cat)));
    host.appendChild(frag);
  }

  /* ------------------------------------------------------------ sections */

  function sections() {
    const host = UI.qs('[data-home="sections"]');
    if (!host) return;
    const limit = AFR.config.ui.cardsPerSection;

    AFR.data.catalog.sections.forEach((section) => {
      const recipes = AFR.data.catalog.forSection(section, limit);
      if (!recipes.length) return;

      const wrap = UI.el('section', { class: 'afr-section afr-section--tight', id: `cat-${section.id}` });
      wrap.innerHTML = `
        <div class="afr-shell">
          <div class="afr-section-head">
            <div>
              <p class="afr-eyebrow"><i class="fa-solid ${U.esc(section.icon)}" aria-hidden="true"></i> ${U.esc(section.title)}</p>
              <h2>${U.esc(section.title)}</h2>
              <p>${U.esc(section.blurb)}</p>
            </div>
            <a class="afr-btn afr-btn--ghost afr-btn--sm" href="create.html#wizard">
              Create your own <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
          <div class="afr-grid" data-rail></div>
        </div>`;
      host.appendChild(wrap);
      AFR.components.recipeCard.renderInto(UI.qs('[data-rail]', wrap), recipes,
        { eager: section.id === 'trending' });
    });
  }

  /* ------------------------------------------------------------- regional */

  function regional() {
    const host = UI.qs('[data-home="regional"]');
    if (!host) return;
    const counts = U.groupBy(AFR.data.catalog.recipes, (x) => x.cuisine);

    host.innerHTML = AFR.data.cuisines.list.map((c) => `
      <a class="afr-tile" href="create.html?cuisine=${encodeURIComponent(c.id)}#wizard" data-reveal>
        <span class="afr-tile__icon" aria-hidden="true">${c.flag}</span>
        <strong>${U.esc(c.name)}</strong>
        <small>${(counts[c.id] || []).length} ideas · full support</small>
      </a>`).join('');
    UI.initReveal(host);
  }

  /* ---------------------------------------------------------------- boot */

  document.addEventListener('DOMContentLoaded', () => {
    heroArt();
    search();
    categories();
    sections();
    regional();
  });
})(window);
