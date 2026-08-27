import test from 'node:test';
import assert from 'node:assert/strict';
import { qualityIssues } from './ai-news-quality.mjs';

function issue({ locale, copySource = 'llm', signal = 'high', repeated = false }) {
  const da = locale === 'da';
  const labels = da
    ? ['Hvad ændrede sig', 'Hvorfor det er relevant', 'Sådan verificerer du det', 'Usikkerhed']
    : ['What changed', 'Why it matters', 'How to verify it', 'Uncertainty'];
  const stories = [1, 2].map((number) => `### ${number}. Story ${number}\n\n${labels.map((label, fieldIndex) => {
    const suffix = repeated ? '' : ` nummer ${number} felt ${fieldIndex}`;
    return `**${label}:** Denne konkrete redaktionelle tekst har tilstrækkeligt mange ord til kvalitetskontrollen${suffix}.`;
  }).join('\n\n')}\n\nKilde: [Source](https://openai.com/index/story-${number})`).join('\n\n');
  return `---\ndate: 2026-08-27\nnews:\n  copySource: ${copySource}\n  semanticReview: passed\n  issueFingerprint: "${'a'.repeat(64)}"\n  signal: ${signal}\n  sources:\n    - "https://openai.com/index/story-1"\n    - "https://github.com/openai/codex/releases/tag/v1"\n---\n\n${stories}\n\n## End`;
}

test('quality gate accepts distinct bilingual LLM copy', () => {
  const issues = qualityIssues({ date: '2026-08-27', da: issue({ locale: 'da' }), en: issue({ locale: 'en' }) });
  assert.deepEqual(issues, []);
});

test('quality gate accepts Windows CRLF content', () => {
  const issues = qualityIssues({
    date: '2026-08-27',
    da: issue({ locale: 'da' }).replace(/\n/g, '\r\n'),
    en: issue({ locale: 'en' }).replace(/\n/g, '\r\n'),
  });
  assert.deepEqual(issues, []);
});

test('quality gate rejects template and repeated copy', () => {
  const issues = qualityIssues({
    date: '2026-08-27',
    da: issue({ locale: 'da', copySource: 'template', repeated: true }),
    en: issue({ locale: 'en', copySource: 'template', repeated: true }),
  });
  assert.ok(issues.some((item) => item.includes('copySource must be llm')));
  assert.ok(issues.some((item) => item.includes('repeated')));
});

test('quality gate rejects a draft without an independent semantic review', () => {
  const da = issue({ locale: 'da' }).replace('  semanticReview: passed\n', '');
  const en = issue({ locale: 'en' }).replace('  semanticReview: passed\n', '');
  const issues = qualityIssues({ date: '2026-08-27', da, en });
  assert.ok(issues.some((item) => item.includes('semanticReview must be passed')));
});
