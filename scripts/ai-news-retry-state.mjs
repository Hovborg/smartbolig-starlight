#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    args.set(argv[index], argv[index + 1]);
    index += 1;
  }
  return args;
}

function frontmatterValue(content, key) {
  const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return frontmatter.match(new RegExp(`^\\s*${escaped}:\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1]?.trim() || '';
}

export async function retryState({ rootDir, date }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error(`Invalid date: ${date}`);
  const paths = [
    path.join(rootDir, 'src/content/docs/da/ai/nyheder', `${date}.mdx`),
    path.join(rootDir, 'src/content/docs/en/ai/nyheder', `${date}.mdx`),
  ];
  const present = paths.map((filePath) => existsSync(filePath));
  if (!present.some(Boolean)) return { action: 'generate' };
  if (!present.every(Boolean)) throw new Error(`Only one locale exists for ${date}; refusing silent retry`);

  const contents = await Promise.all(paths.map((filePath) => readFile(filePath, 'utf8')));
  const fingerprints = contents.map((content) => frontmatterValue(content, 'issueFingerprint'));
  if (!fingerprints.every((value) => /^[a-f0-9]{64}$/.test(value))) {
    throw new Error(`Existing issue ${date} has a missing or invalid issueFingerprint`);
  }
  if (fingerprints[0] !== fingerprints[1]) throw new Error(`Existing bilingual issue ${date} has mismatched fingerprints`);
  return { action: 'resume-public-verification', issueFingerprint: fingerprints[0] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = await retryState({
    rootDir: path.resolve(String(args.get('--root') || projectRoot)),
    date: String(args.get('--date') || ''),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
