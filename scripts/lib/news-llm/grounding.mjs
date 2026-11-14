// Deterministic grounding check: every number in the copy must occur in the
// evidence. It catches invented versions, prices, dates and counts before the
// model-based fact check, and it cannot be talked out of a finding.

// "1.5", "1,5", "10.000", "10,000", "v2.1.3" and "2026-11-13" all compare by
// their digit groups, so Danish and English number formatting match.
function rawTokens(text) {
  return String(text || "").match(/\d[\d.,:/-]*\d|\d/g) || [];
}

function numberTokens(text) {
  return rawTokens(text)
    .map((token) => token.replace(/[^\d]+/g, " ").trim())
    .filter(Boolean);
}

// A decimal such as "2.5" or "2,5" is one number: "2" and "5" appearing
// separately in the evidence do not support it. A single separator followed
// by exactly three digits ("10.000") is thousands grouping, not a decimal,
// unless the integer part is 0 ("0.125").
function decimalParts(token) {
  const match = token.match(/^(\d+)[.,](\d+)$/);
  if (!match) return null;
  const [, integer, fraction] = match;
  if (fraction.length === 3 && !integer.startsWith("0")) return null;
  return { integer, fraction };
}

function hasDecimal(evidenceText, { integer, fraction }) {
  return new RegExp(`(?<![\\d.,])${integer}[.,]${fraction}(?!\\d)`).test(String(evidenceText || ""));
}

function digitGroups(text) {
  return new Set(numberTokens(text).flatMap((token) => [token, ...token.split(" "), token.replace(/ /g, "")]));
}

// Returns the numbers found in `copyText` that the evidence does not contain.
export function ungroundedNumbers(copyText, evidenceText) {
  const known = digitGroups(evidenceText);
  const missing = new Set();
  for (const raw of rawTokens(copyText)) {
    const decimal = decimalParts(raw);
    if (decimal) {
      if (!hasDecimal(evidenceText, decimal)) missing.add(`${decimal.integer}.${decimal.fraction}`);
      continue;
    }
    const token = raw.replace(/[^\d]+/g, " ").trim();
    if (!token) continue;
    const parts = token.split(" ");
    const grounded = known.has(token) || known.has(token.replace(/ /g, "")) || parts.every((part) => known.has(part));
    if (!grounded) missing.add(token.replace(/ /g, "."));
  }
  return [...missing];
}

export function storyText(story) {
  return Object.values(story || {}).flatMap((field) => Object.values(field || {})).join("\n");
}
