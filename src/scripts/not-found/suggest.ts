import type { PageIndexEntry } from "../../lib/not-found-index";
import type { NotFoundLang } from "../../lib/not-found-copy";

// "Mente du?": the closest real pages to the broken URL, scored with a Dice
// coefficient over character bigrams.
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function bigrams(value: string): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < value.length - 1; i++) {
    const gram = value.slice(i, i + 2);
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return map;
}

function dice(a: Map<string, number>, b: Map<string, number>): number {
  if (!a.size || !b.size) return 0;
  let hits = 0;
  let total = 0;
  a.forEach((count, gram) => {
    total += count;
    const other = b.get(gram);
    if (other) hits += Math.min(count, other);
  });
  b.forEach((count) => { total += count; });
  return (2 * hits) / total;
}

const stripLang = (value: string) => value.replace(/^\/(da|en)\//, "/");
const headSegment = (value: string) => stripLang(value).split("/").filter(Boolean)[0] || "";

export function showSuggestions(path: string, lang: NotFoundLang, pageIndex: PageIndexEntry[]): void {
  const requested = normalise(stripLang(path));
  // A bare "/" or a direct visit to /404 is not a broken link.
  if (!requested || path === "/404" || path === "/404/") return;

  const requestedGrams = bigrams(requested);
  const langPrefix = lang === "en" ? "/en/" : "/da/";
  const requestedHead = headSegment(path);

  const ranked = pageIndex
    .filter((page) => page.p.indexOf(langPrefix) === 0)
    .map((page) => {
      let score = dice(requestedGrams, bigrams(normalise(stripLang(page.p))));
      // Landing in the right section is a strong signal by itself.
      if (requestedHead && headSegment(page.p) === requestedHead) score += 0.15;
      return { page, score };
    })
    .filter((entry) => entry.score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!ranked.length) return;
  const items = document.querySelectorAll<HTMLLIElement>("#nf-suggest-list li");
  ranked.forEach((entry, index) => {
    const item = items[index];
    if (!item) return;
    const link = item.querySelector("a")!;
    link.href = entry.page.p;
    link.querySelector(".suggest-text")!.textContent = entry.page.t;
    link.querySelector(".suggest-path")!.textContent = entry.page.p;
    item.hidden = false;
  });
  document.getElementById("nf-suggest")!.hidden = false;
}
