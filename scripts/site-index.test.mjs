// The assistant's own search index: cutting text into terms, reading a built
// page, building the index and searching it. No network, no built site needed.

import assert from "node:assert/strict";
import test from "node:test";
import { createSiteSearch, INDEX_ROOT } from "../functions/lib/site-search/search.js";
import { queryTerms, shardOf, stem, terms } from "../functions/lib/site-search/tokens.js";
import { buildIndex } from "./lib/site-index/build.mjs";
import { chunksOf, chunksOfSite, pieces } from "./lib/site-index/chunks.mjs";
import { splitCompound } from "./lib/site-index/compounds.mjs";
import { decodeEntities, extractPage, sectionsOf } from "./lib/site-index/extract.mjs";
import { PROBES } from "./lib/site-index/probes.mjs";
import { runProbes } from "./site-index.mjs";

const page = (url, title, sections, description = "") => ({ url, title, description, sections });
const section = (id, heading, text) => ({ id, heading, text });

/** Build an index in memory and return a search over it plus the files it read. */
function indexOf(pages, locale = "da") {
  const files = buildIndex(pages, locale, "2026-11-14");
  const read = [];
  const search = createSiteSearch({
    readJson: async (address) => {
      read.push(address);
      const name = address.slice(`${INDEX_ROOT}/${locale}/`.length);
      if (!files.has(name)) throw new Error(`missing ${address}`);
      return JSON.parse(files.get(name));
    },
  });
  return { files, read, search };
}

const PAGES = [
  page("/da/a/zigbee/", "Zigbee i Home Assistant", [
    section("", "", "Zigbee er en trådløs protokol til sensorer og pærer."),
    section("parring", "Parring af enheder", "Sæt sensoren i parringstilstand, og tilføj den i Home Assistant."),
    section("raekkevidde", "Rækkevidde", "Et mesh-netværk med flere routere giver bedre rækkevidde for alle sensorerne."),
  ]),
  page("/da/a/lys/", "Bevægelseslys med manuel overstyring", [
    section("", "", "Styr ganglys med bevægelse og en tydelig manuel overstyring."),
    section("automation", "Opret automationen", "Automationen tænder lyset, når sensoren melder bevægelse."),
  ]),
  page("/da/a/elpris/", "Elpriser time for time", [
    section("", "", "Hent elpriserne, og flyt forbruget til de billigste timer."),
    section("opvask", "Start opvaskemaskinen billigt", "Opvaskemaskinen starter i den billigste time om natten."),
  ]),
];

test("words are stored under one form, and short words and numbers are left alone", () => {
  assert.equal(stem("sensorer"), "sensor");
  assert.equal(stem("sensoren"), "sensor");
  assert.equal(stem("sensorerne"), "sensor");
  assert.equal(stem("målinger"), "mål");
  assert.equal(stem("overstyring"), stem("overstyres"));
  assert.equal(stem("lys"), "lys");
  assert.equal(stem("esp32"), "esp32");
  assert.equal(stem("lights", "en"), "light");
  assert.equal(stem("lighting", "en"), "light");
});

test("singular, plural and definite forms of a word are one term", () => {
  const same = (locale, ...forms) => assert.equal(new Set(forms.map((form) => stem(form, locale))).size, 1, forms.join(" / "));
  same("da", "pris", "priser", "prisen", "priserne");
  same("da", "elpris", "elpriser", "elprisen");
  same("da", "bevægelse", "bevægelser", "bevægelses");
  same("da", "status", "statussen");
  same("da", "shelly", "shellys");
  same("en", "device", "devices");
  same("en", "price", "prices");
  same("en", "scene", "scenes");
  same("en", "update", "updates", "updated", "updating");
  same("en", "battery", "batteries");
  same("en", "entity", "entities");
  same("en", "switch", "switches");
  same("en", "class", "classes");
  same("en", "status", "statuses");
  assert.deepEqual(queryTerms("have"), ["hav"]); // the garden is a word, not filler
});

