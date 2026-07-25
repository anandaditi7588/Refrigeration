/* ==========================================================================
 * create.js — the "Create Your Own Dish" page controller.
 *
 * Three views live in one page and swap in place:
 *   wizard  → the 16-step brief
 *   loading → progress bar, staged log and a skeleton of the result
 *   result  → the 20-section recipe
 *
 * Deep links are supported (`create.html?dish=Pad+Thai&cuisine=thai`) so home
 * page cards, categories and search results all land here pre-filled.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;
  const UI = AFR.ui;

  let wizard = null;
  let currentRecipe = null;

  const views = {};

  function show(name) {
    Object.entries(views).forEach(([key, node]) => {
      if (node) node.hidden = key !== name;
    });
  }

  /* -------------------------------------------------------- deep linking */

  function paramsFromURL() {
    const out = {};
    const dish = U.query('dish');
    const cuisine = U.query('cuisine');
    const diet = U.query('diet');
    const servings = U.query('servings');
    if (dish) out.dish = U.titleCase(dish);
    if (cuisine && AFR.data.cuisines.all[cuisine]) out.cuisine = cuisine;
    if (diet) out.diet = [diet];
    if (servings) out.servings = servings;
    return out;
  }

  /* ------------------------------------------------------------ loading */

  function buildLoadingView() {
    const host = views.loading;
    host.innerHTML = `
      <div class="afr-glass afr-gen">
        <div class="afr-gen__pan" aria-hidden="true">🍳</div>
        <h2 data-gen="title">Cooking up your recipe…</h2>
        <p style="color:var(--afr-text-muted)" data-gen="dish"></p>

        <div class="afr-progress afr-progress--striped" style="max-width:520px;margin:22px auto 0"
             role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
             aria-label="Recipe generation progress" data-gen="progress">
          <div class="afr-progress__bar" data-gen="bar"></div>
        </div>
        <p style="margin-top:10px;font-size:.9rem;color:var(--afr-text-muted)" data-gen="pct">0%</p>

        <ul class="afr-gen__log" data-gen="log"></ul>
      </div>

      <div class="afr-glass" style="padding:24px;margin-top:20px" aria-hidden="true" data-gen="skeleton"></div>`;

    const skeleton = UI.qs('[data-gen="skeleton"]', host);
    skeleton.appendChild(UI.skeleton({ media: true, lines: 3 }));
    skeleton.appendChild(UI.el('div', { style: 'height:20px' }));
    skeleton.appendChild(UI.skeleton({ media: false, lines: 5 }));

    const log = UI.qs('[data-gen="log"]', host);
    log.innerHTML = AFR.recipeService.STAGES.map((stage) => `
      <li data-stage="${U.esc(stage.id)}" data-state="pending">
        <i class="fa-regular fa-circle" aria-hidden="true"></i>
        <span>${U.esc(stage.label)}</span>
      </li>`).join('');
  }

  function loadingHooks(dish) {
    const host = views.loading;
    UI.qs('[data-gen="dish"]', host).textContent = dish;
    const bar = UI.qs('[data-gen="bar"]', host);
    const progress = UI.qs('[data-gen="progress"]', host);
    const pct = UI.qs('[data-gen="pct"]', host);
    const title = UI.qs('[data-gen="title"]', host);

    return {
      onStage(stageId, label) {
        UI.qsa('[data-stage]', host).forEach((li) => {
          const isCurrent = li.dataset.stage === stageId;
          const currentIndex = AFR.recipeService.STAGES.findIndex((s) => s.id === stageId);
          const thisIndex = AFR.recipeService.STAGES.findIndex((s) => s.id === li.dataset.stage);
          const state = isCurrent ? 'active' : thisIndex < currentIndex ? 'done' : 'pending';
          li.dataset.state = state;
          li.querySelector('i').className = state === 'done' ? 'fa-solid fa-circle-check'
            : state === 'active' ? 'fa-solid fa-spinner fa-spin' : 'fa-regular fa-circle';
        });
        if (label) title.textContent = label + '…';
      },
      onProgress(fraction, label) {
        const value = Math.round(U.clamp(fraction, 0, 1) * 100);
        bar.style.width = `${value}%`;
        progress.setAttribute('aria-valuenow', String(value));
        pct.textContent = `${value}%`;
        if (label) title.textContent = label.endsWith('…') ? label : `${label}…`;
      },
    };
  }

  /* ---------------------------------------------------------- generation */

  async function generate(answers) {
    show('loading');
    UI.scrollTo(views.loading, 100);

    const dish = U.clean(answers.dish);
    document.title = `Creating ${dish} — AI Food Recipes`;

    try {
      const recipe = await AFR.recipeService.generate(answers, loadingHooks(dish));
      currentRecipe = recipe;

      /* Persist so a refresh or a return visit keeps the result. */
      AFR.store.saveRecipe(recipe);
      AFR.store.saveDraft(answers);

      renderResult(recipe);
    } catch (err) {
      show('wizard');
      UI.toast(`Could not generate the recipe: ${err.message}`, 'err', 6000);
      // Surfaced in the console too, since this is the one genuinely fatal path.
      global.console.error('[AI Food Recipes] generation failed', err);
    }
  }

  function renderResult(recipe) {
    document.title = `${recipe.name} — AI Food Recipes`;
    show('result');

    /* The full description lives in section 1 — the header just orients you. */
    const header = UI.qs('[data-result="header"]', views.result);
    header.innerHTML = `
      <p class="afr-eyebrow"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
        Your custom recipe · ${U.esc(recipe.meta.provider === 'local' ? 'built-in engine' : recipe.meta.provider)}</p>
      <h1>${U.esc(recipe.name)}</h1>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <span class="afr-chip afr-chip--brand">${U.esc(recipe.cuisine.flag)} ${U.esc(recipe.cuisine.name)}</span>
        <span class="afr-chip">Serves ${recipe.servings}</span>
        <span class="afr-chip">${U.esc(U.humanTime(recipe.totalTime))} total</span>
        <span class="afr-chip">${U.esc(recipe.difficulty)}</span>
        <span class="afr-chip">${recipe.nutrition.calories || 0} kcal / serving</span>
        <span class="afr-chip">Health ${recipe.health.score}/100</span>
        <span class="afr-chip">${U.esc(recipe.cost.perServingLabel || '')} / serving</span>
      </div>`;

    AFR.components.recipeView.render(UI.qs('[data-result="body"]', views.result), recipe, {
      onAgain() {
        show('wizard');
        document.title = 'Create Your Own Dish — AI Food Recipes';
        UI.scrollTo(views.wizard, 90);
      },
    });

    UI.scrollTo(views.result, 90);
  }

  /* ---------------------------------------------------------------- boot */

  document.addEventListener('DOMContentLoaded', () => {
    views.wizard = UI.qs('[data-view="wizard"]');
    views.loading = UI.qs('[data-view="loading"]');
    views.result = UI.qs('[data-view="result"]');
    if (!views.wizard) return;

    buildLoadingView();

    /* Restore an in-progress brief, then let URL parameters win over it. */
    const draft = AFR.store.loadDraft();
    const initial = Object.assign({}, draft || {}, paramsFromURL());

    wizard = new AFR.components.Wizard(UI.qs('[data-wizard-host]'), {
      initial,
      onSubmit: generate,
    });

    if (draft && !Object.keys(paramsFromURL()).length) {
      UI.toast('Restored your previous brief — use "Start over" for a blank one.', 'info', 4000);
    }

    /* Offer the last generated recipe rather than silently dropping it. */
    const last = AFR.store.loadRecipe();
    if (last && !U.query('dish')) {
      const banner = UI.qs('[data-last-recipe]');
      if (banner) {
        banner.hidden = false;
        banner.innerHTML = `
          <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
          <span>You last created <strong>${U.esc(last.name)}</strong>.</span>
          <button class="afr-btn afr-btn--sm afr-btn--ghost" type="button" style="margin-left:auto">
            View it again
          </button>`;
        banner.querySelector('button').addEventListener('click', () => {
          currentRecipe = last;
          renderResult(last);
        });
      }
    }

    /* Deep link with a dish already supplied: jump the user to the first
       unanswered step rather than making them re-read step 1. */
    if (U.query('dish')) {
      wizard.go(1);
      UI.scrollTo(views.wizard, 90);
    }
  });
})(window);
