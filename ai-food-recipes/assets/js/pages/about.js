/* ==========================================================================
 * about.js — renders the About page from data/about.js.
 *
 * Every block is optional. If a field in the data file is blank the block is
 * skipped entirely rather than rendered empty, so a half-filled file still
 * produces a page that looks finished. That is deliberate: the personal
 * details are the owner's to write, and a missing biography should not leave
 * "TODO" sitting on a public site.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  const has = (v) => Boolean(v && String(v).trim());

  /* --------------------------------------------------------------- blocks */

  function personBlock(p, links, project) {
    /* No invented biography: fall back to describing the project, which is
       true regardless of who reads it. */
    const bio = has(p.bio) ? p.bio : project.summary;

    const facts = [
      p.role && { icon: 'fa-briefcase', text: p.role },
      p.location && { icon: 'fa-location-dot', text: p.location },
      has(p.email) && { icon: 'fa-envelope', text: p.email, href: `mailto:${p.email}` },
    ].filter(Boolean);

    return `
      <article class="afr-card afr-about__card" style="padding:26px;margin-bottom:26px">
        <div class="afr-about__head">
          <span class="afr-about__avatar" aria-hidden="true">${U.esc(initials(p.name))}</span>
          <div>
            <h2 style="margin:0">${U.esc(p.name || project.name)}</h2>
            ${has(p.tagline) ? `<p class="afr-about__tagline">${U.esc(p.tagline)}</p>` : ''}
            ${facts.length ? `<ul class="afr-about__facts">${facts.map((f) => `
              <li><i class="fa-solid ${U.esc(f.icon)}" aria-hidden="true"></i>
                ${f.href ? `<a href="${U.esc(f.href)}">${U.esc(f.text)}</a>` : U.esc(f.text)}</li>`).join('')}
            </ul>` : ''}
          </div>
        </div>

        <p style="margin:18px 0 0;color:var(--afr-text-muted)">${U.esc(bio)}</p>

        ${links.length ? `
          <div class="afr-about__links">
            ${links.filter((l) => has(l.url)).map((l) => `
              <a class="afr-btn afr-btn--ghost afr-btn--sm" href="${U.esc(l.url)}"
                 target="_blank" rel="noopener">
                <i class="fa-solid ${U.esc(l.icon || 'fa-link')}" aria-hidden="true"></i>
                ${U.esc(l.label)}
              </a>`).join('')}
          </div>` : ''}
      </article>`;
  }

  /** "Aditi Anand" -> "AA". Purely decorative, so it degrades to a glyph. */
  function initials(name) {
    const parts = U.clean(name).split(' ').filter(Boolean);
    if (!parts.length) return '\u{1F373}';
    return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }

  function projectBlock(project) {
    return `
      <h2 class="afr-about__h2">The project</h2>
      <article class="afr-card" style="padding:22px;margin-bottom:14px">
        <p style="margin:0;color:var(--afr-text-muted)">${U.esc(project.summary)}</p>
      </article>
      ${has(project.honesty) ? `
        <div class="afr-banner" style="margin-bottom:26px">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>${U.esc(project.honesty)}</span>
        </div>` : ''}`;
  }

  function doesBlock(does) {
    if (!does || !does.length) return '';
    return `
      <h2 class="afr-about__h2">What it does</h2>
      <div class="afr-grid afr-grid--wide" style="margin-bottom:26px">
        ${does.map((d) => `
          <article class="afr-card" style="padding:18px">
            <h4><i class="fa-solid ${U.esc(d.icon)}" aria-hidden="true"
                   style="color:var(--afr-brand-500);margin-right:8px"></i>${U.esc(d.title)}</h4>
            <p style="color:var(--afr-text-muted);font-size:.92rem;margin:0">${U.esc(d.text)}</p>
          </article>`).join('')}
      </div>`;
  }

  function builtBlock(builtWith) {
    if (!builtWith || !builtWith.length) return '';
    return `
      <h2 class="afr-about__h2">Built with</h2>
      <ul class="afr-about__built">
        ${builtWith.map((b) => `
          <li><i class="fa-solid fa-check" aria-hidden="true"></i> ${U.esc(b)}</li>`).join('')}
      </ul>`;
  }

  function ctaBlock() {
    return `
      <div class="afr-about__cta">
        <a class="afr-btn afr-btn--primary" href="create.html#wizard">
          <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Create a dish
        </a>
        <a class="afr-btn afr-btn--ghost" href="setup.html#connect">
          <i class="fa-solid fa-plug" aria-hidden="true"></i> Connect a model
        </a>
      </div>`;
  }

  /* ------------------------------------------------------------------ boot */

  document.addEventListener('DOMContentLoaded', () => {
    const body = UI.qs('[data-about="body"]');
    if (!body) return;

    const about = (AFR.data && AFR.data.about) || null;
    if (!about) {
      body.innerHTML = '<div class="afr-banner"><i class="fa-solid fa-triangle-exclamation"'
        + ' aria-hidden="true"></i><span>About content failed to load.</span></div>';
      return;
    }

    const p = about.person || {};
    const project = about.project || {};

    const title = UI.qs('[data-about="title"]');
    if (title) title.textContent = has(p.name) ? `About ${p.name}` : `About ${project.name || ''}`.trim();

    body.innerHTML = personBlock(p, about.links || [], project)
      + projectBlock(project)
      + doesBlock(project.does)
      + builtBlock(project.builtWith)
      + ctaBlock();

    /* The About page is text, so it benefits from the same translation pass
       every other page gets. The translator walks the DOM after render. */
    if (AFR.uiTranslator && AFR.uiTranslator.schedule) AFR.uiTranslator.schedule();
  });
})(window);
