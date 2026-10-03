#!/usr/bin/env node
// Run the complete npm audit. Temporarily accept one reviewed build-only
// advisory, while failing closed on every other high or critical finding.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const advisoryUrl = 'https://github.com/advisories/GHSA-ch52-4w7c-c8xp';
const exceptionExpires = Date.parse('2026-10-17T00:00:00Z');
const knownNames = new Set([
  '@astrojs/mdx', '@astrojs/starlight', 'astro', 'astro-expressive-code',
  'http-cache-semantics', 'starlight-theme-galaxy',
]);

function fail(reason) {
  return { ok: false, excepted: false, reason };
}

const severityOrder = new Map([['info', 0], ['low', 1], ['moderate', 2], ['high', 3], ['critical', 4]]);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function evaluateAuditReport(report, { now = new Date(), versions } = {}) {
  if (!isRecord(report) || report.auditReportVersion !== 2 || report.error
      || !isRecord(report.vulnerabilities) || !isRecord(report.metadata)
      || !isRecord(report.metadata.vulnerabilities)) {
    return fail('npm audit returned an incomplete or invalid report');
  }
  const totals = report.metadata.vulnerabilities;
  const countKeys = ['info', 'low', 'moderate', 'high', 'critical', 'total'];
  if (countKeys.some((key) => !Number.isInteger(totals[key]) || totals[key] < 0)) {
    return fail('npm audit returned invalid vulnerability counts');
  }
  const entries = Object.entries(report.vulnerabilities);
  const counted = Object.fromEntries(countKeys.map((key) => [key, 0]));
  for (const [name, vulnerability] of entries) {
    if (!isRecord(vulnerability) || vulnerability.name !== name
        || !severityOrder.has(vulnerability.severity)
        || !Array.isArray(vulnerability.via) || vulnerability.via.length === 0) {
      return fail(`Unexpected audit structure for ${name}`);
    }
    counted[vulnerability.severity] += 1;
    counted.total += 1;
    for (const via of vulnerability.via) {
      if (typeof via === 'string') {
        const parent = report.vulnerabilities[via];
        if (!isRecord(parent) || !severityOrder.has(parent.severity)
            || severityOrder.get(parent.severity) > severityOrder.get(vulnerability.severity)) {
          return fail(`Invalid audit dependency chain for ${name}`);
        }
      } else if (!isRecord(via) || typeof via.name !== 'string'
          || typeof via.url !== 'string' || !via.url.startsWith('https://')
          || !severityOrder.has(via.severity)
          || severityOrder.get(via.severity) > severityOrder.get(vulnerability.severity)) {
        return fail(`Invalid underlying advisory for ${name}`);
      }
    }
  }
  if (countKeys.some((key) => counted[key] !== totals[key])) {
    return fail('npm audit vulnerability counts do not match its entries');
  }
  const high = entries.filter(([, value]) => severityOrder.get(value.severity) >= 3);
  if (high.length === 0) return { ok: true, excepted: false, reason: 'No high or critical advisories' };
  const checkedAt = new Date(now).getTime();
  if (!Number.isFinite(checkedAt) || checkedAt >= exceptionExpires) {
    return fail('The reviewed advisory exception expired or has no valid clock');
  }
  if (versions?.astro !== '7.2.8' || versions?.httpCacheSemantics !== '4.2.0'
      || versions?.staticOutput !== true || versions?.workerSourcesReviewed !== true
      || versions?.dependencyLockReviewed !== true) {
    return fail('The reviewed dependency, source, or deployment contract changed');
  }
  if (totals.high !== knownNames.size || totals.critical !== 0
      || high.length !== knownNames.size
      || high.some(([name]) => !knownNames.has(name))) {
    return fail('An unreviewed high or critical dependency was reported');
  }
  const root = report.vulnerabilities['http-cache-semantics'];
  if (root?.fixAvailable !== false || root.severity !== 'high'
      || root.via.length !== 1) {
    return fail('The cache advisory changed or now has a fix');
  }
  const advisory = root.via[0];
  if (!isRecord(advisory) || advisory.name !== 'http-cache-semantics'
      || advisory.url !== advisoryUrl || advisory.severity !== 'high'
      || advisory.range !== '<=4.2.0') {
    return fail('The cache advisory is not the exact reviewed finding');
  }
  const reachesRoot = (name, seen = new Set()) => {
    if (name === 'http-cache-semantics') return true;
    if (seen.has(name)) return false;
    const nextSeen = new Set(seen);
    nextSeen.add(name);
    const via = report.vulnerabilities[name]?.via;
    return Array.isArray(via) && via.length > 0 && via.every((parent) =>
      typeof parent === 'string' && knownNames.has(parent) && reachesRoot(parent, nextSeen));
  };
  if (high.some(([name]) => !reachesRoot(name))) {
    return fail('A high dependency does not lead solely to the reviewed advisory');
  }
  return {
    ok: true,
    excepted: true,
    reason: `Only high/critical advisory ${advisoryUrl} is present; reviewed exception expires 2026-10-17 UTC`,
  };
}

