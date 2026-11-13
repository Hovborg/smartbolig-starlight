import assert from 'node:assert/strict';
import test from 'node:test';
import { auditInvocation, decideMode, evaluate, summarizeAuditReport } from './security-audit.mjs';

const report = (vulnerabilities, counts) => ({
  auditReportVersion: 2,
  vulnerabilities,
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, ...counts } },
});
const advisory = (name, severity) => ({
  name,
  severity,
  fixAvailable: true,
  via: [{ name, severity, url: `https://github.com/advisories/GHSA-${name}` }],
});

test('a clean report passes in every mode', () => {
  const summary = summarizeAuditReport(report({ a: advisory('a', 'moderate') }, { moderate: 1 }));
  assert.equal(evaluate(summary, 'gate').ok, true);
  assert.equal(evaluate(summary, 'report').ok, true);
});

test('a high advisory blocks the gate and names the package', () => {
  const summary = summarizeAuditReport(report({ undici: advisory('undici', 'high') }, { high: 1 }));
  const result = evaluate(summary, 'gate');
  assert.equal(result.ok, false);
  assert.match(result.line, /undici:high/);
});

test('a high advisory is reported but does not block in report mode', () => {
  const summary = summarizeAuditReport(report({ zod: advisory('zod', 'critical') }, { critical: 1 }));
  const result = evaluate(summary, 'report');
  assert.equal(result.ok, true);
  assert.match(result.line, /SECURITY_AUDIT_REPORT.*zod:critical/);
});

test('an invalid or inconsistent report fails closed in every mode', () => {
  for (const mode of ['gate', 'report']) {
    assert.equal(evaluate(summarizeAuditReport({ error: { code: 'ENOLOCK' } }), mode).ok, false);
    assert.equal(evaluate(summarizeAuditReport(report({}, { high: 2 })), mode).ok, false);
    assert.equal(evaluate(summarizeAuditReport(report({ a: { severity: 'severe' } }, {})), mode).ok, false);
  }
});

test('only an explicit report mode passes with a blocking advisory', () => {
  const summary = summarizeAuditReport(report({ vite: advisory('vite', 'high') }, { high: 1 }));
  for (const mode of ['auto', 'Gate', undefined, '']) {
    assert.equal(evaluate(summary, mode).ok, false, `mode ${mode} must gate`);
  }
});

test('every severity count must match the listed entries', () => {
  assert.equal(summarizeAuditReport(report({}, { moderate: 3 })).valid, false);
  assert.equal(summarizeAuditReport(report({ a: advisory('a', 'low') }, { low: 1 })).valid, true);
});

test('auto mode gates dependency changes and unknown ranges, reports otherwise', () => {
  assert.equal(decideMode({ mode: 'auto', changedFiles: ['package-lock.json'] }), 'gate');
  assert.equal(decideMode({ mode: 'auto', changedFiles: ['src/a.mdx', 'package.json'] }), 'gate');
  assert.equal(decideMode({ mode: 'auto', changedFiles: null }), 'gate');
  assert.equal(decideMode({ mode: 'auto', changedFiles: ['src/content/docs/da/ai/nyheder/2026-11-14.mdx'] }), 'report');
  assert.equal(decideMode({ mode: 'gate', changedFiles: [] }), 'gate');
});

test('the audit covers development dependencies on every platform', () => {
  assert.ok(auditInvocation('linux').args.includes('--include=dev'));
  assert.match(auditInvocation('win32').args.at(-1), /--include=dev/);
});
