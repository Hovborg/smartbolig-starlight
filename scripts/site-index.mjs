// Builds the assistant's search index from the built site:
//   node scripts/site-index.mjs            (after astro build; part of npm run build)
// Reads dist/<language>/**/index.html, writes dist/_index/<language>/, and
// asks the index a fixed set of questions (scripts/lib/site-index/probes.mjs).

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSiteSearch, INDEX_ROOT } from "../functions/lib/site-search/search.js";
import { buildIndex } from "./lib/site-index/build.mjs";
import { extractPage } from "./lib/site-index/extract.mjs";
import { PROBES } from "./lib/site-index/probes.mjs";

const LOCALES = ["da", "en"];
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

async function pagesUnder(directory, url) {
  const pages = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) pages.push(...(await pagesUnder(path.join(directory, entry.name), `${url}${entry.name}/`)));
    else if (entry.name === "index.html") pages.push({ file: path.join(directory, entry.name), url });
  }
  return pages;
}

/** Ask the freshly built index the probe questions. Returns the ones that failed. */
export async function runProbes(files, locale, probes = PROBES[locale] ?? []) {
  const search = createSiteSearch({
    readJson: async (address) => JSON.parse(files.get(address.slice(`${INDEX_ROOT}/${locale}/`.length))),
  });
  const failed = [];
  for (const probe of probes) {
    const found = (await search(probe.query, locale)).slice(0, 3).map((result) => result.url.split("#")[0]);
    if (!found.includes(probe.page)) failed.push({ ...probe, found });
  }
  return failed;
}

async function main() {
  await rm(path.join(dist, "_index"), { recursive: true, force: true });
  let failures = 0;
  for (const locale of LOCALES) {
    const pages = [];
    for (const { file, url } of (await pagesUnder(path.join(dist, locale), `/${locale}/`)).sort((a, b) => a.url.localeCompare(b.url))) {
      const page = extractPage(await readFile(file, "utf8"));
      if (page) pages.push({ url, ...page });
    }
    const files = buildIndex(pages, locale);
    let bytes = 0;
    for (const [name, content] of files) {
      const target = path.join(dist, "_index", locale, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
      bytes += Buffer.byteLength(content);
    }
    const meta = JSON.parse(files.get("meta.json"));
    console.log(`Site index ${locale}: ${meta.pages} pages, ${meta.chunks} chunks, ${meta.terms} terms, ${files.size} files, ${Math.round(bytes / 1024)} KB.`);
    for (const probe of await runProbes(files, locale)) {
      failures += 1;
      console.error(`Site index ${locale}: "${probe.query}" should find ${probe.page}, found ${probe.found.join(", ") || "nothing"}.`);
    }
  }
  if (failures) throw new Error(`${failures} search probe(s) failed`);
}

/** `--ask <language> "<question>"`: show what the built index answers, for debugging. */
async function ask(locale, query) {
  if (!LOCALES.includes(locale) || !query) {
    console.error(`Usage: node scripts/site-index.mjs --ask <${LOCALES.join("|")}> "<question>"`);
    process.exitCode = 1;
    return;
  }
  const search = createSiteSearch({ readJson: async (address) => JSON.parse(await readFile(path.join(dist, address), "utf8")) });
  for (const result of await search(query, locale)) {
    console.log(`${result.score.toFixed(1).padStart(6)}  ${result.url}\n        ${result.title} · ${result.heading || "(intro)"}\n        ${result.text.slice(0, 110).replace(/\n/g, " ")}…`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--ask") await ask(process.argv[3], process.argv.slice(4).join(" "));
  else await main();
}
