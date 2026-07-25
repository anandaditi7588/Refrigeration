/* ==========================================================================
 * video-providers.js — Section 16 (YouTube videos).
 *
 * Two implementations behind one interface:
 *
 *  • youtube — real YouTube Data API v3 search + statistics, ordered by
 *    relevance and then re-ranked by view count so the highest-regarded
 *    videos surface first.
 *
 *  • local — no network. Returns real, working YouTube SEARCH links built
 *    from the dish and cuisine, clearly flagged `estimated: true` so the UI
 *    can label them as suggestions rather than fabricating channel names,
 *    view counts and publish dates as if they were real data.
 *
 * That distinction matters: inventing plausible-looking metadata for videos
 * that may not exist would be presenting fiction as fact.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /* ISO 8601 duration (PT12M34S) → 12:34 */
  function parseDuration(iso) {
    const m = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(String(iso || ''));
    if (!m) return '';
    const [, d, h, mi, s] = m.map((x) => (x ? parseInt(x, 10) : 0));
    const hours = (d || 0) * 24 + (h || 0);
    const pad = (n) => String(n).padStart(2, '0');
    return hours ? `${hours}:${pad(mi || 0)}:${pad(s || 0)}` : `${mi || 0}:${pad(s || 0)}`;
  }

  /* ------------------------------------------------------------- YouTube */
  const youtube = {
    id: 'youtube', capability: 'video', label: 'YouTube Data API',

    async search(query, opts = {}) {
      const key = AFR.config.keys.youtube;
      const endpoint = AFR.config.endpoints.video;
      const max = opts.max || AFR.config.generation.maxVideos;

      /* Prefer your proxy if one is configured — it keeps the key server-side. */
      if (endpoint) {
        const res = await U.withTimeout(
          fetch(`${endpoint}?q=${encodeURIComponent(query)}&max=${max}`),
          AFR.config.generation.timeoutMs, 'Video search');
        if (!res.ok) throw new Error(`Video search failed: HTTP ${res.status}`);
        const data = await res.json();
        return (data.videos || data || []).slice(0, max);
      }

      if (!key) throw new Error('No YouTube key configured (AFR.config.keys.youtube)');

      const searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video'
        + `&maxResults=${max * 2}&order=relevance&videoEmbeddable=true`
        + `&q=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;

      const searchRes = await U.withTimeout(fetch(searchUrl), AFR.config.generation.timeoutMs, 'YouTube search');
      if (!searchRes.ok) throw new Error(`YouTube search failed: HTTP ${searchRes.status}`);
      const search = await searchRes.json();

      const ids = (search.items || []).map((i) => i.id.videoId).filter(Boolean);
      if (!ids.length) return [];

      /* Second call gets duration and view counts, which search doesn't return. */
      const detailUrl = 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet'
        + `&id=${ids.join(',')}&key=${encodeURIComponent(key)}`;
      const detailRes = await U.withTimeout(fetch(detailUrl), AFR.config.generation.timeoutMs, 'YouTube details');
      if (!detailRes.ok) throw new Error(`YouTube details failed: HTTP ${detailRes.status}`);
      const detail = await detailRes.json();

      return (detail.items || [])
        .map((item) => ({
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          duration: parseDuration(item.contentDetails.duration),
          views: U.compactNumber(item.statistics.viewCount),
          viewsRaw: Number(item.statistics.viewCount) || 0,
          likes: U.compactNumber(item.statistics.likeCount || 0),
          published: U.relativeDate(item.snippet.publishedAt),
          url: `https://www.youtube.com/watch?v=${item.id}`,
          thumb: (item.snippet.thumbnails.medium || item.snippet.thumbnails.default || {}).url || '',
          estimated: false,
        }))
        /* "Prefer highest-rated": relevance first from the API, then popularity. */
        .sort((a, b) => b.viewsRaw - a.viewsRaw)
        .slice(0, max);
    },
  };

  /* --------------------------------------------------------------- local */
  const local = {
    id: 'local', capability: 'video', label: 'YouTube search links (no API key)',

    async search(query, opts = {}) {
      const max = Math.min(opts.max || 4, 6);
      const cuisine = opts.cuisine || '';
      const dish = opts.dish || query;

      /* Distinct, genuinely useful searches rather than invented videos. */
      const angles = [
        { label: `${dish} recipe`, note: 'General walkthroughs of the dish' },
        { label: `${dish} ${cuisine} authentic recipe`, note: 'Regional and traditional versions' },
        { label: `${dish} restaurant style`, note: 'Professional technique and restaurant methods' },
        { label: `how to make ${dish} step by step`, note: 'Beginner-friendly, fully narrated' },
        { label: `${dish} common mistakes`, note: 'What usually goes wrong and how to avoid it' },
        { label: `${dish} quick easy`, note: 'Shorter, weeknight-friendly versions' },
      ].slice(0, max);

      return angles.map((angle) => ({
        title: U.titleCase(angle.label),
        channel: 'Search on YouTube',
        duration: '',
        views: '',
        published: '',
        note: angle.note,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(angle.label)}`,
        thumb: AFR.images.video(angle.label),
        /* Flagged so the renderer labels this section honestly. */
        estimated: true,
      }));
    },
  };

  AFR.providers = AFR.providers || {};
  Object.assign(AFR.providers, { videoYoutube: youtube, videoLocal: local });
})(window);
