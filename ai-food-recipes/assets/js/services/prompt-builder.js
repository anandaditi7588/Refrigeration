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

  /**
   * The part of the prompt that decides whether someone can actually cook from
   * the result.
   *
   * Without this a model writes "Add spices and cook until done" — technically
   * a step, useless in a kitchen. The rules below are deliberately blunt about
   * the two failure modes: skipping stages (the recipe jumps from mixing to
   * serving) and compressing several actions into one line. Length is not the
   * goal, completeness is; but completeness here does mean long, so the prompt
   * says so outright rather than leaving the model to guess at a house style.
   */
  const STEP_RULES = [
    'PREPARATION AND COOKING STEPS — the most important part of your answer:',
    '',
    'Write the recipe END TO END. Someone who has never made this dish must be able',
    'to cook it from your steps alone, without looking anything up. A long answer is',
    'expected and welcome. Never abbreviate, never summarise, never write "etc.",',
    '"and so on", "as needed", "cook until done" or "prepare the remaining ingredients".',
    '',
    'Cover every stage that really happens, including the ones recipes usually omit:',
    'soaking, marinating, resting, proving, preheating, tempering, cooling, straining,',
    'resting after cooking, final seasoning adjustment, garnishing and plating.',
    'If a stage involves waiting, say what to do during the wait.',
    '',
    'PREPARATION: 5 to 10 steps. Each one covers ONE task, and states exactly how the',
    'ingredient should end up — the cut and its size in mm or cm, the texture, the',
    'temperature, the quantity being handled. "Finely chop the onion" is not enough;',
    '"Halve the onion pole to pole and slice into 2-3 mm half-moons, about 1 cup" is.',
    '',
    'COOKING: 8 to 15 steps. Each step must give, in its desc:',
    '  1. The exact action, and the quantity involved restated from the ingredient list',
    '     so the cook does not have to scroll back.',
    '  2. The pan or vessel, and the heat level in words.',
    '  3. How long it takes, as a range.',
    '  4. WHAT IT SHOULD LOOK, SOUND OR SMELL LIKE when it is ready — the sensory cue is',
    '     what makes a step reliable across different stoves. "Until the raw smell goes',
    '     and the oil separates at the edges" beats "until cooked".',
    '  5. What to do if it is going wrong at that moment.',
    '',
    'Write each desc as 3 to 6 full sentences. Aim for 60 words or more per cooking step.',
    'Also fill temp, flame and minutes for every cooking step, plus at least one tip and',
    'one common mistake. The final cooking step must be resting, finishing or plating —',
    'the recipe should end at the table, not at the stove.',
  ].join('\n');

  /** The instruction that makes a hosted model write the whole recipe in the
   *  chosen language. Deliberately explicit about what must NOT be translated:
   *  numbers and units have to stay machine-readable for the nutrition maths. */
  function languageInstruction(code) {
    const lang = AFR.data.languages.get(code || (AFR.i18n && AFR.i18n.current) || 'en');
    if (lang.code === 'en') return '';
    return [
      '',
      `LANGUAGE: Write EVERY human-readable string in ${lang.name} (${lang.native}).`,
      'That includes the recipe name, description, ingredient names, purposes,',
      'substitutes, equipment, every preparation and cooking step, tips, mistakes,',
      'serving suggestions, health notes, storage, meal planning and food safety.',
      'Keep the JSON KEYS in English exactly as given in the schema.',
      'Keep numeric values as numbers, and keep units in a form a cook there would',
      'recognise. Do not add a translation in brackets -- write it natively.',
    ].join('\n');
  }

  const SYSTEM = [
    'You are a professional recipe developer who has cooked across many cuisines.',
    'You write precise, testable recipes: real quantities, real temperatures, real timings.',
    'You never pad with narrative, but you are never terse either: every stage of the',
    'cook is written out in full, because a missing step is what ruins a dish.',
    'Every sentence must help someone cook it.',
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
      '- Every ingredient needs a quantity, a unit, an approximate weight in grams, its purpose in the dish, a practical substitute and a healthier alternative.',
      '- Nutrition must be PER SERVING and consistent with the ingredient list you wrote.',
      '- Six variations: Healthy, Restaurant, Quick, Budget, Premium and Festival.',
      '- Food-safety section must include internal cooking temperatures where a protein is involved.',
      '',
      STEP_RULES,
      '',
      'Return JSON only, matching this schema exactly:',
      SCHEMA_HINT,
      languageInstruction(answers.language),
    ].join('\n');
  }

  AFR.prompt = { SYSTEM, SCHEMA_HINT, STEP_RULES, brief, build, languageInstruction };
})(window);
