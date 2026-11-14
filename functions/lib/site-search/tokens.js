// Turns text into search terms. The index builder (scripts/lib/site-index/)
// and the search in the Worker (./search.js) share this file, so a question
// is cut up the same way as the pages were.

// Common function words, written for this site. "have" is left out on
// purpose: it is also the Danish word for garden.
const STOPWORDS = {
  da: new Set(
    ("ad af alle alt anden at bare blev blive bliver både da de dem den denne der deres det dette dig din disse dog du efter eller en " +
      "end enten er et " +
      "for fra få får gør ham han hans har havde hende hendes her hos hun hvad hvem hvilke hvilken hvis hvor hvordan hvorfor " +
      "i igen ikke ind ingen jeg jer jo kan kun kunne lige man mange med meget men mere mest mig min mine mit mod ned noget nogle nu når " +
      "og også om op os over " +
      "på samt selv sig sin sine sit skal skulle som så sådan til ud under var ved vi vil ville være været").split(" "),
  ),
  en: new Set(
    ("a an and any are as at be been but by can do does for from has have how i if in into is it more my not of on or should so " +
      "some than that the their then there they this to was we were what when where which why will with you your also").split(" "),
  ),
};

// Longest ending first. A word keeps at least three letters.
const DANISH_ENDINGS = [
  "ingerne", "ernes", "ingens", "ingen", "inger", "erne", "enes", "ende", "eren", "eres", "ings",
  "ene", "ens", "ers", "ets", "ere", "ing", "er", "en", "et", "es", "e",
];

/** "priser", "prisen" and "pris" become "pri": one ending off, then every final "s". */
function stemDanish(word) {
  let stem = word;
  const ending = DANISH_ENDINGS.find((candidate) => stem.length - candidate.length >= 3 && stem.endsWith(candidate));
  if (ending) stem = stem.slice(0, -ending.length);
  while (stem.length > 3 && stem.endsWith("s")) stem = stem.slice(0, -1);
  return stem;
}

/** "devices" and "device" become "devic"; "batteries" and "battery" become "battery". */
function stemEnglish(word) {
  let stem = word;
  if (stem.length > 4 && stem.endsWith("ies")) stem = `${stem.slice(0, -3)}y`;
  else if (/(?:ss|x|z|ch|sh)es$/.test(stem)) stem = stem.slice(0, -2);
  else if (/[^su]s$/.test(stem)) stem = stem.slice(0, -1);
  const ending = ["ing", "ed"].find((candidate) => stem.length - candidate.length >= 3 && stem.endsWith(candidate));
  if (ending) stem = stem.slice(0, -ending.length);
  if (stem.length > 3 && stem.endsWith("e")) stem = stem.slice(0, -1);
  return stem;
}

export const MAX_QUERY_TERMS = 10;

/** The form a word is stored under: "sensorer", "sensoren" and "sensor" become one term. */
export function stem(word, locale = "da") {
  if (word.length < 4 || /\d/.test(word)) return word;
  return locale === "en" ? stemEnglish(word) : stemDanish(word);
}

/**
 * Every word in a text that counts, as written (lower case), in order, with
 * repeats. A page's "zigbee-sensor" gives "zigbeesensor", "zigbee" and
 * "sensor". In a question the joined form is only kept when a part is too
 * short to stand alone ("z-wave" gives "zwave" and "wave"): a rare joined
 * word would otherwise outweigh the rest of the question.
 */
export function words(text, locale = "da", question = false) {
  const stop = STOPWORDS[locale] ?? STOPWORDS.da;
  const found = [];
  const written = String(text).toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+(?:[-.][\p{L}\p{N}]+)*/gu) ?? [];
  for (const word of written) {
    const parts = word.split(/[-.]/);
    const whole = parts.join("");
    const long = parts.filter((part) => part.length >= 3);
    const joined = !question || long.length < parts.length;
    const candidates = parts.length > 1 ? [...(joined ? [whole] : []), ...long] : [whole];
    for (const candidate of candidates) {
      if (candidate.length < 2 || candidate.length > 40 || stop.has(candidate)) continue;
      found.push(candidate);
    }
  }
  return found;
}

/** Every term in a text: its words in the form they are stored under. */
export function terms(text, locale = "da") {
  return words(text, locale).map((word) => stem(word, locale));
}

/** The distinct terms of a question, capped so a long question costs no more than a short one. */
export function queryTerms(text, locale = "da") {
  return [...new Set(words(text, locale, true).map((word) => stem(word, locale)))].slice(0, MAX_QUERY_TERMS);
}

/** Which of `count` files a term's entries are stored in (FNV-1a). */
export function shardOf(term, count) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < term.length; i += 1) {
    hash ^= term.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}
