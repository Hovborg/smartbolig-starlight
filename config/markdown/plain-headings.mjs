// Rehype plugin: a heading is shown without the emoji some guides start it
// with. It runs before Astro gives the headings their ids, so the table of
// contents and the anchors are clean as well. Remove it from astro.config.mjs
// to show the headings as written.

const LEADING_EMOJI =
  /^(?:[\p{Extended_Pictographic}\p{Regional_Indicator}](?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*\s*)+/u;

export function stripLeadingEmoji(text) {
  return text.replace(LEADING_EMOJI, "");
}

function visit(node) {
  if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
    const first = node.children?.[0];
    if (first?.type === "text") first.value = stripLeadingEmoji(first.value);
    return;
  }
  for (const child of node.children ?? []) visit(child);
}

export function rehypePlainHeadings() {
  return (tree) => visit(tree);
}
