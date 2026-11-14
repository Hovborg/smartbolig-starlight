// Checks that one built page says the same thing in <title>, og:title and
// twitter:title: the search title with the site name after it in <title>, the
// search title alone in the two social titles.

export const SITE_NAME_SUFFIX = ' | SmartBolig.net';

const NAMED_ENTITIES = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' };

export function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (entity, code) => {
    if (code[0] !== '#') return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    const radix = code[1].toLowerCase() === 'x' ? 16 : 10;
    const number = Number.parseInt(code.slice(radix === 16 ? 2 : 1), radix);
    return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
  });
}

const clean = (value) => decodeEntities(value).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function metaContent(html, attribute, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!new RegExp(`\\s${attribute}="${name}"`, 'i').test(tag)) continue;
    const content = tag.match(/\scontent="([^"]*)"/i);
    return content ? clean(content[1]) : undefined;
  }
  return undefined;
}

/** @returns {string[]} what is wrong with the page's three titles; empty when they agree */
export function checkTitleAgreement(html) {
  const raw = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  if (raw === undefined) return ['missing <title>'];
  const title = clean(raw);
  const messages = [];
  for (const [label, attribute, name] of [
    ['og:title', 'property', 'og:title'],
    ['twitter:title', 'name', 'twitter:title'],
  ]) {
    const social = metaContent(html, attribute, name);
    if (social === undefined) messages.push(`missing ${label}`);
    else if (title !== `${social}${SITE_NAME_SUFFIX}`) {
      messages.push(`<title> "${title}" is not ${label} "${social}" followed by "${SITE_NAME_SUFFIX}"`);
    }
  }
  return messages;
}
