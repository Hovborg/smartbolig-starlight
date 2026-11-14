// Builds the assistant's own search index from the pages' text: the text cut
// into pieces ("chunks", ./chunks.mjs) and, for every term, which pieces it
// scores in (BM25). The result is a set of small JSON files that the Worker
// reads on demand (functions/lib/site-search/search.js).

import { INDEX_VERSION } from "../../../functions/lib/site-search/search.js";
import { shardOf, stem, words } from "../../../functions/lib/site-search/tokens.js";
import { chunksOfSite } from "./chunks.mjs";
import { splitCompound } from "./compounds.mjs";

export const CHUNKS_PER_FILE = 8;
const K1 = 1.2;
const B = 0.75;
const HEADING_WEIGHT = 2;
const TITLE_WEIGHT = 1.5;
const PART_WEIGHT = 0.5;
// A short chunk counts as at least this share of the average length, so two
// lines under a heading do not outrank a full section.
const SHORTEST_SHARE = 1;
// Only the best chunks of a very common term are kept ("assistant" is in
// about 1,000). A term in fewer chunks than this is stored in full.
const MAX_ENTRIES_PER_TERM = 600;
// Term files aim for this size; the number of files follows from it. Small
// files keep a question's CPU time low: the Worker parses one file per term.
const TARGET_SHARD_BYTES = 12_000;

/** What one chunk holds: term → weighted count, the words as written, and its length in words. */
function termsOf(chunk, locale) {
  const counts = new Map();
  const written = new Map(); // word as written → weighted count, for compounds
  const add = (text, weight) => {
    const found = words(text, locale);
    for (const word of found) {
      const term = stem(word, locale);
      counts.set(term, (counts.get(term) ?? 0) + weight);
      written.set(word, (written.get(word) ?? 0) + weight);
    }
    return found.length * weight;
  };
  // Heading and title count in the length too: they count in the terms.
  const length = add(chunk.x, 1) + add(chunk.h, HEADING_WEIGHT) + add(chunk.t, TITLE_WEIGHT);
  return { counts, written, length };
}

/** Terms seen in at least two chunks: they can be the parts of a joined word. */
function knownTerms(docs) {
  const seen = new Map();
  for (const doc of docs) for (const term of doc.counts.keys()) seen.set(term, (seen.get(term) ?? 0) + 1);
  return new Set([...seen].filter(([, count]) => count >= 2).map(([term]) => term));
}

/** Add the parts of joined words to every chunk that holds one. */
function addCompoundParts(docs, known, locale) {
  const splits = new Map();
  for (const doc of docs) {
    for (const [word, count] of doc.written) {
      if (!splits.has(word)) splits.set(word, splitCompound(word, known, locale));
      for (const part of splits.get(word) ?? []) doc.counts.set(part, (doc.counts.get(part) ?? 0) + count * PART_WEIGHT);
    }
  }
}

/** The terms of every page title, with the parts of joined words: what the site has pages about. */
function subjectsOf(pages, known, locale) {
  const subjects = new Set();
  for (const page of pages) {
    for (const word of words(page.title, locale)) {
      subjects.add(stem(word, locale));
      for (const part of splitCompound(word, known, locale) ?? []) subjects.add(part);
    }
  }
  return [...subjects].sort();
}

/** term → [chunk, weight, chunk, weight, …], best first (BM25, weight × 100). */
function postings(docs) {
  const frequency = new Map();
  for (const doc of docs) for (const term of doc.counts.keys()) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  const average = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length) || 1;

  const entries = new Map();
  docs.forEach((doc, id) => {
    const length = Math.max(doc.length, average * SHORTEST_SHARE);
    for (const [term, count] of doc.counts) {
      const df = frequency.get(term);
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      const weight = Math.round(idf * ((count * (K1 + 1)) / (count + K1 * (1 - B + (B * length) / average))) * 100);
      if (weight < 1) continue;
      if (!entries.has(term)) entries.set(term, []);
      entries.get(term).push([id, weight]);
    }
  });
  const lists = new Map();
  for (const [term, list] of entries) {
    lists.set(term, list.sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, MAX_ENTRIES_PER_TERM).flat());
  }
  return lists;
}

/**
 * pages: [{ url, title, description, sections: [{ id, heading, parent, text }] }]
 * Returns Map(relative path → JSON text) for one language.
 */
export function buildIndex(pages, locale, built = new Date().toISOString().slice(0, 10)) {
  const chunks = chunksOfSite(pages);
  const docs = chunks.map((chunk) => termsOf(chunk, locale));
  const known = knownTerms(docs);
  addCompoundParts(docs, known, locale);
  const lists = postings(docs);
  const subjects = subjectsOf(pages, known, locale);

  let bytes = 0;
  for (const [term, list] of lists) bytes += JSON.stringify(term).length + JSON.stringify(list).length + 2;
  const shards = Math.min(1024, Math.max(8, 2 ** Math.ceil(Math.log2(Math.max(1, bytes / TARGET_SHARD_BYTES)))));
  const termFiles = Array.from({ length: shards }, () => ({}));
  for (const term of [...lists.keys()].sort()) termFiles[shardOf(term, shards)][term] = lists.get(term);

  const files = new Map();
  files.set("meta.json", JSON.stringify({ v: INDEX_VERSION, locale, built, pages: pages.length, chunks: chunks.length, chunksPerFile: CHUNKS_PER_FILE, shards, terms: lists.size, subjects }));
  termFiles.forEach((file, index) => files.set(`t/${index}.json`, JSON.stringify(file)));
  for (let index = 0; index * CHUNKS_PER_FILE < chunks.length; index += 1) {
    files.set(`c/${index}.json`, JSON.stringify(chunks.slice(index * CHUNKS_PER_FILE, (index + 1) * CHUNKS_PER_FILE)));
  }
  return files;
}
