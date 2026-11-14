import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { products } from '../src/data/products/index.mjs';
import { affiliateMerchants, buildAffiliateUrl } from '../src/lib/affiliate.ts';
import { productLink } from '../src/lib/affiliate-products.mjs';

const contentRoot = fileURLToPath(new URL('../src/content/', import.meta.url));

function mdxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? mdxFiles(path) : path.endsWith('.mdx') ? [path] : [];
  });
}

// Every <AffiliateLink ...> tag in the guides, with its file.
const tags = mdxFiles(contentRoot).flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(/<AffiliateLink\b[^>]*>/g)].map((match) => ({ file, tag: match[0] })),
);

test('every register entry has a kebab-case id, a name, an approved merchant and a valid shop URL', () => {
  const entries = Object.entries(products);
  assert.ok(entries.length > 0);
  for (const [id, product] of entries) {
    assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `id "${id}" must be lowercase kebab-case`);
    assert.ok(product.name.trim(), `"${id}" needs a name`);
    assert.ok(Object.hasOwn(affiliateMerchants, product.store), `"${id}" uses unapproved merchant "${product.store}"`);
    // Throws unless the URL is https on the merchant's own domain.
    assert.doesNotThrow(() => buildAffiliateUrl(product.store, product.url), `"${id}" has a URL the merchant does not own`);
  }
});

test('no two register entries share a shop URL', () => {
  const owner = new Map();
  for (const [id, { url }] of Object.entries(products)) {
    assert.ok(!owner.has(url), `"${id}" and "${owner.get(url)}" both use ${url}`);
    owner.set(url, id);
  }
});

test('guides only name products that are in the register', () => {
  assert.ok(tags.length > 0);
  for (const { file, tag } of tags) {
    const id = /\sproduct="([^"]+)"/.exec(tag)?.[1];
    assert.ok(id, `${file}: ${tag} has no product attribute`);
    assert.ok(Object.hasOwn(products, id), `${file}: unknown product "${id}"`);
  }
});

test('every register entry is used by a guide, so the register cannot rot', () => {
  const used = new Set(tags.map(({ tag }) => /\sproduct="([^"]+)"/.exec(tag)?.[1]));
  const unused = Object.keys(products).filter((id) => !used.has(id));
  assert.deepEqual(unused, [], `unused register entries: ${unused.join(', ')}`);
});

test('guides carry no shop URL or store of their own', () => {
  for (const { file, tag } of tags) {
    assert.doesNotMatch(tag, /\s(url|store)=/, `${file}: put the link in src/data/products/ instead: ${tag}`);
  }
});

test('productLink returns the register entry with its id', () => {
  const link = productLink('sonoff-zigbee-dongle-e');
  assert.equal(link.id, 'sonoff-zigbee-dongle-e');
  assert.equal(link.store, 'proshop');
  assert.equal(link.url, products['sonoff-zigbee-dongle-e'].url);
});

test('productLink fails on an unknown id and names it', () => {
  assert.throws(() => productLink('nope'), /"nope"/);
  assert.throws(() => productLink('nope'), /src\/data\/products/);
  assert.throws(() => productLink('__proto__'), /Unknown affiliate product/);
});
