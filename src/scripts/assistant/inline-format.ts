// Turns **bold** and `code` spans into DOM nodes without any HTML sink.
export function appendInlineFormatting(element, content) {
  const tokenPattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  let cursor = 0;

  for (const match of content.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      element.append(document.createTextNode(content.slice(cursor, index)));
    }

    const token = match[0];
    const formatted = token.startsWith("**")
      ? document.createElement("strong")
      : document.createElement("code");
    formatted.textContent = token.startsWith("**") ? token.slice(2, -2) : token.slice(1, -1);
    element.append(formatted);
    cursor = index + token.length;
  }

  if (cursor < content.length) {
    element.append(document.createTextNode(content.slice(cursor)));
  }
}
