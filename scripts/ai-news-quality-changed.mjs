#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseIndex = process.argv.indexOf('--base');
const requestedBase = baseIndex >= 0 ? process.argv[baseIndex + 1] : '';
const base = requestedBase && !/^0+$/.test(requestedBase) ? requestedBase : 'HEAD^';

const changed = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], {
  cwd: rootDir,
  encoding: 'utf8',
}).split(/\r?\n/).filter(Boolean);

const dates = [...new Set(changed.flatMap((file) => {
  const match = file.match(/^src\/content\/docs\/da\/ai\/nyheder\/(\d{4}-\d{2}-\d{2})\.mdx$/);
  return match ? [match[1]] : [];
}))].sort();

for (const date of dates) {
  execFileSync(process.execPath, ['scripts/ai-news-quality.mjs', '--date', date], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

console.log(`AI News changed-issue quality gate passed (${dates.length} issue(s) checked).`);
