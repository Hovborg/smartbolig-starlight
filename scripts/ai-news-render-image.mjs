#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const variants = [
  { suffix: '', width: 1200, height: 630 },
  { suffix: '-16x9', width: 1200, height: 675 },
  { suffix: '-4x3', width: 1200, height: 900 },
  { suffix: '-1x1', width: 1200, height: 1200 },
];

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.split('=', 2);
    if (inlineValue !== undefined) {
      args.set(key, inlineValue);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args.set(key, argv[i + 1]);
      i += 1;
    } else {
      args.set(key, true);
    }
  }
  return args;
}

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { title: '', description: '', sources: [] };

  const lines = match[1].split('\n');
  const value = (name) => {
    const line = lines.find((entry) => entry.startsWith(`${name}:`));
    if (!line) return '';
    return line
      .slice(name.length + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  };

  const sources = [];
  const sourceIndex = lines.findIndex((line) => line.trim() === 'sources:');
  if (sourceIndex !== -1) {
    for (const line of lines.slice(sourceIndex + 1)) {
      if (/^\S/.test(line)) break;
      const source = line.match(/^\s+-\s+(.+?)\s*$/);
      if (source) sources.push(source[1]);
    }
  }

  return {
    title: value('title'),
    description: value('description'),
    sources,
  };
}

function providerForUrl(url) {
  if (/openai\.com/i.test(url)) return 'OpenAI';
  if (/github\.com\/openai\/codex/i.test(url)) return 'Codex';
  if (/anthropic|claude-code/i.test(url)) return 'Claude';
  if (/google|gemini/i.test(url)) return 'Google AI';
  if (/openclaw/i.test(url)) return 'OpenClaw';
  return 'AI';
}

function uniqueProviders(sources) {
  const providers = [...new Set(sources.map(providerForUrl))];
  return providers.length > 0 ? providers.slice(0, 5) : ['AI News'];
}

function wrapText(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S+$/, '')} ...`;
  }

  return lines;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('da-DK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function svgText(lines, { x, y, size, color = '#f8fafc', weight = 700, lineHeight = 1.16 }) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + (index * size * lineHeight)}" font-size="${size}" font-weight="${weight}" fill="${color}">${xmlEscape(line)}</text>`
  )).join('\n');
}

function chip(provider, index, x, y) {
  const colors = ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa', '#fb7185'];
  const width = 118 + (provider.length * 4);
  const cx = x + index * 160;
  const color = colors[index % colors.length];
  return `
    <rect x="${cx}" y="${y}" width="${width}" height="42" rx="21" fill="${color}" opacity="0.16"/>
    <circle cx="${cx + 24}" cy="${y + 21}" r="8" fill="${color}"/>
    <text x="${cx + 42}" y="${y + 27}" font-size="18" font-weight="700" fill="#e5f6ff">${xmlEscape(provider)}</text>
  `;
}

function hardwareScene({ width, height }) {
  const baseY = height - 250;
  const rackX = Math.max(640, width - 500);
  const panelX = rackX - 145;
  return `
    <g opacity="0.95">
      <rect x="${panelX}" y="${baseY - 10}" width="124" height="178" rx="18" fill="#102437" stroke="#2dd4bf" stroke-width="2"/>
      <rect x="${panelX + 18}" y="${baseY + 15}" width="88" height="16" rx="8" fill="#38bdf8"/>
      <rect x="${panelX + 18}" y="${baseY + 48}" width="34" height="84" rx="8" fill="#22c55e" opacity="0.75"/>
      <rect x="${panelX + 62}" y="${baseY + 74}" width="44" height="58" rx="8" fill="#f59e0b" opacity="0.75"/>
      <circle cx="${panelX + 30}" cy="${baseY + 151}" r="9" fill="#fb7185"/>
      <circle cx="${panelX + 60}" cy="${baseY + 151}" r="9" fill="#38bdf8"/>
      <circle cx="${panelX + 90}" cy="${baseY + 151}" r="9" fill="#22c55e"/>

      <rect x="${rackX}" y="${baseY}" width="390" height="168" rx="20" fill="#0f172a" stroke="#334155" stroke-width="3"/>
      <rect x="${rackX + 28}" y="${baseY + 28}" width="334" height="30" rx="15" fill="#1e293b"/>
      <rect x="${rackX + 28}" y="${baseY + 74}" width="334" height="30" rx="15" fill="#1e293b"/>
      <rect x="${rackX + 28}" y="${baseY + 120}" width="334" height="30" rx="15" fill="#1e293b"/>
      <circle cx="${rackX + 54}" cy="${baseY + 43}" r="7" fill="#22c55e"/>
      <circle cx="${rackX + 82}" cy="${baseY + 43}" r="7" fill="#38bdf8"/>
      <circle cx="${rackX + 54}" cy="${baseY + 89}" r="7" fill="#f59e0b"/>
      <circle cx="${rackX + 82}" cy="${baseY + 89}" r="7" fill="#22c55e"/>
      <circle cx="${rackX + 54}" cy="${baseY + 135}" r="7" fill="#38bdf8"/>
      <path d="M${rackX + 126} ${baseY + 43} H${rackX + 332}" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M${rackX + 126} ${baseY + 89} H${rackX + 292}" stroke="#22c55e" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M${rackX + 126} ${baseY + 135} H${rackX + 316}" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
    </g>
  `;
}

