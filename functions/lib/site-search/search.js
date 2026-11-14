// Searches the site's own index (built by scripts/site-index.mjs into
// dist/_index/<language>/). Reads only the few small files a question needs:
// one per term and one per result. No service outside the Worker is called.

import { queryTerms, shardOf } from "./tokens.js";

export const INDEX_ROOT = "/_index";
// Raise when the files' format changes: a Worker with older code then refuses
// a newer index instead of misreading it. The builder reads it from here.
export const INDEX_VERSION = 1;
export const MAX_SITE_RESULTS = 5;
// The best score from which a result is about the question. Measured against
// the built index on 2026-11-14 for questions without a smart home word:
// on-topic ones scored 13.33 or more ("Hvordan kommer jeg i gang?" 13.33,
// "Hvordan lader jeg elbilen billigt?" 18.61, "Hvordan får jeg lyset til at
// tænde ved bevægelse?" 31.61), off-topic ones 9.42 or less ("Hvem vandt VM i
// fodbold i 2022?" 9.42, "Skriv et digt om efteråret" 5.42, "ja tak" 0). Below
// it the assistant answers without the site's pages. The build holds the line
// with the question lists in scripts/lib/site-index/probes.mjs.
export const USEFUL_SCORE = 12;
const CANDIDATES = 12;
const PER_PAGE = 2;
// A question reads at most 1 + MAX_QUERY_TERMS + MAX_CHUNK_FILES files (19),
// so two searches in one chat request stay below the Worker's subrequest limit.
const MAX_CHUNK_FILES = 8;
// A chunk that answers more of the question's terms beats one that repeats a single term.
const COVERAGE_BONUS = 0.6;
// A result far below the best one is left out, so a weak match does not
// become a source link.
const SHARE_OF_BEST = 0.25;

const isCount = (value, max = 1_000_000) => Number.isInteger(value) && value > 0 && value <= max;

function checkMeta(meta) {
  if (meta?.v !== INDEX_VERSION || !isCount(meta.shards, 4096) || !isCount(meta.chunks) || !isCount(meta.chunksPerFile, 64)) {
    throw new Error("SiteIndexInvalid");
  }
  return meta;
}

/**
 * readJson(path) → parsed JSON of one index file, e.g. "/_index/da/meta.json".
 * Returns search(query, locale, limit, report) → [{ url, title, heading, text, score }], best first.
 * `report`, when given, is an object the search fills in: `terms` is how many
 * search terms the question has, `unknownTerms` how many of them no page uses.
 */
export function createSiteSearch({ readJson }) {
  // The read value is kept, not the read in progress: a request that is
  // cancelled halfway must not leave later questions waiting on it.
  const metas = new Map();
  const metaFor = async (locale) => {
    if (!metas.has(locale)) metas.set(locale, checkMeta(await readJson(`${INDEX_ROOT}/${locale}/meta.json`)));
    return metas.get(locale);
  };

  return async function search(query, locale = "da", limit = MAX_SITE_RESULTS, report = null) {
    if (!/^[a-z]{2}$/.test(locale)) return [];
    const wanted = queryTerms(query, locale);
    if (report) Object.assign(report, { terms: wanted.length, unknownTerms: 0 });
    if (!wanted.length) return [];
    const meta = await metaFor(locale);
    const base = `${INDEX_ROOT}/${locale}`;

    const shardIds = [...new Set(wanted.map((term) => shardOf(term, meta.shards)))];
    const shardFiles = await Promise.all(shardIds.map((id) => readJson(`${base}/t/${id}.json`)));
    const shards = new Map(shardIds.map((id, index) => [id, shardFiles[index]]));

    // Subjects are the terms of the page titles: what the site has pages about.
    // When the question names one, a result must hold one too. "Hvad koster en
    // Shelly?" is then answered from text about Shelly, not from any page that
    // says "koster".
    const subjects = new Set(Array.isArray(meta.subjects) ? meta.subjects : []);
    const named = wanted.some((term) => subjects.has(term));
    const scores = new Map();
    const matched = new Map();
    const onSubject = new Set();
    for (const term of wanted) {
      const shard = shards.get(shardOf(term, meta.shards));
      const list = shard && Object.hasOwn(shard, term) ? shard[term] : null;
      if (!Array.isArray(list) || !list.length) {
        if (report) report.unknownTerms += 1;
        continue;
      }
      for (let i = 0; i + 1 < list.length; i += 2) {
        const id = list[i];
        const weight = list[i + 1];
        if (!Number.isInteger(id) || id < 0 || id >= meta.chunks || !Number.isFinite(weight)) continue;
        scores.set(id, (scores.get(id) ?? 0) + weight);
        matched.set(id, (matched.get(id) ?? 0) + 1);
        if (subjects.has(term)) onSubject.add(id);
      }
    }

    const all = [...scores]
      .filter(([id]) => !named || onSubject.has(id))
      .map(([id, score]) => [id, score * (1 + COVERAGE_BONUS * (matched.get(id) - 1))])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    if (!all.length) return [];
    const ranked = all.filter(([, score]) => score >= all[0][1] * SHARE_OF_BEST).slice(0, CANDIDATES);

    const fileIds = [...new Set(ranked.map(([id]) => Math.floor(id / meta.chunksPerFile)))].slice(0, MAX_CHUNK_FILES);
    const chunkFiles = await Promise.all(fileIds.map((id) => readJson(`${base}/c/${id}.json`)));
    const files = new Map(fileIds.map((id, index) => [id, chunkFiles[index]]));

    const results = [];
    const perPage = new Map();
    for (const [id, score] of ranked) {
      const chunk = files.get(Math.floor(id / meta.chunksPerFile))?.[id % meta.chunksPerFile];
      if (typeof chunk?.u !== "string" || typeof chunk?.x !== "string") continue;
      const page = chunk.u.split("#")[0];
      const count = perPage.get(page) ?? 0;
      if (count >= PER_PAGE) continue;
      perPage.set(page, count + 1);
      results.push({
        url: chunk.u,
        title: typeof chunk.t === "string" ? chunk.t : "",
        heading: typeof chunk.h === "string" ? chunk.h : "",
        text: chunk.x,
        score: Math.round(score) / 100,
      });
      if (results.length >= limit) break;
    }
    return results;
  };
}
