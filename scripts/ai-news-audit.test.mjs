import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAuditReport, evaluateAuditExecution, auditInvocation } from './ai-news-audit.mjs';

const knownNames = [
  '@astrojs/mdx', '@astrojs/starlight', 'astro', 'astro-expressive-code',
  'http-cache-semantics', 'starlight-theme-galaxy',
];
const versions = { astro: '7.2.8', httpCacheSemantics: '4.2.0', staticOutput: true, workerSourcesReviewed: true, dependencyLockReviewed: true };
const now = new Date('2026-10-03T08:00:00Z');

function knownReport() {
  const vulnerabilities = Object.fromEntries(knownNames.map((name) => [name, {
    name,
    severity: 'high',
    via: name === 'http-cache-semantics'
      ? [{ name, url: 'https://github.com/advisories/GHSA-ch52-4w7c-c8xp', severity: 'high', range: '<=4.2.0' }]
      : [name === 'astro' ? 'http-cache-semantics' : 'astro'],
    fixAvailable: false,
  }]));
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 6, critical: 0, total: 6 } },
  };
}

test('only the reviewed Astro cache advisory is temporarily accepted', () => {
  const result = evaluateAuditReport(knownReport(), { now, versions });
  assert.equal(result.ok, true);
  assert.equal(result.excepted, true);
});

test('another advisory on the same package is blocked', () => {
  const report = knownReport();
  report.vulnerabilities['http-cache-semantics'].via.push({
    name: 'http-cache-semantics', url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz', severity: 'high',
  });
  assert.equal(evaluateAuditReport(report, { now, versions }).ok, false);
});

test('an additional high advisory propagated through Astro is blocked', () => {
  const report = knownReport();
  report.vulnerabilities.astro.via.push({
    name: 'astro', url: 'https://github.com/advisories/GHSA-other', severity: 'high',
  });
  assert.equal(evaluateAuditReport(report, { now, versions }).ok, false);
});

test('new high packages and changed audited counts are blocked', () => {
  const report = knownReport();
  report.vulnerabilities.other = { name: 'other', severity: 'high', via: ['astro'] };
  report.metadata.vulnerabilities.high = 7;
  assert.equal(evaluateAuditReport(report, { now, versions }).ok, false);
});

test('version drift, server output, a fix, and expiry end the exception', () => {
  const report = knownReport();
  assert.equal(evaluateAuditReport(report, { now, versions: { ...versions, astro: '7.2.9' } }).ok, false);
  assert.equal(evaluateAuditReport(report, { now, versions: { ...versions, staticOutput: false } }).ok, false);
  assert.equal(evaluateAuditReport(report, { now: new Date('2026-10-17T00:00:00Z'), versions }).ok, false);
  assert.equal(evaluateAuditReport(report, { now: new Date('invalid'), versions }).ok, false);
  report.vulnerabilities['http-cache-semantics'].fixAvailable = true;
  assert.equal(evaluateAuditReport(report, { now, versions }).ok, false);
});

test('malformed reports and npm or network failures never pass', () => {
  assert.equal(evaluateAuditReport(null, { now, versions }).ok, false);
  assert.equal(evaluateAuditReport({ error: { code: 'ENOAUDIT' } }, { now, versions }).ok, false);
  assert.equal(evaluateAuditExecution({ status: 1, stdout: 'not JSON' }, { now, versions }).ok, false);
  assert.equal(evaluateAuditExecution({ status: 1, stdout: JSON.stringify({ error: { code: 'ENOTFOUND' } }) }, { now, versions }).ok, false);
  assert.equal(evaluateAuditExecution({ status: 2, stdout: JSON.stringify(knownReport()) }, { now, versions }).ok, false);
});

test('a clean full audit passes without using the exception', () => {
  const report = { auditReportVersion: 2, vulnerabilities: {}, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } } };
  const result = evaluateAuditExecution({ status: 0, stdout: JSON.stringify(report) }, { now, versions });
  assert.equal(result.ok, true);
  assert.equal(result.excepted, false);
});

test('unknown audit shapes and inconsistent severities fail closed', () => {
  const arrayReport = knownReport();
  arrayReport.vulnerabilities = [];
  assert.equal(evaluateAuditExecution({ status: 0, stdout: JSON.stringify(arrayReport) }, { now, versions }).ok, false);

  const unknownSeverity = knownReport();
  unknownSeverity.vulnerabilities.astro.severity = 'unrecognized';
  assert.equal(evaluateAuditReport(unknownSeverity, { now, versions }).ok, false);

  const negativeCounts = knownReport();
  negativeCounts.metadata.vulnerabilities.high = -1;
  negativeCounts.metadata.vulnerabilities.critical = 7;
  assert.equal(evaluateAuditReport(negativeCounts, { now, versions }).ok, false);

  const hiddenHigh = knownReport();
  hiddenHigh.vulnerabilities.extra = {
    name: 'extra', severity: 'moderate',
    via: [{ name: 'extra', url: 'https://github.com/advisories/GHSA-other', severity: 'critical' }],
  };
  hiddenHigh.metadata.vulnerabilities.moderate = 1;
  hiddenHigh.metadata.vulnerabilities.total = 7;
  assert.equal(evaluateAuditExecution({ status: 1, stdout: JSON.stringify(hiddenHigh) }, { now, versions }).ok, false);
});

test('all high dependency chains must reach the exact reviewed advisory', () => {
  const report = knownReport();
  report.vulnerabilities.astro.via = ['astro'];
  assert.equal(evaluateAuditReport(report, { now, versions }).ok, false);
  const noParent = knownReport();
  noParent.vulnerabilities.astro.via = ['missing'];
  assert.equal(evaluateAuditReport(noParent, { now, versions }).ok, false);
});

test('Worker source and lockfile changes invalidate the exception', () => {
  const report = knownReport();
  assert.equal(evaluateAuditReport(report, { now, versions: { ...versions, workerSourcesReviewed: false } }).ok, false);
  assert.equal(evaluateAuditReport(report, { now, versions: { ...versions, dependencyLockReviewed: false } }).ok, false);
});

test('audit invocation explicitly includes development and optional dependencies', () => {
  for (const platform of ['win32', 'linux']) {
    const { command, args } = auditInvocation(platform);
    const joined = [command, ...args].join(' ');
    assert.match(joined, /--include=dev/);
    assert.match(joined, /--include=optional/);
    assert.match(joined, /--include=peer/);
    assert.match(joined, /--audit-level=high/);
  }
});