test("a question becomes distinct terms without filler words", () => {
  assert.deepEqual(queryTerms("Hvordan tænder jeg lyset, når der er bevægelse?"), ["tænd", "lys", "bevægel"]);
  assert.deepEqual(queryTerms("How do I turn on the lights?", "en"), ["turn", "light"]);
  // A hyphenated name is stored joined and as its parts ("e" is a Danish ending, also here).
  assert.deepEqual(terms("Z-Wave og zigbee2mqtt"), ["zwav", "wav", "zigbee2mqtt"]);
  assert.deepEqual(terms("Z-Wave"), terms("zwave wave"));
  // A page keeps the joined form of a hyphenated word; a question only when a part is too short to stand alone.
  assert.deepEqual(terms("zigbee-sensor"), ["zigbeesensor", "zigbe", "sensor"]);
  assert.deepEqual(queryTerms("zigbee-sensor"), ["zigbe", "sensor"]);
  assert.deepEqual(queryTerms("Z-Wave"), ["zwav", "wav"]);
  assert.deepEqual(queryTerms("zigbeesensor"), ["zigbeesensor"]);
  assert.deepEqual(queryTerms("", "da"), []);
  assert.equal(queryTerms(Array.from({ length: 40 }, (_, i) => `ord${i}`).join(" ")).length, 10);
});

test("a term always lands in the same file, inside the range", () => {
  for (const term of ["zigbee", "bevægels", "æøå", ""]) {
    const shard = shardOf(term, 64);
    assert.equal(shard, shardOf(term, 64));
    assert.ok(Number.isInteger(shard) && shard >= 0 && shard < 64);
  }
});

test("HTML entities are decoded and unknown ones are kept", () => {
  assert.equal(decodeEntities("a &amp; b &lt;c&gt; &#230;&#xF8; &nbsp;&ukendt;"), "a & b <c> æø  &ukendt;");
});

test("a page is cut at its h2 and h3 headings, and menus, buttons and hidden parts are left out", () => {
  const sections = sectionsOf(`
    <p>Intro <a href="/x">med link</a>.</p>
    <nav><a href="/">Menu</a></nav>
    <button>Kopiér</button>
    <span class="sr-only">Skjult</span>
    <div data-pagefind-ignore><p>Ikke til søgning</p></div>
    <h2 id="trin-1">Trin 1 <span aria-hidden="true">#</span></h2>
    <p>Første &amp; anden linje.</p>
    <table><tr><th>Navn</th><th>Pris</th></tr><tr><td>Sensor</td><td>99 kr.</td></tr></table>
    <h3 id="kode">Kode</h3>
    <pre><code>automation:
  trigger:
    - platform: state</code></pre>
    <script>alert(1)</script>`);
  assert.deepEqual(sections.map((part) => [part.id, part.heading, part.parent]), [["", "", ""], ["trin-1", "Trin 1", ""], ["kode", "Kode", "Trin 1"]]);
  assert.equal(sections[0].text, "Intro med link.");
  assert.equal(sections[1].text, "Første & anden linje.\nNavn | Pris |\nSensor | 99 kr. |");
  assert.equal(sections[2].text, "automation:\n  trigger:\n    - platform: state");
});

test("a heading with nothing under it gives no section, and the next h3 still names its h2", () => {
  const sections = sectionsOf(`
    <h2 id="opsaetning">Opsætning</h2>
    <h3 id="docker">Docker</h3><p>Start containeren.</p>
    <h2 id="kommentarer">Kommentarer</h2>`);
  assert.deepEqual(sections, [{ id: "docker", heading: "Docker", parent: "Opsætning", text: "Start containeren." }]);
});

test("every tab's text is read, and words in neighbouring inline elements are not glued together", () => {
  const sections = sectionsOf(`
    <div role="tabpanel"><p>Første fane.</p></div>
    <div role="tabpanel" hidden><p>Anden fane.</p></div>
    <div hidden><p>Skjult.</p></div>
    <p><a href="/x"><span>Bevægelseslys</span><span>Lær at bygge det</span></a></p>
    <p><a href="/y">Køb</a><span class="badge">Reklamelink</span> hos <a href="/z">butikken</a>.</p>`);
  assert.equal(sections[0].text, "Første fane.\nAnden fane.\nBevægelseslys Lær at bygge det\nKøb Reklamelink hos butikken.");
});

test("a section that is mostly links gives no section", () => {
  const sections = sectionsOf(`
    <p>En rigtig forklaring med <a href="/x">et link</a> midt i teksten, som stadig er en forklaring.</p>
    <h2 id="naeste">Næste skridt</h2>
    <ul><li><a href="/a">Elpris-integration</a></li><li><a href="/b">Zigbee2MQTT opsætning</a></li></ul>
    <h2 id="mere">Mere</h2>
    <p>Almindelig tekst.</p>`);
  assert.deepEqual(sections.map((part) => part.id), ["", "mere"]);
});

