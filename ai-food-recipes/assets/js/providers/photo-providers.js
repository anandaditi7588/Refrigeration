/* ==========================================================================
 * photo-providers.js — real photography instead of the drawn SVG plates.
 *
 * Four sources, all callable straight from the browser (each sets permissive
 * CORS headers), so no backend is required to get real images:
 *
 *   youtube    thumbnails from the video search already being run. Free, no
 *              extra key, and the picture is genuinely of THIS dish because it
 *              comes from a video about it.
 *   pexels     stock photography. Free key, 200 requests/hour.
 *   unsplash   stock photography. Free key, 50 requests/hour on demo apps.
 *              Attribution is required and is carried through in `credit`.
 *   wikimedia  Commons image search. NO KEY AT ALL, which makes it the right
 *              default for the ~120 pantry ingredients.
 *
 * Every adapter returns the same record so the image service does not care
 * which one produced it:
 *   { url, credit, creditUrl, source }
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /** Fetch JSON with a timeout and an error message worth reading. */
  async function getJSON(url, options, label) {
    const res = await U.withTimeout(
      fetch(url, options), AFR.config.generation.timeoutMs, label);
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 200); } catch (_) { /* ignore */ }
      throw new Error(`${label}: HTTP ${res.status}${detail ? ` - ${detail}` : ''}`);
    }
    return res.json();
  }

  /* ---------------------------------------------------------------- pexels */
  const pexels = {
    id: 'pexels', capability: 'photo', label: 'Pexels',
    needsKey: 'keys.pexels',

    async search(query, opts = {}) {
      const key = AFR.config.keys.pexels;
      if (!key) throw new Error('No Pexels key configured (AFR.config.keys.pexels)');

      const url = 'https://api.pexels.com/v1/search'
        + `?query=${encodeURIComponent(query)}`
        + `&per_page=${Math.min(opts.count || 12, 80)}`
        + `&orientation=${opts.orientation || 'landscape'}`;

      const data = await getJSON(url, { headers: { Authorization: key } }, 'Pexels');
      return (data.photos || []).map((p) => ({
        url: (p.src || {}).large || (p.src || {}).medium || p.url,
        credit: `${p.photographer} / Pexels`,
        creditUrl: p.url,
        source: 'pexels',
      })).filter((p) => p.url);
    },
  };

  /* -------------------------------------------------------------- unsplash */
  const unsplash = {
    id: 'unsplash', capability: 'photo', label: 'Unsplash',
    needsKey: 'keys.unsplash',

    async search(query, opts = {}) {
      const key = AFR.config.keys.unsplash;
      if (!key) throw new Error('No Unsplash access key configured (AFR.config.keys.unsplash)');

      const url = 'https://api.unsplash.com/search/photos'
        + `?query=${encodeURIComponent(query)}`
        + `&per_page=${Math.min(opts.count || 12, 30)}`
        + `&orientation=${opts.orientation || 'landscape'}`
        + '&content_filter=high';

      const data = await getJSON(url, {
        headers: { Authorization: `Client-ID ${key}` },
      }, 'Unsplash');

      return (data.results || []).map((p) => ({
        url: (p.urls || {}).regular || (p.urls || {}).small,
        /* Unsplash's API terms require crediting the photographer, so the
           credit travels with the image and is rendered in the sources panel. */
        credit: `${(p.user || {}).name || 'Unknown'} / Unsplash`,
        creditUrl: ((p.links || {}).html) || '',
        source: 'unsplash',
      })).filter((p) => p.url);
    },
  };

  /* ------------------------------------------------------------- wikimedia */
  const wikimedia = {
    id: 'wikimedia', capability: 'photo', label: 'Wikimedia Commons (no key)',
    needsKey: null,

    async search(query, opts = {}) {
      const count = Math.min(opts.count || 3, 10);
      const width = opts.width || 480;

      /* `origin=*` is what makes the Commons API answer a browser directly. */
      const url = 'https://commons.wikimedia.org/w/api.php'
        + '?action=query&format=json&origin=*'
        + '&generator=search&gsrnamespace=6'
        + `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}`
        + `&gsrlimit=${count}`
        + `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${width}`;

      const data = await getJSON(url, {}, 'Wikimedia Commons');
      const pages = ((data.query || {}).pages) || {};

      return Object.values(pages).map((page) => {
        const info = (page.imageinfo || [])[0] || {};
        const meta = info.extmetadata || {};
        const artist = (meta.Artist || {}).value || '';
        return {
          url: info.thumburl || info.url,
          // Artist arrives as HTML; strip tags rather than injecting markup.
          credit: `${artist.replace(/<[^>]*>/g, '').trim() || 'Wikimedia Commons'} / Wikimedia`,
          creditUrl: info.descriptionurl || '',
          source: 'wikimedia',
        };
      }).filter((p) => p.url);
    },
  };

  /* --------------------------------------------------------------- youtube */
  /* Not a search of its own: it reuses the video results the recipe service
     has already fetched, so it costs nothing extra and the photo is of the
     dish the user actually asked for. */
  const youtubeThumbs = {
    id: 'youtube', capability: 'photo', label: 'YouTube video thumbnails',
    needsKey: 'keys.youtube',

    async search(query, opts = {}) {
      const videos = opts.videos || [];
      return videos
        .filter((v) => v.thumb && /^https?:/.test(v.thumb) && !v.estimated)
        .map((v) => ({
          /* hqdefault is the largest still YouTube guarantees for every video.
             maxresdefault is sharper but 404s on plenty of uploads, so it is
             not worth the broken images. */
          url: v.thumb.replace(/\/(default|mqdefault|sddefault)\.jpg/, '/hqdefault.jpg'),
          credit: `${v.channel} (YouTube)`,
          creditUrl: v.url,
          source: 'youtube',
        }));
    },
  };

  /* ----------------------------------------------------------------- local */
  const local = {
    id: 'local', capability: 'photo', label: 'Drawn plates (offline, no network)',
    needsKey: null,
    async search() { return []; }, // the image service falls back to SVG
  };

  AFR.providers = AFR.providers || {};
  Object.assign(AFR.providers, {
    photoPexels: pexels,
    photoUnsplash: unsplash,
    photoWikimedia: wikimedia,
    photoYoutube: youtubeThumbs,
    photoLocal: local,
  });
})(window);
