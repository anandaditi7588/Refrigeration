/* ==========================================================================
 * llm-providers.js — the catalogue behind "bring your own model".
 *
 * Nearly every model host speaks one of three wire protocols:
 *
 *   openai     POST {base}/chat/completions   Authorization: Bearer <key>
 *   anthropic  POST {base}/messages           x-api-key: <key>
 *   gemini     POST {base}/models/{m}:generateContent?key=<key>
 *
 * So the app needs three adapters, not thirty, and adding a host is a row in
 * this table. That includes hosts that do not exist yet and anything you run
 * yourself — Ollama, vLLM and LM Studio all speak the openai protocol.
 *
 * `maxOutputTokens` is the ceiling on what a host will emit in one reply.
 * Asking for more is not ignored — Gemini and several OpenAI-compatible hosts
 * reject the whole request with a 400, which surfaces as "connection failed".
 * The values here are conservative on purpose: too low costs a little detail,
 * too high costs the entire answer.
 *
 * `models` is only a starting list. Where a host exposes a models endpoint the
 * setup page fetches the live list with your key, which is always more current
 * than anything hard-coded here.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  const PROVIDERS = [
    {
      id: 'gemini',
      maxOutputTokens: 8192,
      name: 'Google Gemini',
      protocol: 'gemini',
      base: 'https://generativelanguage.googleapis.com/v1beta',
      modelsPath: '/models',
      keyUrl: 'https://aistudio.google.com/apikey',
      keyLabel: 'Google AI Studio API key',
      free: 'Free tier, no card required — roughly 1,500 requests a day.',
      note: 'The easiest starting point: a key takes about a minute and costs nothing.',
      recommended: true,
      models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    },
    {
      id: 'groq',
      maxOutputTokens: 32768,
      name: 'Groq — open models, very fast',
      protocol: 'openai',
      base: 'https://api.groq.com/openai/v1',
      modelsPath: '/models',
      keyUrl: 'https://console.groq.com/keys',
      keyLabel: 'Groq API key',
      free: 'Generous free tier, no card required.',
      note: 'Runs open-weight models. The fastest option here, and the one to pick if you '
        + 'would rather not depend on Google or OpenAI. Press "Load models" for the current '
        + 'list — hosts retire models regularly and this starting list will drift.',
      recommended: true,
      /* mixtral-8x7b-32768 was here and Groq has since retired it, so it sat in
         the dropdown as a default that could never work. Only models worth
         defaulting to belong here; "Load models" fetches the live list, which
         is always more current than anything hard-coded. */
      models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    },
    {
      id: 'openai',
      maxOutputTokens: 16384,
      name: 'OpenAI',
      protocol: 'openai',
      base: 'https://api.openai.com/v1',
      modelsPath: '/models',
      keyUrl: 'https://platform.openai.com/api-keys',
      keyLabel: 'OpenAI API key',
      free: 'Paid — billed per token. No free tier.',
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    },
    {
      id: 'anthropic',
      maxOutputTokens: 8192,
      name: 'Anthropic Claude',
      protocol: 'anthropic',
      base: 'https://api.anthropic.com/v1',
      modelsPath: '/models',
      keyUrl: 'https://console.anthropic.com/settings/keys',
      keyLabel: 'Anthropic API key',
      free: 'Paid — billed per token.',
      /* Anthropic blocks browser calls unless you opt in explicitly, which is
         a deliberate safety measure against leaking keys from a web page. */
      note: 'Calling this straight from a browser needs the '
        + 'anthropic-dangerous-direct-browser-access header, which the app sends. '
        + 'For anything public, use the proxy option instead.',
      models: ['claude-sonnet-4-5', 'claude-haiku-4-5'],
    },
    {
      id: 'openrouter',
      maxOutputTokens: 8192,
      name: 'OpenRouter — one key, hundreds of models',
      protocol: 'openai',
      base: 'https://openrouter.ai/api/v1',
      modelsPath: '/models',
      keyUrl: 'https://openrouter.ai/keys',
      keyLabel: 'OpenRouter API key',
      free: 'Several models are free; the rest are pay-as-you-go.',
      note: 'Useful for trying many models without signing up to each provider. '
        + 'Model names look like "meta-llama/llama-3.3-70b-instruct:free".',
      models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-2-9b-it:free',
        'mistralai/mistral-7b-instruct:free'],
    },
    {
      id: 'mistral',
      maxOutputTokens: 8192,
      name: 'Mistral AI',
      protocol: 'openai',
      base: 'https://api.mistral.ai/v1',
      modelsPath: '/models',
      keyUrl: 'https://console.mistral.ai/api-keys',
      keyLabel: 'Mistral API key',
      free: 'Free experimentation tier available.',
      models: ['mistral-small-latest', 'mistral-large-latest', 'open-mistral-nemo'],
    },
    {
      id: 'together',
      maxOutputTokens: 8192,
      name: 'Together AI',
      protocol: 'openai',
      base: 'https://api.together.xyz/v1',
      modelsPath: '/models',
      keyUrl: 'https://api.together.ai/settings/api-keys',
      keyLabel: 'Together API key',
      free: 'Free credits on sign-up.',
      models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo'],
    },
    {
      id: 'deepinfra',
      maxOutputTokens: 8192,
      name: 'DeepInfra',
      protocol: 'openai',
      base: 'https://api.deepinfra.com/v1/openai',
      modelsPath: '/models',
      keyUrl: 'https://deepinfra.com/dash/api_keys',
      keyLabel: 'DeepInfra API key',
      free: 'Free credits on sign-up.',
      models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'Qwen/Qwen2.5-72B-Instruct'],
    },
    {
      id: 'deepseek',
      maxOutputTokens: 8192,
      name: 'DeepSeek',
      protocol: 'openai',
      base: 'https://api.deepseek.com/v1',
      modelsPath: '/models',
      keyUrl: 'https://platform.deepseek.com/api_keys',
      keyLabel: 'DeepSeek API key',
      free: 'Paid, but among the cheapest per token.',
      models: ['deepseek-chat', 'deepseek-reasoner'],
    },
    {
      id: 'xai',
      maxOutputTokens: 16384,
      name: 'xAI Grok',
      protocol: 'openai',
      base: 'https://api.x.ai/v1',
      modelsPath: '/models',
      keyUrl: 'https://console.x.ai',
      keyLabel: 'xAI API key',
      free: 'Paid.',
      models: ['grok-2-latest'],
    },
    {
      id: 'ollama',
      maxOutputTokens: 8192,
      name: 'Ollama — a model on your own machine',
      protocol: 'openai',
      base: 'http://localhost:11434/v1',
      modelsPath: '/models',
      keyUrl: 'https://ollama.com/download',
      keyLabel: 'No key needed',
      keyless: true,
      free: 'Completely free. Runs on your computer, nothing leaves it.',
      note: 'Install Ollama, run `ollama pull llama3.2`, and start it with '
        + 'OLLAMA_ORIGINS="*" so the browser is allowed to call it. Only works on the '
        + 'machine running Ollama — visitors to a published site cannot reach it.',
      models: ['llama3.2', 'qwen2.5', 'mistral', 'gemma2'],
    },
    {
      id: 'custom',
      maxOutputTokens: 8192,
      name: 'Custom — any OpenAI-compatible endpoint',
      protocol: 'openai',
      base: '',
      modelsPath: '/models',
      keyUrl: '',
      keyLabel: 'API key (leave blank if the endpoint needs none)',
      custom: true,
      free: 'Depends entirely on what you point it at.',
      note: 'For a host not listed here, a company gateway, vLLM, LM Studio, or your own '
        + 'proxy. Give the base URL up to and including /v1 — the app appends '
        + '/chat/completions itself.',
      models: [],
    },
  ];

  const byId = PROVIDERS.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

  /** Merge a stored connection over its catalogue entry. */
  function resolve(connection) {
    const conn = connection || {};
    const base = byId[conn.provider] || byId.custom;
    return Object.assign({}, base, {
      base: conn.baseUrl || base.base,
      model: conn.model || (base.models[0] || ''),
      key: conn.key || '',
    });
  }

  AFR.data = AFR.data || {};
  AFR.data.llmProviders = { all: PROVIDERS, byId, resolve };
})(window);