export function evaluateAuditExecution(execution, context = {}) {
  if (!execution || execution.error || execution.signal
      || (execution.status !== 0 && execution.status !== 1)
      || typeof execution.stdout !== 'string') {
    return fail('npm audit could not complete normally');
  }
  let report;
  try {
    report = JSON.parse(execution.stdout);
  } catch {
    return fail('npm audit did not return valid JSON');
  }
  const result = evaluateAuditReport(report, context);
  if (!result.ok) return result;
  if (execution.status === 1 && !result.excepted) {
    return fail('npm audit failed without the exact reviewed advisory');
  }
  if (execution.status === 0 && result.excepted) {
    return fail('npm audit exit status disagrees with reported high findings');
  }
  return result;
}

function hashText(text) {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
}

function workerSourceHash(root) {
  const directory = path.join(root, 'functions');
  const files = [];
  for (const relative of readdirSync(directory, { recursive: true })) {
    const stat = lstatSync(path.join(directory, relative));
    if (stat.isSymbolicLink()) return null;
    if (stat.isFile()) files.push(relative.split(path.sep).join('/'));
  }
  files.sort();
  const hash = createHash('sha256');
  for (const relative of files) {
    const source = readFileSync(path.join(directory, relative), 'utf8').replace(/\r\n/g, '\n');
    hash.update(relative).update('\0').update(source).update('\0');
  }
  return hash.digest('hex');
}

function installedVersions() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const astro = JSON.parse(readFileSync(path.join(root, 'node_modules/astro/package.json'), 'utf8')).version;
  const httpCacheSemantics = JSON.parse(readFileSync(path.join(root, 'node_modules/http-cache-semantics/package.json'), 'utf8')).version;
  const config = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
  const wrangler = readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
  return {
    astro,
    httpCacheSemantics,
    // Any deployment-config, Worker-source, or lockfile edit requires review.
    staticOutput: /^\s*output:\s*['"]static['"]\s*,/m.test(config)
      && /"assets"\s*:\s*\{[^}]*"directory"\s*:\s*"\.\/dist"/s.test(wrangler)
      && hashText(config) === 'e3066921cd1e583638ba2e76d890ac0e14cf835cac1251fbe6da0d7ae956dbd0'
      && hashText(wrangler) === '9c47b438d339ebffc2d0db3f91267e8ec597148207b1ebf6dde85841a1f1e1d3',
    workerSourcesReviewed: workerSourceHash(root) === 'db48c9114654c7a87a532860e3c8d7ae22a7ae0b154a032effeee6344c23ec7a',
    dependencyLockReviewed: hashText(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
      === 'b8d6d8a6fb2e2328a2ec9cdf45a7f4b0b491208ff5b50fc2ccbe7a88487ccb22',
  };
}

export function auditInvocation(platform = process.platform) {
  const args = ['audit', '--audit-level=high', '--json', '--include=dev', '--include=optional', '--include=peer'];
  return platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', `npm ${args.join(' ')}`] }
    : { command: 'npm', args };
}

function main() {
  const { command, args } = auditInvocation();
  const execution = spawnSync(command, args, {
      cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
    });
  let versions;
  try {
    versions = installedVersions();
  } catch (error) {
    console.error(`SECURITY_AUDIT_FAILED could not inspect installed dependencies: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const result = evaluateAuditExecution(execution, { versions });
  if (!result.ok) {
    console.error(`SECURITY_AUDIT_FAILED ${result.reason}`);
    process.exitCode = 1;
    return;
  }
  if (result.excepted) {
    console.warn(`SECURITY_AUDIT_EXCEPTION ${result.reason}`);
  } else {
    console.log(`SECURITY_AUDIT_OK ${result.reason}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
