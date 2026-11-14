// Danish joins words: "bevægelseslys", "elmåler". The index also stores a
// joined word under the two known words it is made of, so a question about
// "lys" or "måler" finds it.

import { stem } from "../../../functions/lib/site-search/tokens.js";

// word: shortest word that is split. head/tail: shortest first and last part.
// A first part shorter than `head` is only accepted from `shortHeads`, and
// then with a last part of at least `shortTail` letters. Without the list,
// "seneste" would become "se" + "nest" and "parring" "par" + "ring".
const LIMITS = {
  da: {
    word: 7,
    head: 4,
    tail: 3,
    shortHeads: new Set(["el", "tv", "bad", "bil", "dør", "gas", "hus", "lyd", "lys", "net", "rum", "sol", "tag", "tid"]),
    shortTail: 4,
  },
  en: { word: 8, head: 4, tail: 4, shortHeads: new Set(), shortTail: 4 },
};

/** The stored form of the first part, if it is a known word. It may end in a joining "s" or "e": "bevægelse-s-lys". */
function firstPart(head, known, locale, limits) {
  if (head.length < limits.head) return limits.shortHeads.has(head) && known.has(head) ? head : null;
  return [head, /[se]$/.test(head) ? head.slice(0, -1) : null]
    .filter(Boolean)
    .map((part) => stem(part, locale))
    .find((part) => part.length >= limits.head && known.has(part));
}

/**
 * The two known terms a written word is made of, or null.
 * `known` holds terms (stored forms) seen in several chunks.
 */
export function splitCompound(word, known, locale) {
  const limits = LIMITS[locale] ?? LIMITS.da;
  if (/[^\p{L}]/u.test(word)) return null;
  let best = null;
  for (let i = 2; i <= word.length - limits.tail; i += 1) {
    const short = i < limits.head;
    if (short ? word.length - i < limits.shortTail : word.length < limits.word) continue;
    const right = stem(word.slice(i), locale);
    if (!known.has(right)) continue;
    const left = firstPart(word.slice(0, i), known, locale, limits);
    if (!left) continue;
    const balance = Math.min(left.length, word.length - i);
    if (!best || balance > best.balance) best = { parts: [left, right], balance };
  }
  return best?.parts ?? null;
}
