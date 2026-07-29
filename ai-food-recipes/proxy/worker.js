/* ==========================================================================
 * worker.js — the shared-model backend for AI Food Recipes.
 *
 * WHY THIS EXISTS
 *
 * The obvious way to let every visitor use one API key is to put the key in
 * config.js. That does not work, and not in a way that can be worked around:
 * a static site ships its JavaScript to the browser, so the key is visible to
 * anyone who opens View Source or the Network tab. Within days it gets lifted
 * and spent on someone else's project, and GitHub's secret scanning will
 * usually have told the provider to revoke it before that even happens.
 *
 * So the key lives here instead, on a server, as an environment secret. The
 * browser calls this endpoint; this endpoint calls the model. The key is never
 * sent to the browser, and visitors need no key of their own — which is the
 * behaviour actually wanted.
 *
 * Runs on Cloudflare Workers (free tier, no card). See README.md in this
 * folder for the deploy steps and the Google Cloud alternative.
 * ========================================================================== */

/* ---------------------------------------------------------------- settings */

const CONFIG = {
  /* Which sites may call this. A request from anywhere else is refused, so
     someone who finds the URL cannot simply point their own page at it.
     Not airtight — Origin is set by the browser and a script can forge it —
     but it stops casual reuse. The rate limit handles the rest. */
  allowedOrigins: [
    'https://anandaditi7588.github.io',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
  ],

  /* Groq's OpenAI-compatible endpoint. Any other host that speaks the same
     protocol works by changing these two lines. */
  upstream: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'llama-3.3-70b-versatile',

  /* One visitor should not be able to drain a shared free tier. A recipe
     takes a few seconds, so this is generous for a person and useless for a
     script. */
  rateLimit: { requests: 8, windowSeconds: 60 },

  /* A recipe brief is a couple of KB. Anything much larger is not a recipe. */
  maxBodyBytes: 16_000,

  /* Output ceiling. A complete recipe with detailed steps needs the room. */
  maxTokens: 16_000,

  timeoutMs: 45_000,
};

/* The system prompt is fixed HERE rather than taken from the request. The
   client sends one, and it is deliberately ignored: if the endpoint used
   whatever system prompt it was handed, anyone with the URL would have a free
   general-purpose language model. Constrained this way, the worst someone can
   do with it is generate recipes. */
const SYSTEM = [
  'You are a professional recipe developer who has cooked across many cuisines.',
  'You write precise, testable recipes: real quantities, real temperatures, real timings.',
  'You never pad with narrative, but you are never terse either: every stage of the',
  'cook is written out in full, because a missing step is what ruins a dish.',
  'Every sentence must help someone cook it.',
  'You respect dietary restrictions absolutely — an allergy is a hard constraint, never a suggestion.',
  'You scale every quantity to the requested number of servings, scaling spices and fat',
  'slightly sub-linearly as a real cook would.',
  'You return ONLY valid JSON matching the given schema. No markdown fences, no commentary.',
  'You only ever produce recipes. If asked for anything else, return a JSON object',
  'with an "error" field explaining that this service only writes recipes.',
].join(' ');

/* ------------------------------------------------------------------ helpers */

const json = (body, status, origin) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || CONFIG.allowedOrigins[0],
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

const allowed = (origin) => Boolean(origin) && CONFIG.allowedOrigins.includes(origin);

/**
 * Per-IP rate limit, kept in memory.
 *
 * Workers are recycled and there are many of them, so this is approximate —
 * a determined caller spread across isolates gets somewhat more than the
 * limit. It is a spend-protection measure, not a security boundary. Swap the
 * Map for a Durable Object or KV if you ever need it to be exact.
 */
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const windowMs = CONFIG.rateLimit.windowSeconds * 1000;
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);

  if (recent.length >= CONFIG.rateLimit.requests) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);

  /* Stop the Map growing without bound across a long-lived isolate. */
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.length || now - times[times.length - 1] > windowMs) hits.delete(key);
    }
  }
  return false;
}

/* --------------------------------------------------------------- the worker */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    /* --- CORS preflight --- */
    if (request.method === 'OPTIONS') {
      if (!allowed(origin)) return new Response('Forbidden', { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Send a POST request.' }, 405, origin);
    }
    if (!allowed(origin)) {
      return json({ error: 'This endpoint only serves the AI Food Recipes site.' }, 403, origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) {
      return json({
        error: 'Too many recipes at once. Wait a minute and try again — this is a shared '
          + 'free allowance, so it is rationed per visitor.',
      }, 429, origin);
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: 'The server is missing its model key.' }, 500, origin);
    }

    /* --- read the brief --- */
    let body;
    try {
      const raw = await request.text();
      if (raw.length > CONFIG.maxBodyBytes) {
        return json({ error: 'That brief is too long.' }, 413, origin);
      }
      body = JSON.parse(raw);
    } catch (err) {
      return json({ error: 'Could not read the request.' }, 400, origin);
    }

    const user = typeof body.user === 'string' ? body.user : body.brief;
    if (!user || typeof user !== 'string') {
      return json({ error: 'No recipe brief in the request.' }, 400, origin);
    }

    /* --- ask the model --- */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

    try {
      const upstream = await fetch(CONFIG.upstream, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.MODEL || CONFIG.model,
          temperature: 0.7,
          /* A detailed 20-section recipe is a big document. Without this the
             host's default cuts the JSON mid-array and the browser sees a
             parse failure it can do nothing about. */
          max_tokens: Number(env.MAX_TOKENS) || CONFIG.maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: user },
          ],
        }),
      });

      if (!upstream.ok) {
        const detail = (await upstream.text()).slice(0, 300);
        /* Never let an upstream error carry the key back to the browser, and
           translate the two statuses a visitor can actually act on. */
        if (upstream.status === 429) {
          return json({ error: 'The shared model is busy right now. Try again in a moment.' }, 429, origin);
        }
        if (upstream.status === 401 || upstream.status === 403) {
          return json({ error: 'The shared model is unavailable. The site owner needs to check its key.' }, 502, origin);
        }
        return json({ error: `The model refused the request (HTTP ${upstream.status}).`, detail }, 502, origin);
      }

      const data = await upstream.json();
      const choice = data?.choices?.[0];
      const text = choice?.message?.content;
      if (!text) return json({ error: 'The model returned nothing.' }, 502, origin);
      if (choice.finish_reason === 'length') {
        return json({
          error: 'The recipe was longer than the model could finish in one go. '
            + 'Try again, or ask for fewer servings.',
        }, 502, origin);
      }

      /* Hand back the raw text. The browser already knows how to parse and
         normalise it — the same code path every other adapter uses — so the
         schema lives in exactly one place. */
      return json({ text }, 200, origin);
    } catch (err) {
      const timedOut = err.name === 'AbortError';
      return json({
        error: timedOut ? 'The model took too long. Try again.' : 'Could not reach the model.',
      }, 504, origin);
    } finally {
      clearTimeout(timer);
    }
  },
};
