// Remark plugin: cards and tabs are shown without the emoji some guides start
// their title with (`<Card title="…">`, `<LinkCard title="…">`,
// `<TabItem label="…">`). Remove it from astro.config.mjs to show the titles as
// written.

import { stripLeadingEmoji } from "./plain-headings.mjs";

const LABELS = { Card: "title", LinkCard: "title", TabItem: "label" };

function visit(node) {
  const name = LABELS[node.name];
  if (name && /^mdxJsx(Flow|Text)Element$/.test(node.type)) {
    for (const attribute of node.attributes ?? []) {
      if (attribute.name === name && typeof attribute.value === "string") {
        attribute.value = stripLeadingEmoji(attribute.value);
      }
    }
  }
  for (const child of node.children ?? []) visit(child);
}

export function remarkPlainLabels() {
  return (tree) => visit(tree);
}
