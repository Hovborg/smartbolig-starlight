// Builds the assistant's own search index from the pages' text: the text cut
// into pieces ("chunks") and, for every term, which pieces it scores in
// (BM25). The result is a set of small JSON files that the Worker reads on
// demand (functions/lib/site-search/search.js).

import { shardOf, stem, words } from "../../../functions/lib/site-search/tokens.js";

export const INDEX_VERSION = 1;
export const CHUNK_CHARS = 1500;
export const CHUNKS_PER_FILE = 8;
const K1 = 1.2;
const B = 0.75;
const HEADING_WEIGHT = 2;
const TITLE_WEIGHT = 1.5;
const PART_WEIGHT = 0.5;
const MAX_ENTRIES_PER_TERM = 160;
// A compound is split only when it is long enough and its last part is a word of this length.
const COMPOUND = { da: { word: 7, tail: 3 }, en: { word: 8, tail: 4 } };
const TARGET_SHARD_BYTES = 24_000;

/** Cut a text into pieces of at most `size` characters, at line ends where possible. */
export function pieces(text, size = CHUNK_CHARS) {
  const out = [];
  let current = "";
  const push = () => {
    if (current.trim()) out.push(current.trimEnd());
    current = "";
  };
  for (const line of text.split("\n")) {
    let rest = line;
    while (rest.length > size) {
      push();
      const cut = Math.max(rest.lastIndexOf(". ", size) + 1, rest.lastIndexOf(" ", size), Math.floor(size / 2));
      out.push(rest.slice(0, cut).trimEnd());
      rest = rest.slice(cut).trimStart();
    }
    if (current.length + rest.length + 1 > size) push();
    current += (current ? "\n" : "") + rest;
  }
  push();
  return out;
}

/** One page's chunks: { u: address (with #anchor), t: page title, h: section heading, x: text }. */
export function chunksOf(page) {
  const chunks = [];
  for (const section of page.sections) {
    const intro = !section.heading && page.description && !section.text.includes(page.description);
    const text = intro ? `${page.description}\n${section.text}` : section.text;
    const address = section.id ? `${page.url}#${section.id}` : page.url;
    for (const piece of pieces(text || section.heading)) chunks.push({ u: address, t: page.title, h: section.heading, x: piece });
  }
  return chunks;
}

/**
 * Danish joins words: "bevægelseslys". Find the two known terms a written word
 * is made of, if any. `known` holds terms (stored forms) seen in several chunks.
 */
export function splitCompound(word, known, locale) {
  const limits = COMPOUND[locale] ?? COMPOUND.da;
  if (word.length < limits.word || /[^\p{L}]/u.test(word)) return null;
  let best = null;
  for (let i = 4; i <= word.length - limits.tail; i += 1) {
    const right = stem(word.slice(i), locale);
    if (!known.has(right)) continue;
    const head = word.slice(0, i);
    // The first part may end in a joining "s" or "e": "bevægelse-s-lys".
    const left = [head, /[se]$/.test(head) ? head.slice(0, -1) : null]
      .filter(Boolean)
      .map((part) => stem(part, locale))
      .find((part) => part.length >= 4 && known.has(part));
    if (!left) continue;
    const balance = Math.min(left.length, word.length - i);
    if (!best || balance > best.balance) best = { parts: [left, right], balance };
  }
  return best?.parts ?? null;
}

/**
 * pages: [{ url, title, description, sections: [{ id, heading, text }] }]
 * Returns Map(relative path → JSON text) for one language.
 */
export function buildIndex(pages, locale, built = new Date().toISOString().slice(0, 10)) {
  const chunks = pages.flatMap(chunksOf);
  const docs = chunks.map((chunk) => {
    const counts = new Map(); // term → weighted count
    const written = new Map(); // word as written → weighted count, for compounds
    const add = (text, weight) => {
      const found = words(text, locale);
      for (const word of found) {
        const term = stem(word, locale);
        counts.set(term, (counts.get(term) ?? 0) + weight);
        written.set(word, (written.get(word) ?? 0) + weight);
      }
      return found.length;
    };
    const length = add(chunk.x, 1);
    add(chunk.h, HEADING_WEIGHT);
    add(chunk.t, TITLE_WEIGHT);
    return { counts, written, length };
  });

  // Terms seen in at least two chunks can be parts of a compound.
  const seen = new Map();
  for (const doc of docs) for (const term of doc.counts.keys()) seen.set(term, (seen.get(term) ?? 0) + 1);
  const known = new Set([...seen].filter(([, count]) => count >= 2).map(([term]) => term));
  const splits = new Map();
  for (const doc of docs) {
    for (const [word, count] of doc.written) {
      if (!splits.has(word)) splits.set(word, splitCompound(word, known, locale));
      for (const part of splits.get(word) ?? []) doc.counts.set(part, (doc.counts.get(part) ?? 0) + count * PART_WEIGHT);
    }
  }

  const frequency = new Map();
  for (const doc of docs) for (const term of doc.counts.keys()) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  const average = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length) || 1;

  const entries = new Map(); // term → [[chunk, weight], …]
  docs.forEach((doc, id) => {
    for (const [term, count] of doc.counts) {
      const df = frequency.get(term);
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      const weight = Math.round(idf * ((count * (K1 + 1)) / (count + K1 * (1 - B + (B * doc.length) / average))) * 100);
      if (weight < 1) continue;
      if (!entries.has(term)) entries.set(term, []);
      entries.get(term).push([id, weight]);
    }
  });

  let bytes = 0;
  const lists = new Map();
  for (const [term, list] of entries) {
    const flat = list.sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, MAX_ENTRIES_PER_TERM).flat();
    lists.set(term, flat);
    bytes += JSON.stringify(term).length + JSON.stringify(flat).length + 2;
  }
  const shards = Math.min(1024, Math.max(8, 2 ** Math.ceil(Math.log2(Math.max(1, bytes / TARGET_SHARD_BYTES)))));
  const termFiles = Array.from({ length: shards }, () => ({}));
  for (const term of [...lists.keys()].sort()) termFiles[shardOf(term, shards)][term] = lists.get(term);

  const files = new Map();
  files.set("meta.json", JSON.stringify({ v: INDEX_VERSION, locale, built, pages: pages.length, chunks: chunks.length, chunksPerFile: CHUNKS_PER_FILE, shards, terms: lists.size }));
  termFiles.forEach((file, index) => files.set(`t/${index}.json`, JSON.stringify(file)));
  for (let index = 0; index * CHUNKS_PER_FILE < chunks.length; index += 1) {
    files.set(`c/${index}.json`, JSON.stringify(chunks.slice(index * CHUNKS_PER_FILE, (index + 1) * CHUNKS_PER_FILE)));
  }
  return files;
}
