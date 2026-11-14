// Cuts a page's sections into the pieces ("chunks") the index stores, and
// leaves out text that is repeated on many pages.

export const CHUNK_CHARS = 1500;
// The same text on this many pages is boilerplate (a notice under every news issue), not an answer.
const REPEATED_ON_PAGES = 3;

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
      const cut = Math.max(rest.lastIndexOf(". ", size - 1) + 1, rest.lastIndexOf(" ", size), Math.floor(size / 2));
      out.push(rest.slice(0, cut).trimEnd());
      rest = rest.slice(cut).trimStart();
    }
    if (current.length + rest.length + 1 > size) push();
    current += (current ? "\n" : "") + rest;
  }
  push();
  return out;
}

/**
 * One page's chunks: { u: address (with #anchor), t: page title, h: section heading, x: text }.
 * A section without text gives no chunk. An h3 section carries its h2 in the
 * heading ("Opsætning › Docker"). The page's description leads the intro.
 */
export function chunksOf(page) {
  const chunks = [];
  const sections = page.sections.some((section) => !section.heading) ? page.sections : [{ id: "", heading: "", text: "" }, ...page.sections];
  for (const section of sections) {
    const lead = !section.heading && page.description && !section.text.includes(page.description) ? `${page.description}\n` : "";
    const heading = section.parent ? `${section.parent} › ${section.heading}` : section.heading;
    const address = section.id ? `${page.url}#${section.id}` : page.url;
    for (const piece of pieces(lead + section.text)) chunks.push({ u: address, t: page.title, h: heading, x: piece });
  }
  return chunks;
}

/** Every page's chunks, without the texts that are repeated word for word on several pages. */
export function chunksOfSite(pages) {
  const chunks = pages.flatMap(chunksOf);
  const pagesWith = new Map(); // text → the pages it is on
  for (const chunk of chunks) {
    if (!pagesWith.has(chunk.x)) pagesWith.set(chunk.x, new Set());
    pagesWith.get(chunk.x).add(chunk.u.split("#")[0]);
  }
  return chunks.filter((chunk) => pagesWith.get(chunk.x).size < REPEATED_ON_PAGES);
}
