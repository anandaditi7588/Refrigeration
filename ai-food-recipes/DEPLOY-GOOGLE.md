# Deploying AI Food Recipes on Google

This folder **is** the website. There is no build step, no bundler and no server —
every file here is served exactly as it sits on disk. So "deploying" means copying
this folder to a host and pointing a domain at it.

**Firebase Hosting is the one to use.** It is Google's static host, the free tier
covers a site like this comfortably, HTTPS and a global CDN are automatic, and a
deploy is one command. The alternatives further down are documented for
completeness, but each is more work for a worse result on a static site.

---

## What was added for deployment

| File | Why it is needed |
|---|---|
| `firebase.json` | Hosting config: what to upload, cache headers, security headers |
| `404.html` | A styled not-found page. Self-contained, so it renders at any URL depth |
| `robots.txt` | Lets crawlers in; keeps `saved.html` and `setup.html` out of the index |
| `sitemap.xml` | The three public pages, for Search Console |
| `manifest.webmanifest` | Makes the site installable as an app on phones and desktops |
| `assets/img/icon.svg` | The icon that manifest points at |
| `assets/img/og-cover.png` | The 1200×630 card shown when the link is shared |
| `tools/set-domain.js` | Points canonical, og, sitemap and robots at one domain |

`saved.html` and `setup.html` carry `<meta name="robots" content="noindex">`.
That is deliberate — one shows your own saved recipes, the other is the API-key
screen. Neither belongs in search results.

---

## Firebase Hosting

### 1. Install the CLI and sign in

```bash
npm install -g firebase-tools
firebase login
```

`firebase login` opens a browser. Use the Google account you want the project
billed to (this site will not cost anything, but the account owns the project).

### 2. Create the project

Go to <https://console.firebase.google.com> → **Add project**. Give it a name —
the project ID becomes your URL, so `ai-food-recipes` gives you
`https://ai-food-recipes.web.app`. Google Analytics is optional; skip it if you
do not want it.

You do **not** need to add an app inside the project. Hosting works without one.

### 3. Link this folder to the project

```bash
cd ai-food-recipes
firebase use --add
```

Pick your project, and give it the alias `default` when asked. This writes a
small `.firebaserc` file next to `firebase.json`.

> **Do not run `firebase init hosting`.** It would overwrite the `firebase.json`
> already in this folder and reset the cache and security headers. `firebase use
> --add` is the only setup step needed.

### 4. Deploy

```bash
firebase deploy --only hosting
```

Roughly thirty seconds later the CLI prints your live URL:

```
Hosting URL: https://YOUR-PROJECT.web.app
```

The site is also reachable at `https://YOUR-PROJECT.firebaseapp.com`.

### 5. Point the site at its new address

The site states its own URL in six places, and they all have to agree. One
command sets them:

```bash
node tools/set-domain.js YOUR-PROJECT.web.app
firebase deploy --only hosting
```

Ideally run this *before* step 4, so the first deploy is already correct.

Then submit the sitemap at <https://search.google.com/search-console> →
Sitemaps → `sitemap.xml`. That is what gets the site into Google results.

If you are going straight to a `.com`, skip the `web.app` address and use the
domain instead — see the next section.

### Trying a change before it goes live

```bash
firebase hosting:channel:deploy preview
```

This publishes to a temporary URL that expires in seven days and leaves the live
site untouched. Useful before showing anyone.

### Rolling back

Firebase console → Hosting → **Release history** → the three dots next to any
previous release → **Rollback**. Instant, and no redeploy needed.

---

## Using your own `.com` domain

### 1. Buy the domain

This is the one step nobody can do for you — it needs your card and your name
on the registration. A `.com` costs roughly **US $10–15 (₹900–1,400) a year**.

Any registrar works; Firebase only ever needs DNS records, so who sells you the
name does not affect the site. Note that Google no longer runs a consumer
registrar — Google Domains was sold to Squarespace — so "buy it from Google" is
not an option in the way it once was. Cloudflare, Namecheap, Porkbun, GoDaddy
and BigRock are all fine. Prefer one that includes free WHOIS privacy, or your
home address ends up in a public database.

Two things worth paying attention to when you pick a name:

- **Check the renewal price, not the first-year price.** A ₹99 first year that
  renews at ₹1,800 is common.
- **Say it out loud.** Hyphens and creative spellings cost you every time you
  tell someone the address.

### 2. Point the site at it — one command

```bash
cd ai-food-recipes
node tools/set-domain.js yourdomain.com
```

Do this **before** the deploy. A website has to state its own address in six
places — canonical link, `og:url`, `og:image`, `sitemap.xml`, `robots.txt` and
the structured data — and they all have to agree, or Google merges your pages
under the wrong URL and shared links preview as a blank box. The script writes
all six and prints what it changed. Re-run it any time the domain changes; it
replaces rather than appends.

