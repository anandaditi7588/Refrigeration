/* ==========================================================================
 * i18n.js — interface translation and text direction.
 *
 * Scope, stated plainly: this translates the INTERFACE — navigation, wizard
 * questions, section headings, buttons. The recipe body itself is translated
 * by whichever AI provider writes it (see prompt-builder.js), because the
 * built-in offline engine composes English prose from templates and cannot
 * translate itself. The UI says so rather than leaving you to discover it.
 *
 * Markup opts in with `data-i18n="key"`, so adding a string is a one-line
 * change in the catalogue and a one-attribute change in the HTML.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  /* English is the source of truth; every other catalogue may be partial and
     falls back key-by-key, so a missing translation shows English rather than
     an empty element or a raw key. */
  const CATALOG = {
    en: {
      'nav.home': 'Home',
      'nav.categories': 'Categories',
      'nav.trending': 'Trending',
      'nav.regional': 'Regional',
      'nav.create': 'Create a Dish',
      'nav.saved': 'Saved',
      'nav.about': 'About',
      'nav.setup': 'Live Data',
      'nav.language': 'Language',
      'nav.chooseLanguage': 'Choose your language',
      'nav.country': 'Country / region',

      'hero.eyebrow': 'Every country · Every cuisine',
      'hero.cta': 'Create Your Own Dish',
      'hero.browse': 'Browse categories',
      'hero.searchPlaceholder': 'Search any dish — biryani, pad thai, lasagna, sushi…',
      'hero.search': 'Search',

      'wizard.title': 'Create Your Own Dish',
      'wizard.progress': 'Progress',
      'wizard.answered': 'answered',
      'wizard.back': 'Back',
      'wizard.next': 'Next',
      'wizard.skip': 'Skip',
      'wizard.startOver': 'Start over',
      'wizard.generate': 'Generate Recipe',
      'wizard.step': 'Step',
      'wizard.of': 'of',

      'result.print': 'Print',
      'result.pdf': 'Download PDF',
      'result.share': 'Share',
      'result.save': 'Save',
      'result.saved': 'Saved',
      'result.expandAll': 'Expand all',
      'result.collapseAll': 'Collapse all',
      'result.again': 'Create another',
      'result.servings': 'Servings',
      'result.prepTime': 'Prep time',
      'result.cookTime': 'Cook time',
      'result.totalTime': 'Total time',

      'lang.recipeNotice': 'Recipes are written in this language only when an AI provider is configured. The built-in offline engine writes in English.',
      'lang.uiPartial': 'Recipe output uses this language; the interface stays in English.',
    },

    hi: {
      'nav.home': 'होम',
      'nav.categories': 'श्रेणियाँ',
      'nav.trending': 'लोकप्रिय',
      'nav.regional': 'क्षेत्रीय',
      'nav.create': 'व्यंजन बनाएँ',
      'nav.saved': 'सहेजे गए',
      'nav.setup': 'लाइव डेटा',
      'nav.language': 'भाषा',
      'nav.chooseLanguage': 'अपनी भाषा चुनें',
      'nav.country': 'देश / क्षेत्र',

      'hero.eyebrow': 'हर देश · हर व्यंजन',
      'hero.cta': 'अपना व्यंजन बनाएँ',
      'hero.browse': 'श्रेणियाँ देखें',
      'hero.searchPlaceholder': 'कोई भी व्यंजन खोजें — बिरयानी, पैड थाई, लज़ान्या, सुशी…',
      'hero.search': 'खोजें',

      'wizard.title': 'अपना व्यंजन बनाएँ',
      'wizard.progress': 'प्रगति',
      'wizard.answered': 'उत्तर दिए',
      'wizard.back': 'पीछे',
      'wizard.next': 'आगे',
      'wizard.skip': 'छोड़ें',
      'wizard.startOver': 'फिर से शुरू करें',
      'wizard.generate': 'रेसिपी बनाएँ',
      'wizard.step': 'चरण',
      'wizard.of': 'में से',

      'result.print': 'प्रिंट',
      'result.pdf': 'PDF डाउनलोड',
      'result.share': 'साझा करें',
      'result.save': 'सहेजें',
      'result.saved': 'सहेजा गया',
      'result.expandAll': 'सभी खोलें',
      'result.collapseAll': 'सभी बंद करें',
      'result.again': 'दूसरा बनाएँ',
      'result.servings': 'कितने लोगों के लिए',
      'result.prepTime': 'तैयारी का समय',
      'result.cookTime': 'पकाने का समय',
      'result.totalTime': 'कुल समय',

      'lang.recipeNotice': 'रेसिपी इस भाषा में तभी लिखी जाएगी जब कोई AI प्रोवाइडर कॉन्फ़िगर किया गया हो। बिल्ट-इन ऑफ़लाइन इंजन अंग्रेज़ी में लिखता है।',
      'lang.uiPartial': 'रेसिपी इस भाषा में आएगी; इंटरफ़ेस अंग्रेज़ी में रहेगा।',
    },

    es: {
      'nav.home': 'Inicio',
      'nav.categories': 'Categorías',
      'nav.trending': 'Tendencias',
      'nav.regional': 'Regional',
      'nav.create': 'Crear un plato',
      'nav.saved': 'Guardados',
      'nav.setup': 'Datos en vivo',
      'nav.language': 'Idioma',
      'nav.chooseLanguage': 'Elige tu idioma',
      'nav.country': 'País / región',

      'hero.eyebrow': 'Todos los países · Todas las cocinas',
      'hero.cta': 'Crea tu propio plato',
      'hero.browse': 'Ver categorías',
      'hero.searchPlaceholder': 'Busca cualquier plato — biryani, pad thai, lasaña, sushi…',
      'hero.search': 'Buscar',

      'wizard.title': 'Crea tu propio plato',
      'wizard.progress': 'Progreso',
      'wizard.answered': 'respondidas',
      'wizard.back': 'Atrás',
      'wizard.next': 'Siguiente',
      'wizard.skip': 'Omitir',
      'wizard.startOver': 'Empezar de nuevo',
      'wizard.generate': 'Generar receta',
      'wizard.step': 'Paso',
      'wizard.of': 'de',

      'result.print': 'Imprimir',
      'result.pdf': 'Descargar PDF',
      'result.share': 'Compartir',
      'result.save': 'Guardar',
      'result.saved': 'Guardado',
      'result.expandAll': 'Expandir todo',
      'result.collapseAll': 'Contraer todo',
      'result.again': 'Crear otro',
      'result.servings': 'Raciones',
      'result.prepTime': 'Preparación',
      'result.cookTime': 'Cocción',
      'result.totalTime': 'Tiempo total',

      'lang.recipeNotice': 'Las recetas se escriben en este idioma solo si hay un proveedor de IA configurado. El motor local integrado escribe en inglés.',
      'lang.uiPartial': 'La receta usará este idioma; la interfaz permanece en inglés.',
    },

    fr: {
      'nav.home': 'Accueil',
      'nav.categories': 'Catégories',
      'nav.trending': 'Tendances',
      'nav.regional': 'Régional',
      'nav.create': 'Créer un plat',
      'nav.saved': 'Enregistrés',
      'nav.setup': 'Données en direct',
      'nav.language': 'Langue',
      'nav.chooseLanguage': 'Choisissez votre langue',
      'nav.country': 'Pays / région',

      'hero.eyebrow': 'Tous les pays · Toutes les cuisines',
      'hero.cta': 'Créez votre plat',
      'hero.browse': 'Parcourir les catégories',
      'hero.searchPlaceholder': 'Cherchez un plat — biryani, pad thaï, lasagnes, sushi…',
      'hero.search': 'Rechercher',

      'wizard.title': 'Créez votre plat',
      'wizard.progress': 'Progression',
      'wizard.answered': 'répondues',
      'wizard.back': 'Retour',
      'wizard.next': 'Suivant',
      'wizard.skip': 'Passer',
      'wizard.startOver': 'Recommencer',
      'wizard.generate': 'Générer la recette',
      'wizard.step': 'Étape',
      'wizard.of': 'sur',

      'result.print': 'Imprimer',
      'result.pdf': 'Télécharger le PDF',
      'result.share': 'Partager',
      'result.save': 'Enregistrer',
      'result.saved': 'Enregistré',
      'result.expandAll': 'Tout déplier',
      'result.collapseAll': 'Tout replier',
      'result.again': 'En créer un autre',
      'result.servings': 'Portions',
      'result.prepTime': 'Préparation',
      'result.cookTime': 'Cuisson',
      'result.totalTime': 'Temps total',

      'lang.recipeNotice': "Les recettes sont rédigées dans cette langue uniquement si un fournisseur d'IA est configuré. Le moteur local intégré écrit en anglais.",
      'lang.uiPartial': "La recette utilisera cette langue ; l'interface reste en anglais.",
    },

    de: {
      'nav.home': 'Start',
      'nav.categories': 'Kategorien',
      'nav.trending': 'Beliebt',
      'nav.regional': 'Regional',
      'nav.create': 'Gericht erstellen',
      'nav.saved': 'Gespeichert',
      'nav.setup': 'Live-Daten',
      'nav.language': 'Sprache',
      'nav.chooseLanguage': 'Sprache wählen',
      'nav.country': 'Land / Region',

      'hero.eyebrow': 'Jedes Land · Jede Küche',
      'hero.cta': 'Eigenes Gericht erstellen',
      'hero.browse': 'Kategorien ansehen',
      'hero.searchPlaceholder': 'Gericht suchen — Biryani, Pad Thai, Lasagne, Sushi…',
      'hero.search': 'Suchen',

      'wizard.title': 'Eigenes Gericht erstellen',
      'wizard.progress': 'Fortschritt',
      'wizard.answered': 'beantwortet',
      'wizard.back': 'Zurück',
      'wizard.next': 'Weiter',
      'wizard.skip': 'Überspringen',
      'wizard.startOver': 'Neu beginnen',
      'wizard.generate': 'Rezept erstellen',
      'wizard.step': 'Schritt',
      'wizard.of': 'von',

      'result.print': 'Drucken',
      'result.pdf': 'PDF herunterladen',
      'result.share': 'Teilen',
      'result.save': 'Speichern',
      'result.saved': 'Gespeichert',
      'result.expandAll': 'Alle öffnen',
      'result.collapseAll': 'Alle schließen',
      'result.again': 'Weiteres erstellen',
      'result.servings': 'Portionen',
      'result.prepTime': 'Vorbereitung',
      'result.cookTime': 'Garzeit',
      'result.totalTime': 'Gesamtzeit',

      'lang.recipeNotice': 'Rezepte werden nur dann in dieser Sprache verfasst, wenn ein KI-Anbieter konfiguriert ist. Die integrierte Offline-Engine schreibt auf Englisch.',
      'lang.uiPartial': 'Das Rezept erscheint in dieser Sprache; die Oberfläche bleibt englisch.',
    },

    ar: {
      'nav.home': 'الرئيسية',
      'nav.categories': 'الفئات',
      'nav.trending': 'الأكثر رواجًا',
      'nav.regional': 'إقليمي',
      'nav.create': 'أنشئ طبقًا',
      'nav.saved': 'المحفوظات',
      'nav.setup': 'البيانات المباشرة',
      'nav.language': 'اللغة',
      'nav.chooseLanguage': 'اختر لغتك',
      'nav.country': 'الدولة / المنطقة',

      'hero.eyebrow': 'كل بلد · كل مطبخ',
      'hero.cta': 'أنشئ طبقك الخاص',
      'hero.browse': 'تصفح الفئات',
      'hero.searchPlaceholder': 'ابحث عن أي طبق — برياني، باد تاي، لازانيا، سوشي…',
      'hero.search': 'بحث',

      'wizard.title': 'أنشئ طبقك الخاص',
      'wizard.progress': 'التقدم',
      'wizard.answered': 'تمت الإجابة',
      'wizard.back': 'رجوع',
      'wizard.next': 'التالي',
      'wizard.skip': 'تخطٍ',
      'wizard.startOver': 'ابدأ من جديد',
      'wizard.generate': 'أنشئ الوصفة',
      'wizard.step': 'خطوة',
      'wizard.of': 'من',

      'result.print': 'طباعة',
      'result.pdf': 'تنزيل PDF',
      'result.share': 'مشاركة',
      'result.save': 'حفظ',
      'result.saved': 'تم الحفظ',
      'result.expandAll': 'توسيع الكل',
      'result.collapseAll': 'طي الكل',
      'result.again': 'أنشئ وصفة أخرى',
      'result.servings': 'عدد الحصص',
      'result.prepTime': 'وقت التحضير',
      'result.cookTime': 'وقت الطهي',
      'result.totalTime': 'الوقت الإجمالي',

      'lang.recipeNotice': 'تُكتب الوصفات بهذه اللغة فقط عند تهيئة مزوّد ذكاء اصطناعي. المحرك المدمج دون اتصال يكتب بالإنجليزية.',
      'lang.uiPartial': 'ستظهر الوصفة بهذه اللغة؛ أما الواجهة فتبقى بالإنجليزية.',
    },
  };

  let current = 'en';

  /** Translate a key, falling back to English and then to the key itself. */
  function t(key, fallback) {
    const table = CATALOG[current] || {};
    if (table[key]) return table[key];
    if (CATALOG.en[key]) return CATALOG.en[key];
    return fallback !== undefined ? fallback : key;
  }

  /** Apply the current language to every `data-i18n` element on the page. */
  function apply(root = document) {
    const UI = AFR.ui;
    UI.qsa('[data-i18n]', root).forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    UI.qsa('[data-i18n-placeholder]', root).forEach((node) => {
      node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
    });
    UI.qsa('[data-i18n-label]', root).forEach((node) => {
      node.setAttribute('aria-label', t(node.dataset.i18nLabel));
    });
  }

  function setLanguage(code, opts = {}) {
    const lang = AFR.data.languages.get(code);
    current = lang.code;
    AFR.store.set('language', lang.code);

    document.documentElement.setAttribute('lang', lang.code);
    /* Right-to-left scripts need the whole document flipped, not just text. */
    document.documentElement.setAttribute('dir', lang.rtl ? 'rtl' : 'ltr');

    apply();
    if (!opts.silent) {
      document.dispatchEvent(new CustomEvent('afr:languagechange', { detail: { language: lang } }));
    }
    return lang;
  }

  function init() {
    const saved = AFR.store.get('language');
    setLanguage(saved || AFR.data.languages.detect(), { silent: true });
  }

  AFR.i18n = {
    t,
    apply,
    setLanguage,
    init,
    get current() { return current; },
    get language() { return AFR.data.languages.get(current); },
    /** Is the interface itself translated, or only the recipe output? */
    get uiTranslated() { return Boolean(AFR.data.languages.get(current).uiReady); },
    catalog: CATALOG,
  };
})(window);
