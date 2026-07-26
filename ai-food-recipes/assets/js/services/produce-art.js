/* ==========================================================================
 * produce-art.js — drawn illustrations for individual ingredients.
 *
 * Why this exists
 * ---------------
 * Real photographs are better, and the app fetches them from Wikimedia and
 * TheMealDB whenever it can reach the network (see image-service.js). But two
 * situations are permanent: a published Artifact page blocks every external
 * request, and any photo source can be down or missing an entry for, say,
 * ridge gourd. The fallback used to be an emoji in a tinted square, which
 * looked like a placeholder because it was one.
 *
 * These are proper vector illustrations — one per ingredient, drawn to a
 * common 96x96 grid, sharing a palette with the rest of the interface. They
 * cost nothing to load, scale to any size, work offline, and carry no
 * licensing questions.
 *
 * Adding one is a single entry: a function returning SVG body markup.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});

  /* Shared bits so the set looks like one hand drew it. --------------- */

  /** Soft ground shadow — every item sits on the same surface. */
  const shadow = (cx = 48, cy = 84, rx = 26, ry = 5) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".10"/>`;

  /** A highlight arc, so round things read as three-dimensional. */
  const gloss = (d, opacity = 0.45) =>
    `<path d="${d}" fill="#fff" opacity="${opacity}"/>`;

  const leaf = (x, y, rot, fill = '#4e9a4a') =>
    `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 0 C 8 -10 20 -12 26 -6 C 20 2 8 4 0 0 Z" fill="${fill}"/>`;

  /* ---------------------------------------------------------------------- */
  /* The drawings                                                           */
  /* ---------------------------------------------------------------------- */

  const ART = {
    tomato: () => `${shadow()}
      <path d="M48 26 C 30 26 20 40 20 54 C 20 70 33 82 48 82 C 63 82 76 70 76 54 C 76 40 66 26 48 26 Z" fill="#e0402f"/>
      <path d="M48 26 C 38 26 30 33 26 42 C 34 34 40 31 48 31 Z" fill="#f0644f" opacity=".8"/>
      ${gloss('M34 42 C 38 34 46 31 52 33 C 45 35 39 39 36 46 Z', .5)}
      <path d="M48 20 L44 27 L52 27 Z" fill="#3f7d33"/>
      <path d="M48 27 C 40 20 32 22 30 26 C 36 28 42 28 48 27 Z" fill="#4e9a4a"/>
      <path d="M48 27 C 56 20 64 22 66 26 C 60 28 54 28 48 27 Z" fill="#4e9a4a"/>`,

    onion: () => `${shadow()}
      <path d="M48 24 C 30 30 22 46 24 60 C 26 74 36 82 48 82 C 60 82 70 74 72 60 C 74 46 66 30 48 24 Z" fill="#c98a5e"/>
      <path d="M48 30 C 38 38 34 50 36 62 C 38 72 42 78 48 79 C 42 70 40 58 42 48 C 43 41 45 34 48 30 Z" fill="#e0a97c" opacity=".85"/>
      <path d="M48 30 C 58 38 62 50 60 62 C 58 72 54 78 48 79 C 54 70 56 58 54 48 C 53 41 51 34 48 30 Z" fill="#b0714a" opacity=".55"/>
      <path d="M44 24 L48 12 L52 24 C 50 22 46 22 44 24 Z" fill="#8fae5a"/>`,

    /* A bulb: wide flat base, domed top, visible cloves and a papery neck. */
    garlic: () => `${shadow(48, 84, 24, 4)}
      <path d="M48 24 C 44 32 42 38 42 42 L54 42 C 54 38 52 32 48 24 Z" fill="#e3ddd0"/>
      <path d="M24 60 C 24 48 34 40 48 40 C 62 40 72 48 72 60 C 72 72 62 80 48 80 C 34 80 24 72 24 60 Z" fill="#f6f1e7"/>
      <path d="M32 62 C 32 50 38 42 48 41 C 43 50 41 62 43 76 C 37 74 32 69 32 62 Z" fill="#e6dece"/>
      <path d="M64 62 C 64 50 58 42 48 41 C 53 50 55 62 53 76 C 59 74 64 69 64 62 Z" fill="#dcd2bf"/>
      <path d="M48 41 C 44 52 43 66 45 79 L51 79 C 53 66 52 52 48 41 Z" fill="#fffdf8"/>
      ${gloss('M34 56 C 36 48 41 43 46 42 C 40 47 37 52 36 60 Z', .4)}`,

    /* A knobbly rhizome: one long body with two side knobs and cut faces. */
    ginger: () => `${shadow(48, 82, 27, 5)}
      <path d="M20 58 C 20 48 28 42 38 44 C 44 36 56 36 62 44 C 72 42 80 48 78 58 C 76 68 66 72 56 70 C 50 78 38 78 32 70 C 24 70 20 66 20 58 Z" fill="#d5a165"/>
      <path d="M26 56 C 28 50 34 47 40 49 C 34 51 30 54 28 60 Z" fill="#e9c188" opacity=".85"/>
      <path d="M60 44 C 66 36 74 38 76 44 C 70 43 65 45 62 49 Z" fill="#bd8a48"/>
      <path d="M36 44 C 36 36 42 32 47 34 C 42 37 39 40 38 45 Z" fill="#bd8a48"/>
      <ellipse cx="74" cy="53" rx="6" ry="7" fill="#f3dcb8"/>
      <ellipse cx="74" cy="53" rx="3.4" ry="4" fill="#e0bd8a"/>
      <path d="M34 62 C 42 64 54 64 62 61" stroke="#b9853f" stroke-width="1.4" fill="none" opacity=".7"/>`,

    'green-chilli': () => `${shadow(48, 84, 20, 4)}
      <path d="M56 20 C 52 22 50 26 51 30 C 44 34 34 44 30 58 C 26 72 34 82 46 80 C 60 78 68 62 68 46 C 68 36 63 28 56 20 Z" fill="#4aa03f"/>
      <path d="M56 30 C 50 36 44 46 41 58 C 38 70 42 76 48 75 C 44 70 43 62 46 52 C 48 44 52 36 56 30 Z" fill="#6dbf5c" opacity=".85"/>
      <path d="M52 22 C 54 14 60 12 64 16 C 60 17 56 19 54 24 Z" fill="#3d7a33"/>`,

    potato: () => `${shadow()}
      <ellipse cx="48" cy="54" rx="30" ry="24" fill="#c9a173" transform="rotate(-8 48 54)"/>
      ${gloss('M30 44 C 36 36 48 33 58 36 C 46 37 36 41 32 50 Z', .35)}
      <ellipse cx="38" cy="48" rx="3" ry="2" fill="#a07e52" opacity=".8"/>
      <ellipse cx="56" cy="58" rx="3.5" ry="2.4" fill="#a07e52" opacity=".8"/>
      <ellipse cx="50" cy="42" rx="2.4" ry="1.8" fill="#a07e52" opacity=".6"/>`,

    carrot: () => `${shadow(48, 84, 18, 4)}
      <path d="M44 30 L52 30 L50 80 C 49 83 47 83 46 80 Z" fill="#e2762b"/>
      <path d="M46 30 L50 30 L49 76 Z" fill="#f0954f" opacity=".7"/>
      <path d="M45 44 L51 46 M45 54 L51 56 M46 64 L50 65" stroke="#c05f1c" stroke-width="1.6" stroke-linecap="round"/>
      ${leaf(48, 28, -60, '#4e9a4a')}${leaf(48, 28, -95, '#5cb054')}${leaf(48, 28, -130, '#4e9a4a')}`,

    spinach: () => `${shadow(48, 84, 26, 5)}
      <path d="M48 78 C 46 62 44 48 40 36" stroke="#3f7d33" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M40 36 C 26 30 16 40 20 54 C 24 68 40 70 46 60 C 48 52 46 42 40 36 Z" fill="#3f8f3a"/>
      <path d="M40 36 C 36 44 36 54 40 62" stroke="#2f6b2b" stroke-width="1.6" fill="none"/>
      <path d="M52 40 C 66 32 78 42 74 56 C 70 70 54 72 50 62 C 48 54 48 46 52 40 Z" fill="#4ea343"/>
      <path d="M52 40 C 55 48 55 56 52 64" stroke="#357a30" stroke-width="1.6" fill="none"/>
      ${gloss('M26 44 C 30 38 36 36 40 38 C 34 40 30 42 28 48 Z', .3)}`,

    'coriander-leaves': () => `${shadow(48, 84, 22, 4)}
      <path d="M48 80 C 48 66 48 54 48 44" stroke="#3f7d33" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M48 44 C 38 34 26 38 26 48 C 26 56 38 58 44 52 Z" fill="#57ad4b"/>
      <path d="M48 44 C 58 34 70 38 70 48 C 70 56 58 58 52 52 Z" fill="#4a9c40"/>
      <path d="M48 34 C 42 24 46 16 52 16 C 58 18 56 30 48 34 Z" fill="#63bd55"/>
      <path d="M40 58 C 32 56 26 60 28 66 C 32 70 40 66 42 60 Z" fill="#4a9c40" opacity=".9"/>
      <path d="M56 58 C 64 56 70 60 68 66 C 64 70 56 66 54 60 Z" fill="#57ad4b" opacity=".9"/>`,

    'curry-leaves': () => `${shadow(48, 84, 20, 4)}
      <path d="M48 82 C 48 62 48 42 48 26" stroke="#3a6f30" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      ${leaf(48, 34, -30, '#3f8f3a')}${leaf(48, 34, -150, '#4ea343')}
      ${leaf(48, 50, -25, '#4ea343')}${leaf(48, 50, -155, '#3f8f3a')}
      ${leaf(48, 66, -20, '#3f8f3a')}${leaf(48, 66, -160, '#4ea343')}`,

    cauliflower: () => `${shadow()}
      <path d="M30 74 L34 60 L62 60 L66 74 Z" fill="#8fb46a"/>
      <circle cx="48" cy="44" r="24" fill="#f4efe0"/>
      <circle cx="36" cy="42" r="10" fill="#fbf7ec"/>
      <circle cx="52" cy="36" r="11" fill="#fbf7ec"/>
      <circle cx="60" cy="48" r="9" fill="#f0e9d6"/>
      <circle cx="42" cy="54" r="9" fill="#f0e9d6"/>
      <path d="M24 52 C 20 62 26 66 34 62 C 30 58 26 56 24 52 Z" fill="#7ea45c"/>
      <path d="M72 52 C 76 62 70 66 62 62 C 66 58 70 56 72 52 Z" fill="#7ea45c"/>`,

    eggplant: () => `${shadow()}
      <path d="M56 30 C 72 34 78 52 70 66 C 62 80 42 82 32 72 C 22 62 26 42 40 34 C 45 31 51 29 56 30 Z" fill="#6b3f96"/>
      ${gloss('M40 42 C 46 36 54 34 60 37 C 50 38 44 42 40 50 Z', .3)}
      <path d="M50 30 C 46 22 40 20 36 22 C 40 26 44 28 48 30 Z" fill="#4a8f3f"/>
      <path d="M52 30 C 58 22 64 22 66 26 C 60 26 56 28 52 30 Z" fill="#57a749"/>
      <path d="M50 30 L52 18" stroke="#3f7d33" stroke-width="3" stroke-linecap="round"/>`,

    okra: () => `${shadow(48, 84, 20, 4)}
      <path d="M42 24 L54 24 L56 34 C 60 48 58 66 50 80 C 48 83 46 83 44 80 C 38 66 36 48 40 34 Z" fill="#5aa845"/>
      <path d="M46 32 C 44 48 45 64 48 76 C 51 64 52 48 50 32 Z" fill="#79c161" opacity=".7"/>
      <path d="M42 24 C 44 18 52 18 54 24 Z" fill="#3f7d33"/>
      <path d="M43 40 L45 70 M53 40 L51 70" stroke="#3f8f3a" stroke-width="1.2" opacity=".7"/>`,

    peas: () => `${shadow(48, 84, 24, 4)}
      <path d="M20 52 C 26 38 44 32 62 36 C 76 39 80 50 74 60 C 66 72 44 74 30 68 C 22 64 18 58 20 52 Z" fill="#4e9a4a"/>
      <path d="M24 54 C 30 44 46 40 60 43 C 70 45 73 52 69 58 C 62 66 42 68 32 64 C 26 61 23 58 24 54 Z" fill="#6fbf5c"/>
      <circle cx="36" cy="54" r="7" fill="#8ed37a"/><circle cx="50" cy="52" r="7" fill="#8ed37a"/>
      <circle cx="63" cy="53" r="6" fill="#8ed37a"/>
      ${gloss('M33 50 C 35 47 39 47 40 49 C 37 49 35 50 34 52 Z', .5)}`,

    'bell-pepper': () => `${shadow()}
      <path d="M30 40 C 24 52 26 68 36 76 C 46 84 62 80 68 68 C 74 56 70 42 60 38 C 50 34 36 34 30 40 Z" fill="#d93b2b"/>
      <path d="M40 42 C 34 54 36 68 44 74 C 40 62 40 50 44 42 Z" fill="#ee6752" opacity=".75"/>
      ${gloss('M34 46 C 38 40 44 38 48 40 C 42 42 38 46 36 52 Z', .35)}
      <path d="M44 36 C 44 28 52 28 52 36 Z" fill="#4e9a4a"/>
      <path d="M48 32 L48 22" stroke="#3f7d33" stroke-width="3.4" stroke-linecap="round"/>`,

    cucumber: () => `${shadow(48, 84, 24, 4)}
      <path d="M26 70 C 18 58 24 38 40 28 C 56 18 74 24 76 36 C 78 50 62 66 46 74 C 38 78 30 78 26 70 Z" fill="#3f8f3a"/>
      <path d="M32 66 C 26 56 32 42 44 34 C 56 26 68 30 70 38 C 60 34 48 40 40 50 C 34 56 32 62 32 66 Z" fill="#5cb054" opacity=".8"/>
      <circle cx="40" cy="54" r="2" fill="#2f6b2b" opacity=".5"/>
      <circle cx="52" cy="44" r="2" fill="#2f6b2b" opacity=".5"/>
      <circle cx="62" cy="38" r="2" fill="#2f6b2b" opacity=".5"/>`,

    cabbage: () => `${shadow()}
      <circle cx="48" cy="52" r="27" fill="#8fc06f"/>
      <path d="M48 25 C 34 30 26 42 28 56 C 36 46 42 34 48 25 Z" fill="#a9d489"/>
      <path d="M48 25 C 62 30 70 42 68 56 C 60 46 54 34 48 25 Z" fill="#7ab05e"/>
      <path d="M30 60 C 38 54 44 48 48 40 C 52 48 58 54 66 60 C 58 72 38 72 30 60 Z" fill="#bcdf9c" opacity=".9"/>
      <path d="M48 40 L48 74" stroke="#6fa054" stroke-width="1.6" opacity=".6"/>`,

    pumpkin: () => `${shadow()}
      <ellipse cx="48" cy="56" rx="30" ry="24" fill="#e08b2a"/>
      <ellipse cx="38" cy="56" rx="12" ry="24" fill="#ef9f42" opacity=".8"/>
      <ellipse cx="58" cy="56" rx="12" ry="24" fill="#c9761d" opacity=".55"/>
      <path d="M48 32 L48 22" stroke="#6f8f3a" stroke-width="4" stroke-linecap="round"/>
      <path d="M48 24 C 56 18 62 22 60 28 C 56 24 52 24 48 26 Z" fill="#7ea45c"/>`,

    beetroot: () => `${shadow(48, 84, 22, 4)}
      <path d="M48 34 C 32 38 26 54 34 68 C 42 82 56 82 62 68 C 70 54 64 38 48 34 Z" fill="#9c2a55"/>
      ${gloss('M38 46 C 42 40 50 38 56 41 C 46 42 40 46 37 54 Z', .25)}
      <path d="M48 82 C 50 86 52 88 54 90" stroke="#7a1f42" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M44 34 C 38 22 42 14 48 14 C 54 16 52 28 44 34 Z" fill="#4e9a4a"/>
      <path d="M52 34 C 60 24 68 24 68 30 C 62 30 56 32 52 36 Z" fill="#3f8f3a"/>`,

    'bottle-gourd': () => `${shadow(48, 84, 22, 4)}
      <path d="M48 20 C 44 20 42 26 43 32 C 34 40 28 56 32 70 C 36 82 60 82 64 70 C 68 56 62 40 53 32 C 54 26 52 20 48 20 Z" fill="#8fc06f"/>
      <path d="M44 36 C 38 46 36 60 40 72 C 42 76 46 78 48 78 C 44 68 43 52 46 40 Z" fill="#a9d489" opacity=".8"/>
      <path d="M46 20 C 46 14 50 14 50 20 Z" fill="#6f8f3a"/>`,

    mushroom: () => `${shadow(48, 84, 18, 4)}
      <path d="M42 60 C 40 70 40 78 42 82 L54 82 C 56 78 56 70 54 60 Z" fill="#efe6d6"/>
      <path d="M22 58 C 22 40 34 28 48 28 C 62 28 74 40 74 58 C 66 64 30 64 22 58 Z" fill="#a97c53"/>
      <path d="M32 50 C 34 40 40 34 48 33 C 40 36 36 42 34 52 Z" fill="#c69a6c" opacity=".8"/>
      <path d="M22 58 C 30 62 66 62 74 58 C 66 60 30 60 22 58 Z" fill="#8a6440"/>`,

    corn: () => `${shadow(48, 84, 18, 4)}
      <path d="M48 22 C 36 30 32 48 34 64 C 36 76 42 82 48 82 C 54 82 60 76 62 64 C 64 48 60 30 48 22 Z" fill="#e9b93a"/>
      <path d="M40 36 L56 36 M38 46 L58 46 M38 56 L58 56 M40 66 L56 66" stroke="#c99a1e" stroke-width="1.6" opacity=".7"/>
      <path d="M44 30 L44 76 M52 30 L52 76" stroke="#c99a1e" stroke-width="1.4" opacity=".55"/>
      <path d="M34 50 C 22 44 18 56 24 66 C 28 60 30 54 34 50 Z" fill="#5cb054"/>
      <path d="M62 50 C 74 44 78 56 72 66 C 68 60 66 54 62 50 Z" fill="#4e9a4a"/>`,

    lemon: () => `${shadow(48, 84, 20, 4)}
      <ellipse cx="48" cy="54" rx="27" ry="22" fill="#f0c419"/>
      ${gloss('M32 44 C 38 37 48 34 56 37 C 45 38 38 42 34 50 Z', .45)}
      <path d="M75 52 C 79 50 80 54 77 57 Z" fill="#d9a913"/>
      <path d="M21 52 C 17 50 16 54 19 57 Z" fill="#d9a913"/>
      <path d="M48 32 L48 26" stroke="#7ea45c" stroke-width="3" stroke-linecap="round"/>`,

    coconut: () => `${shadow()}
      <circle cx="48" cy="54" r="26" fill="#7a5230"/>
      <path d="M30 42 C 36 34 48 31 58 34 C 46 36 36 40 32 48 Z" fill="#96683f" opacity=".7"/>
      <circle cx="40" cy="44" r="3" fill="#4f341c"/><circle cx="52" cy="42" r="3" fill="#4f341c"/>
      <circle cx="46" cy="52" r="3" fill="#4f341c"/>
      <path d="M48 28 C 40 20 34 22 32 26 C 38 26 44 27 48 30 Z" fill="#4e9a4a"/>`,

    paneer: () => `${shadow(48, 84, 26, 4)}
      <path d="M22 44 L48 32 L74 44 L74 70 L48 82 L22 70 Z" fill="#fbf5e8"/>
      <path d="M22 44 L48 56 L48 82 L22 70 Z" fill="#eee3cd"/>
      <path d="M48 56 L74 44 L74 70 L48 82 Z" fill="#e2d4b9"/>
      <path d="M22 44 L48 32 L74 44 L48 56 Z" fill="#fffcf5"/>`,

    egg: () => `${shadow(48, 84, 20, 4)}
      <ellipse cx="48" cy="72" rx="30" ry="12" fill="#fdfaf2"/>
      <path d="M18 70 C 20 58 30 54 40 58 C 48 50 62 52 66 62 C 76 62 80 70 76 74 C 60 80 32 80 18 70 Z" fill="#fdfaf2"/>
      <circle cx="50" cy="66" r="12" fill="#f2b21e"/>
      ${gloss('M44 60 C 46 57 51 56 54 58 C 49 59 46 61 45 64 Z', .5)}`,

    rice: () => `${shadow(48, 84, 26, 5)}
      <path d="M20 66 C 24 50 34 42 48 42 C 62 42 72 50 76 66 Z" fill="#fbf6ec"/>
      <path d="M20 66 C 30 72 66 72 76 66 C 72 76 24 76 20 66 Z" fill="#e8dcc6"/>
      <ellipse cx="38" cy="56" rx="5" ry="2.4" fill="#fff" transform="rotate(-25 38 56)"/>
      <ellipse cx="52" cy="52" rx="5" ry="2.4" fill="#fff" transform="rotate(15 52 52)"/>
      <ellipse cx="60" cy="60" rx="5" ry="2.4" fill="#fff" transform="rotate(-10 60 60)"/>`,

    'toor-dal': () => `${shadow(48, 84, 24, 5)}
      <path d="M22 62 C 22 50 32 44 48 44 C 64 44 74 50 74 62 C 74 72 62 78 48 78 C 34 78 22 72 22 62 Z" fill="#e8b64c"/>
      <ellipse cx="38" cy="56" rx="6" ry="4.4" fill="#f4cd76"/>
      <ellipse cx="52" cy="54" rx="6" ry="4.4" fill="#f4cd76"/>
      <ellipse cx="60" cy="62" rx="6" ry="4.4" fill="#f4cd76"/>
      <ellipse cx="44" cy="66" rx="6" ry="4.4" fill="#f4cd76"/>`,

    chicken: () => `${shadow(48, 84, 22, 4)}
      <path d="M34 34 C 46 24 62 28 68 40 C 74 52 68 68 56 74 C 44 80 30 74 28 62 C 26 50 28 40 34 34 Z" fill="#e8b98e"/>
      ${gloss('M38 42 C 44 34 54 32 60 36 C 50 38 42 42 39 50 Z', .35)}
      <path d="M32 68 C 26 76 22 82 26 86 L34 82 C 32 76 32 72 34 70 Z" fill="#f4ece0"/>`,

    fish: () => `${shadow(48, 84, 24, 4)}
      <path d="M18 56 C 26 42 46 36 62 42 C 74 46 80 54 80 58 C 74 68 52 76 36 70 C 26 66 20 62 18 56 Z" fill="#7fa8c9"/>
      <path d="M18 56 C 26 46 44 42 58 46 C 46 46 32 50 24 60 Z" fill="#a3c4dd" opacity=".8"/>
      <path d="M80 58 L92 48 L92 70 Z" fill="#6a93b5"/>
      <circle cx="34" cy="54" r="3" fill="#25415a"/>`,

    /* Powders and pastes share one bowl so they read as a family. */
    /* A heaped bowl. The mound has to sit well above the rim or the tile reads
       as an empty dish — which is how the first version looked. */
    spiceBowl: (color, top) => `${shadow(48, 84, 26, 5)}
      <path d="M22 56 C 30 34 66 34 74 56 C 66 60 30 60 22 56 Z" fill="${color}"/>
      <path d="M32 48 C 38 38 52 36 58 42 C 48 41 40 43 34 51 Z" fill="${top}" opacity=".85"/>
      <path d="M18 58 C 18 74 32 84 48 84 C 64 84 78 74 78 58 Z" fill="#f3ece0"/>
      <path d="M18 58 C 28 64 68 64 78 58 C 78 62 74 66 70 68 C 58 72 38 72 26 68 C 22 66 18 62 18 58 Z" fill="#ddd0bb"/>
      <path d="M22 56 C 32 62 64 62 74 56 C 64 61 32 61 22 56 Z" fill="${color}" opacity=".9"/>
      ${gloss('M28 66 C 34 70 44 71 50 70 C 40 72 32 70 28 68 Z', .35)}`,

    oil: () => `${shadow(48, 84, 16, 4)}
      <path d="M42 26 L54 26 L54 34 C 62 40 64 50 64 62 C 64 76 58 82 48 82 C 38 82 32 76 32 62 C 32 50 34 40 42 34 Z" fill="#e8c56a" opacity=".55"/>
      <path d="M34 58 C 34 48 38 42 44 38 L52 38 C 58 42 62 48 62 58 C 62 72 56 78 48 78 C 40 78 34 72 34 58 Z" fill="#e5a72c"/>
      <rect x="41" y="18" width="14" height="10" rx="2" fill="#6f5a3a"/>
      ${gloss('M38 56 C 38 48 41 44 45 42 C 41 48 40 52 40 58 Z', .35)}`,
  };

  /* Spice powders, coloured individually but drawn identically. */
  const SPICES = {
    turmeric: ['#e0a21a', '#f2c452'],
    'red-chilli-powder': ['#c2331f', '#e05a42'],
    paprika: ['#cf4a26', '#ea7449'],
    'coriander-powder': ['#a58b4a', '#c4ac72'],
    'garam-masala': ['#7a5230', '#9c7148'],
    cumin: ['#8a6a3c', '#ab8a58'],
    salt: ['#f4f1ea', '#ffffff'],
    'black-pepper': ['#3f3a33', '#5d564c'],
    besan: ['#e5c463', '#f2da92'],
    'wheat-flour': ['#e8dcc0', '#f6efdd'],
    'all-purpose-flour': ['#f4efe4', '#fffdf8'],
    sugar: ['#f6f3ec', '#ffffff'],
    jaggery: ['#9c6321', '#bd8340'],
    'sambar-powder': ['#b8461f', '#d46a40'],
    'pav-bhaji-masala': ['#a83a22', '#c85c3e'],
    'chole-masala': ['#8f5330', '#ad7150'],
  };

  Object.keys(SPICES).forEach((id) => {
    const [base, top] = SPICES[id];
    ART[id] = () => ART.spiceBowl(base, top);
  });

  /* Ingredients that look near enough alike to share a drawing. */
  const ALIAS = {
    'cherry-tomato': 'tomato', 'tomato-puree': 'tomato',
    'spring-onion': 'onion', shallot: 'onion',
    'red-chilli': 'green-chilli', 'dried-red-chilli': 'green-chilli',
    'sweet-potato': 'potato', colocasia: 'potato', yam: 'potato', tinda: 'potato',
    'amaranth-leaves': 'spinach', 'mustard-greens': 'spinach', 'fenugreek-leaves': 'spinach',
    lettuce: 'spinach', 'kasuri-methi': 'spinach',
    mint: 'coriander-leaves', basil: 'coriander-leaves', parsley: 'coriander-leaves',
    oregano: 'coriander-leaves', thyme: 'coriander-leaves', rosemary: 'coriander-leaves',
    broccoli: 'cauliflower',
    zucchini: 'cucumber', 'ridge-gourd': 'bottle-gourd', 'ash-gourd': 'bottle-gourd',
    'bitter-gourd': 'okra', drumstick: 'okra', 'cluster-beans': 'okra', 'green-beans': 'okra',
    radish: 'carrot', 'raw-banana': 'carrot',
    lime: 'lemon', orange: 'lemon',
    cheese: 'paneer', tofu: 'paneer', butter: 'paneer',
    'chicken-thigh': 'chicken', mutton: 'chicken', beef: 'chicken', pork: 'chicken',
    prawns: 'fish', squid: 'fish',
    'brown-rice': 'rice', quinoa: 'rice', poha: 'rice', semolina: 'rice', sabudana: 'rice',
    'idli-rice': 'rice', 'rice-flour': 'wheat-flour', 'jowar-flour': 'wheat-flour',
    'moong-dal': 'toor-dal', 'chana-dal': 'toor-dal', 'urad-dal': 'toor-dal',
    lentils: 'toor-dal', chickpeas: 'toor-dal', 'kidney-beans': 'toor-dal',
    'black-beans': 'toor-dal', 'moth-beans': 'toor-dal', 'soy-chunks': 'toor-dal',
    'olive-oil': 'oil', 'sesame-oil': 'oil', 'coconut-oil': 'oil', ghee: 'oil',
    'mustard-oil': 'oil', honey: 'oil', 'maple-syrup': 'oil',
    milk: 'paneer', yogurt: 'paneer', cream: 'paneer', 'condensed-milk': 'paneer',
    'coconut-milk': 'coconut',
  };

  /* The tinted card each drawing sits on, by ingredient family. */
  const BACKDROP = {
    vegetables: ['#eaf6e6', '#d6ecd0'],
    fruits: ['#fdf3e0', '#fae4c4'],
    herbs: ['#e8f6e4', '#d2eccb'],
    spices: ['#fdefe0', '#f8dcc0'],
    dairy: ['#fbf6ec', '#f2e8d6'],
    meat: ['#fdeee8', '#f8d9cd'],
    seafood: ['#e9f2f8', '#d2e5f0'],
    grains: ['#fbf5e6', '#f2e6cc'],
    legumes: ['#fdf4e2', '#f8e6c2'],
    nuts: ['#f7f0e6', '#ebdfcd'],
    oils: ['#fdf6e2', '#f8ecc6'],
    sweeteners: ['#fdf2ea', '#f9e2d2'],
    condiments: ['#f4f2ec', '#e6e2d8'],
    others: ['#f6f4ef', '#e9e5dc'],
  };

  /** Normalise a display name to a drawing key. */
  function keyFor(nameOrId, item) {
    const raw = String(nameOrId || '').toLowerCase().trim();
    const slug = raw.replace(/\([^)]*\)/g, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (ART[slug]) return slug;
    if (ALIAS[slug] && ART[ALIAS[slug]]) return ALIAS[slug];

    /* Fall back through the pantry id, which is usually the cleaner key. */
    const id = item && item.id ? String(item.id).replace(/^custom-/, '') : '';
    if (ART[id]) return id;
    if (ALIAS[id] && ART[ALIAS[id]]) return ALIAS[id];

    /* Last resort: a word inside the name ("fresh green chilli"). */
    const hit = Object.keys(ART).concat(Object.keys(ALIAS))
      .filter((k) => k !== 'spiceBowl')
      .sort((a, b) => b.length - a.length)
      .find((k) => slug.includes(k));
    return hit ? (ART[hit] ? hit : ALIAS[hit]) : null;
  }

  /**
   * An illustration for an ingredient, as a data URI, or null when we have no
   * drawing for it — the caller then keeps its existing fallback rather than
   * showing something misleading.
   */
  function ingredient(nameOrId, item, size = 128) {
    const key = keyFor(nameOrId, item);
    if (!key || !ART[key]) return null;

    const category = (item && item.category) || 'others';
    const [bg1, bg2] = BACKDROP[category] || BACKDROP.others;
    const uid = `p${Math.abs(AFR.utils.hash(key + category)).toString(36)}`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96" role="img" aria-label="${AFR.utils.esc(String(nameOrId))}">`
      + `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">`
      + `<stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/>`
      + `</linearGradient></defs>`
      + `<rect width="96" height="96" rx="18" fill="url(#${uid})"/>`
      + ART[key]()
      + `</svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  AFR.produceArt = { ingredient, keyFor, has: (n, i) => Boolean(keyFor(n, i)), ART, ALIAS };
})(window);
