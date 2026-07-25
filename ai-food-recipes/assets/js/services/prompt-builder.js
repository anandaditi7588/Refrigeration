/* ==========================================================================
 * prompt-builder.js — turns wizard answers into a model-agnostic brief.
 *
 * Kept separate from the adapters so all three hosted models (and any future
 * one) send the same instructions; only the transport differs. It also gives
 * you one place to iterate on prompt quality without touching provider code.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  const U = AFR.utils;

  /** The JSON contract we ask the model to fill. Mirrors recipe-schema.js. */
  const SCHEMA_HINT = `{
  "name": string,
  "description": string,
  "cuisine": { "id": string, "name": string },
  "difficulty": "Easy" | "Medium" | "Hard",
  "prepTime": number, "cookTime": number, "servings": number,
  "ingredients": [{ "name": string, "qty": string, "unit": string, "grams": number,
                    "purpose": string, "substitute": string, "healthy": string, "group": "Vegetables|Spices|Dairy|Meat|Grains|Others" }],
  "equipment": [{ "name": string, "usage": string }],
  "preparation": [{ "title": string, "desc": string, "minutes": number }],
  "steps": [{ "title": string, "desc": string, "minutes": number, "temp": string,
              "flame": string, "tips": string[], "mistakes": string[] }],
  "serving": { "sides": string[], "drinks": string[], "garnish": string, "plating": string },
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number,
                 "fiber": number, "sugar": number, "sodium": number, "calcium": number,
                 "iron": number, "potassium": number, "vitA": number, "vitC": number,
                 "vitD": number, "b12": number, "magnesium": number, "zinc": number,
                 "omega3": number, "cholesterol": number, "netCarbs": number },
  "health": { "score": number, "band": string, "pros": string[], "cons": string[] },
  "variations": [{ "name": string, "desc": string, "changes": string[] }],
  "storage": { "fridge": string, "freezer": string, "reheat": string, "notes": string[] },
  "mealPlan": { "best": string, "slots": [{ "slot": string, "fit": "good|ok|poor", "note": string }] },
  "tips": { "chef": string[], "pro": string[], "mistakes": string[], "flavor": string[], "texture": string[] },
  "safety": { "temps": string[], "storage": string[], "crossContamination": string[], "expiry": string[] }
}`;

  const SYSTEM = [
    'You are a professional recipe developer who has cooked across many cuisines.',
    'You write precise, testable recipes: real quantities, real temperatures, real timings.',
    'You never pad with narrative. Every sentence must help someone cook the dish.',
    'You respect dietary restrictions absolutely — an allergy is a hard constraint, never a suggestion.',
    'You scale every quantity to the requested number of servings, scaling spices and fat slightly sub-linearly as a real cook would.',
    'You return ONLY valid JSON matching the given schema. No markdown fences, no commentary.',
  ].join(' ');

  /** Readable brief describing exactly what the user asked for. */
  function brief(answers) {
    const W = AFR.data.wizard;
    const val = (id) => {
      const raw = answers[id];
      if (Array.isArray(raw)) return raw.length ? raw.map((v) => W.labelFor(id, v)).join(', ') : 'none';
      return raw ? W.labelFor(id, raw) : 'not specified';
    };

    const cuisineId = (!answers.cuisine || answers.cuisine === 'auto')
      ? AFR.data.cuisines.detect(answers.dish) : answers.cuisine;

    const lines = [
      `Dish: ${U.clean(answers.dish)}`,
      `Servings: ${answers.servings} (scale every quantity and all nutrition to this)`,
      `Cook's experience: ${val('experience')}`,
      `Time available: ${val('time')}`,
      `Cuisine: ${AFR.data.cuisines.get(cuisineId).name}${(!answers.cuisine || answers.cuisine === 'auto') ? ' (auto-detected from the dish name)' : ' (explicitly chosen)'}`,
      `Diet requirements: ${val('diet')}`,
      `Spice level: ${val('spice')}`,
      `Sweetness: ${val('sweetness')}`,
      `Salt preference: ${val('salt')}`,
      `Oil preference: ${val('oil')}`,
      `Cooking style: ${val('style')}`,
      `Available appliances: ${val('appliances')} — the method must work with these`,
      `Ingredients already at home (prioritise these): ${(answers.available || []).join(', ') || 'none listed'}`,
      `Ingredients to avoid (substitute them): ${(answers.avoid || []).join(', ') || 'none'}`,
      `ALLERGIES — hard exclusions, must not appear in any form: ${val('allergies')}`,
      `Special instructions from the user: ${U.clean(answers.notes) || 'none'}`,
    ];
    return lines.join('\n');
  }

  /** Full user-turn prompt. */
  function build(answers) {
    return [
      'Create one complete, structured recipe for the following brief.',
      '',
      brief(answers),
      '',
      'Requirements:',
      '- At least 5 preparation steps and 6 cooking steps.',
      '- Every ingredient needs a quantity, a unit, an approximate weight in grams, its purpose in the dish, a practical substitute and a healthier alternative.',
      '- Every cooking step needs a temperature, a flame/heat level, a duration, at least one tip and one common mistake.',
      '- Nutrition must be PER SERVING and consistent with the ingredient list you wrote.',
      '- Six variations: Healthy, Restaurant, Quick, Budget, Premium and Festival.',
      '- Food-safety section must include internal cooking temperatures where a protein is involved.',
      '',
      'Return JSON only, matching this schema exactly:',
      SCHEMA_HINT,
    ].join('\n');
  }

  AFR.prompt = { SYSTEM, SCHEMA_HINT, brief, build };
})(window);
