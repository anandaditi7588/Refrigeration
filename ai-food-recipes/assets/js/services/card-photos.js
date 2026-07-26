/* ==========================================================================
 * card-photos.js — real photographs on the browsing cards.
 *
 * The home page renders 74 recipe cards. Each starts as a drawn plate, which
 * is instant and always works; this then quietly replaces it with a real
 * photograph.
 *
 * Three rules make that affordable rather than 74 requests on load:
 *
 *   1. Only cards the visitor actually scrolls to are fetched
 *      (IntersectionObserver), so an untouched page costs almost nothing.
 *   2. At most a few requests are in flight at once, so the browser is not
 *      flooded and Commons is not hammered.
 *   3. Results — including misses — persist in localStorage, so a second
 *      visit is free and a dish Commons has never heard of is asked once.
 *
 * The swap is deliberately gentle: the photo fades in over the drawing, so a
 * slow connection never shows an empty box, and a failed fetch simply leaves
 * the illustration in place. There is no state where a card has no image.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  const MAX_IN_FLIGHT = 3;
  let inFlight = 0;
  const queue = [];
  let observer = null;

  /** Work the queue without ever exceeding the concurrency limit. */
  function pump() {
    while (inFlight < MAX_IN_FLIGHT && queue.length) {
      const job = queue.shift();
      inFlight += 1;
      job().finally(() => {
        inFlight -= 1;
        pump();
      });
    }
  }

  /**
   * Swap one card's drawing for a photograph.
   * Loads the image off-DOM first so a broken or slow URL never replaces a
   * perfectly good illustration with a broken-image icon.
   */
  function load(img) {
    const name = img.getAttribute('data-dish-photo');
    if (!name) return Promise.resolve();
    img.removeAttribute('data-dish-photo');       // never ask twice

    return AFR.images.photoForDish(name).then((url) => {
      if (!url) return;
      return new Promise((resolve) => {
        const probe = new Image();
        probe.onload = () => {
          img.src = url;
          img.classList.add('afr-card__img--photo');
          resolve();
        };
        probe.onerror = resolve;                  // keep the drawing
        probe.src = url;
      });
    }).catch(() => { /* a card image is never worth an error */ });
  }

  function observe(root = document) {
    const targets = Array.from(root.querySelectorAll('img[data-dish-photo]'));
    if (!targets.length) return;

    /* Without IntersectionObserver, fall back to fetching the first handful
       rather than all of them — old browser, but still no request storm. */
    if (typeof IntersectionObserver !== 'function') {
      targets.slice(0, 8).forEach((img) => { queue.push(() => load(img)); });
      pump();
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          queue.push(() => load(entry.target));
        });
        pump();
      }, { rootMargin: '200px' });   // start just before they scroll into view
    }

    targets.forEach((img) => observer.observe(img));
  }

  /* Cards are rendered continuously — section by section on the home page, and
     again when a filter or search re-renders. Watching the DOM is simpler and
     more reliable than asking every call site to remember to register. */
  function watch() {
    observe();
    if (typeof MutationObserver !== 'function') return;
    let scheduled = null;
    new MutationObserver(() => {
      if (scheduled) clearTimeout(scheduled);
      scheduled = setTimeout(() => { scheduled = null; observe(); }, 150);
    }).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    /* Nothing to do when photos are switched off, or on a page that cannot
       reach the network at all — the drawings are the finished article there. */
    if (!AFR.images || !AFR.images.photoForDish) return;
    if (!AFR.config.providers.photo || AFR.config.providers.photo === 'local') return;
    watch();
  });

  AFR.cardPhotos = { observe, watch };
})(window);
