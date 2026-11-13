// Deterministic grounding check: every number in the copy must occur in the
// evidence. It catches invented versions, prices, dates and counts before the
// model-based fact check, and it cannot be talked out of a finding.

// "1.5", "1,5", "10.000", "10,000", "v2.1.3" and "2026-11-13" all compare by
// their digit groups, so Danish and English number formatting match.
function numberTokens(text) {
  return (String(text || "").match(/\d[\d.,:/-]*\d|\d/g) || [])
    .map((token) => token.replace(/[^\d]+/g, " ").trim())
    .filter(Boolean);
}

function digitGroups(text) {
  return new Set(numberTokens(text).flatMap((token) => [token, ...token.split(" "), token.replace(/ /g, "")]));
}

// Returns the numbers found in `copyText` that the evidence does not contain.
export function ungroundedNumbers(copyText, evidenceText) {
  const known = digitGroups(evidenceText);
  const missing = new Set();
  for (const token of numberTokens(copyText)) {
    const parts = token.split(" ");
    const grounded = known.has(token) || known.has(token.replace(/ /g, "")) || parts.every((part) => known.has(part));
    if (!grounded) missing.add(token.replace(/ /g, "."));
  }
  return [...missing];
}

export function storyText(story) {
  return Object.values(story || {}).flatMap((field) => Object.values(field || {})).join("\n");
}