test("a built page gives title, description and sections; a page that is not indexed gives nothing", () => {
  const html = (head, body) => `<html><head><title>Fane</title>${head}</head><body><header>Top</header><main>${body}</main></body></html>`;
  const built = extractPage(
    html(
      '<meta name="description" content="Kort &amp; godt">',
      '<h1 id="_top">Min <em>guide</em></h1><div class="sl-markdown-content"><p>Tekst.</p><h2 id="a">A</h2><p>Mere.</p></div>',
    ),
  );
  assert.deepEqual(built, {
    title: "Min guide",
    description: "Kort & godt",
    sections: [
      { id: "", heading: "", parent: "", text: "Tekst." },
      { id: "a", heading: "A", parent: "", text: "Mere." },
    ],
  });
  assert.equal(extractPage(html('<meta name="robots" content="noindex, nofollow">', "<p>Tekst</p>")), null);
  assert.equal(extractPage("<html><body><p>Ingen main</p></body></html>"), null);
});

test("long text is cut at line ends and never above the size", () => {
  const text = ["a".repeat(40), "b".repeat(40), "c".repeat(40)].join("\n");
  assert.deepEqual(pieces(text, 90), [`${"a".repeat(40)}\n${"b".repeat(40)}`, "c".repeat(40)]);
  const long = pieces(`${"ord ".repeat(200)}`, 100);
  assert.ok(long.length > 5 && long.every((piece) => piece.length <= 100));
  assert.deepEqual(pieces("  \n \n"), []);
  // A sentence that ends exactly at the limit is not cut one character too late.
  assert.ok(pieces(`${"a".repeat(99)}. ${"b".repeat(150)}`, 100).every((piece) => piece.length <= 100));
});

test("a page's chunks carry the address with the section's anchor, and the intro gets the description", () => {
  const chunks = chunksOf(page("/da/x/", "Titel", [section("", "", "Intro."), section("trin", "Trin", "Gør sådan.")], "Beskrivelsen."));
  assert.deepEqual(chunks, [
    { u: "/da/x/", t: "Titel", h: "", x: "Beskrivelsen.\nIntro." },
    { u: "/da/x/#trin", t: "Titel", h: "Trin", x: "Gør sådan." },
  ]);
});

test("a section without text gives no chunk, an h3 carries its h2, and a page without intro still gets its description", () => {
  const chunks = chunksOf(
    page("/da/x/", "Titel", [section("tom", "Tom", ""), { id: "docker", heading: "Docker", parent: "Opsætning", text: "Start." }], "Beskrivelsen."),
  );
  assert.deepEqual(chunks, [
    { u: "/da/x/", t: "Titel", h: "", x: "Beskrivelsen." },
    { u: "/da/x/#docker", t: "Titel", h: "Opsætning › Docker", x: "Start." },
  ]);
});

test("text repeated word for word on three pages is left out of the index", () => {
  const notice = "Nyhederne er skrevet af en sprogmodel og kontrolleret mod kilderne.";
  const pages = [1, 2, 3].map((day) => page(`/da/nyheder/${day}/`, `Dag ${day}`, [section("", "", `Nyhed nummer ${day}.`), section("om", "Om", notice)]));
  const chunks = chunksOfSite(pages);
  assert.equal(chunks.length, 3);
  assert.ok(chunks.every((chunk) => chunk.x !== notice));
  assert.equal(chunksOfSite(pages.slice(0, 2)).length, 4);
});

test("a heading alone never outranks the section that answers", async () => {
  const pages = [
    page("/da/a/", "Zigbee2MQTT", [
      section("opsaetning", "Opsætning", "Installer Zigbee2MQTT som tilføjelse, og vælg din koordinator i opsætningen. ".repeat(4)),
    ]),
    page("/da/b/", "Netværk", [section("opsaetning", "Opsætning", ""), section("kort", "Opsætning", "Se her.")]),
    page("/da/c/", "Andet", [section("", "", "Noget helt andet om lys og varme i huset.")]),
  ];
  const { files, search } = indexOf(pages);
  assert.ok([...files].filter(([name]) => name.startsWith("c/")).every(([, content]) => JSON.parse(content).every((chunk) => chunk.x !== chunk.h)));
  assert.equal((await search("zigbee2mqtt opsætning"))[0].url, "/da/a/#opsaetning");
});

