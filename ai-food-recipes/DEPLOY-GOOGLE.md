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

### 5. Put the real domain in robots.txt and sitemap.xml

Both ship with a `YOUR-SITE.web.app` placeholder. One command fixes both:

```bash
sed -i 's|YOUR-SITE.web.app|YOUR-PROJECT.web.app|g' robots.txt sitemap.xml
firebase deploy --only hosting
```

On macOS use `sed -i ''` instead of `sed -i`.

Then submit the sitemap at <https://search.google.com/search-console> →
Sitemaps → `sitemap.xml`. That is what gets the site into Google results.

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

## Using your own domain

Firebase console → Hosting → **Add custom domain**. It asks you to prove you own
the domain with a TXT record, then gives you two A records to add at your
registrar. The certificate is issued automatically and takes anywhere from a few
minutes to a day.

If you buy the domain through Google Domains / Squarespace Domains, the DNS
records go in that registrar's DNS panel — Firebase shows the exact values.

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
