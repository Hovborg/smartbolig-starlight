#!/usr/bin/env node
// Content inventory: one row per page in both locales.
// Usage: node scripts/content-inventory.mjs [--json out.json] [--summary]
// Read-only. Used for audits, docs/measurements and the monitoring workflow.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const docsRoot = join(root, 'src', 'content', 'docs');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.mdx?$/.test(name) ? [full] : [];
  });
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

export function inventoryPage(file) {
  const raw = readFileSync(file, 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const frontmatter = fm ? fm[1] : '';
  const body = fm ? raw.slice(fm[0].length) : raw;
  const rel = relative(docsRoot, file).split(sep).join('/');
  const [locale, ...rest] = rel.replace(/\.mdx?$/, '').split('/');
  const slug = rest.join('/').replace(/(^|\/)index$/, '');
  const prose = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^import .*$/gm, ' ');
  const mdImages = [...body.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  const htmlImages = [...body.matchAll(/<(?:img|Image|Picture)\b[^>]*>/g)];
  const illustrations = [...body.matchAll(/<(?:Scene|Illustration|Diagram|Figure)[A-Za-z]*\b/g)];
  const title = frontmatterValue(frontmatter, 'title') ?? '';
  const description = frontmatterValue(frontmatter, 'description') ?? '';
  return {
    locale,
    slug,
    section: rest.length > 1 ? rest[0] : '(root)',
    isNews: /^ai\/nyheder\/\d{4}-\d{2}-\d{2}$/.test(slug),
    title,
    titleLength: [...title].length,
    descriptionLength: [...description].length,
    date: frontmatterValue(frontmatter, 'date'),
    lastUpdated: frontmatterValue(frontmatter, 'lastUpdated') ?? frontmatterValue(frontmatter, 'updated'),
    words: prose.split(/\s+/).filter(Boolean).length,
    images: mdImages.length + htmlImages.length,
    imagesMissingAlt:
      mdImages.filter((m) => !m[1].trim()).length +
      htmlImages.filter((m) => !/\balt=(?:"[^"]+"|'[^']+'|\{)/.test(m[0])).length,
    illustrations: illustrations.length,
    hasHeroImage: /^heroImage:/m.test(frontmatter),
    codeBlocks: (body.match(/^```[a-z]/gim) ?? []).length,
    yamlBlocks: (body.match(/^```ya?ml/gim) ?? []).length,
    affiliateLinks: (body.match(/<(?:AffiliateLink|ProductCard)\b/g) ?? []).length,
    internalLinks: (body.match(/\]\(\/(?:da|en)\//g) ?? []).length + (body.match(/href="\/(?:da|en)\//g) ?? []).length,
    hasFaq: /<FAQ\b/.test(body),
  };
}

export function buildInventory() {
  return walk(docsRoot).map(inventoryPage).sort((a, b) => `${a.locale}/${a.slug}`.localeCompare(`${b.locale}/${b.slug}`));
}

function summarize(pages) {
  const guides = pages.filter((p) => !p.isNews);
  const bySection = {};
  for (const page of guides.filter((p) => p.locale === 'da')) {
    const s = (bySection[page.section] ??= { pages: 0, noVisual: 0, noAffiliate: 0, longTitle: 0 });
    s.pages += 1;
    if (page.images + page.illustrations === 0 && !page.hasHeroImage) s.noVisual += 1;
    if (page.affiliateLinks === 0) s.noAffiliate += 1;
    if (page.titleLength > 60) s.longTitle += 1;
  }
  return {
    total: pages.length,
    perLocale: Object.fromEntries(['da', 'en'].map((l) => [l, pages.filter((p) => p.locale === l).length])),
    news: pages.filter((p) => p.isNews).length,
    titlesOver60: pages.filter((p) => p.titleLength > 60).length,
    imagesMissingAlt: pages.reduce((sum, p) => sum + p.imagesMissingAlt, 0),
    guidesWithoutVisual: guides.filter((p) => p.images + p.illustrations === 0 && !p.hasHeroImage).length,
    danishSections: bySection,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pages = buildInventory();
  const jsonFlag = process.argv.indexOf('--json');
  if (jsonFlag > -1 && process.argv[jsonFlag + 1]) {
    writeFileSync(process.argv[jsonFlag + 1], `${JSON.stringify(pages, null, 2)}\n`);
  }
  console.log(JSON.stringify(summarize(pages), null, 2));
}
