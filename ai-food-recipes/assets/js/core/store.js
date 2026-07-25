/* ==========================================================================
 * store.js — namespaced localStorage wrapper + the app's persisted state
 * (theme, bookmarks, wizard draft, last generated recipe, shopping ticks).
 *
 * Every read is defensive: private-mode browsers throw on localStorage, so
 * the store degrades to an in-memory map instead of breaking the page.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const PREFIX = (AFR.config && AFR.config.ui.storagePrefix) || 'afr:';

  const memory = new Map();
  let backend = null;

  function getBackend() {
    if (backend) return backend;
    try {
      const probe = `${PREFIX}__probe`;
      global.localStorage.setItem(probe, '1');
      global.localStorage.removeItem(probe);
      backend = global.localStorage;
    } catch (_) {
      // Safari private mode / storage disabled — stay functional, lose persistence.
      backend = {
        getItem: (k) => (memory.has(k) ? memory.get(k) : null),
        setItem: (k, v) => memory.set(k, v),
        removeItem: (k) => memory.delete(k),
      };
    }
    return backend;
  }

  const Store = {
    get(key, fallback = null) {
      try {
        const raw = getBackend().getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (_) { return fallback; }
    },

    set(key, value) {
      try {
        getBackend().setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (_) {
        // Quota exceeded (a saved recipe with inline images can be large).
        return false;
      }
    },

    remove(key) {
      try { getBackend().removeItem(PREFIX + key); } catch (_) { /* noop */ }
    },

    /* ------------------------------------------------------------- theme */

    getTheme() {
      const saved = Store.get('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      const pref = (AFR.config && AFR.config.ui.defaultTheme) || 'auto';
      if (pref !== 'auto') return pref;
      return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
    },

    setTheme(theme) { Store.set('theme', theme); },

    /* --------------------------------------------------------- bookmarks */

    getBookmarks() {
      const list = Store.get('bookmarks', []);
      return Array.isArray(list) ? list : [];
    },

    isBookmarked(id) {
      return Store.getBookmarks().some((b) => b.id === id);
    },

    /** Toggle and return the new state (true = now saved). */
    toggleBookmark(entry) {
      const list = Store.getBookmarks();
      const idx = list.findIndex((b) => b.id === entry.id);
      if (idx >= 0) {
        list.splice(idx, 1);
        Store.set('bookmarks', list);
        return false;
      }
      list.unshift({
        id: entry.id,
        title: entry.title,
        image: entry.image,
        cuisine: entry.cuisine || '',
        time: entry.time || '',
        diet: entry.diet || '',
        href: entry.href || '',
        savedAt: new Date().toISOString(),
      });
      Store.set('bookmarks', list.slice(0, 60));
      return true;
    },

    /* ------------------------------------------------------ wizard draft */

    saveDraft(answers) { Store.set('wizard:draft', { answers, at: Date.now() }); },

    loadDraft(maxAgeMs = 1000 * 60 * 60 * 24 * 7) {
      const draft = Store.get('wizard:draft');
      if (!draft || !draft.answers) return null;
      if (Date.now() - (draft.at || 0) > maxAgeMs) return null;
      return draft.answers;
    },

    clearDraft() { Store.remove('wizard:draft'); },

    /* ------------------------------------------------- last full recipe */

    saveRecipe(recipe) { Store.set('recipe:last', recipe); },
    loadRecipe() { return Store.get('recipe:last'); },

    /* --------------------------------------------- shopping list ticks */

    getChecked(recipeId) { return Store.get(`shop:${recipeId}`, []) || []; },

    setChecked(recipeId, items) { Store.set(`shop:${recipeId}`, items); },
  };

  AFR.store = Store;
})(window);
