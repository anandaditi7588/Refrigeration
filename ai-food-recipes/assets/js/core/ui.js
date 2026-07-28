/* ==========================================================================
 * ui.js — the app's tiny UI kit: DOM helpers, theming, toasts, accordions,
 * tabs, scroll reveal and lazy images.
 *
 * Deliberately framework-free AND Bootstrap-JS-free: Bootstrap is loaded for
 * its grid/utility classes, but every interactive widget here works on its
 * own so a blocked CDN degrades styling, never behaviour.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  const UI = {
    /* ----------------------------------------------------------- DOM sugar */

    qs(selector, root = document) { return root.querySelector(selector); },
    qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); },

    /** el('div', {class:'x', onclick:fn, dataset:{k:'v'}}, ...children) */
    el(tag, attrs = {}, ...children) {
      const node = document.createElement(tag);
      Object.entries(attrs || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, value);
      });
      children.flat().forEach((child) => {
        if (child === null || child === undefined || child === false) return;
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
      return node;
    },

    /** Replace a container's contents with an HTML string (already escaped). */
    html(target, markup) {
      const node = typeof target === 'string' ? UI.qs(target) : target;
      if (node) node.innerHTML = markup;
      return node;
    },

    clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); },

    /* -------------------------------------------------------------- theme */

    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      const meta = UI.qs('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#14100c' : '#fbf7f2');
      UI.qsa('[data-theme-toggle]').forEach((btn) => {
        const dark = theme === 'dark';
        btn.setAttribute('aria-pressed', String(dark));
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.innerHTML = `<i class="fa-solid ${dark ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>`;
      });
      document.dispatchEvent(new CustomEvent('afr:themechange', { detail: { theme } }));
    },

    initTheme() {
      UI.applyTheme(AFR.store.getTheme());
      document.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-theme-toggle]');
        if (!btn) return;
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        AFR.store.setTheme(next);
        UI.applyTheme(next);
      });
    },

    /* ------------------------------------------------------------- toasts */

    toast(message, kind = 'ok', ms = 3200) {
      let host = UI.qs('.afr-toasts');
      if (!host) {
        host = UI.el('div', { class: 'afr-toasts', role: 'status', 'aria-live': 'polite' });
        document.body.appendChild(host);
      }
      const icon = kind === 'err' ? 'fa-circle-exclamation'
        : kind === 'info' ? 'fa-circle-info' : 'fa-circle-check';
      const node = UI.el('div', { class: `afr-toast afr-toast--${kind}` },
        UI.el('i', { class: `fa-solid ${icon}`, 'aria-hidden': 'true' }),
        UI.el('span', { text: message }));
      host.appendChild(node);
      setTimeout(() => {
        node.style.transition = 'opacity .25s, transform .25s';
        node.style.opacity = '0';
        node.style.transform = 'translateX(20px)';
        setTimeout(() => node.remove(), 260);
      }, ms);
    },

    /* ---------------------------------------------------------- accordion */

    /**
     * Build an accordion section. Bodies render lazily via `render()` so a
     * 20-section recipe doesn't pay for all of it up front.
     */
    accordion({ index, title, icon, open = false, render, id }) {
      const bodyId = `acc-body-${id}`;
      const headId = `acc-head-${id}`;
      const body = UI.el('div', {
        class: 'afr-acc__body', id: bodyId, role: 'region', 'aria-labelledby': headId,
      });

      let rendered = false;
      const fill = () => {
        if (rendered) return;
        rendered = true;
        const content = render();
        if (typeof content === 'string') body.innerHTML = content;
        else if (content) body.appendChild(content);
      };

      const head = UI.el('button', {
        class: 'afr-acc__head', type: 'button', id: headId,
        'aria-expanded': String(open), 'aria-controls': bodyId,
        onclick() {
          const expanded = this.getAttribute('aria-expanded') === 'true';
          if (!expanded) fill();
          this.setAttribute('aria-expanded', String(!expanded));
          body.hidden = expanded;
        },
      },
        index ? UI.el('span', { class: 'afr-acc__idx', 'aria-hidden': 'true', text: String(index) }) : null,
        icon ? UI.el('i', { class: `fa-solid ${icon}`, 'aria-hidden': 'true' }) : null,
        UI.el('span', { text: title }),
        UI.el('i', { class: 'fa-solid fa-chevron-down afr-acc__chev', 'aria-hidden': 'true' }));

      body.hidden = !open;
      if (open) fill();

      const section = UI.el('section', { class: 'afr-acc', id: `section-${id}` }, head, body);
      // Printing must show everything, so force-render collapsed bodies first.
      section.forcePrintRender = fill;
      return section;
    },

    /* --------------------------------------------------------------- tabs */

    /** Wire a `.afr-tabs` group; calls onChange(value) on selection. */
    tabs(container, onChange) {
      const buttons = UI.qsa('.afr-tab', container);
      buttons.forEach((btn) => {
        btn.setAttribute('role', 'tab');
        btn.addEventListener('click', () => {
          buttons.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
          onChange(btn.dataset.value, btn);
        });
      });
      container.setAttribute('role', 'tablist');
      const initial = buttons.find((b) => b.getAttribute('aria-selected') === 'true') || buttons[0];
      if (initial) {
        initial.setAttribute('aria-selected', 'true');
        onChange(initial.dataset.value, initial);
      }
    },

    /* ------------------------------------------------------ scroll reveal */

    /**
     * `[data-reveal]` starts at opacity 0 and is faded in once it scrolls into
     * view. That makes the CSS default *invisible*, so anything rendered after
     * boot that never reaches an observer stays invisible for good — still
     * laid out, still clickable, just never drawn. Whoever renders such content
     * must call this; `sweepReveal` below is the net for when they forget.
     */
    initReveal(root = document) {
      const nodes = UI.qsa('[data-reveal]:not([data-revealed]):not([data-reveal-watched])', root);
      if (!nodes.length) return;
      if (!('IntersectionObserver' in global)) {
        nodes.forEach((n) => n.setAttribute('data-revealed', 'true'));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          setTimeout(() => entry.target.setAttribute('data-revealed', 'true'), i * 60);
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      nodes.forEach((n) => {
        /* Marked so a later sweep does not stack a second observer on it. */
        n.setAttribute('data-reveal-watched', '');
        io.observe(n);
      });
    },

    /**
     * Catch anything a page rendered without calling initReveal. Cheap: after
     * the first pass every node carries data-reveal-watched, so the selector
     * matches nothing and this returns immediately.
     */
    sweepReveal() { UI.initReveal(document); },

    /* ------------------------------------------------------- sticky nav */

    initNavScroll() {
      const nav = UI.qs('.afr-nav');
      if (!nav) return;
      const onScroll = () => nav.setAttribute('data-scrolled', String(global.scrollY > 8));
      onScroll();
      global.addEventListener('scroll', onScroll, { passive: true });

      const toggle = UI.qs('.afr-nav__toggle');
      const links = UI.qs('.afr-nav__links');
      if (toggle && links) {
        toggle.addEventListener('click', () => {
          const open = links.getAttribute('data-open') === 'true';
          links.setAttribute('data-open', String(!open));
          toggle.setAttribute('aria-expanded', String(!open));
        });
        links.addEventListener('click', (e) => {
          if (e.target.closest('a')) {
            links.setAttribute('data-open', 'false');
            toggle.setAttribute('aria-expanded', 'false');
          }
        });
      }
    },

    /** Mark the nav link matching the current page. */
    markCurrentNav() {
      const file = (global.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      UI.qsa('.afr-nav__link').forEach((link) => {
        const href = (link.getAttribute('href') || '').split('#')[0].toLowerCase();
        if (href && (href === file || (file === '' && href === 'index.html'))) {
          link.setAttribute('aria-current', 'page');
        }
      });
    },

    /* -------------------------------------------------------------- misc */

    /** Copy text with a graceful fallback for non-secure contexts. */
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        const ta = UI.el('textarea', { style: 'position:fixed;opacity:0' });
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove();
        return ok;
      }
    },

    /** Native share when available, clipboard otherwise. */
    async share({ title, text, url }) {
      if (navigator.share) {
        try { await navigator.share({ title, text, url }); return 'shared'; }
        catch (err) { if (err && err.name === 'AbortError') return 'cancelled'; }
      }
      const ok = await UI.copy(url);
      return ok ? 'copied' : 'failed';
    },

    /** Skeleton block used while a provider is working. */
    skeleton({ media = true, lines = 4 } = {}) {
      const wrap = UI.el('div', { class: 'afr-skel-group', 'aria-hidden': 'true' });
      if (media) wrap.appendChild(UI.el('div', { class: 'afr-skel afr-skel--media' }));
      wrap.appendChild(UI.el('div', { class: 'afr-skel afr-skel--title' }));
      for (let i = 0; i < lines; i++) {
        wrap.appendChild(UI.el('div', {
          class: 'afr-skel afr-skel--line',
          style: `width:${[100, 92, 84, 96, 70][i % 5]}%`,
        }));
      }
      return wrap;
    },

    scrollTo(target, offset = 90) {
      const node = typeof target === 'string' ? UI.qs(target) : target;
      if (!node) return;
      const top = node.getBoundingClientRect().top + global.scrollY - offset;
      global.scrollTo({ top, behavior: 'smooth' });
    },

    /**
     * A remote photograph can 404 or be blocked. Rather than leave a broken
     * image, swap in the drawn plate for that subject. `error` does not bubble,
     * so this listens in the capture phase.
     */
    initImageFallback(root = document) {
      root.addEventListener('error', (event) => {
        const img = event.target;
        if (!img || img.tagName !== 'IMG' || img.dataset.fellBack) return;
        img.dataset.fellBack = '1';
        img.src = AFR.images.dish(img.alt || 'dish');
      }, true);
    },

    /** Print helper: expand every accordion first so nothing is lost on paper. */
    printPage(root = document) {
      UI.qsa('.afr-acc', root).forEach((acc) => {
        if (typeof acc.forcePrintRender === 'function') acc.forcePrintRender();
      });
      setTimeout(() => global.print(), 120);
    },
  };

  AFR.ui = UI;

  /* Boot the pieces every page needs. Pages add their own logic on top. */
  document.addEventListener('DOMContentLoaded', () => {
    UI.initTheme();
    UI.initImageFallback();
    UI.initNavScroll();
    UI.markCurrentNav();
    UI.initReveal();
    const year = UI.qs('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());
  });

  /* This listener is registered before any page script's, so it also runs
     first — before the page has rendered its own [data-reveal] content. Sweep
     again once everything has had its turn, so a page that forgets to call
     initReveal loses the animation rather than the content. */
  global.addEventListener('load', () => UI.sweepReveal());
  document.addEventListener('DOMContentLoaded', () => setTimeout(UI.sweepReveal, 0));
})(window);
