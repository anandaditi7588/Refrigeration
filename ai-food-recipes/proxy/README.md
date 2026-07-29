# The shared model backend

This makes the site answer for **any dish, for every visitor, with nobody
entering a key** — using one Groq key that you own.

## Why the key cannot just go in `config.js`

That is the obvious approach and it does not work. A static site sends its
JavaScript to the browser, so anything in `config.js` is readable by every
visitor — View Source, or one glance at the Network tab. Three things follow:

1. **The key gets taken and spent.** Not hypothetically; scrapers watch public
   repositories and deployed sites specifically for API keys.
2. **GitHub will report it.** Push a Groq key to a public repo and secret
   scanning notifies Groq, which usually revokes it automatically. The site
   then breaks and you have to issue a new key.
3. **The free tier is per key, not per visitor.** Groq's free allowance is
   rate-limited per minute and per day. Shared across everyone who opens the
   site, a handful of simultaneous visitors exhausts it and everybody gets
   errors — including you.

Point 3 applies no matter where the key lives, which is why the worker below
rations requests per visitor.

The fix is the standard one: the key sits on a server, the browser calls the
server, the server calls the model. The key is never sent to a browser.

## What you deploy

`worker.js` — about 200 lines, no dependencies. It:

- accepts a recipe brief from your site and nowhere else (origin allowlist)
- adds the key server-side and forwards to Groq
- **ignores any system prompt the caller sends** and uses its own, so someone
  who finds the URL gets a recipe generator, not a free general-purpose model
- rate-limits each visitor to 8 recipes a minute
- never lets an upstream error carry the key back to the browser
- turns provider failures into messages a visitor can act on

## Deploying it — Cloudflare Workers

Free tier, 100,000 requests a day, **no card required**. About five minutes.

```bash
npm install -g wrangler
wrangler login

cd ai-food-recipes/proxy
wrangler secret put GROQ_API_KEY      # paste your Groq key when prompted
wrangler deploy
```

`wrangler secret put` stores the key encrypted on Cloudflare. It is never
written to disk here and never committed — `.gitignore` in this folder blocks
the usual accidents.

Deploy prints a URL like `https://ai-food-recipes-model.<you>.workers.dev`.

### Then point the site at it

In `assets/js/core/config.js`:

```js
endpoints: {
  ai: 'https://ai-food-recipes-model.<you>.workers.dev',
  ...
}
```

That is the whole change. `config.js` sets `providers.ai = 'proxy'`
automatically whenever `endpoints.ai` is filled in, so every visitor gets the
shared model with no further wiring — and this URL is safe to commit, because
it is not a secret and only answers requests from your own site.

### Keep the origin list current

`worker.js` starts with an `allowedOrigins` list. **Add your domain to it when
you get one**, or the live site will get 403s:

```js
allowedOrigins: [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'https://anandaditi7588.github.io',
  'http://localhost:8080',
],
```

Then `wrangler deploy` again.

## If you would rather stay on Google

Firebase Functions works and has one real advantage: Firebase Hosting can
rewrite `/api/recipe` to the function, which puts it on the **same origin** as
the site — no CORS involved at all, and the endpoint URL is just
`/api/recipe`.

The catch is that Cloud Functions requires the Blaze (pay-as-you-go) plan,
which means a card on file. Usage at this scale falls inside the free
allowance, so the realistic bill is zero, but the card is not optional. That
is the only reason Cloudflare is the recommendation above.

The handler logic is identical — same guards, same upstream call — wrapped in
`functions.https.onRequest` instead of `export default { fetch }`, with the key
set by `firebase functions:secrets:set GROQ_API_KEY`.

## What this does and does not protect

**Does:** keeps the key off every visitor's machine, stops the endpoint being
used as a general-purpose model, caps what any one visitor can spend of your
allowance, and keeps provider errors from leaking internals.

**Does not:** make the endpoint private. Anyone who reads your site's
JavaScript can see the URL, and `Origin` is a browser-set header that a script
can forge. What stops abuse being worth anyone's while is the rate limit and
the fixed system prompt — the endpoint only ever writes recipes, slowly.

If it is ever abused anyway: rotate the Groq key
(`wrangler secret put GROQ_API_KEY` again), or tighten
`CONFIG.rateLimit` and redeploy.

## Checking it works

The Live Data page shows **"A model is already connected for everyone"** when
`endpoints.ai` is set, and Currently using reads *shared model (no key
needed)*. The real test is generating a dish the offline engine does not know —
try **Kothimbir Vadi** or **Puran Poli**. If the loud "this is not a real
recipe" banner does not appear, the shared model answered.
