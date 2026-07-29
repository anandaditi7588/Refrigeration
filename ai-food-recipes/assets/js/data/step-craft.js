/* ==========================================================================
 * step-craft.js — turns a one-line instruction into one you can cook from.
 *
 * THE PROBLEM THIS SOLVES
 *
 * The dish knowledge base says what happens: "Shallow-fry the pieces until
 * golden, about 3 minutes a side." True, and useless to anyone who has not
 * shallow-fried before. It does not say how hot the oil should be, how to
 * check without a thermometer, what the sound tells you, how many pieces fit,
 * what to do when they stick, or how to tell "golden" from "too far".
 *
 * Writing that out for all 400 steps in the knowledge base would mean 400
 * separate paragraphs, most of them repeating the same craft. But the craft is
 * not dish-specific — how you know shallow-frying is done is the same whether
 * it is Kothimbir Vadi or a cutlet. The dish-specific part is already written.
 *
 * So: the dish supplies WHAT to do, and this file supplies HOW you know it is
 * working. Each entry matches a kind of cooking action and contributes the
 * technique detail, the sensory cues, and the recovery when it goes wrong.
 * That lifts every step in every dish at once, and it applies to dishes the
 * app has never been told about too, because it keys off the action rather
 * than the recipe.
 *
 * Each block is parameterised by the recipe context, so it names the actual
 * fat, pan and ingredients rather than reading like a generic manual. Where an
 * entry offers several phrasings, the recipe's seeded random picks one, so the
 * same dish always reads the same way but two dishes do not read identically.
 * ========================================================================== */
