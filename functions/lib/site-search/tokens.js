// Turns text into search terms. The index builder (scripts/lib/site-index/)
// and the search in the Worker (./search.js) share this file, so a question
// is always cut up the same way as the pages were.

const STOPWORDS = {
  da: new Set(
    ("ad af alle alt anden at bare blev blive bliver både da de dem den denne der deres det dette dig din disse dog du efter eller en " +
      "end enten er et " +
      "for fra få får gør ham han hans har havde have hende hendes her hos hun hvad hvem hvilke hvilken hvis hvor hvordan hvorfor " +
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
const ENDINGS = {
  da: [
    "ingerne", "ernes", "ingens", "ingen", "inger", "erne", "enes", "ende", "eren", "eres", "ings",
    "ene", "ens", "ers", "ets", "ere", "ing", "er", "en", "et", "es", "e", "s",
  ],
  en: ["ings", "ing", "ies", "ed", "es", "s"],
};

export const MAX_QUERY_TERMS = 10;

/** The form a word is stored under: "sensorer", "sensoren" and "sensor" become one term. */
export function stem(word, locale = "da") {
  if (word.length < 4 || /\d/.test(word)) return word;
  for (const ending of ENDINGS[locale] ?? ENDINGS.da) {
    if (word.length - ending.length >= 3 && word.endsWith(ending)) return word.slice(0, -ending.length);
  }
  return word;
}

/** Every word in a text that counts, as written (lower case), in order, with repeats. "Z-Wave" gives "zwave" and "wave". */
export function words(text, locale = "da") {
  const stop = STOPWORDS[locale] ?? STOPWORDS.da;
  const found = [];
  const words = String(text).toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+(?:[-.][\p{L}\p{N}]+)*/gu) ?? [];
  for (const word of words) {
    const parts = word.split(/[-.]/);
    const whole = parts.join("");
    const candidates = parts.length > 1 ? [whole, ...parts.filter((part) => part.length >= 3)] : [whole];
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
  return [...new Set(terms(text, locale))].slice(0, MAX_QUERY_TERMS);
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
