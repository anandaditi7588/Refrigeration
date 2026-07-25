/* ==========================================================================
 * saved.js — the bookmarks page.
 *
 * Bookmarks live in localStorage only: nothing about a visitor's saved
 * recipes leaves their browser.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  function render() {
    const host = UI.qs('[data-saved="list"]');
    const count = UI.qs('[data-saved="count"]');
    const actions = UI.qs('[data-saved="actions"]');
    if (!host) return;

    const items = AFR.store.getBookmarks();
    if (count) {
      count.textContent = items.length
        ? `${items.length} saved recipe${items.length === 1 ? '' : 's'}`
        : 'Nothing saved yet';
    }
    if (actions) actions.hidden = !items.length;

    if (!items.length) {
      host.innerHTML = `
        <div class="afr-empty">
          <i class="fa-regular fa-bookmark" aria-hidden="true"></i>
          <h3>No saved recipes yet</h3>
          <p>Tap the bookmark icon on any recipe card, or save a recipe you have generated.</p>
          <a class="afr-btn afr-btn--primary" href="create.html#wizard" style="margin-top:12px">
            <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Create your first dish
          </a>
        </div>`;
      return;
    }

    UI.clear(host);
    const frag = document.createDocumentFragment();
    items.forEach((item) => {
      frag.appendChild(AFR.components.recipeCard.card({
        id: item.id,
        name: item.title,
        image: item.image,
        cuisineName: item.cuisine,
        desc: `Saved ${U.relativeDate(item.savedAt)}`,
        href: item.href || `create.html?dish=${encodeURIComponent(item.title)}#wizard`,
        diet: item.diet,
      }));
    });
    host.appendChild(frag);
    UI.initReveal(host);
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    document.addEventListener('afr:bookmarkchange', render);

    const clear = UI.qs('[data-saved="clear"]');
    if (clear) {
      clear.addEventListener('click', () => {
        if (!global.confirm('Remove every saved recipe? This cannot be undone.')) return;
        AFR.store.set('bookmarks', []);
        render();
        UI.toast('All saved recipes removed.', 'info');
      });
    }
  });
})(window);
