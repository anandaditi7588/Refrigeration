/* ==========================================================================
 * nutrition-service.js — nutrition maths, health scoring and cost.
 *
 * Everything is computed from the actual ingredient list and then divided by
 * the chosen number of servings, so changing servings genuinely changes the
 * numbers rather than relabelling them.
 *
 * These are ESTIMATES built from reference food-composition values (see
 * ingredients.js). Cooking losses, oil absorption and portion variance are
 * real, so the UI presents them as approximate throughout.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /* Reference daily intakes used only to draw the % bars. Adult average. */
  const RDA = {
    calories: 2000, protein: 50, carbs: 275, fat: 70, fiber: 28, sugar: 50, sodium: 2300,
    calcium: 1000, iron: 18, potassium: 3500, vitA: 900, vitC: 90, vitD: 20, b12: 2.4,
    magnesium: 400, zinc: 11, omega3: 1600, cholesterol: 300,
  };

  /* Display metadata for the nutrition grid — order matters, it's the render order. */
  const NUTRIENTS = [
    { key: 'calories', label: 'Calories', unit: 'kcal', icon: 'fa-fire' },
    { key: 'protein', label: 'Protein', unit: 'g', icon: 'fa-dumbbell' },
    { key: 'carbs', label: 'Carbohydrates', unit: 'g', icon: 'fa-bread-slice' },
    { key: 'fat', label: 'Fat', unit: 'g', icon: 'fa-droplet' },
    { key: 'fiber', label: 'Fiber', unit: 'g', icon: 'fa-wheat-awn' },
    { key: 'sugar', label: 'Sugar', unit: 'g', icon: 'fa-cube' },
    { key: 'sodium', label: 'Sodium', unit: 'mg', icon: 'fa-cubes-stacked' },
    { key: 'calcium', label: 'Calcium', unit: 'mg', icon: 'fa-bone' },
    { key: 'iron', label: 'Iron', unit: 'mg', icon: 'fa-magnet' },
    { key: 'potassium', label: 'Potassium', unit: 'mg', icon: 'fa-bolt' },
    { key: 'vitA', label: 'Vitamin A', unit: 'µg', icon: 'fa-eye' },
    { key: 'vitC', label: 'Vitamin C', unit: 'mg', icon: 'fa-lemon' },
    { key: 'vitD', label: 'Vitamin D', unit: 'µg', icon: 'fa-sun' },
    { key: 'b12', label: 'Vitamin B12', unit: 'µg', icon: 'fa-flask' },
    { key: 'magnesium', label: 'Magnesium', unit: 'mg', icon: 'fa-atom' },
    { key: 'zinc', label: 'Zinc', unit: 'mg', icon: 'fa-shield-halved' },
    { key: 'omega3', label: 'Omega 3', unit: 'g', icon: 'fa-fish' },
    { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', icon: 'fa-heart-pulse' },
    { key: 'netCarbs', label: 'Net Carbs', unit: 'g', icon: 'fa-calculator' },
  ];

  const EMPTY = () => ({
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0,
    calcium: 0, iron: 0, potassium: 0, vitA: 0, vitC: 0, vitD: 0, b12: 0,
    magnesium: 0, zinc: 0, omega3: 0, netCarbs: 0,
  });

  /**
   * Sum an ingredient list into totals.
   * Each line must carry `.item` (pantry entry) and `.grams` (total grams used).
   */
  function total(lines) {
    const sum = EMPTY();
    (lines || []).forEach((line) => {
      const item = line.item;
      if (!item) return;
      const f = (Number(line.grams) || 0) / 100; // values are per 100 g

      sum.calories += item.kcal * f;
      sum.protein += item.protein * f;
      sum.carbs += item.carbs * f;
      sum.fat += item.fat * f;
      sum.fiber += item.fiber * f;
      sum.sugar += item.sugar * f;
      sum.sodium += item.sodium * f;
      sum.cholesterol += (item.cholesterol || 0) * f;

      const m = item.micro || {};
      sum.calcium += (m.calcium || 0) * f;
      sum.iron += (m.iron || 0) * f;
      sum.potassium += (m.potassium || 0) * f;
      sum.vitA += (m.vitA || 0) * f;
      sum.vitC += (m.vitC || 0) * f;
      sum.vitD += (m.vitD || 0) * f;
      sum.b12 += (m.b12 || 0) * f;
      sum.magnesium += (m.magnesium || 0) * f;
      sum.zinc += (m.zinc || 0) * f;
      sum.omega3 += (m.omega3 || 0) * f;
    });

    sum.netCarbs = Math.max(0, sum.carbs - sum.fiber);
    return sum;
  }

  /**
   * Per-serving nutrition, with a modest cooking-loss adjustment applied to the
   * heat-sensitive vitamins so the numbers aren't optimistic.
   */
  function perServing(lines, servings, opts = {}) {
    const n = Math.max(1, Number(servings) || 1);
    const totals = total(lines);
    const out = {};

    const LOSS = { vitC: 0.65, vitA: 0.85, b12: 0.9, vitD: 0.95 }; // retention factors
    Object.keys(totals).forEach((key) => {
      const retention = opts.raw ? 1 : (LOSS[key] || 1);
      out[key] = U.round(totals[key] * retention / n, key === 'calories' ? 0 : 1);
    });

    // Frying absorbs oil that never appears in the ingredient list as "eaten".
    if (opts.absorbedOilGrams) {
      const perServe = opts.absorbedOilGrams / n;
      out.fat = U.round(out.fat + perServe, 1);
      out.calories = Math.round(out.calories + perServe * 9);
    }

    out.netCarbs = U.round(Math.max(0, out.carbs - out.fiber), 1);
    return out;
  }

  /** Percentage of the reference daily intake, capped at 100 for the bar width. */
  function rdaPercent(key, value) {
    const ref = RDA[key === 'netCarbs' ? 'carbs' : key];
    if (!ref) return 0;
    return U.clamp(Math.round((value / ref) * 100), 0, 100);
  }

  /**
   * Health score out of 100. Built from the actual per-serving numbers, then
   * nudged by the cooking choices the user made (oil, salt, style).
   * Returns the score plus the reasons, so the UI can show its working.
   */
  function healthScore(ps, context = {}) {
    let score = 55; // neutral home-cooked baseline
    const pros = [];
    const cons = [];

    // Protein density
    if (ps.protein >= 25) { score += 12; pros.push(`Strong protein content — ${ps.protein} g per serving supports satiety and muscle repair.`); }
    else if (ps.protein >= 15) { score += 7; pros.push(`Reasonable protein at ${ps.protein} g per serving.`); }
    else if (ps.protein < 8) { score -= 5; cons.push(`Low in protein (${ps.protein} g) — pair it with yogurt, lentils, eggs or a side of beans.`); }

    // Fibre
    if (ps.fiber >= 8) { score += 10; pros.push(`High fibre (${ps.fiber} g) — good for digestion and blood-sugar stability.`); }
    else if (ps.fiber >= 4) { score += 5; pros.push(`Decent fibre at ${ps.fiber} g per serving.`); }
    else { score -= 4; cons.push(`Low fibre (${ps.fiber} g) — add a salad, extra vegetables or switch to a whole grain.`); }

    // Fat load
    if (ps.fat > 35) { score -= 12; cons.push(`High fat per serving (${ps.fat} g). Reducing the cooking oil is the easiest lever.`); }
    else if (ps.fat > 22) { score -= 5; cons.push(`Moderately rich at ${ps.fat} g fat per serving.`); }
    else if (ps.fat <= 12) { score += 6; pros.push(`Light on fat (${ps.fat} g per serving).`); }

    // Sodium
    if (ps.sodium > 1200) { score -= 14; cons.push(`High sodium (${Math.round(ps.sodium)} mg) — over half a day's guideline in one serving.`); }
    else if (ps.sodium > 700) { score -= 6; cons.push(`Sodium is on the higher side at ${Math.round(ps.sodium)} mg per serving.`); }
    else if (ps.sodium < 400) { score += 7; pros.push(`Low sodium (${Math.round(ps.sodium)} mg) — kind to blood pressure.`); }

    // Sugar
    if (ps.sugar > 25) { score -= 10; cons.push(`High sugar (${ps.sugar} g per serving).`); }
    else if (ps.sugar < 8) { score += 5; pros.push(`Low added sugar (${ps.sugar} g per serving).`); }

    // Calorie load
    if (ps.calories > 750) { score -= 8; cons.push(`Calorie-dense at ${ps.calories} kcal per serving — worth halving the portion or the fat.`); }
    else if (ps.calories < 400) { score += 5; pros.push(`Moderate at ${ps.calories} kcal per serving.`); }

    // Micronutrient standouts
    if (rdaPercent('iron', ps.iron) >= 25) pros.push(`A good source of iron (${ps.iron} mg, around ${rdaPercent('iron', ps.iron)}% of the daily reference).`);
    if (rdaPercent('vitC', ps.vitC) >= 30) pros.push(`Rich in vitamin C (${ps.vitC} mg), which also improves iron absorption from this meal.`);
    if (rdaPercent('calcium', ps.calcium) >= 25) pros.push(`Contributes meaningfully to calcium (${Math.round(ps.calcium)} mg).`);
    if (ps.omega3 >= 0.5) pros.push(`Provides omega-3 fats (${ps.omega3} g per serving).`);
    if (ps.cholesterol > 250) cons.push(`High dietary cholesterol (${Math.round(ps.cholesterol)} mg per serving).`);

    // User-choice adjustments
    if (context.oil === 'none') { score += 8; pros.push('Cooked without added oil.'); }
    else if (context.oil === 'low') score += 4;
    else if (context.oil === 'rich') { score -= 6; cons.push('Cooked in the rich style, which adds fat beyond what the dish needs.'); }

    if (context.salt === 'low') { score += 5; pros.push('Prepared with reduced salt.'); }
    else if (context.salt === 'high') score -= 4;

    if (context.style === 'healthy') { score += 6; pros.push('Built with the healthy cooking style — lighter techniques throughout.'); }
    else if (context.style === 'street' || context.style === 'restaurant') score -= 4;

    if ((context.diet || []).includes('vegan') || (context.diet || []).includes('vegetarian')) {
      score += 4;
      pros.push('Plant-forward, which generally means more fibre and less saturated fat.');
    }

    score = U.clamp(Math.round(score), 5, 98);
    const band = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Balanced' : score >= 35 ? 'Indulgent' : 'Occasional treat';

    return { score, band, pros, cons };
  }

  /**
   * Suitability verdicts for the health analysis section.
   * Each returns { level: 'good'|'ok'|'poor', note }.
   */
  function suitability(ps, context = {}) {
    const diet = context.diet || [];
    const spiceLevel = context.spiceLevel || 0;

    const verdict = (ok, warn, goodNote, okNote, poorNote) =>
      ok ? { level: 'good', note: goodNote }
        : warn ? { level: 'ok', note: okNote }
          : { level: 'poor', note: poorNote };

    return {
      diabetic: verdict(
        ps.netCarbs <= 30 && ps.sugar <= 10,
        ps.netCarbs <= 50 && ps.sugar <= 18,
        `${ps.netCarbs} g net carbs and ${ps.sugar} g sugar per serving — a comfortable fit for most blood-sugar plans.`,
        `${ps.netCarbs} g net carbs per serving. Fine in a measured portion, ideally with a protein or fibre side.`,
        `${ps.netCarbs} g net carbs and ${ps.sugar} g sugar per serving is high — halve the portion or swap the starch.`),

      heart: verdict(
        ps.sodium <= 600 && ps.fat <= 18,
        ps.sodium <= 1000 && ps.fat <= 28,
        `Low sodium (${Math.round(ps.sodium)} mg) and moderate fat (${ps.fat} g) — heart-friendly as written.`,
        `Sodium at ${Math.round(ps.sodium)} mg and fat at ${ps.fat} g. Reasonable, but the low-salt setting would improve it.`,
        `${Math.round(ps.sodium)} mg sodium and ${ps.fat} g fat per serving — worth reducing both for regular eating.`),

      kids: verdict(
        spiceLevel <= 2 && ps.sodium <= 700,
        spiceLevel <= 3,
        'Mild enough for children, with sodium in a sensible range.',
        'Slightly spicy for younger children — set the spice to Mild or Very Mild for them.',
        `At this heat level (${spiceLevel}/6) it is too spicy for most children. Cook a separate mild portion.`),

      pregnancy: verdict(
        spiceLevel <= 3 && !context.hasRaw && !context.hasAlcohol,
        spiceLevel <= 4 && !context.hasRaw,
        'Cooked through, moderate heat — suitable during pregnancy. Ensure all protein reaches its safe internal temperature.',
        'Broadly suitable, though the heat level may aggravate reflux. Confirm everything is cooked through.',
        'Contains raw or high-risk elements, or is very spicy. Cook everything thoroughly and reduce the chilli.'),

      weightLoss: verdict(
        ps.calories <= 450 && ps.protein >= 15,
        ps.calories <= 650,
        `${ps.calories} kcal with ${ps.protein} g protein — filling without being heavy.`,
        `${ps.calories} kcal per serving fits a deficit if this is the main meal of the day.`,
        `At ${ps.calories} kcal per serving this is calorie-dense; reduce the oil and increase the vegetables.`),

      highProtein: verdict(
        ps.protein >= 25,
        ps.protein >= 15,
        `${ps.protein} g of protein per serving — a genuinely high-protein meal.`,
        `${ps.protein} g per serving. Add yogurt, eggs or legumes on the side to push it higher.`,
        `Only ${ps.protein} g per serving — this is not a high-protein dish as written.`),

      glutenFree: diet.includes('gluten-free') || !context.hasGluten
        ? { level: 'good', note: 'No gluten-containing ingredients in this version.' }
        : { level: 'poor', note: 'Contains wheat-based ingredients. Select the Gluten Free diet option to have them swapped.' },
    };
  }

  /** Cost estimate from the ingredient list. */
  function cost(lines, servings, currency = '₹') {
    const totalCost = (lines || []).reduce((sum, line) => {
      if (!line.item) return sum;
      return sum + ((line.item.costPer100g || 0) * (Number(line.grams) || 0) / 100);
    }, 0);
    const n = Math.max(1, Number(servings) || 1);
    return {
      total: U.round(totalCost, 0),
      perServing: U.round(totalCost / n, 1),
      currency,
      totalLabel: U.money(totalCost, currency),
      perServingLabel: U.money(totalCost / n, currency),
    };
  }

  AFR.nutrition = { RDA, NUTRIENTS, total, perServing, rdaPercent, healthScore, suitability, cost, EMPTY };
})(window);
