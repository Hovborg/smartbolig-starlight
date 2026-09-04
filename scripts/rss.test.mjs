import assert from 'node:assert/strict';
import test from 'node:test';
import { getPubDate, isGuideDocument } from '../src/lib/rss-guides.mjs';

test('RSS excludes navigation indexes after the content loader removes /index', () => {
  for (const locale of ['da', 'en']) {
    for (const separator of ['/', '\\']) {
      const doc = { id: `${locale}/home-assistant`, filePath: `src/content/docs/${locale}/home-assistant/index.mdx`.replaceAll('/', separator), data: { title: 'Section' } };
      assert.equal(isGuideDocument(doc, locale), false);
    }
    assert.equal(isGuideDocument({ id: `${locale}/start`, data: { title: 'Start' } }, locale), false);
    assert.equal(isGuideDocument({ id: `${locale}/home-assistant/index`, data: { title: 'Legacy index' } }, locale), false);
    assert.equal(isGuideDocument({ id: `${locale}/home-assistant/example`, data: { title: 'Guide' } }, locale), true);
  }
});

test('RSS locale and non-guide filtering do not hide similarly named guides', () => {
  assert.equal(isGuideDocument({ id: 'en/juridisk/privacy', data: { title: 'Privacy' } }, 'en'), false);
  assert.equal(isGuideDocument({ id: 'da/ai/example', data: { title: 'Guide' } }, 'en'), false);
  assert.equal(isGuideDocument({ id: 'en/home-assistant/kontakt-sensor', data: { title: 'Guide' } }, 'en'), true);
});

test('RSS uses real dates and omits unknown dates instead of inventing one', () => {
  assert.equal(getPubDate({ id: 'not-a-real-guide', data: { date: '2026-09-03', lastUpdated: true } }).toISOString(), '2026-09-03T00:00:00.000Z');
  assert.equal(getPubDate({ id: 'not-a-real-guide', data: { lastUpdated: true } }), null);
});
