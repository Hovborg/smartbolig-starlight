#!/usr/bin/env node
// Dependency audit for all dependencies, including build tools.
//
//   node scripts/security-audit.mjs            gate: exit 1 on any high/critical advisory
//   node scripts/security-audit.mjs --report   monitor: print findings, exit 0
//   node scripts/security-audit.mjs --auto --base <sha>
//       gate when package.json or package-lock.json changed since <sha>, otherwise report
//
// Why two modes: a newly published advisory for an unchanged lockfile must not
// block content publishing (it stopped the daily news for 25 days in 2026).
// Dependency changes are always gated, and the scheduled monitor reports the rest.
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blockingSeverities = new Set(['high', 'critical']);
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function summarizeAuditReport(report) {
  if (!isRecord(report) || report.auditReportVersion !== 2 || report.error
      || !isRecord(report.vulnerabilities) || !isRecord(report.metadata?.vulnerabilities)) {
    return { valid: false, reason: 'npm audit returned an incomplete or invalid report' };
  }
  const findings = [];
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (!isRecord(vulnerability) || !severities.includes(vulnerability.severity)) {
      return { valid: false, reason: `Unexpected audit structure for ${name}` };
    }
    const advisories = (Array.isArray(vulnerability.via) ? vulnerability.via : [])
      .filter(isRecord)
      .map((via) => via.url)
      .filter((url) => typeof url === 'string' && url.startsWith('https://'));
    findings.push({
      name,
      severity: vulnerability.severity,
      fixAvailable: Boolean(vulnerability.fixAvailable),
      advisories,
    });
  }
  const blocking = findings.filter((finding) => blockingSeverities.has(finding.severity));
  const totals = report.metadata.vulnerabilities;
  if (blocking.length !== (totals.high ?? 0) + (totals.critical ?? 0)) {
    return { valid: false, reason: 'npm audit vulnerability counts do not match its entries' };
  }
  return { valid: true, findings, blocking };
}

export function decideMode({ mode, changedFiles }) {
  if (mode !== 'auto') return mode;
  const dependencyFiles = new Set(['package.json', 'package-lock.json']);
  return changedFiles === null || changedFiles.some((file) => dependencyFiles.has(file)) ? 'gate' : 'report';
}

export function evaluate(summary, mode) {
  if (!summary.valid) return { ok: false, line: `SECURITY_AUDIT_FAILED ${summary.reason}` };
  if (summary.blocking.length === 0) {
    return { ok: true, line: `SECURITY_AUDIT_OK no high or critical advisories (${summary.findings.length} lower findings)` };
  }
  const names = summary.blocking.map((finding) => `${finding.name}:${finding.severity}`).join(', ');
  return mode === 'gate'
    ? { ok: false, line: `SECURITY_AUDIT_FAILED high or critical advisories: ${names}` }
    : { ok: true, line: `SECURITY_AUDIT_REPORT high or critical advisories (not blocking unchanged dependencies): ${names}` };
}

export function auditInvocation(platform = process.platform) {
  const args = ['audit', '--json', '--include=dev', '--include=optional', '--include=peer'];
  return platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', `npm ${args.join(' ')}`] }
    : { command: 'npm', args };
}

// null means "unknown": treated as changed, so the gate applies.
function changedFilesSince(base) {
  if (!base || /^0+$/.test(base)) return null;
  const diff = spawnSync('git', ['diff', '--name-only', base, 'HEAD'], { cwd: root, encoding: 'utf8' });
  return diff.status === 0 ? diff.stdout.split('\n').filter(Boolean) : null;
}

function main(argv) {
  const baseIndex = argv.indexOf('--base');
  const requested = argv.includes('--report') ? 'report' : argv.includes('--auto') ? 'auto' : 'gate';
  const mode = decideMode({
    mode: requested,
    changedFiles: requested === 'auto' ? changedFilesSince(argv[baseIndex + 1]) : null,
  });
  const { command, args } = auditInvocation();
  const execution = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120_000 });
  let summary;
  try {
    if (execution.error || execution.signal || ![0, 1].includes(execution.status)) throw new Error('npm audit could not complete normally');
    summary = summarizeAuditReport(JSON.parse(execution.stdout));
  } catch (error) {
    summary = { valid: false, reason: error.message };
  }
  const result = evaluate(summary, mode);
  console[result.ok ? 'log' : 'error'](`${result.line} [mode=${mode}]`);
  if (process.env.GITHUB_STEP_SUMMARY && summary.valid && summary.blocking.length > 0) {
    const rows = summary.blocking.map((f) => `| ${f.name} | ${f.severity} | ${f.fixAvailable ? 'yes' : 'no'} | ${f.advisories.join(' ')} |`);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Dependency advisories (${mode})\n\n| Package | Severity | Fix | Advisory |\n|---|---|---|---|\n${rows.join('\n')}\n`);
  }
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
