/* ==========================================================================
 * languages.js — country-wise language selection.
 *
 * Two things depend on this:
 *
 *   1. The interface language. Translated strings live in core/i18n.js.
 *   2. The RECIPE language. Which matters more: the prompt sent to a hosted
 *      model instructs it to write every one of the 20 sections in the chosen
 *      language, so ingredients, steps, tips and safety notes all arrive
 *      translated rather than just the buttons around them.
 *
 * `uiReady: true` marks the languages whose interface strings are actually
 * translated. Every other language still works for recipe output — the app
 * says so rather than pretending the chrome is localised too.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  /* code, English name, native name, countries/regions, rtl?, uiReady? */
  const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English', countries: ['United Kingdom', 'United States', 'India', 'Australia', 'Canada'], uiReady: true },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', countries: ['India'], uiReady: true },
    { code: 'es', name: 'Spanish', native: 'Español', countries: ['Spain', 'Mexico', 'Argentina', 'Colombia'], uiReady: true },
    { code: 'fr', name: 'French', native: 'Français', countries: ['France', 'Belgium', 'Canada', 'Senegal'], uiReady: true },
    { code: 'ar', name: 'Arabic', native: 'العربية', countries: ['United Arab Emirates', 'Egypt', 'Saudi Arabia', 'Morocco'], rtl: true, uiReady: true },
    { code: 'de', name: 'German', native: 'Deutsch', countries: ['Germany', 'Austria', 'Switzerland'], uiReady: true },

    /* Recipe output works in all of these; the interface stays English. */
    { code: 'bn', name: 'Bengali', native: 'বাংলা', countries: ['India', 'Bangladesh'] },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்', countries: ['India', 'Sri Lanka', 'Singapore'] },
    { code: 'te', name: 'Telugu', native: 'తెలుగు', countries: ['India'] },
    { code: 'mr', name: 'Marathi', native: 'मराठी', countries: ['India'] },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', countries: ['India'] },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', countries: ['India'] },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം', countries: ['India'] },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', countries: ['India', 'Pakistan'] },
    { code: 'ur', name: 'Urdu', native: 'اردو', countries: ['Pakistan', 'India'], rtl: true },
    { code: 'pt', name: 'Portuguese', native: 'Português', countries: ['Portugal', 'Brazil'] },
    { code: 'it', name: 'Italian', native: 'Italiano', countries: ['Italy'] },
    { code: 'nl', name: 'Dutch', native: 'Nederlands', countries: ['Netherlands', 'Belgium'] },
    { code: 'ru', name: 'Russian', native: 'Русский', countries: ['Russia'] },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', countries: ['Türkiye'] },
    { code: 'zh', name: 'Chinese (Simplified)', native: '简体中文', countries: ['China', 'Singapore'] },
    { code: 'ja', name: 'Japanese', native: '日本語', countries: ['Japan'] },
    { code: 'ko', name: 'Korean', native: '한국어', countries: ['South Korea'] },
    { code: 'th', name: 'Thai', native: 'ไทย', countries: ['Thailand'] },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', countries: ['Vietnam'] },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', countries: ['Indonesia'] },
    { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', countries: ['Malaysia'] },
    { code: 'fil', name: 'Filipino', native: 'Filipino', countries: ['Philippines'] },
    { code: 'fa', name: 'Persian', native: 'فارسی', countries: ['Iran'], rtl: true },
    { code: 'he', name: 'Hebrew', native: 'עברית', countries: ['Israel'], rtl: true },
    { code: 'sw', name: 'Swahili', native: 'Kiswahili', countries: ['Kenya', 'Tanzania'] },
    { code: 'am', name: 'Amharic', native: 'አማርኛ', countries: ['Ethiopia'] },
    { code: 'pl', name: 'Polish', native: 'Polski', countries: ['Poland'] },
    { code: 'el', name: 'Greek', native: 'Ελληνικά', countries: ['Greece'] },
    { code: 'sv', name: 'Swedish', native: 'Svenska', countries: ['Sweden'] },
  ];

  const byCode = {};
  LANGUAGES.forEach((l) => { byCode[l.code] = l; });

  /** Every country that appears, each with the languages offered for it. */
  function byCountry() {
    const map = new Map();
    LANGUAGES.forEach((lang) => {
      (lang.countries || []).forEach((country) => {
        if (!map.has(country)) map.set(country, []);
        map.get(country).push(lang);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([country, langs]) => ({ country, languages: langs }));
  }

  function get(code) { return byCode[code] || byCode.en; }

  /** Best guess from the browser, so the first visit is already close. */
  function detect() {
    const tags = (global.navigator && (global.navigator.languages || [global.navigator.language])) || [];
    for (const tag of tags) {
      const base = String(tag || '').toLowerCase().split('-')[0];
      if (byCode[base]) return base;
    }
    return 'en';
  }

  AFR.data = AFR.data || {};
  AFR.data.languages = { all: LANGUAGES, byCode, byCountry, get, detect };
})(window);
