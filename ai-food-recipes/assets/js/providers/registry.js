/* ==========================================================================
 * registry.js — provider lookup.
 *
 * Capabilities: 'ai' | 'video' | 'recipe'
 * Each capability has one active provider chosen in config.js, plus a local
 * fallback that always works. `resolve()` is the only way the rest of the app
 * gets hold of a provider, which is what keeps the swap to a hosted API a
 * configuration change rather than a refactor.
 *
 * Registering your own:
 *
 *   AFR.registry.register('ai', {
 *     id: 'my-model',
 *     async generate(answers, hooks) { ... return AFR.schema.normalise(json); }
 *   });
 *   AFR.config.providers.ai = 'my-model';
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  const registry = {
    ai: {},
    video: {},
    recipe: {},
    photo: {},
  };

  function register(capability, provider) {
    if (!registry[capability]) registry[capability] = {};
    if (!provider || !provider.id) throw new Error('A provider needs an `id`');
    registry[capability][provider.id] = provider;
    return provider;
  }

  /** The configured provider for a capability, or the local fallback. */
  function resolve(capability) {
    const wanted = AFR.config.providers[capability];
    const bucket = registry[capability] || {};
    return bucket[wanted] || bucket.local || null;
  }

  /** The always-available offline implementation. */
  function fallback(capability) {
    return (registry[capability] || {}).local || null;
  }

  function list(capability) {
    return Object.values(registry[capability] || {});
  }

  AFR.registry = { register, resolve, fallback, list, _all: registry };

  /* ------------------------------------------------------------------ */
  /* Register everything that shipped with the app.                      */
  /* ------------------------------------------------------------------ */
  const P = AFR.providers || {};

  if (P.aiLocal) register('ai', P.aiLocal);
  if (P.aiOpenai) register('ai', P.aiOpenai);
  if (P.aiGemini) register('ai', P.aiGemini);
  if (P.aiClaude) register('ai', P.aiClaude);
  if (P.aiProxy) register('ai', P.aiProxy);

  if (P.videoLocal) register('video', P.videoLocal);
  if (P.videoYoutube) register('video', P.videoYoutube);

  if (P.photoLocal) register('photo', P.photoLocal);
  if (P.photoPexels) register('photo', P.photoPexels);
  if (P.photoUnsplash) register('photo', P.photoUnsplash);
  if (P.photoWikimedia) register('photo', P.photoWikimedia);
  if (P.photoYoutube) register('photo', P.photoYoutube);

  if (P.recipeLocal) register('recipe', P.recipeLocal);
  if (P.recipeSpoonacular) register('recipe', P.recipeSpoonacular);
  if (P.recipeEdamam) register('recipe', P.recipeEdamam);
  if (P.recipeProxy) register('recipe', P.recipeProxy);
})(window);
