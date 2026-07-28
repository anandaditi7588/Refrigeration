#!/usr/bin/env node
/* ==========================================================================
 * set-domain.js — point the whole site at one domain.
 *
 *   node tools/set-domain.js airecipes.com
 *   node tools/set-domain.js www.airecipes.com
 *   node tools/set-domain.js my-project.web.app
 *
 * A site needs to state its own address in several places, and they must all
 * agree or search engines and social previews misbehave:
 *
 *   canonical      which URL is the real one (duplicates get merged into it)
 *   og:url         what a shared link resolves to
 *   og:image       the preview picture — MUST be absolute, relative is ignored
 *                  by most scrapers
 *   sitemap.xml    the URLs submitted to Search Console
 *   robots.txt     where the sitemap lives
 *   JSON-LD url    the structured-data identity of the site
 *
 * Run this once before your first deploy to a new host, and again if the
 * domain ever changes. It is idempotent: it strips whatever was there and
 * writes the tags fresh, so running it twice does nothing the first run did
 * not already do.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* Pages that should advertise themselves. saved and setup are noindex — they
   still get a canonical (harmless, and correct if anyone links one) but no
   social card, because neither is meant to be shared. */
const PAGES = [
  { file: 'index.html', social: true },
  { file: 'create.html', social: true },
  { file: 'about.html', social: true },
  { file: 'saved.html', social: false },
  { file: 'setup.html', social: false },
];

/* ------------------------------------------------------------------ input */

const raw = process.argv[2];
if (!raw || raw === '--help' || raw === '-h') {
  console.error('usage: node tools/set-domain.js <domain>\n'
    + '   eg: node tools/set-domain.js airecipes.com\n'
    + '       node tools/set-domain.js my-project.web.app');
  process.exit(1);
}

/* Accept whatever shape someone pastes: with or without protocol, with or
   without a trailing slash, with or without a stray path. */
const cleaned = String(raw).trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '');

/* A base path is allowed because not every host serves a site at the root:
   GitHub Pages puts a project at /<repo>/. A .com normally has none. */
const slash = cleaned.indexOf('/');
const host = (slash === -1 ? cleaned : cleaned.slice(0, slash)).replace(/\.+$/, '').toLowerCase();
const basePath = slash === -1 ? '' : cleaned.slice(slash);

if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
  console.error(`"${raw}" does not look like a domain.`);
  process.exit(1);
}

const origin = `https://${host}${basePath}`;
const OG_IMAGE = `${origin}/assets/img/og-cover.png`;

/* --------------------------------------------------------------- helpers */

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);
const changes = [];

/** Delete every existing instance of a tag so the rewrite cannot duplicate. */
function strip(html, patterns) {
  return patterns.reduce((acc, re) => acc.replace(re, ''), html);
}

const TAG_PATTERNS = [
  /^[ \t]*<link rel="canonical"[^>]*>\r?\n?/gim,
  /^[ \t]*<meta property="og:url"[^>]*>\r?\n?/gim,
  /^[ \t]*<meta property="og:image(?::\w+)?"[^>]*>\r?\n?/gim,
  /^[ \t]*<meta name="twitter:image"[^>]*>\r?\n?/gim,
];

/* ------------------------------------------------------------------ pages */

PAGES.forEach(({ file, social }) => {
  let html = read(file);
  const before = html;

  html = strip(html, TAG_PATTERNS);

  const tags = [`  <link rel="canonical" href="${origin}/${file}">`];
  if (social) {
    tags.push(
      `  <meta property="og:url" content="${origin}/${file}">`,
      `  <meta property="og:image" content="${OG_IMAGE}">`,
      '  <meta property="og:image:width" content="1200">',
      '  <meta property="og:image:height" content="630">',
      '  <meta property="og:image:alt" content="AI Food Recipes — every cuisine on earth, cooked your way">',
      `  <meta name="twitter:image" content="${OG_IMAGE}">`,
    );
  }

  /* Insert after the description, which every page has, so the head stays
     in a sensible reading order rather than the tags landing anywhere. */
  const anchor = /^[ \t]*<meta name="description"[^>]*>[ \t]*$/m;
  if (!anchor.test(html)) throw new Error(`${file}: no <meta name="description"> to anchor to`);
  html = html.replace(anchor, (m) => `${m}\n${tags.join('\n')}`);

  if (html !== before) { write(file, html); changes.push(`${file}  canonical${social ? ' + social card' : ''}`); }
});

/* --------------------------------------------------------------- JSON-LD */
{
  let html = read('index.html');
  const before = html;
  html = html.replace(/("@type":\s*"WebApplication",)(\s*\n\s*"url":\s*"[^"]*",)?/,
    `$1\n    "url": "${origin}/",`);
  if (html !== before) { write('index.html', html); changes.push('index.html  structured data url'); }
}

/* ------------------------------------------------------- robots + sitemap */
{
  let txt = read('robots.txt');
  txt = txt.replace(/^Sitemap:.*$/m, `Sitemap: ${origin}/sitemap.xml`)
    .replace(/^# Replace the Sitemap host.*\n# The DEPLOY-GOOGLE\.md.*\n/m, '');
  write('robots.txt', txt);
  changes.push('robots.txt  sitemap url');
}
{
  let xml = read('sitemap.xml');
  /* Keep only the filename and rebuild the rest. Matching just the host would
     strip the host but leave any stale base path behind ("/Refrigeration/"). */
  xml = xml.replace(/<loc>[^<]*?([^/<]+)<\/loc>/g, `<loc>${origin}/$1</loc>`)
    .replace(/^\s*Replace YOUR-SITE\.web\.app.*\n/m, '');
  write('sitemap.xml', xml);
  changes.push('sitemap.xml  page urls');
}

/* ----------------------------------------------------------------- report */

console.log(`Site domain set to ${origin}\n`);
changes.forEach((c) => console.log(`  ${c}`));
console.log('\nNext:  firebase deploy --only hosting');
console.log(`Then:  submit ${origin}/sitemap.xml at search.google.com/search-console`);
