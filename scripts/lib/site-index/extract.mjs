// Reads one built page (HTML from dist/) and returns its text, cut into the
// sections a reader sees: the intro and one piece per h2/h3. Menus, buttons,
// scripts, pictures and anything marked data-pagefind-ignore are left out.

const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|<!--[\s\S]*?-->/g;
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const SKIPPED = new Set(["script", "style", "svg", "nav", "footer", "template", "button", "noscript", "select", "form", "iframe", "dialog"]);
const BREAKS = new Set([
  "p", "div", "li", "tr", "pre", "table", "ul", "ol", "blockquote", "section", "article", "details", "summary",
  "figure", "figcaption", "dt", "dd", "h1", "h2", "h3", "h4", "h5", "h6", "aside", "header",
]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] !== "#") return ENTITIES[name.toLowerCase()] ?? whole;
    const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

const attribute = (attributes, name) => new RegExp(`(?:^|\\s)${name}(?:=("[^"]*"|'[^']*'|[^\\s"'>]+))?(?=\\s|$)`, "i").exec(attributes);
const attributeValue = (attributes, name) => {
  const match = attribute(attributes, name);
  return match?.[1] ? decodeEntities(match[1].replace(/^["']|["']$/g, "")) : null;
};

/** Not part of the page's text: ignored by the site search, hidden, or only there for screen readers or decoration. */
const isHidden = (attributes) =>
  Boolean(attribute(attributes, "data-pagefind-ignore") || attribute(attributes, "hidden")) ||
  attributeValue(attributes, "aria-hidden") === "true" ||
  /\bsr-only\b/.test(attributeValue(attributes, "class") ?? "");

/** Tidy one section's text: single spaces outside code, no empty lines, code lines kept as they are. */
function tidy(text) {
  return text
    .split("\n")
    .map((line) => (line.startsWith("\u0001") ? line.slice(1).replace(/\s+$/, "") : line.replace(/\s+/g, " ").trim()))
    .filter((line) => line.trim())
    .join("\n");
}

/** The text of the content area as sections: [{ id, heading, text }]. The first has no heading. */
export function sectionsOf(html) {
  const sections = [{ id: "", heading: "", text: "" }];
  let current = sections[0];
  let skipUntil = -1; // depth at which the skipped element started
  let depth = 0;
  let pre = 0;
  let heading = null; // { id, text } while inside an h2/h3
  let last = 0;

  const write = (raw) => {
    if (skipUntil >= 0 || !raw) return;
    const text = decodeEntities(raw);
    if (heading) heading.text += text;
    else if (pre) current.text += text.replace(/\n/g, "\n\u0001"); // mark code lines so their indent survives
    else current.text += text.replace(/\s+/g, " ");
  };

  for (const match of html.matchAll(TAG)) {
    write(html.slice(last, match.index));
    last = match.index + match[0].length;
    const [, closing, rawName, attributes = ""] = match;
    if (!rawName) continue; // a comment
    const name = rawName.toLowerCase();
    if (VOID.has(name) || attributes.trimEnd().endsWith("/")) {
      if (name === "br" && skipUntil < 0 && !heading) current.text += "\n";
      continue;
    }

    if (!closing) {
      depth += 1;
      if (skipUntil >= 0) continue;
      if (SKIPPED.has(name) || isHidden(attributes)) {
        skipUntil = depth;
      } else if (name === "h2" || name === "h3") {
        heading = { id: attributeValue(attributes, "id") ?? "", text: "" };
      } else if (name === "pre") {
        pre += 1;
        current.text += "\n\u0001";
      }
      continue;
    }

    if (skipUntil >= 0) {
      if (depth === skipUntil) skipUntil = -1;
      depth -= 1;
      continue;
    }
    depth -= 1;
    if (heading && (name === "h2" || name === "h3")) {
      current = { id: heading.id, heading: heading.text.replace(/\s+/g, " ").trim(), text: "" };
      sections.push(current);
      heading = null;
    } else if (name === "pre") {
      pre = Math.max(0, pre - 1);
      current.text += "\n";
    } else if (name === "td" || name === "th") {
      current.text += " | ";
    } else if (BREAKS.has(name) && !heading) {
      current.text += pre ? "\n\u0001" : "\n";
    }
  }
  write(html.slice(last));

  return sections
    .map((section) => ({ ...section, text: tidy(section.text) }))
    .filter((section) => section.text || section.heading);
}

/** Everything the index needs from one page, or null when the page has no content to index. */
export function extractPage(html) {
  if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) return null;
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  if (!main) return null;
  const title = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(main)?.[1] ?? /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  const description = /<meta[^>]+name=["']description["'][^>]+content=("[^"]*"|'[^']*')/i.exec(html)?.[1] ?? "";
  const start = main.search(/<div[^>]+class=["'][^"']*\bsl-markdown-content\b/i);
  const body = start >= 0 ? main.slice(start) : main;
  const sections = sectionsOf(body);
  if (!sections.length) return null;
  return {
    title: decodeEntities(title.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim(),
    description: decodeEntities(description.slice(1, -1)).trim(),
    sections,
  };
}
