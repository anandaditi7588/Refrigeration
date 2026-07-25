/* ==========================================================================
 * recipe-card.js — the card used by every browse rail on the home and saved
 * pages, plus the shared bookmark button behaviour.
 *
 * Cards are inspiration, not stored recipes: activating one opens the wizard
 * with the dish pre-filled, so there is exactly one generation path in the app.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  const DIET_CHIP = {
    veg: { label: 'Veg', class: 'afr-chip--veg', icon: 'fa-leaf' },
    vegan: { label: 'Vegan', class: 'afr-chip--veg', icon: 'fa-seedling' },
    nonveg: { label: 'Non-veg', class: 'afr-chip--nonveg', icon: 'fa-drumstick-bite' },
  };

  /** Link to the wizard with this dish (and any hints) pre-filled. */
  function wizardHref(recipe) {
    const params = new URLSearchParams({ dish: recipe.name });
    if (recipe.cuisine) params.set('cuisine', recipe.cuisine);
    if (recipe.diet === 'vegan') params.set('diet', 'vegan');
    else if (recipe.diet === 'veg') params.set('diet', 'vegetarian');
    return `create.html?${params.toString()}#wizard`;
  }

  /**
   * Build a recipe card element.
   * @param {object} recipe catalog entry
   * @param {object} opts   { eager: load image immediately (above the fold) }
   */
  function card(recipe, opts = {}) {
    const href = recipe.href || wizardHref(recipe);
    const img = recipe.image || AFR.images.dish(recipe.name);
    const diet = DIET_CHIP[recipe.diet];
    const cuisine = recipe.cuisineName
      || (AFR.data.cuisines && AFR.data.cuisines.get(recipe.cuisine).name)
      || '';
    const saved = AFR.store.isBookmarked(recipe.id);

    const node = UI.el('article', { class: 'afr-card', 'data-reveal': '' });
    node.innerHTML = `
      <div class="afr-card__media">
        <img src="${U.esc(img)}" alt="${U.esc(recipe.name)}"
             loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async">
        <div class="afr-card__tags">
          ${diet ? `<span class="afr-chip ${diet.class}"><i class="fa-solid ${diet.icon}" aria-hidden="true"></i>${diet.label}</span>` : ''}
          ${recipe.difficulty ? `<span class="afr-chip">${U.esc(recipe.difficulty)}</span>` : ''}
        </div>
        <button class="afr-card__save" type="button" aria-pressed="${saved}"
                aria-label="${saved ? 'Remove' : 'Save'} ${U.esc(recipe.name)} ${saved ? 'from' : 'to'} your saved recipes">
          <i class="fa-${saved ? 'solid' : 'regular'} fa-bookmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="afr-card__body">
        <h3 class="afr-card__title"><a href="${U.esc(href)}">${U.esc(recipe.name)}</a></h3>
        <p class="afr-card__desc">${U.esc(recipe.desc || '')}</p>
        <div class="afr-card__meta">
          ${cuisine ? `<span><i class="fa-solid fa-earth-asia" aria-hidden="true"></i>${U.esc(cuisine)}</span>` : ''}
          ${recipe.minutes ? `<span><i class="fa-solid fa-clock" aria-hidden="true"></i>${U.humanTime(recipe.minutes)}</span>` : ''}
          ${recipe.rating ? `<span><i class="fa-solid fa-star" aria-hidden="true" style="color:var(--afr-brand-500)"></i>${U.esc(recipe.rating)}</span>` : ''}
        </div>
      </div>`;

    /* Bookmarking is local-only, so it can respond instantly. */
    const saveBtn = node.querySelector('.afr-card__save');
    saveBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const nowSaved = AFR.store.toggleBookmark({
        id: recipe.id, title: recipe.name, image: img,
        cuisine, time: recipe.minutes ? U.humanTime(recipe.minutes) : '',
        diet: recipe.diet, href,
      });
      saveBtn.setAttribute('aria-pressed', String(nowSaved));
      saveBtn.setAttribute('aria-label',
        `${nowSaved ? 'Remove' : 'Save'} ${recipe.name} ${nowSaved ? 'from' : 'to'} your saved recipes`);
      saveBtn.innerHTML = `<i class="fa-${nowSaved ? 'solid' : 'regular'} fa-bookmark" aria-hidden="true"></i>`;
      UI.toast(nowSaved ? `Saved ${recipe.name}` : `Removed ${recipe.name}`, nowSaved ? 'ok' : 'info', 2000);
      document.dispatchEvent(new CustomEvent('afr:bookmarkchange'));
    });

    return node;
  }

  /** Compact category tile used under the hero. */
  function tile(category) {
    return UI.el('a', {
      class: 'afr-tile', href: `create.html?dish=${encodeURIComponent(category.query)}#wizard`,
      'data-reveal': '',
    }, UI.el('span', { class: 'afr-tile__icon', 'aria-hidden': 'true', text: category.emoji }),
      UI.el('strong', { text: category.label }),
      UI.el('small', { text: 'Create with AI' }));
  }

  /** Render a list of cards into a container, with a skeleton-free fast path. */
  function renderInto(container, recipes, opts = {}) {
    if (!container) return;
    UI.clear(container);
    if (!recipes.length) {
      container.appendChild(UI.el('div', { class: 'afr-empty' },
        UI.el('i', { class: 'fa-solid fa-utensils', 'aria-hidden': 'true' }),
        UI.el('p', { text: opts.emptyText || 'Nothing here yet.' })));
      return;
    }
    const frag = document.createDocumentFragment();
    recipes.forEach((recipe, i) => frag.appendChild(card(recipe, { eager: opts.eager && i < 4 })));
    container.appendChild(frag);
    UI.initReveal(container);
  }

  AFR.components = AFR.components || {};
  AFR.components.recipeCard = { card, tile, renderInto, wizardHref };
})(window);
