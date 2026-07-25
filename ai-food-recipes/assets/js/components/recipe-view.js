/* ==========================================================================
 * recipe-view.js — renders a recipe object into the 20 output sections.
 *
 * Hard rule from the brief: nothing is ever a wall of prose. Every section is
 * a card, a table, a timeline, a numbered step or a checklist.
 *
 * Section bodies render lazily (see UI.accordion) so a 20-section recipe
 * paints instantly and only builds what the reader actually opens. Printing
 * forces every body to render first.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  const e = U.esc;

  /* --------------------------------------------------------------- bits */

  const chip = (text, cls = '') => `<span class="afr-chip ${cls}">${e(text)}</span>`;

  const note = (kind, icon, text) =>
    `<div class="afr-note afr-note--${kind}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${e(text)}</span></div>`;

  const stat = (value, label) =>
    `<div class="afr-stat"><strong>${e(value)}</strong><span>${e(label)}</span></div>`;

  const img = (src, alt, cls = '') =>
    `<img src="${e(src)}" alt="${e(alt)}" loading="lazy" decoding="async"${cls ? ` class="${e(cls)}"` : ''}>`;

  const list = (items, icon = 'fa-check', color = 'var(--afr-accent-500)') =>
    `<ul class="afr-list">${items.map((x) =>
      `<li><i class="fa-solid ${icon}" aria-hidden="true" style="color:${color}"></i><span>${e(x)}</span></li>`).join('')}</ul>`;

  /* =====================================================================
     Section renderers — each returns an HTML string.
     ===================================================================== */

  /* 1 — Recipe overview -------------------------------------------------- */
  function overview(recipe) {
    const warnings = recipe.meta.warnings.length
      ? `<div style="margin-top:16px">${recipe.meta.warnings.map((w) =>
        note('warn', 'fa-circle-info', w)).join('')}</div>`
      : '';

    return `
      <div class="afr-hero-recipe" style="padding:0">
        <div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
            ${chip(`${recipe.cuisine.flag} ${recipe.cuisine.name}`, 'afr-chip--brand')}
            ${chip(recipe.difficulty)}
            ${chip(recipe.technique.name)}
            ${chip(`Serves ${recipe.servings}`)}
          </div>
          <h2 style="margin-bottom:10px">${e(recipe.name)}</h2>
          <p style="color:var(--afr-text-muted)">${e(recipe.description)}</p>
          <div class="afr-stats" style="margin-top:18px">
            ${stat(U.humanTime(recipe.prepTime), 'Prep time')}
            ${stat(U.humanTime(recipe.cookTime), 'Cook time')}
            ${stat(U.humanTime(recipe.totalTime), 'Total time')}
            ${stat(String(recipe.servings), 'Servings')}
            ${stat(`${recipe.nutrition.calories || 0}`, 'kcal / serving')}
            ${stat(`${recipe.health.score}/100`, 'Health score')}
          </div>
          ${warnings}
        </div>
        <div>${img(recipe.image, `${recipe.name} — finished dish`)}</div>
      </div>`;
  }

  /* 2 — Recipe images ---------------------------------------------------- */
  function gallery(recipe) {
    if (!recipe.gallery.length) return `<p class="afr-empty">No images available.</p>`;
    return `<div class="afr-grid afr-grid--wide">
      ${recipe.gallery.map((g) => `
        <figure style="margin:0;border-radius:var(--afr-radius);overflow:hidden;border:1px solid var(--afr-border);background:var(--afr-surface)">
          ${img(g.src, g.caption)}
          <figcaption style="padding:10px 14px;font-size:.86rem;color:var(--afr-text-muted)">
            <strong style="display:block;color:var(--afr-text);text-transform:capitalize">${e(g.kind)}</strong>
            ${e(g.caption)}
          </figcaption>
        </figure>`).join('')}
    </div>`;
  }

  /* 3 — Ingredient list -------------------------------------------------- */
  function ingredients(recipe) {
    const rows = recipe.ingredients.map((i) => `
      <tr>
        <td data-label="Image">${img(i.image, i.name)}</td>
        <td data-label="Ingredient">
          <strong>${e(i.name)}</strong>
          ${i.have ? ` ${chip('You have this', 'afr-chip--veg')}` : ''}
        </td>
        <td data-label="Quantity" class="afr-qty">${e(i.qty)}</td>
        <td data-label="Unit">${e(i.unit)}</td>
        <td data-label="Purpose">${e(i.purpose)}</td>
        <td data-label="Substitute">${e(i.substitute)}</td>
        <td data-label="Healthy alternative">${e(i.healthy)}</td>
      </tr>`).join('');

    return `
      <div class="afr-banner">
        <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i>
        <span>${e(recipe.ingredientNote)}</span>
      </div>
      <div class="afr-table-wrap">
        <table class="afr-table">
          <caption class="afr-sr">Ingredients for ${e(recipe.name)}, ${recipe.servings} servings</caption>
          <thead>
            <tr>
              <th scope="col">Image</th><th scope="col">Ingredient</th><th scope="col">Quantity</th>
              <th scope="col">Unit</th><th scope="col">Purpose</th>
              <th scope="col">Substitute</th><th scope="col">Healthy alternative</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  /* 4 — Equipment -------------------------------------------------------- */
  function equipment(recipe) {
    return `<div class="afr-grid">
      ${recipe.equipment.map((eq) => `
        <div class="afr-card" style="flex-direction:row;align-items:center;gap:14px;padding:14px">
          <div style="flex:0 0 62px">${img(eq.image, eq.name, '')}</div>
          <div>
            <strong style="display:block">${e(eq.name)}</strong>
            <small style="color:var(--afr-text-muted)">${e(eq.usage)}</small>
          </div>
        </div>`).join('')}
    </div>`;
  }

  /* 5 — Preparation ------------------------------------------------------ */
  function preparation(recipe) {
    if (!recipe.preparation.length) return '<p class="afr-empty">No preparation needed.</p>';
    return `<ol class="afr-timeline">
      ${recipe.preparation.map((s) => `
        <li class="afr-step">
          <span class="afr-step__num" aria-hidden="true">${s.n}</span>
          <h4 class="afr-step__title">${e(s.title)}</h4>
          <div class="afr-step__facts">
            ${chip(`${U.humanTime(s.minutes)}`, 'afr-chip--brand')}
          </div>
          <div class="afr-step__media">${img(s.image, `Step ${s.n}: ${s.title}`)}</div>
          <p style="color:var(--afr-text-muted)">${e(s.desc)}</p>
          ${(s.tips || []).map((t) => note('tip', 'fa-lightbulb', t)).join('')}
          ${(s.mistakes || []).map((m) => note('warn', 'fa-triangle-exclamation', m)).join('')}
        </li>`).join('')}
    </ol>`;
  }

  /* 6 — Cooking steps ---------------------------------------------------- */
  function steps(recipe) {
    return `<ol class="afr-timeline">
      ${recipe.steps.map((s) => `
        <li class="afr-step">
          <span class="afr-step__num" aria-hidden="true">${s.n}</span>
          <h4 class="afr-step__title">${e(s.title)}</h4>
          <div class="afr-step__media">${img(s.image, `Cooking step ${s.n}: ${s.title}`)}</div>
          <div class="afr-step__facts">
            ${chip(`⏱ ${U.humanTime(s.minutes)}`, 'afr-chip--brand')}
            ${s.temp && s.temp !== '—' ? chip(`🌡 ${s.temp}`) : ''}
            ${s.flame ? chip(`🔥 ${s.flame}`) : ''}
          </div>
          <p style="color:var(--afr-text-muted)">${e(s.desc)}</p>
          ${(s.tips || []).map((t) => note('tip', 'fa-lightbulb', t)).join('')}
          ${(s.mistakes || []).map((m) => note('danger', 'fa-circle-xmark', m)).join('')}
        </li>`).join('')}
    </ol>`;
  }

  /* 7 — Serving suggestions ---------------------------------------------- */
  function serving(recipe) {
    return `
      <div class="afr-hero-recipe" style="padding:0">
        <div>
          <h4><i class="fa-solid fa-plate-wheat" aria-hidden="true"></i> Serve it with</h4>
          ${list(recipe.serving.sides, 'fa-utensils', 'var(--afr-brand-500)')}
          <h4 style="margin-top:18px"><i class="fa-solid fa-wine-glass" aria-hidden="true"></i> Drinks that work</h4>
          ${list(recipe.serving.drinks, 'fa-mug-hot', 'var(--afr-info)')}
        </div>
        <div>
          ${img(recipe.serving.image, `${recipe.name} plated and served`)}
          <div style="margin-top:14px">
            ${note('tip', 'fa-leaf', `Garnish: ${recipe.serving.garnish}`)}
            ${note('tip', 'fa-palette', `Presentation: ${recipe.serving.plating}`)}
          </div>
        </div>
      </div>`;
  }

  /* 8 — Nutrition -------------------------------------------------------- */
  function nutrition(recipe) {
    const n = recipe.nutrition;
    const cards = AFR.nutrition.NUTRIENTS.map((def) => {
      const value = Number(n[def.key]) || 0;
      const pct = AFR.nutrition.rdaPercent(def.key, value);
      return `
        <div class="afr-nutri__item">
          <span><i class="fa-solid ${def.icon}" aria-hidden="true"></i> ${e(def.label)}</span>
          <strong>${e(String(value))}<small style="font-size:.7em;font-weight:400"> ${e(def.unit)}</small></strong>
          <div class="afr-meter" role="img" aria-label="${pct}% of the daily reference intake">
            <i style="width:${pct}%;background:${pct > 75 ? 'var(--afr-danger)' : pct > 40 ? 'var(--afr-warn)' : 'var(--afr-accent-500)'}"></i>
          </div>
          <small style="color:var(--afr-text-faint)">${pct}% of daily reference</small>
        </div>`;
    }).join('');

    return `
      <div class="afr-banner">
        <i class="fa-solid fa-calculator" aria-hidden="true"></i>
        <span>${e(recipe.nutritionNote)}</span>
      </div>
      <div class="afr-nutri">${cards}</div>
      <p style="font-size:.82rem;color:var(--afr-text-faint);margin-top:14px">
        Percentages use a 2,000 kcal reference adult and are indicative only. If you are managing a
        medical condition, treat these as a rough guide and confirm with a dietitian.
      </p>`;
  }

  /* 9 — Health analysis -------------------------------------------------- */
  function health(recipe) {
    const h = recipe.health;
    const s = h.suitability || {};

    const dot = (level) => ({ good: 'var(--afr-ok)', ok: 'var(--afr-warn)', poor: 'var(--afr-danger)' }[level] || 'var(--afr-border)');
    const suitRow = (label, key) => {
      const v = s[key];
      if (!v) return '';
      return `<div class="afr-suit__item">
        <span class="afr-suit__dot" style="background:${dot(v.level)}"></span>
        <div><strong>${e(label)}</strong><small>${e(v.note)}</small></div>
      </div>`;
    };

    return `
      <div class="afr-score">
        <div class="afr-score__dial" style="--val:${h.score}" role="img"
             aria-label="Health score ${h.score} out of 100 — ${e(h.band)}">
          <span class="afr-score__val">${h.score}<small>/100</small></span>
        </div>
        <div>
          <h4 style="margin-bottom:4px">${e(h.band)}</h4>
          <p style="color:var(--afr-text-muted);max-width:46ch;margin:0">
            Calculated from this recipe's own per-serving nutrition, then adjusted for the oil, salt
            and cooking style you selected.
          </p>
        </div>
      </div>

      <div class="afr-proscons" style="margin-top:24px">
        <div>
          <h4><i class="fa-solid fa-thumbs-up" aria-hidden="true" style="color:var(--afr-ok)"></i> Pros</h4>
          ${h.pros.length ? list(h.pros, 'fa-circle-check', 'var(--afr-ok)') : '<p style="color:var(--afr-text-muted)">Nothing notable.</p>'}
        </div>
        <div>
          <h4><i class="fa-solid fa-thumbs-down" aria-hidden="true" style="color:var(--afr-danger)"></i> Cons</h4>
          ${h.cons.length ? list(h.cons, 'fa-circle-exclamation', 'var(--afr-danger)') : '<p style="color:var(--afr-text-muted)">No significant concerns.</p>'}
        </div>
      </div>

      <h4 style="margin-top:26px">Suitability</h4>
      <div class="afr-suit">
        ${suitRow('Diabetic friendly', 'diabetic')}
        ${suitRow('Heart friendly', 'heart')}
        ${suitRow('Kid friendly', 'kids')}
        ${suitRow('Pregnancy friendly', 'pregnancy')}
        ${suitRow('Weight loss friendly', 'weightLoss')}
        ${suitRow('High protein', 'highProtein')}
        ${suitRow('Gluten free', 'glutenFree')}
      </div>
      <p style="font-size:.82rem;color:var(--afr-text-faint);margin-top:16px">
        This is general nutritional guidance generated from the ingredient list — not medical advice.
      </p>`;
  }

  /* 10 — Customisation summary ------------------------------------------- */
  function customization(recipe) {
    return `<div class="afr-grid afr-grid--wide">
      ${recipe.customization.map((row) => `
        <div class="afr-stat" style="text-align:left;display:flex;gap:12px;align-items:flex-start">
          <i class="fa-solid ${e(row.icon)}" aria-hidden="true" style="color:var(--afr-brand-500);margin-top:4px"></i>
          <div>
            <span style="display:block;font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:var(--afr-text-muted)">${e(row.label)}</span>
            <strong style="font-family:var(--afr-font-body);font-size:.96rem">${e(row.value)}</strong>
          </div>
        </div>`).join('')}
    </div>`;
  }

  /* 11 — Variations ------------------------------------------------------ */
  function variations(recipe) {
    return `<div class="afr-grid afr-grid--wide">
      ${recipe.variations.map((v) => `
        <div class="afr-card" style="padding:18px">
          <h4 style="display:flex;align-items:center;gap:10px">
            <i class="fa-solid ${e(v.icon)}" aria-hidden="true" style="color:var(--afr-brand-500)"></i>
            ${e(v.name)}
          </h4>
          <p style="color:var(--afr-text-muted);font-size:.9rem">${e(v.desc)}</p>
          ${list(v.changes, 'fa-arrow-right', 'var(--afr-brand-500)')}
        </div>`).join('')}
    </div>`;
  }

  /* 12 — Storage --------------------------------------------------------- */
  function storage(recipe) {
    return `
      <div class="afr-grid">
        <div class="afr-stat" style="text-align:left">
          <span><i class="fa-solid fa-temperature-low" aria-hidden="true"></i> Fridge</span>
          <strong style="font-size:1rem;font-family:var(--afr-font-body)">${e(recipe.storage.fridge)}</strong>
        </div>
        <div class="afr-stat" style="text-align:left">
          <span><i class="fa-solid fa-snowflake" aria-hidden="true"></i> Freezer</span>
          <strong style="font-size:1rem;font-family:var(--afr-font-body)">${e(recipe.storage.freezer)}</strong>
        </div>
        <div class="afr-stat" style="text-align:left">
          <span><i class="fa-solid fa-fire-burner" aria-hidden="true"></i> Reheating</span>
          <strong style="font-size:1rem;font-family:var(--afr-font-body)">${e(recipe.storage.reheat)}</strong>
        </div>
      </div>
      <div style="margin-top:18px">${recipe.storage.notes.map((n) => note('tip', 'fa-box-archive', n)).join('')}</div>`;
  }

  /* 13 — Meal planning --------------------------------------------------- */
  function mealPlan(recipe) {
    const colour = { good: 'var(--afr-ok)', ok: 'var(--afr-warn)', poor: 'var(--afr-danger)' };
    const icon = { good: 'fa-circle-check', ok: 'fa-circle-minus', poor: 'fa-circle-xmark' };
    return `
      <p style="margin-bottom:16px">Best eaten at: <strong>${e(recipe.mealPlan.best)}</strong></p>
      <div class="afr-grid">
        ${recipe.mealPlan.slots.map((slot) => `
          <div class="afr-suit__item">
            <i class="fa-solid ${icon[slot.fit] || 'fa-circle'}" aria-hidden="true"
               style="color:${colour[slot.fit] || 'var(--afr-border)'};font-size:1.2rem"></i>
            <div><strong>${e(slot.slot)}</strong><small>${e(slot.note)}</small></div>
          </div>`).join('')}
      </div>`;
  }

  /* 14 — Cost ------------------------------------------------------------ */
  function cost(recipe) {
    return `
      <div class="afr-stats">
        ${stat(recipe.cost.perServingLabel || '—', 'Cost per serving')}
        ${stat(recipe.cost.totalLabel || '—', `Total for ${recipe.servings}`)}
        ${stat(String(recipe.ingredients.length), 'Ingredients')}
        ${stat(String(recipe.ingredients.filter((i) => i.have).length), 'Already in your kitchen')}
      </div>
      ${note('tip', 'fa-circle-info', recipe.cost.note || 'Estimated from typical retail prices.')}`;
  }

  /* 15 — Shopping list --------------------------------------------------- */
  function shopping(recipe) {
    const saved = AFR.store.getChecked(recipe.id);
    const groupIcon = {
      Vegetables: 'fa-carrot', Spices: 'fa-mortar-pestle', Dairy: 'fa-cheese',
      Meat: 'fa-drumstick-bite', Grains: 'fa-wheat-awn', Others: 'fa-basket-shopping',
    };

    const html = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <button class="afr-btn afr-btn--ghost afr-btn--sm" type="button" data-shop="copy">
          <i class="fa-solid fa-copy" aria-hidden="true"></i> Copy list
        </button>
        <button class="afr-btn afr-btn--ghost afr-btn--sm" type="button" data-shop="clear">
          <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Reset ticks
        </button>
        <span style="margin-left:auto;color:var(--afr-text-muted);font-size:.88rem" data-shop="count"></span>
      </div>
      ${recipe.shopping.map((group) => `
        <div class="afr-shop__group">
          <h4><i class="fa-solid ${groupIcon[group.group] || 'fa-basket-shopping'}" aria-hidden="true"></i> ${e(group.group)}</h4>
          ${group.items.map((item) => {
            const key = `${group.group}:${item.name}`;
            const checked = saved.includes(key) || item.have;
            return `<label class="afr-check">
              <input type="checkbox" data-key="${e(key)}" ${checked ? 'checked' : ''}>
              <span class="afr-check__name">${e(item.name)}</span>
              ${item.have ? chip('Have it', 'afr-chip--veg') : ''}
              <span class="afr-check__qty">${e(item.qty)}</span>
            </label>`;
          }).join('')}
        </div>`).join('')}`;

    /* Return a live node rather than a string so we can wire the checkboxes. */
    const wrap = UI.el('div');
    wrap.innerHTML = html;

    const boxes = () => UI.qsa('input[type="checkbox"]', wrap);
    const countEl = UI.qs('[data-shop="count"]', wrap);

    const sync = () => {
      const checked = boxes().filter((b) => b.checked);
      AFR.store.setChecked(recipe.id, checked.map((b) => b.dataset.key));
      countEl.textContent = `${checked.length} of ${boxes().length} ticked`;
    };

    wrap.addEventListener('change', (event) => {
      if (event.target.matches('input[type="checkbox"]')) sync();
    });

    UI.qs('[data-shop="copy"]', wrap).addEventListener('click', async () => {
      const text = [`Shopping list — ${recipe.name} (serves ${recipe.servings})`, '']
        .concat(recipe.shopping.flatMap((g) => [`${g.group}:`]
          .concat(g.items.map((i) => `  - ${i.name} — ${i.qty}${i.have ? ' (have it)' : ''}`))
          .concat([''])))
        .join('\n');
      const ok = await UI.copy(text);
      UI.toast(ok ? 'Shopping list copied to your clipboard.' : 'Could not copy — select and copy manually.', ok ? 'ok' : 'err');
    });

    UI.qs('[data-shop="clear"]', wrap).addEventListener('click', () => {
      boxes().forEach((b) => { b.checked = false; });
      sync();
    });

    sync();
    return wrap;
  }

  /* 16 — YouTube videos -------------------------------------------------- */
  function videos(recipe) {
    if (!recipe.videos.length) {
      return `<p class="afr-empty"><i class="fa-brands fa-youtube" aria-hidden="true"></i>
        No videos found for this dish.</p>`;
    }

    const isSuggestion = recipe.videos.every((v) => v.estimated);
    const banner = isSuggestion
      ? `<div class="afr-banner">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>No YouTube API key is configured, so these are <strong>ready-made searches</strong> rather than
          specific videos. Each one opens a real YouTube search for this dish. Add a key in
          <code>assets/js/core/config.js</code> to pull live titles, channels, durations and view counts.</span>
        </div>`
      : `<div class="afr-banner">
          <i class="fa-brands fa-youtube" aria-hidden="true"></i>
          <span>Retrieved live from the YouTube Data API and ranked by view count.</span>
        </div>`;

    return `${banner}
      <div class="afr-grid afr-grid--wide">
        ${recipe.videos.map((v) => `
          <article class="afr-video">
            <div class="afr-video__thumb">
              ${img(v.thumb, v.title)}
              <span class="afr-video__play" aria-hidden="true"><i class="fa-solid fa-circle-play"></i></span>
              ${v.duration ? `<span class="afr-video__dur">${e(v.duration)}</span>` : ''}
            </div>
            <div class="afr-video__body">
              <h4>${e(v.title)}</h4>
              <div class="afr-video__meta">
                ${v.channel ? `<span><i class="fa-solid fa-user" aria-hidden="true"></i> ${e(v.channel)}</span>` : ''}
                ${v.views ? `<span><i class="fa-solid fa-eye" aria-hidden="true"></i> ${e(v.views)} views</span>` : ''}
                ${v.published ? `<span><i class="fa-solid fa-calendar" aria-hidden="true"></i> ${e(v.published)}</span>` : ''}
              </div>
              ${v.note ? `<small style="color:var(--afr-text-muted)">${e(v.note)}</small>` : ''}
              <a class="afr-btn afr-btn--ghost afr-btn--sm" href="${e(v.url)}" target="_blank" rel="noopener noreferrer"
                 style="margin-top:auto">
                <i class="fa-brands fa-youtube" aria-hidden="true" style="color:#f00"></i>
                ${v.estimated ? 'Search on YouTube' : 'Watch on YouTube'}
                <span class="afr-sr"> (opens in a new tab)</span>
              </a>
            </div>
          </article>`).join('')}
      </div>`;
  }

  /* 17 — Source references ----------------------------------------------- */
  function sources(recipe) {
    const typeIcon = {
      youtube: 'fa-brands fa-youtube', api: 'fa-solid fa-plug', web: 'fa-solid fa-globe',
      search: 'fa-solid fa-magnifying-glass', reference: 'fa-solid fa-book',
      engine: 'fa-solid fa-microchip',
    };
    return `
      <div class="afr-banner">
        <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
        <span>This recipe was <strong>written for your brief</strong>, not copied from any of the pages below.
        External sources are listed as references and further reading.</span>
      </div>
      <div class="afr-grid afr-grid--wide afr-print-url">
        ${recipe.sources.map((s) => `
          <div class="afr-card" style="padding:16px">
            <div style="display:flex;gap:10px;align-items:flex-start">
              <i class="${typeIcon[s.type] || 'fa-solid fa-link'}" aria-hidden="true"
                 style="color:var(--afr-brand-500);margin-top:4px"></i>
              <div style="min-width:0">
                <strong style="display:block;word-break:break-word">${
                  s.url ? `<a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a>` : e(s.title)}</strong>
                <small style="color:var(--afr-text-muted)">${e(s.note)}</small>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  /* 18 — AI cooking tips ------------------------------------------------- */
  function tips(recipe) {
    const block = (title, icon, items, colour) => items.length ? `
      <div class="afr-card" style="padding:18px">
        <h4 style="display:flex;align-items:center;gap:10px">
          <i class="fa-solid ${icon}" aria-hidden="true" style="color:${colour}"></i> ${e(title)}
        </h4>
        ${list(items, 'fa-angle-right', colour)}
      </div>` : '';

    return `<div class="afr-grid afr-grid--wide">
      ${block('Chef tips', 'fa-user-chef', recipe.tips.chef, 'var(--afr-brand-500)')}
      ${block('Professional tricks', 'fa-star', recipe.tips.pro, 'var(--afr-info)')}
      ${block('Mistakes to avoid', 'fa-circle-xmark', recipe.tips.mistakes, 'var(--afr-danger)')}
      ${block('Flavour enhancers', 'fa-wand-magic-sparkles', recipe.tips.flavor, 'var(--afr-accent-500)')}
      ${block('Texture improvements', 'fa-layer-group', recipe.tips.texture, 'var(--afr-warn)')}
    </div>`;
  }

  /* 19 — Food safety ----------------------------------------------------- */
  function safety(recipe) {
    const block = (title, icon, items, kind) => items.length ? `
      <div>
        <h4><i class="fa-solid ${icon}" aria-hidden="true"></i> ${e(title)}</h4>
        ${items.map((i) => note(kind, icon, i)).join('')}
      </div>` : '';

    return `<div class="afr-proscons">
      ${block('Internal cooking temperatures', 'fa-temperature-half', recipe.safety.temps, 'danger')}
      ${block('Storage safety', 'fa-box-archive', recipe.safety.storage, 'tip')}
      ${block('Cross-contamination', 'fa-hands-bubbles', recipe.safety.crossContamination, 'warn')}
      ${block('Expiry guidance', 'fa-calendar-xmark', recipe.safety.expiry, 'tip')}
    </div>`;
  }

  /* 20 — Printable recipe ------------------------------------------------ */
  function printable(recipe) {
    const ing = recipe.ingredients.map((i) => `<li>${e(i.display)} ${e(i.name)}</li>`).join('');
    const method = recipe.steps.map((s) =>
      `<li><strong>${e(s.title)}</strong> — ${e(s.desc)}</li>`).join('');

    return `
      <p style="color:var(--afr-text-muted)">A condensed, ink-friendly version: ingredients and method only,
      no images or navigation. Use the button below, or the Print action at the top of the page to print
      the full recipe with every section expanded.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">
        <button class="afr-btn afr-btn--primary" type="button" data-print-card>
          <i class="fa-solid fa-print" aria-hidden="true"></i> Print this card
        </button>
        <button class="afr-btn afr-btn--ghost" type="button" data-print-full>
          <i class="fa-solid fa-file-lines" aria-hidden="true"></i> Print the full recipe
        </button>
      </div>
      <div id="afr-print-card" style="border:1px solid var(--afr-border);border-radius:var(--afr-radius);padding:22px;background:var(--afr-surface)">
        <h3 style="margin-bottom:4px">${e(recipe.name)}</h3>
        <p style="color:var(--afr-text-muted);font-size:.9rem">
          ${e(recipe.cuisine.name)} · Serves ${recipe.servings} ·
          Prep ${U.humanTime(recipe.prepTime)} · Cook ${U.humanTime(recipe.cookTime)} ·
          ${recipe.nutrition.calories || 0} kcal per serving
        </p>
        <h4 style="margin-top:16px">Ingredients</h4>
        <ul style="columns:2;column-gap:32px;font-size:.92rem">${ing}</ul>
        <h4 style="margin-top:16px">Method</h4>
        <ol style="font-size:.92rem;display:grid;gap:8px">${method}</ol>
        <p style="margin-top:16px;font-size:.8rem;color:var(--afr-text-faint)">
          Generated by AI Food Recipes · ${e(new Date(recipe.meta.generatedAt).toLocaleDateString())}
        </p>
      </div>`;
  }

  /* =====================================================================
     Assembly
     ===================================================================== */

  const SECTIONS = [
    { id: 'overview', title: 'Recipe Overview', icon: 'fa-circle-info', render: overview, open: true },
    { id: 'images', title: 'Recipe Images', icon: 'fa-images', render: gallery },
    { id: 'ingredients', title: 'Ingredient List', icon: 'fa-carrot', render: ingredients, open: true },
    { id: 'equipment', title: 'Required Equipment', icon: 'fa-kitchen-set', render: equipment },
    { id: 'preparation', title: 'Preparation', icon: 'fa-list-check', render: preparation },
    { id: 'steps', title: 'Cooking Steps', icon: 'fa-fire-burner', render: steps, open: true },
    { id: 'serving', title: 'Serving Suggestions', icon: 'fa-plate-wheat', render: serving },
    { id: 'nutrition', title: 'Nutrition Information', icon: 'fa-chart-simple', render: nutrition },
    { id: 'health', title: 'Health Analysis', icon: 'fa-heart-pulse', render: health },
    { id: 'customization', title: 'Customization Summary', icon: 'fa-sliders', render: customization },
    { id: 'variations', title: 'Recipe Variations', icon: 'fa-shuffle', render: variations },
    { id: 'storage', title: 'Storage', icon: 'fa-box-archive', render: storage },
    { id: 'mealplan', title: 'Meal Planning', icon: 'fa-calendar-days', render: mealPlan },
    { id: 'cost', title: 'Estimated Cost', icon: 'fa-wallet', render: cost },
    { id: 'shopping', title: 'Shopping List', icon: 'fa-basket-shopping', render: shopping },
    { id: 'videos', title: 'YouTube Videos', icon: 'fa-video', render: videos },
    { id: 'sources', title: 'Source References', icon: 'fa-link', render: sources },
    { id: 'tips', title: 'AI Cooking Tips', icon: 'fa-lightbulb', render: tips },
    { id: 'safety', title: 'Food Safety', icon: 'fa-shield-halved', render: safety },
    { id: 'printable', title: 'Printable Recipe', icon: 'fa-print', render: printable },
  ];

  /** Sticky bar: print, PDF, share, bookmark, regenerate. */
  function actionBar(recipe, handlers) {
    const saved = AFR.store.isBookmarked(recipe.id);
    const bar = UI.el('div', { class: 'afr-actionbar afr-glass', role: 'toolbar', 'aria-label': 'Recipe actions' });
    bar.innerHTML = `
      <button class="afr-btn afr-btn--sm" type="button" data-act="print">
        <i class="fa-solid fa-print" aria-hidden="true"></i> Print
      </button>
      <button class="afr-btn afr-btn--sm" type="button" data-act="pdf">
        <i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Download PDF
      </button>
      <button class="afr-btn afr-btn--sm" type="button" data-act="share">
        <i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Share
      </button>
      <button class="afr-btn afr-btn--sm" type="button" data-act="bookmark" aria-pressed="${saved}">
        <i class="fa-${saved ? 'solid' : 'regular'} fa-bookmark" aria-hidden="true"></i>
        <span data-act-label>${saved ? 'Saved' : 'Save'}</span>
      </button>
      <span class="afr-actionbar__spacer"></span>
      <button class="afr-btn afr-btn--sm afr-btn--ghost" type="button" data-act="expand">
        <i class="fa-solid fa-angles-down" aria-hidden="true"></i> Expand all
      </button>
      <button class="afr-btn afr-btn--sm afr-btn--primary" type="button" data-act="again">
        <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Create another
      </button>`;

    UI.qs('[data-act="print"]', bar).addEventListener('click', () => UI.printPage());

    UI.qs('[data-act="pdf"]', bar).addEventListener('click', () => {
      /* No PDF library needed: the print stylesheet is already a clean A4
         layout, and every browser can "Save as PDF" from the print dialog. */
      UI.toast('Opening the print dialog — choose "Save as PDF" as the destination.', 'info', 4200);
      UI.printPage();
    });

    UI.qs('[data-act="share"]', bar).addEventListener('click', async () => {
      const result = await UI.share({
        title: `${recipe.name} — AI Food Recipes`,
        text: `${recipe.name}: ${recipe.description.slice(0, 140)}`,
        url: global.location.href,
      });
      if (result === 'copied') UI.toast('Link copied to your clipboard.', 'ok');
      else if (result === 'failed') UI.toast('Could not share or copy the link.', 'err');
    });

    const bookmarkBtn = UI.qs('[data-act="bookmark"]', bar);
    bookmarkBtn.addEventListener('click', () => {
      const now = AFR.store.toggleBookmark({
        id: recipe.id, title: recipe.name, image: recipe.image,
        cuisine: recipe.cuisine.name, time: U.humanTime(recipe.totalTime),
        diet: (recipe.customization.find((c) => c.label === 'Diet') || {}).value || '',
        href: global.location.href,
      });
      bookmarkBtn.setAttribute('aria-pressed', String(now));
      bookmarkBtn.querySelector('i').className = `fa-${now ? 'solid' : 'regular'} fa-bookmark`;
      bookmarkBtn.querySelector('[data-act-label]').textContent = now ? 'Saved' : 'Save';
      UI.toast(now ? 'Recipe saved.' : 'Removed from saved recipes.', now ? 'ok' : 'info');
    });

    const expandBtn = UI.qs('[data-act="expand"]', bar);
    let expanded = false;
    expandBtn.addEventListener('click', () => {
      expanded = !expanded;
      UI.qsa('.afr-acc').forEach((acc) => {
        const head = UI.qs('.afr-acc__head', acc);
        const isOpen = head.getAttribute('aria-expanded') === 'true';
        if (isOpen !== expanded) head.click();
      });
      expandBtn.innerHTML = expanded
        ? '<i class="fa-solid fa-angles-up" aria-hidden="true"></i> Collapse all'
        : '<i class="fa-solid fa-angles-down" aria-hidden="true"></i> Expand all';
    });

    UI.qs('[data-act="again"]', bar).addEventListener('click', () => {
      if (handlers && handlers.onAgain) handlers.onAgain();
    });

    return bar;
  }

  /** Jump links to every section. */
  function jumpBar() {
    const nav = UI.el('nav', { class: 'afr-jump', 'aria-label': 'Jump to a section', style: 'margin-bottom:20px' });
    nav.innerHTML = SECTIONS.map((s, i) =>
      `<a href="#section-${s.id}">${i + 1}. ${e(s.title)}</a>`).join('');
    return nav;
  }

  /**
   * Render a complete recipe into `host`.
   * @param {HTMLElement} host
   * @param {object} recipe
   * @param {object} handlers { onAgain }
   */
  function render(host, recipe, handlers = {}) {
    UI.clear(host);

    /* Printed sheets need their own header/footer since the nav is hidden. */
    const printHead = UI.el('div', { class: 'afr-print-head' });
    printHead.innerHTML = `<strong style="font-size:1.4rem">${e(recipe.name)}</strong>
      <div style="font-size:.9rem">${e(recipe.cuisine.name)} · Serves ${recipe.servings} ·
      ${U.humanTime(recipe.totalTime)} total · ${recipe.nutrition.calories || 0} kcal per serving</div>`;
    host.appendChild(printHead);

    host.appendChild(actionBar(recipe, handlers));
    host.appendChild(jumpBar());

    SECTIONS.forEach((section, i) => {
      host.appendChild(UI.accordion({
        id: section.id,
        index: i + 1,
        title: section.title,
        icon: section.icon,
        open: Boolean(section.open),
        render: () => section.render(recipe),
      }));
    });

    const printFoot = UI.el('div', { class: 'afr-print-foot' });
    printFoot.innerHTML = `Generated by AI Food Recipes on
      ${e(new Date(recipe.meta.generatedAt).toLocaleString())} ·
      Nutrition and cost figures are estimates.`;
    host.appendChild(printFoot);

    /* The printable-card buttons live inside a lazily rendered body. */
    host.addEventListener('click', (event) => {
      if (event.target.closest('[data-print-full]')) UI.printPage();
      if (event.target.closest('[data-print-card]')) {
        const card = UI.qs('#afr-print-card');
        if (!card) return;
        const w = global.open('', '_blank', 'width=820,height=1000');
        if (!w) { UI.toast('Your browser blocked the print window.', 'err'); return; }
        w.document.write(`<!doctype html><html><head><meta charset="utf-8">
          <title>${e(recipe.name)} — recipe card</title>
          <style>
            body{font:14px/1.6 system-ui,sans-serif;color:#111;margin:28px;max-width:760px}
            h3{margin:0 0 4px;font-size:1.6rem} h4{margin:18px 0 6px}
            ul,ol{padding-left:20px} li{margin-bottom:5px}
            @media print{@page{margin:16mm}}
          </style></head><body>${card.innerHTML}</body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 260);
      }
    });

    UI.initReveal(host);
  }

  AFR.components = AFR.components || {};
  AFR.components.recipeView = { render, SECTIONS };
})(window);
