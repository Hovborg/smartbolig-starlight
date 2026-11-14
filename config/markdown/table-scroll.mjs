// Rehype plugin: every table in a guide gets a wrapper that scrolls sideways
// on its own, so the table fills the column on wide screens and never breaks
// the page on phones. The wrapper can take keyboard focus, so it can be
// scrolled without a mouse. Styles: src/styles/content/blocks.css.

function wrap(table, label) {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["table-scroll"], tabIndex: 0, role: "region", ariaLabel: label },
    children: [table],
  };
}

function visit(node, label) {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (child.type === "element" && child.tagName === "table") return wrap(child, label);
    visit(child, label);
    return child;
  });
}

export function rehypeTableScroll() {
  return (tree, file) => {
    const english = /[\\/]docs[\\/]en[\\/]/.test(String(file?.path ?? ""));
    visit(tree, english ? "Table" : "Tabel");
  };
}
