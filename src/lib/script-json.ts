// Serialises a value for a <script type="application/json"> or ld+json block.
// "<" becomes the unicode escape so content can never close the script tag;
// JSON.stringify does not escape "</script>" on its own.
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
