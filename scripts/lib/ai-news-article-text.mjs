// Extracts the article text from a fetched page. Measured 2026-11-13: plain
// tag stripping put about 2,500 characters of site navigation in front of the
// article, so the writer and the fact checker mostly saw menus. That made the
// fact check reject claims the real article did support.
import { sectionInner, stripSections } from "./html-sections.mjs";

// Page chrome that never carries article facts.
const CHROME_TAGS = ["nav", "footer", "aside", "form", "svg", "noscript", "template", "button", "dialog", "select"];
// Below this, the element was a teaser card or an empty shell, not the article.
const MIN_ARTICLE_CHARS = 600;

function withoutChrome(html, tags) {
  return tags.reduce((value, tag) => stripSections(value, tag), html);
}

// `toText` turns HTML into plain text (the caller's hardened stripHtml).
export function extractArticleText(html, toText) {
  const article = sectionInner(html, "article");
  if (article) {
    // An article's own <header> holds its title and standfirst: keep it.
    const text = toText(withoutChrome(article, CHROME_TAGS));
    if (text.length >= MIN_ARTICLE_CHARS) return text;
  }
  const main = sectionInner(html, "main");
  if (main) {
    const text = toText(withoutChrome(main, [...CHROME_TAGS, "header"]));
    if (text.length >= MIN_ARTICLE_CHARS) return text;
  }
  return toText(withoutChrome(html, [...CHROME_TAGS, "header"]));
}