function renderSvg({ width, height, date, title, description, providers }) {
  const compact = height < 800;
  const titleLines = wrapText(title || `AI-nyheder, ${formatDate(date)}`, compact ? 28 : 22, compact ? 3 : 4);
  const descriptionLines = wrapText(description, compact ? 56 : 34, compact ? 2 : 4);
  const titleSize = compact ? 60 : 66;
  const left = 78;
  const top = compact ? 92 : 124;
  const chipY = top + (titleLines.length * titleSize * 1.16) + 38;
  const descriptionY = chipY + 94;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08111f"/>
      <stop offset="48%" stop-color="#102437"/>
      <stop offset="100%" stop-color="#19331f"/>
    </linearGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0H0V44" fill="none" stroke="#ffffff" stroke-opacity="0.055" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  <circle cx="${width - 128}" cy="108" r="88" fill="#38bdf8" opacity="0.15"/>
  <circle cx="${width - 268}" cy="${height - 120}" r="160" fill="#22c55e" opacity="0.12"/>
  <rect x="${left}" y="${top - 56}" width="260" height="42" rx="21" fill="#e2e8f0" opacity="0.1"/>
  <text x="${left + 22}" y="${top - 28}" font-size="20" font-weight="800" fill="#bfdbfe">SmartBolig.net AI News</text>
  ${svgText(titleLines, { x: left, y: top + 26, size: titleSize })}
  ${providers.map((provider, index) => chip(provider, index, left, chipY)).join('\n')}
  ${svgText(descriptionLines, { x: left, y: descriptionY, size: compact ? 27 : 30, color: '#cbd5e1', weight: 500, lineHeight: 1.35 })}
  <text x="${left}" y="${height - 72}" font-size="24" font-weight="800" fill="#bbf7d0">${xmlEscape(formatDate(date))}</text>
  ${hardwareScene({ width, height })}
</svg>
  `.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(String(args.get('--root') || defaultRootDir));
  const date = String(args.get('--date') || process.env.AI_NEWS_DATE || '').trim();
  const force = args.has('--force');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Use --date YYYY-MM-DD or set AI_NEWS_DATE.');
  }

  const articlePath = path.join(rootDir, 'src/content/docs/da/ai/nyheder', `${date}.mdx`);
  if (!existsSync(articlePath)) {
    throw new Error(`Missing Danish AI News article for ${date}: ${articlePath}`);
  }

  const article = await readFile(articlePath, 'utf8');
  const meta = frontmatter(article);
  const providers = uniqueProviders(meta.sources);
  const outputDir = path.join(rootDir, 'public/images/ai-news');
  await mkdir(outputDir, { recursive: true });

  for (const variant of variants) {
    const outputPath = path.join(outputDir, `${date}${variant.suffix}.png`);
    if (!force && existsSync(outputPath)) {
      console.log(`kept ${path.relative(rootDir, outputPath)}`);
      continue;
    }
    const svg = renderSvg({
      width: variant.width,
      height: variant.height,
      date,
      title: meta.title,
      description: meta.description,
      providers,
    });
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    console.log(`wrote ${path.relative(rootDir, outputPath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