The site currently points at the GitHub Pages URL, because that is where it is
actually live today. Running the command above moves it.

### 3. Attach the domain in Firebase

Firebase console → Hosting → **Add custom domain** → type `yourdomain.com`.

Firebase then asks for two things, in order:

1. **A TXT record** to prove you own the domain. Copy the value it shows into
   your registrar's DNS panel.
2. **Two A records** once ownership is confirmed. Use the exact values the
   console gives you — do not copy IPs from a blog post, they change.

Add **both** `yourdomain.com` and `www.yourdomain.com` in Firebase, and set one
to redirect to the other so there is a single real address. Which one is the
"real" one is your call; whichever you choose must be the one you passed to
`set-domain.js`.

DNS changes take anywhere from a few minutes to a few hours to spread. Firebase
then issues the HTTPS certificate automatically, which can take up to 24 hours.
Until it is issued the domain may show a certificate warning — that is expected
and resolves itself.

### 4. Redeploy and tell Google

```bash
firebase deploy --only hosting
```

Then at <https://search.google.com/search-console>, add the domain as a property
and submit `https://yourdomain.com/sitemap.xml`. Indexing takes days to weeks —
there is no way to speed it up beyond having the sitemap in place.

### About the old URLs

The GitHub Pages copy keeps working after the move. The canonical tags tell
Google the `.com` is the real one, so it will not be treated as duplicate
content. If you would rather have only one live copy, turn off Pages in the
repository settings.

---

## Alternatives

### Cloud Storage bucket

Workable, but weaker than Firebase for this: the plain bucket website endpoint
is **HTTP only**, and getting HTTPS or a custom domain requires putting a Cloud
Load Balancer in front, which is not free and is a lot of configuration for a
static site.

```bash
gcloud storage buckets create gs://YOUR-BUCKET --location=asia-south1
gcloud storage cp -r . gs://YOUR-BUCKET
gcloud storage buckets update gs://YOUR-BUCKET \
  --web-main-page-suffix=index.html --web-error-page=404.html
gcloud storage buckets add-iam-policy-binding gs://YOUR-BUCKET \
  --member=allUsers --role=roles/storage.objectViewer
```

### Cloud Run

Cloud Run runs containers, so it needs a web server and a Dockerfile wrapped
around files that need neither. It only starts to make sense if you later add a
backend — which the next section explains you may eventually want.

### App Engine

Same conclusion. `app.yaml` static handlers would serve this, but you would be
running an application platform to hand out files that never change.

---

## Deploying automatically on every push

Optional. Firebase can generate a GitHub Actions workflow and the service-account
secret it needs:

```bash
firebase init hosting:github
```

Answer **no** when it offers to overwrite `firebase.json`. It creates the
workflow and adds a `FIREBASE_SERVICE_ACCOUNT_*` secret to the repository, after
which every push to your chosen branch deploys itself.

---

## Things worth knowing once it is public

**API keys.** Anything a visitor connects on the Live Data page is stored in
*their* browser and never touches your hosting. But a key written into
`assets/js/core/config.js` ships to every visitor in plain text — treat that file
as public. If you want visitors to use *your* key without seeing it, that needs a
small server that holds the key and forwards the request; point
`endpoints.ai` at it and set `providers.ai` to `proxy`. A Cloud Run service or a
Cloud Function is a reasonable place for that, and is the one situation where the
alternatives above earn their keep.

**No Content-Security-Policy header is set,** and that is on purpose. The whole
point of the Live Data page is letting a visitor connect any model host they
like — Groq, Gemini, OpenRouter, something running on their own machine. A CSP
strict enough to be worth having would have to name every allowed host in
advance, which would break exactly that feature. The other security headers
(`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are set
in `firebase.json`.

**Caching is set to `no-cache`,** which sounds wrong but is not. The filenames
are not content-hashed — `theme.css` is always `theme.css` — so any long cache
lifetime would serve visitors stale JavaScript for hours after a deploy, and a
bug you had just fixed would look unfixed. `no-cache` means the browser
revalidates with an ETag and gets a tiny `304 Not Modified` when nothing changed,
not that it re-downloads everything. If you ever add versioned filenames, change
`/assets/**` in `firebase.json` to `public, max-age=31536000, immutable`.

**The CDN dependencies.** Bootstrap, Font Awesome and Google Fonts load from
jsdelivr, cdnjs and fonts.googleapis.com. The app degrades gracefully if they are
blocked — layout and behaviour are all in local CSS and JS — but to be fully
self-hosted you would need to download those three and change the `<link>` tags.