test("a joined word is split into the two known words it is made of", () => {
  const known = new Set(["bevægel", "lys", "gang", "sensor", "led", "control", "el", "pri", "mål", "dør", "se", "nest", "par", "ring"]);
  assert.deepEqual(splitCompound("bevægelseslys", known, "da"), ["bevægel", "lys"]);
  // A short first part is accepted from a fixed list only, and needs a last part of four letters.
  assert.deepEqual(splitCompound("elpris", known, "da"), ["el", "pri"]);
  assert.deepEqual(splitCompound("elmåler", known, "da"), ["el", "mål"]);
  assert.deepEqual(splitCompound("dørsensor", known, "da"), ["dør", "sensor"]);
  assert.equal(splitCompound("seneste", known, "da"), null); // not "se" + "nest"
  assert.equal(splitCompound("parring", known, "da"), null); // not "par" + "ring"
  assert.deepEqual(splitCompound("ganglys", known, "da"), ["gang", "lys"]);
  assert.equal(splitCompound("sensorerne", known, "da"), null);
  assert.equal(splitCompound("udelys", known, "da"), null); // too short to be split safely
  assert.equal(splitCompound("controlled", known, "en"), null); // "led" is too short a last part in English
});

test("the index is small files: one description, term files and chunk files", () => {
  const { files } = indexOf(PAGES);
  const meta = JSON.parse(files.get("meta.json"));
  assert.deepEqual(
    { v: meta.v, locale: meta.locale, built: meta.built, pages: meta.pages, chunks: meta.chunks, chunksPerFile: meta.chunksPerFile },
    { v: 1, locale: "da", built: "2026-11-14", pages: 3, chunks: 7, chunksPerFile: 8 },
  );
  const names = [...files.keys()];
  assert.equal(names.filter((name) => name.startsWith("t/")).length, meta.shards);
  assert.deepEqual(names.filter((name) => name.startsWith("c/")), ["c/0.json"]);
  for (const name of names.filter((entry) => entry.startsWith("t/"))) {
    for (const [term, list] of Object.entries(JSON.parse(files.get(name)))) {
      assert.equal(shardOf(term, meta.shards), Number(name.slice(2, -5)), `${term} is in the wrong file`);
      assert.ok(list.length % 2 === 0 && list.every((value) => Number.isInteger(value) && value >= 0));
    }
  }
});

test("a question finds the section that answers it, with the address of that section", async () => {
  const { search } = indexOf(PAGES);
  const [best] = await search("hvordan parrer jeg en sensor", "da");
  assert.equal(best.url, "/da/a/zigbee/#parring");
  assert.equal(best.title, "Zigbee i Home Assistant");
  assert.equal(best.heading, "Parring af enheder");
  assert.match(best.text, /parringstilstand/);
  assert.ok(best.score > 0);

  assert.equal((await search("billigste time til opvaskemaskinen", "da"))[0].url, "/da/a/elpris/#opvask");
  // "lys" and "bevægelse" are found inside "Bevægelseslys" and "ganglys".
  assert.equal((await search("lys ved bevægelse med overstyring", "da"))[0].url.split("#")[0], "/da/a/lys/");
});

test("a chunk that answers more of the question wins over one that repeats a single word", async () => {
  const { search } = indexOf([
    page("/da/a/", "A", [section("", "", "Sensor sensor sensor sensor sensor sensor i stuen.")]),
    page("/da/b/", "B", [section("", "", "En sensor måler temperatur i drivhuset.")]),
  ]);
  assert.equal((await search("sensor temperatur drivhus", "da"))[0].url, "/da/b/");
});

test("when the question names something the site has a page about, every result is about it", async () => {
  const pages = [
    page("/da/a/shelly/", "Shelly Produktguide", [section("", "", "Shelly laver relæer til lys og måling af forbrug i hjemmet.")]),
    page("/da/a/vand/", "Smart vand", [section("", "", "En Shelly Flood koster omkring 200 kr. og melder om lækage.")]),
    page("/da/a/vilkaar/", "Vilkår", [section("", "", "Det koster ikke noget at læse med. Det koster heller ikke noget at skrive.")]),
    page("/da/a/andet/", "Andet", [section("", "", "Noget om varme og gardiner."), section("x", "Mere", "Og lidt om ventilation.")]),
  ];
  const { search } = indexOf(pages);
  assert.deepEqual((await search("Hvad koster en Shelly?")).map((result) => result.url), ["/da/a/vand/", "/da/a/shelly/"]);
  // No page is about "koster": then any text that says it may answer.
  assert.deepEqual((await search("hvad koster det")).map((result) => result.url), ["/da/a/vilkaar/", "/da/a/vand/"]);
});