(function (global) {
  'use strict';

  const AFR = (global.AFR = global.AFR || {});
  AFR.data = AFR.data || {};

  const fatOf = (c) => (c && c.oil && c.oil.factor <= 0.1 ? 'water or stock'
    : (c && c.cuisine && /india|pakistan|bangla|nepal|sri/i.test(c.cuisine.name) ? 'ghee or oil' : 'oil'));
  const mainOf = (c) => (c && c.protein && c.protein.name)
    || (c && c.base && c.base.name) || 'the main ingredient';

  /* ------------------------------------------------------------------------
     The blocks.

     `match` is tested against the step's title and description together.
     Order matters: the first match wins, so the specific actions are listed
     before the general ones (griddle before fry, deep-fry before fry).
     ------------------------------------------------------------------------ */
  const ACTIONS = [
    /* ------------------------------------------------------------ heat on */
    {
      id: 'temper',
      heat: true,
      brief: 'Same as the earlier tempering: fat shimmering, seeds cracking within two seconds, done inside a minute.',
      match: /temper|tadka|bloom|splutter|crackle|pop the|mustard seed|whole spice/i,
      detail: (c) => `The fat has to be properly hot before anything goes in, or the spices `
        + `stew instead of blooming and taste dusty in the finished dish. Heat the ${fatOf(c)} over `
        + `a medium flame for about a minute; it is ready when the surface shimmers and a single `
        + `mustard seed dropped in spins and cracks within two seconds. Add the seeds first and `
        + `stand back — they spit. Wait for the popping to slow from a rattle to an occasional `
        + `tick, roughly 20 to 30 seconds, then add the softer aromatics. The whole tempering is `
        + `over inside a minute. If the seeds darken past reddish-brown or the kitchen smells `
        + `sharp and acrid, the fat was too hot: start again rather than carry burnt spice through `
        + `the entire dish, because nothing later will cover it.`,
      tips: ['Keep the lid within reach — clapping it on for a few seconds stops the spitting without stopping the cooking.'],
      mistakes: ['Adding everything at once. Seeds, then dried chilli and curry leaves, then garlic and ginger — each needs less heat than the one before.'],
    },
    {
      id: 'onions',
      heat: true,
      brief: 'As before — single layer, a pinch of salt, and wait for real colour rather than stopping at translucent.',
      match: /onion|soffritto|mirepoix|sweat|caramelis|caramaliz|caramelize/i,
      detail: (c) => `This is the step people rush, and it is the one that decides how deep the `
        + `finished dish tastes. Spread the onions in a single layer so they fry rather than steam, `
        + `and add a good pinch of salt straight away — it pulls water out and speeds the browning. `
        + `Expect three stages: translucent and floppy at around four minutes, pale gold at eight, `
        + `and properly golden-brown at ten to twelve. Stir every minute or two, not constantly. `
        + `When the base of the pan starts to catch, add a tablespoon of water and scrape it up — `
        + `that browned layer is flavour, not damage. If they are colouring in patches while `
        + `staying raw elsewhere, the heat is too high; drop it and give it the time.`,
      tips: ['Sliced onions brown faster and sweeter than chopped; chopped melt into the gravy better. Either works, they just behave differently.'],
      mistakes: ['Calling them done at "translucent". That is the halfway point, and stopping there is why a curry can taste thin however long it simmers afterwards.'],
    },
    {
      id: 'sear',
      heat: true,
      brief: 'Same as the first sear: dry surface, hot pan, space between the pieces, and leave them until they release.',
      match: /sear|brown the|char|griddle the (?:chicken|meat|paneer)|colour the/i,
      detail: (c) => `Get the pan hot before anything touches it — a drop of water should skitter `
        + `and vanish, not sit and hiss. Pat ${mainOf(c).toLowerCase()} dry first; surface moisture `
        + `boils off before browning can start, which is why wet pieces go grey instead of golden. `
        + `Lay the pieces down with space between them and then leave them alone. They will stick `
        + `at first and release by themselves once a crust forms, usually two to three minutes; `
        + `if you have to tug, it is not ready. Work in batches rather than crowding — a full pan `
        + `drops in temperature and everything steams in its own juices. You want a deep brown, `
        + `not black, on one or two sides only.`,
      tips: ['A crowded pan is the single commonest cause of pale, grey meat at home. Two batches take four extra minutes and change the dish completely.'],
      mistakes: ['Moving the pieces around to "check". Every time you lift one you interrupt the crust that is forming.'],
    },

    /* ------------------------------------------------------------- liquid */
    {
      id: 'simmer',
      heat: true,
      brief: 'Keep it at the same lazy bubble as before, half-covered, and judge it by the spoon rather than the clock.',
      match: /simmer|gravy|cook down|reduce|thicken|stew|braise|until it thickens/i,
      detail: (c) => `Bring it up to a boil first, then drop the heat until the surface is barely `
        + `moving — a lazy bubble breaking every second or two, not a rolling boil. A hard boil `
        + `here breaks the gravy and toughens anything protein-based in it. Half-cover the pan: `
        + `fully covered and it will not reduce, uncovered and it reduces too fast and catches on `
        + `the base. Stir up from the bottom every few minutes with a flat spoon. You are looking `
        + `for two signs of readiness — the sauce coats the back of a spoon and holds a line when `
        + `you draw a finger through it, and small pools of ${fatOf(c)} separate out at the edges. `
        + `If it thickens before the flavour has developed, loosen with hot water, never cold.`,
      tips: ['Hot water only when loosening. Cold water shocks the sauce and dulls it, and it takes several minutes to recover the temperature.'],
      mistakes: ['Judging by the clock rather than the spoon. Pan width changes reduction time more than the recipe can predict.'],
    },
    {
      id: 'boil',
      heat: true,
      brief: 'Full rolling boil again, well salted, and start tasting a couple of minutes before the time says.',
      match: /boil|blanch|parboil|cook the (?:pasta|rice|noodle)|rolling boil/i,
      detail: () => `Use more water than looks necessary and salt it until it tastes seasoned — `
        + `this is the only chance to season from the inside, and most of the salt goes down the `
        + `drain. Wait for a full rolling boil before anything goes in, and expect the boil to stop `
        + `for a minute afterwards; bring it back up before you start timing. Stir in the first `
        + `thirty seconds to stop things settling and sticking to each other. Start tasting two `
        + `minutes before the time given, because the difference between right and overdone is `
        + `about ninety seconds. Drain the moment it is ready — carryover heat keeps cooking it in `
        + `the colander, so pull it a shade under where you want it to end up.`,
      tips: ['Save a cup of the cooking water before draining. Starchy water is the standard fix for a sauce that will not cling.'],
      mistakes: ['Adding oil to the water. It coats the surface and stops sauce sticking later; stirring early does the job properly.'],
    },
    {
      id: 'steam',
      heat: true,
      brief: 'Steam running hard before it goes in, clearance around the tin, lid wrapped, skewer clean when done.',
      match: /steam/i,
      detail: () => `Get the water boiling hard and the steam running before the tin goes in — `
        + `putting it into a cold steamer means the outside sets while the middle is still batter. `
        + `Grease the tin properly, including the corners. Leave a finger's width of clearance `
        + `around the tin so steam can circulate; a snug fit steams the edges and leaves the centre `
        + `raw. Wrap the lid in a cloth or tilt it slightly so condensation runs off the side `
        + `rather than dripping back and pockmarking the surface. Do not open it in the first `
        + `two-thirds of the time — the temperature drop can collapse anything risen. It is done `
        + `when a skewer pushed into the centre comes out clean and the surface springs back.`,
      tips: ['Check the water level if it steams longer than 20 minutes. A pan that boils dry will scorch in under a minute.'],
      mistakes: ['Spreading the batter too thick to save time. The outside overcooks long before the centre sets, and it will never fry crisp afterwards.'],
    },

    /* --------------------------------------------------------------- fat */
    {
      id: 'deepfry',
      heat: true,
      brief: 'Same oil temperature as before, 175-180C, small batches, and let it recover between them.',
      match: /deep-?fry|deep fry|fry until golden|hot oil/i,
      detail: (c) => `Oil temperature is the whole game: too cool and it soaks in, too hot and the `
        + `outside colours before the inside cooks. You want around 175 to 180°C. Without a `
        + `thermometer, drop in a pinch of batter — it should sink briefly, then rise and sizzle `
        + `steadily. If it sits on the bottom the oil is too cool; if it browns instantly and `
        + `darkens, too hot. Fry in small batches, no more than a third of the surface covered, and `
        + `let the oil come back up to temperature between batches — this is the step everyone `
        + `skips and it is why the last batch is always greasy. Turn once, when the underside is `
        + `set and golden. Lift onto a rack rather than paper if you can, so steam escapes and the `
        + `crust stays crisp instead of going soft underneath.`,
      tips: ['A wooden spoon handle dipped in the oil should fizz steadily around the wood. No bubbles means too cool, violent bubbling means too hot.'],
      mistakes: ['Salting while still dripping. Salt draws moisture to the surface and softens the crust; season the moment it hits the rack, not before.'],
    },
    {
      id: 'shallowfry',
      heat: true,
      brief: 'As before: enough fat to come a third of the way up, space between pieces, turn once when it releases.',
      match: /shallow-?fry|shallow fry|pan-?fry|pan fry/i,
      detail: (c) => `Use enough ${fatOf(c)} to come a third of the way up the pieces, and let it `
        + `heat properly — a corner dipped in should sizzle at once without spitting violently. `
        + `Lay the pieces in with a gap between each; crowding drops the temperature and they will `
        + `absorb oil instead of sealing against it. Then leave them be for two to three minutes. `
        + `They release from the pan on their own once a crust forms, so if a piece resists the `
        + `spatula it simply is not ready. Turn once, not repeatedly. The second side always takes `
        + `slightly less time than the first. Between batches, top up the fat and let it come back `
        + `to heat, and wipe out any burnt crumbs — they will taste bitter on the next batch.`,
      tips: ['A fish slice or thin spatula slides under a fragile crust far better than a spoon, which tends to break the piece.'],
      mistakes: ['Turning too early. The crust is what holds these together, and flipping before it sets is why pieces fall apart in the pan.'],
    },
    {
      id: 'griddle',
      heat: true,
      brief: 'Same as the earlier one, but drop the flame a little — the pan is hotter now than when you started.',
      match: /griddle|tawa|pancake|crepe|on the tawa/i,
      detail: (c) => `Heat the tawa or pan over a medium flame for a good two minutes before the `
        + `first one — an under-heated pan gives you a pale, leathery result and the first one is `
        + `always the sacrificial test. It is ready when a few drops of water flicked on skitter `
        + `and evaporate in a couple of seconds. Cook the first side until the surface loses its `
        + `wet sheen and small bubbles appear, around 45 to 60 seconds, then turn. Brush ${fatOf(c)} `
        + `on the cooked side, turn again, and press gently around the edges with a folded cloth — `
        + `that pressure is what makes it puff. Look for golden-brown freckles, not a uniform `
        + `colour; even browning means the pan is too cool and it has been on too long. Stack them `
        + `under a cloth as they come off so they steam each other soft.`,
      tips: ['Adjust the flame between each one. The pan gains heat as you go, so what worked for the first will burn the fourth.'],
      mistakes: ['Cooking on high to save time. The outside scorches while the inside stays doughy, and it goes stiff as it cools.'],
    },

    /* ------------------------------------------------------------- dough */
    {
      id: 'knead',
      brief: 'Work it the same way until smooth and springy, and rest it again before you roll.',
      match: /knead|dough|atta|flour and water/i,
      detail: () => `Add the liquid gradually — flours vary in how much they drink, and a dough `
        + `that is too wet cannot be rescued by adding flour without making it tough. Bring it `
        + `together with your fingers first, then work it with the heel of your hand for six to `
        + `eight minutes, pushing away and folding back. It changes under your hands: shaggy and `
        + `sticky at first, then smooth, then springy. It is ready when it stops sticking to the `
        + `bowl, feels like an earlobe, and springs back slowly when you press a finger into it. `
        + `Then cover it and let it rest at least 20 minutes — this is not optional. Resting `
        + `relaxes the gluten, and a rested dough rolls out thin and evenly instead of shrinking `
        + `back at you every time you lift the pin.`,
      tips: ['Oil your palms rather than flouring the surface if it sticks. Extra flour at this stage stiffens the finished result.'],
      mistakes: ['Skipping the rest to save time. An unrested dough fights the rolling pin and tears, and no amount of force fixes it.'],
    },
    {
      id: 'roll',
      brief: 'Same technique: dust lightly, roll from the centre, quarter-turn between strokes.',
      match: /roll (?:it|out|the)|flatten|shape the|stuff the/i,
      detail: () => `Work on a lightly dusted surface, and dust the pin rather than the dough — `
        + `too much loose flour bakes into a dry, floury layer. Roll from the centre outwards, `
        + `turning a quarter-turn between strokes so it stays round and even rather than becoming `
        + `an oval. Press evenly; more weight on one hand is what makes one edge thin enough to `
        + `tear while the other stays thick. If there is a filling, seal it completely and roll `
        + `gently from the centre so the filling spreads with the dough instead of bursting `
        + `through one side. If it starts springing back and refusing to hold its shape, stop and `
        + `let it rest another ten minutes — that is the gluten telling you it needs the time, and `
        + `fighting it only tears the surface.`,
      tips: ['Roll all the pieces before you start cooking. Once the pan is hot you will not have time, and the pan waiting is better than the dough waiting.'],
      mistakes: ['Rolling right to the edge with full pressure. Edges end up thinner than the middle and burn while the centre is still raw.'],
    },

    /* -------------------------------------------------------- prep tasks */
    {
      id: 'chop',
      brief: 'Keep the pieces the same size as each other, as before — even cutting is what makes even cooking.',
      match: /chop|dice|slice|cut|julienne|mince|grate/i,
      detail: () => `Uniform pieces matter more than speed or neatness: mixed sizes mean the small `
        + `bits are mush by the time the large ones are cooked, and there is no way to correct that `
        + `later. Use a properly sharp knife — a blunt one bruises and crushes rather than cutting, `
        + `which makes onion taste harsher and herbs go black at the edges. Keep the fingertips of `
        + `your guiding hand curled back with the knuckles against the blade. Cut everything before `
        + `the pan goes on; chopping while something is already cooking is how the first ingredient `
        + `burns. Keep the pieces for each stage in separate bowls so they go in as a group rather `
        + `than being fished out of one pile.`,
      tips: ['Halve anything round and put the flat side down before slicing. A stable ingredient is a safe one, and it cuts more evenly.'],
      mistakes: ['Cutting to a rough average. Two very different sizes cook at two very different rates, which shows up as both raw and overdone in the same mouthful.'],
    },
    {
      id: 'soak',
      brief: 'Rinse until the water runs clear again, then soak in plenty of fresh water and drain thoroughly.',
      match: /soak|rinse|wash the (?:rice|dal|lentil)|rehydrate/i,
      detail: (c, step) => {
        const rinseOnly = !/soak|rehydrate/i.test(`${step.title || ''} ${step.desc || ''}`);
        const rinse = `Rinse in several changes of water until it runs close to clear rather than `
          + `cloudy — that cloudiness is surface starch and dust, and leaving it in makes the `
          + `finished texture gluey rather than distinct. Use your fingers to agitate it rather `
          + `than just running the tap over the top, and drain it properly between changes. Three `
          + `or four changes is usually enough; you are looking at the water, not counting. `;
        if (rinseOnly) {
          return rinse + `Drain thoroughly afterwards and let it sit in the sieve for a couple of `
            + `minutes. Water carried through from rinsing is invisible but it changes every `
            + `quantity that follows, and in anything that gets fried later it is the difference `
            + `between crisp and soggy.`;
        }
        return rinse + `Then soak in plenty of fresh water, at least three times the volume, `
          + `because it swells considerably. Timing is not fussy — longer is usually fine — but `
          + `much beyond the stated time in warm weather and it starts to ferment and sour. It is `
          + `properly soaked when a piece crushes easily between finger and thumb with no hard `
          + `core left in the middle. Drain thoroughly and let it stand in the sieve a few minutes.`;
      },
      tips: ['Soaking is passive time, not working time. Start it before you do anything else and the rest of the prep happens while it waits.'],
      mistakes: ['Cooking straight from a short soak. It takes far longer on the heat and cooks unevenly, and no extra simmering makes it uniform.'],
    },
    {
      id: 'marinate',
      brief: 'Same again: dry surface, worked in by hand, and out of the fridge 20 minutes before it cooks.',
      match: /marinate|marinade|coat the|rub the|toss with (?:salt|yoghurt|curd)/i,
      detail: (c) => `Pat ${mainOf(c).toLowerCase()} completely dry first — a marinade slides off a `
        + `wet surface instead of clinging. Score thicker pieces a few millimetres deep so the `
        + `seasoning reaches past the surface; without that, a marinade only ever flavours the `
        + `outside millimetre. Use your hands and work it into every side, not a spoon. Salt and `
        + `acid do the real work: salt draws moisture out, then carries flavour back in, while acid `
        + `tenderises the surface. That also means time has a ceiling — beyond a few hours in a `
        + `strongly acidic marinade the texture turns chalky rather than tender. Cover and `
        + `refrigerate, then take it out 20 minutes before cooking so it is not fridge-cold going `
        + `into a hot pan.`,
      tips: ['Even 15 minutes is worth doing. The difference between no marinade and a short one is far bigger than between a short one and a long one.'],
      mistakes: ['Cooking it straight from the fridge. Cold in the middle means the outside overcooks while the centre catches up.'],
    },
    {
      id: 'grind',
      brief: 'Add liquid a spoonful at a time again, scrape the sides twice, and run it longer than feels necessary.',
      match: /grind|blend|purée|puree|paste|smooth|mixie|food processor/i,
      detail: () => `Add liquid a spoonful at a time rather than all at once — you can always `
        + `loosen a thick paste, but a thin one cannot be brought back and will change every `
        + `quantity downstream. Work in short pulses at first to break everything down, then run `
        + `it continuously once it is moving. Stop twice to scrape the sides; the top third `
        + `otherwise never reaches the blade and you get a paste with lumps through it. For a `
        + `genuinely smooth result, run it a good minute longer than seems necessary and then push `
        + `it through a sieve — that sieving step is the difference between a home gravy and a `
        + `restaurant one. If the machine is straining or the motor pitch drops, stop and add a `
        + `little liquid rather than forcing it.`,
      tips: ['Let anything hot cool for ten minutes first. Steam builds pressure in a closed jar and can force the lid off.'],
      mistakes: ['Over-blending anything with a skin or seed you meant to keep whole. Pulse for texture, run continuously only for smooth.'],
    },

    /* ----------------------------------------------- added after auditing
       the knowledge base: these covered the steps that matched nothing and
       were left as one-liners. ------------------------------------------ */
    {
      id: 'pressure',
      heat: true,
      brief: 'Same again — full pressure, then count the whistles, and let it drop on its own.',
      match: /pressure-?cook|pressure cook|cooker|whistle|instant pot/i,
      detail: () => `Fill the cooker no more than two-thirds full, and less for anything that froths `
        + `like dal or beans — a blocked vent is the one genuinely dangerous failure here. Bring it `
        + `to full pressure on a high flame first, then drop to medium and start counting from the `
        + `first whistle, not from when you lit the gas. Let the pressure fall by itself rather than `
        + `forcing it under a tap; a sudden drop makes pulses split and rice go mushy, and it takes `
        + `about ten minutes. Open away from your face. Test before you carry on: it should crush `
        + `completely between finger and thumb with no firm centre. Underdone, it will not soften `
        + `later once salt or anything acidic goes in, so give it two more whistles now.`,
      tips: ['Add salt after pressure-cooking pulses, not before. Salted early they take noticeably longer to soften.'],
      mistakes: ['Counting time from lighting the flame. The clock starts at the first whistle, and the difference is several minutes.'],
    },
    {
      id: 'ferment',
      brief: 'Same as before: somewhere warm, loosely covered, and judge it risen and sour rather than by the hours.',
      match: /ferment|prove|proof|rise|overnight|batter to rest|leaven/i,
      detail: () => `Fermenting is governed by warmth, not by the clock, so treat any time given as `
        + `a guide for a warm kitchen and expect it to take considerably longer in cold weather. `
        + `Find somewhere draught-free around 25 to 30°C — inside an oven with only the light on, or `
        + `a cupboard near the stove, both work. Cover loosely so gas can escape; sealed tight and `
        + `it can push the lid off, uncovered and the surface dries into a skin. Leave real headroom `
        + `in the container, because a well-fermented batter roughly doubles. It is ready when it `
        + `has visibly risen, the surface is domed and covered in fine bubbles, and it smells `
        + `pleasantly sour rather than sharp or alcoholic. Stir it as little as possible afterwards `
        + `— knocking the air out is what gives you flat, dense results.`,
      tips: ['A short spell in a cold kitchen is not lost. Move it somewhere warmer and give it longer; it recovers.'],
      mistakes: ['Judging by hours rather than volume. The same batter can take eight hours in summer and eighteen in winter.'],
    },
    {
      id: 'dryroast',
      heat: true,
      match: /dry-?roast|roast the (?:besan|rava|semolina|flour|spice|nut)|toast the|fry the (?:nut|cashew|peanut)/i,
      brief: 'Same again: low flame, constant stirring, and stop at the colour and smell rather than the time.',
      detail: (c) => `This needs a low flame and your full attention — there is no liquid to buffer `
        + `the heat, so the gap between properly roasted and burnt is under a minute. Use a heavy `
        + `pan so the heat is even, and keep it moving constantly with a flat spoon, scraping the `
        + `base rather than stirring in circles. Three things tell you it is ready, in this order: `
        + `the raw smell goes and a nutty one replaces it, the colour turns one shade darker, and `
        + `it starts to move loosely in the pan instead of clumping. That is usually five to eight `
        + `minutes. Tip it straight out into a cold bowl the moment it is done — a hot pan carries `
        + `on roasting off the heat and will take it past where you wanted it.`,
      tips: ['Trust your nose before your eyes. The smell changes a good thirty seconds before the colour does.'],
      mistakes: ['Walking away "for a second". This is the step that burns, every time, and burnt cannot be rescued.'],
    },
    {
      id: 'shape',
      match: /fill and seal|shape|pat it out|pat out|form the|mould|mold|stuff|fill the/i,
      brief: 'Shape the rest the same way, keeping them the same size so they cook at the same rate.',
      detail: () => `Work with lightly oiled or damp hands — that alone stops most of the sticking `
        + `and tearing people fight with here. Divide the mixture into equal portions before you `
        + `shape anything, rather than working through it and finding the last few are half the `
        + `size; equal pieces cook in equal time, and that is the whole point. Seal any filling `
        + `completely and pinch the join firmly: the commonest failure is a seam that opens in the `
        + `pan and spills everything into the oil. Keep the thickness even, because a thin patch `
        + `cooks through and colours while the thick centre is still raw. Cover the shaped pieces `
        + `with a damp cloth as you go so they do not dry out and crack while the rest are made.`,
      tips: ['Shape them all before any go on the heat. Once cooking starts there is no spare attention for shaping.'],
      mistakes: ['A filling that is too wet or too warm. Either will burst the seam however carefully you pinch it.'],
    },
    {
      id: 'stream',
      match: /in a (?:thin |steady )?stream|whisk in|sprinkle .*(?:over|in)|lump|add the (?:rava|semolina|besan|flour) /i,
      brief: 'Same again — a thin stream with one hand, stirring hard with the other, and no lumps form.',
      detail: () => `Lumps form when dry meets hot liquid faster than you can stir it in, and once `
        + `formed they will not beat out. So do two things at once: pour in a thin steady stream `
        + `with one hand while stirring hard and continuously with the other. If you are on your `
        + `own, take it off the heat first — nothing is lost, and it is far easier without the pan `
        + `spitting at you. A whisk works better than a spoon here because it breaks up clumps as `
        + `they start rather than pushing them around. Keep going for a full minute after the last `
        + `of it is in. If lumps do appear despite everything, push the mixture through a sieve `
        + `while it is still loose; once it thickens, that stops being possible.`,
      tips: ['Warm the liquid rather than boiling it. Just-boiling liquid sets the outside of each grain instantly, which is exactly what makes lumps.'],
      mistakes: ['Tipping it all in at once and stirring afterwards. By then the lumps have already formed.'],
    },
    {
      id: 'spread',
      heat: true,
      match: /spread thin|spread the batter|swirl|ladle the batter|thin and even/i,
      brief: 'Same motion again, and wipe the pan between each one so the batter grips.',
      detail: () => `The pan has to be at the right heat before the batter touches it, and this is `
        + `the step that takes practice: too cool and it will not spread or release, too hot and it `
        + `sets before you can move it. Flick a few drops of water on — they should skitter and `
        + `vanish in a second or two. Wipe the surface with a halved onion or an oiled cloth just `
        + `before each one; a bone-dry pan tears the batter and a greasy one stops it gripping. `
        + `Pour into the centre and spread outwards in one continuous spiral without lifting, `
        + `working quickly while the batter is still fluid. Do not go back over a patch you missed `
        + `— it will tear. Leave it alone until the edges lift away from the pan by themselves.`,
      tips: ['The first one is always a write-off. It is seasoning the pan and telling you the heat, not wasted.'],
      mistakes: ['Trying to spread batter that has thickened as it sat. Loosen it with a splash of water first; it will not spread otherwise.'],
    },
    {
      id: 'layer',
      match: /layer|assemble|arrange|dum|seal the (?:pot|lid)|top with/i,
      brief: 'Build the remaining layers the same way, finishing with the aromatics on top.',
      detail: () => `Use a heavy-based pot: this stage cooks on residual steam, and a thin base `
        + `scorches the bottom layer before the top one is warmed through. Build in even layers `
        + `rather than tipping things in, and resist pressing down — the point is trapped air and `
        + `steam moving up through it. Finish with anything aromatic on top so its scent travels `
        + `down through everything as it steams. Seal the lid properly: a tight lid, or a rope of `
        + `dough pressed round the rim, or foil under the lid. Cook on the lowest possible flame, `
        + `with a heavy tawa underneath if your burner runs hot. Then leave it completely alone for `
        + `the full time — every lift of the lid loses the steam doing the work. Rest it ten `
        + `minutes off the heat before opening, and fold gently rather than stirring.`,
      tips: ['A tawa or griddle under the pot is the standard fix for a burner that will not go low enough.'],
      mistakes: ['Stirring it at the end. Layers are the whole point, and stirring turns the dish into a single mush.'],
    },
    {
      id: 'drain',
      match: /drain|strain|squeeze out|pat dry|remove excess/i,
      brief: 'Drain the rest the same way, and keep any liquid you were told to save.',
      detail: () => `Drain thoroughly and give it longer than feels necessary — a couple of minutes `
        + `in the sieve, shaken once or twice. Carried-over water is invisible and it changes `
        + `everything downstream: a wet mixture will not hold its shape, will not fry crisp, and `
        + `will spit dangerously in hot fat. Where the liquid is worth keeping, put the bowl under `
        + `the sieve before you pour rather than remembering afterwards. For anything that holds `
        + `water inside it rather than on its surface, press gently with the back of a spoon or `
        + `squeeze in a clean cloth, but stop short of crushing it to a paste. If the next step is `
        + `frying, spread it out on a cloth or paper for a few minutes — surface dryness is what `
        + `stands between a crisp result and a soggy one.`,
      tips: ['Save the cooking liquid unless you are certain you do not want it. In many dishes it is the base of the accompaniment.'],
      mistakes: ['Going straight from the sieve into hot oil. Water and hot fat is the one combination that genuinely hurts.'],
    },
    {
      id: 'spices',
      heat: true,
      match: /spice|powder|masala powder|turmeric|chilli powder|coriander powder|garam/i,
      brief: 'Same again: heat low, a splash of water if needed, and cook until the raw smell goes.',
      detail: (c) => `Ground spices burn far faster than whole ones, and burnt spice is bitter in a `
        + `way nothing later can cover. Drop the heat before they go in. Add them to fat rather `
        + `than to a dry pan, and keep everything moving for 30 to 60 seconds — that is long enough `
        + `to cook off the raw, dusty taste and no longer. If the pan looks dry or they start to `
        + `catch, add a tablespoon of water immediately; it drops the temperature at once and lets `
        + `them cook without scorching. You will know they are done by smell: the sharp raw note `
        + `disappears and is replaced by something rounder and warmer. Salt goes in around now too, `
        + `so it has time to draw flavour out rather than sitting on the surface.`,
      tips: ['Add whole spices early and ground spices late. They are not interchangeable in timing, and treating them alike burns one or undercooks the other.'],
      mistakes: ['Adding ground spice to a screaming-hot dry pan. It scorches in seconds, and the whole dish tastes of it.'],
    },
    {
      id: 'addhot',
      heat: true,
      match: /add the hot|pour in the hot|hot water|hot stock|boiling water/i,
      brief: 'Hot liquid again, added gradually and stirred through before you add more.',
      detail: () => `The liquid must be genuinely hot, not warm. Cold liquid into a hot pan drops `
        + `the temperature sharply, stops the cooking dead for a minute or two, and in anything `
        + `starch-based it makes the texture claggy rather than smooth. Keep a kettle or a small `
        + `pan on alongside so it is ready when you need it. Add it gradually and stir it through `
        + `before adding more; all at once and you get a layer of liquid sitting on top rather than `
        + `combining. Stand back as you pour — hot liquid hitting hot fat spits. Once it is all in, `
        + `bring it back to a simmer before you judge the consistency, because it will thicken as `
        + `it comes back up to heat and what looks thin now will be right in two minutes.`,
      tips: ['Err on the side of slightly too little. Loosening a thick mixture is easy; a thin one has to be cooked back down.'],
      mistakes: ['Judging the consistency before it returns to a simmer. It always thickens on the way back up.'],
    },
    {
      id: 'addlate',
      brief: 'Added late again, off or on the lowest heat, and folded through rather than stirred hard.',
      match: /add the (?:paneer|cream|yoghurt|curd|herb|coriander|butter|cheese|egg)|fold in|stir through|add .* last|off the heat/i,
      detail: () => `Timing is the whole point of this step: added early, these break, curdle, `
        + `toughen or lose their scent entirely, which is why they are held back to here. Drop the `
        + `heat right down or take the pan off it completely before they go in — residual heat is `
        + `plenty. Fold them through gently rather than stirring hard; you are distributing them, `
        + `not incorporating them, and vigorous stirring is what breaks soft pieces apart. Anything `
        + `dairy-based should be at room temperature and, if the dish is acidic, stirred into a `
        + `little of the hot liquid first before going into the pan — that tempering is what stops `
        + `it splitting. Once they are in, warm through for a minute at most and do not let it boil `
        + `again.`,
      tips: ['If yoghurt or cream has to go into something acidic, whisk a spoonful of the hot sauce into it first. It will not split after that.'],
      mistakes: ['Boiling after the dairy goes in. That is the moment a smooth gravy turns grainy, and it cannot be brought back.'],
    },
    {
      id: 'panheat',
      heat: true,
      brief: 'Same heat management as before — adjust the flame to what you see, not what the timing says.',
      match: /fry|cook the|heat the|flip|crisp|sizzle|pan/i,
      detail: () => `Watch the pan rather than the clock for this one: burners, pans and batch sizes `
        + `all differ enough that a fixed time is only ever an estimate. The sound tells you most `
        + `of it — a steady, even sizzle means it is going well, a violent spitting one means the `
        + `heat is too high, and near-silence means it is too low and whatever is in there is `
        + `absorbing fat rather than cooking in it. Adjust the flame rather than moving the pan `
        + `on and off. Give it a full minute after any adjustment before judging the result, `
        + `because pans respond slowly. If something is colouring faster than it is cooking `
        + `through, lower the heat and cover the pan for a minute — trapped steam finishes the `
        + `inside without adding any more colour to the outside.`,
      tips: ['Cover the pan for a minute when the outside is running ahead of the inside. It is the standard fix and it works on almost anything.'],
      mistakes: ['Leaving the flame where it was set at the start. The pan is hotter at step six than it was at step one.'],
    },
    {
      id: 'batter',
      brief: 'Same consistency test as before, and let it sit again before you use it.',
      match: /batter|mix (?:the|it|everything)|combine|fold together|bind|dough-?like|paste of/i,
      detail: () => `Consistency is the thing to get right here, and it is judged by feel rather `
        + `than by the measurements, because flours and vegetables differ in how much water they `
        + `hold. Add the liquid a little at a time and stop early — a mixture that is too slack `
        + `cannot be brought back without adding more dry ingredients and throwing the seasoning `
        + `out. Mix from the bottom up so nothing dry hides underneath, and work it just enough to `
        + `bring it together; over-mixing anything with flour in it develops gluten and turns the `
        + `result tough and rubbery. Check it against what the step asks for: a thick, scoopable `
        + `mixture should hold its shape on a spoon and drop off reluctantly, a pouring one should `
        + `run in a smooth ribbon. Let it stand for a few minutes if you can — the flour hydrates `
        + `and the consistency settles, and what looked right immediately often thickens.`,
      tips: ['Hold back the last of the liquid deliberately. It is far easier to loosen a stiff mixture than to rescue a runny one.'],
      mistakes: ['Beating it smooth like a cake batter. Most savoury batters want to be just combined; overworking makes them heavy.'],
    },

    /* ------------------------------------------------------------ finish */
    {
      id: 'rest',
      brief: 'Let it rest again properly — it is still cooking, and cutting in early costs you the moisture.',
      match: /rest|cool|set aside|let it sit|stand for/i,
      detail: () => `Resting is a stage of cooking, not a pause in it. Heat keeps travelling `
        + `inwards after the pan is off, so the centre carries on cooking for several minutes; `
        + `anything sliced or cut immediately loses the moisture that is still moving back through `
        + `it. Leave it somewhere warm and uncovered, or loosely tented — sealing it tightly traps `
        + `steam and softens any crust you have built. Flavours change during this window too: `
        + `spices that tasted sharp and separate at the stove settle and read as one thing. If `
        + `something needs to be firm enough to cut or fry afterwards, it must go completely cold, `
        + `and an hour in the fridge is more reliable than an hour on the counter.`,
      tips: ['Use the time. Warm the plates, finish the garnish, clear the board — the resting period is exactly long enough for all three.'],
      mistakes: ['Cutting into it straight away to check. Every cut releases moisture that would otherwise have stayed in.'],
    },
    {
      id: 'serve',
      brief: 'Taste once more before it leaves the kitchen: salt, then acid, then richness.',
      match: /serve|plate|garnish|finish|table|drain and/i,
      detail: () => `Taste it before it leaves the kitchen, with a clean spoon, on its own rather `
        + `than with rice or bread — accompaniments hide exactly the flatness you are checking for. `
        + `Ask three questions in order: does it need salt, does it need acid, does it need `
        + `richness? A dish that tastes almost right but somehow dull is nearly always short of `
        + `salt or a squeeze of something sour, and almost never short of more spice. Adjust while `
        + `it is still hot enough to absorb the change. Add anything fresh — herbs, a raw squeeze, `
        + `crisp fried bits — at the last possible moment, because they wilt or go soft within a `
        + `couple of minutes. Warm the bowls if the dish cools fast.`,
      tips: ['Serve into warmed bowls for anything with a sauce. A cold bowl takes a surprising amount of heat out in the first thirty seconds.'],
      mistakes: ['Garnishing early so it "looks ready". Fresh herbs added five minutes ahead arrive limp and dark instead of bright.'],
    },
  ];

  /** Significant words, for spotting a note that repeats one already present. */
  function keyWords(text) {
    return new Set(String(text).toLowerCase().match(/[a-z]{4,}/g) || []);
  }

  /**
   * Append the craft notes, minus any that say what the dish already said.
   * Without this, "Spreading it too thick leaves a wet centre" sits directly
   * above "Spreading the batter too thick ... the centre never sets".
   */
  function merge(own, extra) {
    const existing = (own || []).map(keyWords);
    const keep = (extra || []).filter((note) => {
      const words = keyWords(note);
      return !existing.some((prev) => {
        const shared = [...words].filter((w) => prev.has(w)).length;
        return shared >= Math.min(words.size, prev.size) * 0.5;
      });
    });
    return (own || []).concat(keep);
  }

  /** The block matching a step, or null when nothing fits. */
  function classify(step) {
    const title = String(step.title || '');
    const both = `${title} ${step.desc || ''}`;

    /* A step that is off the heat gets no heat technique, however its
       description reads. "Cool completely, then cut into diamonds" mentions
       the frying that comes later, and used to be given frying advice. */
    const offHeat = /^(off|none|-)$/i.test(String(step.flame || ''))
      || /\bcool|\brest\b|chill|set aside|soak|drain|marinate|knead|shape|fill\b/i.test(title);
    const usable = offHeat ? ACTIONS.filter((a) => !a.heat) : ACTIONS;

    /* Title first: it names the action. Only fall back to the description when
       the title is uninformative ("Spices", "Add the sabudana"). */
    const byTitle = usable.find((a) => a.match.test(title));
    if (byTitle) return byTitle;

    /* Falling back to the description is where mismatches come from: a
       preparation step reading "mix the besan, spices and water into a thick
       batter" mentions spices, but nothing there is on a flame. So a prep step
       may only pick up a heat technique from its TITLE, never from its
       description — "Dry-roast the besan" still works, "Make a batter" is no
       longer told to watch the pan. */
    const cooksAnyway = /\b(temper|fry|fries|roast|boil|simmer|saut|griddle|steam|pressure-?cook)/i
      .test(String(step.desc || ''));
    const pool = (step.phase === 'prep' && !cooksAnyway)
      ? usable.filter((a) => !a.heat) : usable;
    return pool.find((a) => a.match.test(both)) || null;
  }

  /**
   * The dish's own instruction, followed by the craft that makes it reliable.
   * Returns null when no block matches, so a step nothing fits is left exactly
   * as the knowledge base wrote it rather than padded with something generic.
   */
  function expand(step, c, opts = {}) {
    /* A step the caller has already written at length — the mise en place and
       the finish — is left alone; it does not need craft bolted onto it. */
    if (step.noCraft) return null;

    const action = classify(step);
    if (!action) return null;

    /* Second time this action appears in one recipe, a one-line reminder
       instead of the full explanation. Repeating 140 words about how to
       shallow-fry, twice in the same recipe, is worse than saying it once. */
    const detail = opts.repeat ? (action.brief || '') : action.detail(c, step);
    if (!detail) return null;

    return {
      desc: `${String(step.desc || '').trim().replace(/\s+$/, '')} ${detail}`.trim(),
      /* Tips and mistakes belong to the first occurrence only, for the same
         reason — they would otherwise be listed identically twice. */
      tips: opts.repeat ? (step.tips || []) : merge(step.tips, action.tips),
      mistakes: opts.repeat ? (step.mistakes || []) : merge(step.mistakes, action.mistakes),
      action: action.id,
    };
  }

  AFR.data.stepCraft = { expand, classify, ACTIONS, count: ACTIONS.length };
})(window);
