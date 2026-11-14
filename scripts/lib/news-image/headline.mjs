// Fits a headline into a column: the largest size from `sizes` that wraps into
// at most `maxLines` lines, otherwise the smallest size with an ellipsis.
import { textPath } from "../brand/text.mjs";

const TRACKING = -0.02;
const measure = (text, size) => textPath(text, { size, weight: 700, tracking: TRACKING }).width;

// Words wider than the column are cut by character so nothing leaves the canvas.
function splitLongWords(words, maxWidth, size) {
  return words.flatMap((word) => {
    if (measure(word, size) <= maxWidth) return [word];
    const chunks = [];
    let chunk = "";
    for (const ch of word) {
      if (chunk && measure(chunk + ch, size) > maxWidth) {
        chunks.push(chunk);
        chunk = "";
      }
      chunk += ch;
    }
    return [...chunks, chunk];
  });
}

function wrap(text, maxWidth, size) {
  const lines = [];
  let line = "";
  for (const word of splitLongWords(text.split(/\s+/).filter(Boolean), maxWidth, size)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  return line ? [...lines, line] : lines;
}

function ellipsize(line, maxWidth, size) {
  let words = line.split(" ");
  while (words.length > 1 && measure(`${words.join(" ")}…`, size) > maxWidth) words = words.slice(0, -1);
  let text = words.join(" ");
  while (text.length > 1 && measure(`${text}…`, size) > maxWidth) text = text.slice(0, -1);
  return `${text}…`;
}

export function fitHeadline(text, { maxWidth, sizes, maxLines = 3, lineHeight = 1.06 }) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  let size = sizes[sizes.length - 1];
  let lines;
  for (const candidate of sizes) {
    const wrapped = wrap(clean, maxWidth, candidate);
    if (wrapped.length <= maxLines) {
      size = candidate;
      lines = wrapped;
      break;
    }
  }
  if (!lines) {
    const wrapped = wrap(clean, maxWidth, size);
    lines = wrapped.slice(0, maxLines);
    lines[maxLines - 1] = ellipsize(lines[maxLines - 1], maxWidth, size);
  }
  const paths = lines.map((line) => textPath(line, { size, weight: 700, tracking: TRACKING }));
  const capHeight = paths[0].capHeight;
  return {
    size,
    lines,
    paths,
    lead: size * lineHeight,
    capHeight,
    height: capHeight + (lines.length - 1) * size * lineHeight,
    width: Math.max(...paths.map((p) => p.width)),
  };
}
