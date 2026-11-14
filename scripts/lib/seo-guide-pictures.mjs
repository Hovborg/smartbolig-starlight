// Checks a built guide that opens with a picture: the picture must come in
// several widths, say how wide it is shown, and be fetched first.

import { COLUMN_SIZES } from '../../config/markdown/body-images.mjs';

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** @returns {string[]} what is wrong with the guide's opening picture; empty when it is right */
export function checkGuidePicture(html) {
  const pictures = (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) => attribute(tag, 'sizes') === COLUMN_SIZES);
  if (pictures.length === 0) return ['no picture says it is shown in the text column (sizes)'];

  const [first] = pictures;
  const issues = [];
  const widths = (attribute(first, 'srcset') ?? '').split(',').filter((candidate) => /\.webp \d+w$/.test(candidate.trim()));
  if (widths.length < 3) issues.push(`the opening picture has ${widths.length} WebP width(s) in srcset, expected at least 3`);
  if (attribute(first, 'fetchpriority') !== 'high') issues.push('the opening picture is not fetched with high priority');
  if (!attribute(first, 'width') || !attribute(first, 'height')) issues.push('the opening picture has no width and height');
  const eager = pictures.filter((tag) => attribute(tag, 'fetchpriority') === 'high').length;
  if (eager > 1) issues.push(`${eager} pictures in the text are fetched with high priority, expected 1`);
  return issues;
}
