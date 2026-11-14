// Checks on one built page's head that no single-page needle can express.
// Each returns plain messages; seo-validate.mjs turns them into failures.

const ARTICLE_TYPES = new Set(["Article", "TechArticle", "NewsArticle"]);

// All JSON-LD nodes of the page, flattened out of @graph and arrays. A block
// that does not parse is reported by the caller through `unparsable`.
export function readJsonLd(html) {
  const nodes = [];
  let unparsable = 0;
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const walk = (value) => {
        if (Array.isArray(value)) return value.forEach(walk);
        if (!value || typeof value !== "object") return;
        nodes.push(value);
        if (value["@graph"]) walk(value["@graph"]);
      };
      walk(JSON.parse(match[1]));
    } catch {
      unparsable += 1;
    }
  }
  return { nodes, unparsable };
}

const typesOf = (node) => [node["@type"]].flat().filter(Boolean);

export function checkHead(html) {
  const messages = [];
  const { nodes, unparsable } = readJsonLd(html);
  if (unparsable > 0) messages.push(`${unparsable} JSON-LD block(s) are not valid JSON`);

  if (nodes.some((node) => typesOf(node).includes("HowTo"))) {
    messages.push("must not include HowTo JSON-LD (Google no longer shows HowTo results)");
  }

  for (const node of nodes.filter((item) => typesOf(item).includes("BreadcrumbList"))) {
    const count = Array.isArray(node.itemListElement) ? node.itemListElement.length : 0;
    if (count < 2) messages.push(`BreadcrumbList has ${count} item(s); it needs at least 2`);
  }

  const generators = (html.match(/<meta name="generator"/g) ?? []).length;
  if (generators > 1) messages.push(`expected at most one generator meta, found ${generators}`);

  const isArticleType = html.includes('<meta property="og:type" content="article"');
  const hasArticleSchema = nodes.some((node) => typesOf(node).some((type) => ARTICLE_TYPES.has(type)));
  if (isArticleType && !hasArticleSchema) {
    messages.push('og:type is "article" on a page without article structured data');
  }
  return messages;
}
