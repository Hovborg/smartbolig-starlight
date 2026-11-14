// Linear-time helpers for cutting sections out of untrusted HTML. No regex
// spans tags here: lazy patterns turn quadratic on input with unclosed tags.

// HTML/XML tag names are ASCII. Unicode lowercasing can expand characters
// (for example İ), shifting offsets used to slice the original input.
export function asciiLower(value) {
  return String(value).replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

const isTagBoundary = (character) => character === undefined || /[\s>/]/.test(character);

// Removes <tagName ...>...</tagName> sections in a single pass. An unclosed
// section swallows the remainder of the input (its content is never text).
export function stripSections(value, tagName) {
  const parts = [];
  const lower = asciiLower(value);
  const open = `<${tagName}`;
  const close = `</${tagName}`;
  let index = 0;
  while (index < value.length) {
    const start = lower.indexOf(open, index);
    if (start === -1) {
      parts.push(value.slice(index));
      break;
    }
    const boundary = lower[start + open.length];
    if (boundary !== undefined && !/[\s>/]/.test(boundary)) {
      parts.push(value.slice(index, start + open.length));
      index = start + open.length;
      continue;
    }
    parts.push(value.slice(index, start), " ");
    const end = lower.indexOf(close, start + open.length);
    if (end === -1) break;
    const closeEnd = lower.indexOf(">", end);
    if (closeEnd === -1) break;
    index = closeEnd + 1;
  }
  return parts.join("");
}

// Inner HTML of the first <tagName> element, honouring nested elements of the
// same name. Returns "" when the element is missing or never closed.
export function sectionInner(value, tagName) {
  const lower = asciiLower(value);
  const open = `<${tagName}`;
  const close = `</${tagName}`;
  let start = lower.indexOf(open);
  while (start !== -1 && !isTagBoundary(lower[start + open.length])) start = lower.indexOf(open, start + open.length);
  if (start === -1) return "";
  const contentStart = lower.indexOf(">", start);
  if (contentStart === -1) return "";

  // Each search continues from where the previous one of its kind stopped, so
  // the scan stays linear on thousands of nested elements of the same name.
  let depth = 1;
  let nextOpen = lower.indexOf(open, contentStart + 1);
  let nextClose = lower.indexOf(close, contentStart + 1);
  while (nextClose !== -1) {
    if (nextOpen !== -1 && nextOpen < nextClose) {
      if (isTagBoundary(lower[nextOpen + open.length])) depth += 1;
      nextOpen = lower.indexOf(open, nextOpen + open.length);
      continue;
    }
    depth -= 1;
    if (depth === 0) return value.slice(contentStart + 1, nextClose);
    nextClose = lower.indexOf(close, nextClose + close.length);
  }
  return "";
}
