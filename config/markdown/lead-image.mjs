// Rehype plugin: the first picture in a guide's body is loaded right away and
// with high priority, because it is what the visitor sees first.
//
// GuideHead.astro shows its own head picture, already eager and high priority,
// unless the body opens with a picture of its own (hasLeadPicture decides).
// The body's first picture is only marked in that case, so a page never has two
// high-priority pictures. Every other picture keeps Astro's lazy default.
//
// The mark is Astro's own `priority` prop. Astro turns it into loading="eager",
// decoding="sync" and fetchpriority="high" when it renders the picture.

import { hasLeadPicture } from "../../src/lib/guide-art.mjs";

function firstImage(node) {
  if (node.type === "element" && node.tagName === "img") return node;
  for (const child of node.children ?? []) {
    const found = firstImage(child);
    if (found) return found;
  }
  return null;
}

export function rehypeLeadImage() {
  return (tree, file) => {
    // Astro hands over the MDX with the frontmatter blanked to spaces, which
    // would push the picture past hasLeadPicture's window.
    if (!hasLeadPicture(String(file?.value ?? "").trimStart())) return;
    const image = firstImage(tree);
    // Only pictures Astro optimizes understand `priority`; public/ ones stay as written.
    if (image && String(image.properties?.src ?? "").startsWith(".")) image.properties.priority = "true";
  };
}