test("at most two results come from the same page, and the limit is kept", async () => {
  const many = page("/da/m/", "Zigbee", Array.from({ length: 6 }, (_, i) => section(`s${i}`, `Zigbee del ${i}`, `Zigbee sensor nummer ${i}.`)));
  const { search } = indexOf([many, ...PAGES]);
  const results = await search("zigbee sensor", "da");
  assert.ok(results.length <= 5);
  assert.ok(results.filter((result) => result.url.startsWith("/da/m/")).length <= 2);
  assert.equal((await search("zigbee sensor", "da", 1)).length, 1);
});

test("a question reads only the description, the term files it needs and the chunk files of the candidates", async () => {
  const { read, search } = indexOf(PAGES);
  await search("zigbee rækkevidde", "da");
  assert.equal(read[0], "/_index/da/meta.json");
  assert.ok(read.length <= 1 + 2 + 1, read.join(", "));
  const before = read.length;
  await search("zigbee", "da");
  assert.ok(!read.slice(before).includes("/_index/da/meta.json"), "the description is read once");
});

test("no words, unknown words and filler words give no results and read no term files", async () => {
  const { read, search } = indexOf(PAGES);
  assert.deepEqual(await search("", "da"), []);
  assert.deepEqual(await search("og eller men", "da"), []);
  assert.equal(read.length, 0);
  assert.deepEqual(await search("kvantecomputer", "da"), []);
});

test("a damaged index is refused or skipped, never trusted", async () => {
  const broken = (meta) => createSiteSearch({ readJson: async () => meta })("zigbee", "da");
  await assert.rejects(broken({ v: 2, shards: 8, chunks: 1, chunksPerFile: 8 }), /SiteIndexInvalid/);
  await assert.rejects(broken({ v: 1, shards: 0, chunks: 1, chunksPerFile: 8 }), /SiteIndexInvalid/);
  await assert.rejects(broken(null), /SiteIndexInvalid/);

  // Entries that point outside the index, and chunks without an address, are skipped.
  const meta = { v: 1, shards: 1, chunks: 2, chunksPerFile: 8 };
  const search = createSiteSearch({
    readJson: async (address) => {
      if (address.endsWith("meta.json")) return meta;
      if (address.includes("/t/")) return { [stem("zigbee")]: [0, 50, 7, 900, -1, 900, 1, "x", 1, 40] };
      return [{ u: "/da/ok/", t: "Ok", h: "", x: "Zigbee" }, { u: 5, x: "Zigbee" }];
    },
  });
  assert.deepEqual((await search("zigbee", "da")).map((result) => result.url), ["/da/ok/"]);
});

test("a failed read is tried again on the next question", async () => {
  let calls = 0;
  const search = createSiteSearch({
    readJson: async () => {
      calls += 1;
      throw new Error("offline");
    },
  });
  await assert.rejects(search("zigbee", "da"), /offline/);
  await assert.rejects(search("zigbee", "da"), /offline/);
  assert.equal(calls, 2);
});

test("the questions asked after every build name a failed one with what was found instead", async () => {
  const { files } = indexOf(PAGES);
  assert.deepEqual(await runProbes(files, "da", [{ query: "parring af sensor", page: "/da/a/zigbee/" }]), []);
  const failed = await runProbes(files, "da", [{ query: "parring af sensor", page: "/da/findes-ikke/" }]);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].found[0], "/da/a/zigbee/");
});

test("the fixed questions cover both languages and point at pages of that language", () => {
  for (const locale of ["da", "en"]) {
    assert.ok(PROBES[locale].length >= 5);
    for (const probe of PROBES[locale]) {
      assert.match(probe.page, new RegExp(`^/${locale}/.+/$`));
      assert.ok(queryTerms(probe.query, locale).length > 0);
    }
  }
});

test("the build writes the index, and search engines are told the index files are not pages", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");
  const build = JSON.parse(await read("package.json")).scripts.build;
  assert.match(build, /astro build && node scripts\/finalize-build\.mjs && node scripts\/write-llms-txt\.mjs && node scripts\/site-index\.mjs$/);
  assert.match(await read("public/_headers"), /^\/_index\/\*\n\s+X-Robots-Tag: noindex$/m);
});
