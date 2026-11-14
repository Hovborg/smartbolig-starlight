// Rehype plugin: every table in a guide gets a wrapper that scrolls sideways
// on its own, so the table fills the column on wide screens and never breaks
// the page on phones. The wrapper carries a name taken from the heading above
// it; src/lib/table-scroll.mjs makes it a named, focusable region only while
// the table is wider than the column. Styles: src/styles/content/blocks.css.

const HEADING = /^h[1-6]$/;
const textOf = (node) => (node.type === "text" ? node.value : (node.children ?? []).map(textOf).join(""));

function wrap(table, label) {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["table-scroll"], dataLabel: label },
    children: [table],
  };
}

export function rehypeTableScroll() {
  return (tree, file) => {
    const word = /[\\/]docs[\\/]en[\\/]/.test(String(file?.path ?? "")) ? "Table" : "Tabel";
    let heading = "";
    const visit = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type !== "element") return child;
        if (HEADING.test(child.tagName)) heading = textOf(child).trim();
        if (child.tagName === "table") return wrap(child, heading ? `${word}: ${heading}` : word);
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}
