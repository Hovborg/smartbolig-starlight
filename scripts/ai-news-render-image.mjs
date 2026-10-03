#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { generateBackground, isReady, waitForReady } from './ai-news-comfyui-client.mjs';

const COMFY_ENABLED = process.env.AI_NEWS_ENABLE_COMFYUI === '1'
  && process.env.AI_NEWS_DISABLE_AI !== '1';

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

export function frontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { title: '', description: '', imageHeadline: '', sources: [] };

  const lines = match[1].split(/\r?\n/);
  const decodeScalar = (raw) => {
    const trimmed = String(raw).trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed.slice(1, -1);
      }
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1).replace(/''/g, "'");
    }
    return trimmed;
  };
  const value = (name) => {
    const line = lines.find((entry) => entry.startsWith(`${name}:`));
    if (!line) return '';
    return decodeScalar(line.slice(name.length + 1));
  };
  const nestedValue = (section, name) => {
    const sectionIndex = lines.findIndex((line) => line.trim() === `${section}:`);
    if (sectionIndex === -1) return '';
    for (const line of lines.slice(sectionIndex + 1)) {
      if (/^\S/.test(line)) break;
      const nested = line.match(new RegExp(`^\\s+${name}:\\s*(.+?)\\s*$`));
      if (nested) return decodeScalar(nested[1]);
    }
    return '';
  };

  const sources = [];
  const sourceIndex = lines.findIndex((line) => line.trim() === 'sources:');
  if (sourceIndex !== -1) {
    for (const line of lines.slice(sourceIndex + 1)) {
      if (/^\S/.test(line)) break;
      const source = line.match(/^\s+-\s+(.+?)\s*$/);
      if (source) sources.push(source[1].replace(/^["']|["']$/g, ''));
    }
  }

  return {
    title: value('title'),
    description: value('description'),
    imageHeadline: nestedValue('news', 'imageHeadline'),
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
  return providers.length > 0 ? providers.slice(0, 3) : ['AI News'];
}

function wrapText(text, maxChars, maxLines) {
  const words = String(text)
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      if (word.length <= maxChars) return [word];
      const chunks = [];
      for (let offset = 0; offset < word.length; offset += maxChars) {
        chunks.push(word.slice(offset, offset + maxChars));
      }
      return chunks;
    });
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

function svgText(lines, {
  x,
  y,
  size,
  color = '#f8fafc',
  weight = 700,
  lineHeight = 1.16,
  maxWidth,
}) {
  return lines.map((line, index) => {
    const widthUnits = [...line].reduce((total, character) => {
      if (character === 'W') return total + 1;
      if (character === 'w') return total + 0.85;
      if (character === '@') return total + 1.05;
      if (character === '&') return total + 0.8;
      if (/[^\x00-\x7F]/u.test(character)) return total + 1.1;
      if (/[Mm%]/.test(character)) return total + 0.95;
      if (/[A-Z]/.test(character)) return total + 0.85;
      if (/[a-z0-9]/.test(character)) return total + 0.68;
      if (/\s/.test(character)) return total + 0.36;
      return total + 0.65;
    }, 0);
    const conservativeWidth = widthUnits * size;
    const scaleX = maxWidth && conservativeWidth > maxWidth ? maxWidth / conservativeWidth : 1;
    const renderWidth = conservativeWidth * scaleX;
    const fit = scaleX < 1
      ? ` transform="translate(${x} 0) scale(${scaleX.toFixed(4)} 1) translate(${-x} 0)"`
      : '';
    const metrics = maxWidth
      ? ` data-headline-line="true" data-render-width="${renderWidth.toFixed(1)}"`
      : '';
    return `<text x="${x}" y="${y + (index * size * lineHeight)}"${metrics}${fit} font-family="Arial, Segoe UI, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${xmlEscape(line)}</text>`;
  }).join('\n');
}

function chip(provider, index, x, y) {
  const colors = ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa', '#fb7185'];
  const width = Math.min(174, 80 + (provider.length * 6));
  const cx = x + index * 184;
  const color = colors[index % colors.length];
  return `
    <rect x="${cx}" y="${y}" width="${width}" height="38" rx="19" fill="${color}" opacity="0.18" stroke="${color}" stroke-opacity="0.45"/>
    <circle cx="${cx + 20}" cy="${y + 19}" r="6" fill="${color}"/>
    <text x="${cx + 34}" y="${y + 25}" font-size="16" font-weight="700" fill="#f8fafc">${xmlEscape(provider)}</text>
  `;
}

const motifRules = [
  { motif: 'security', match: /security|sikkerhed|privacy|privatliv|vulnerab|cve|auth|token|permission|tilladel|guard|attack/i },
  { motif: 'browser', match: /browser|chrome|edge|firefox|safari|web page|webside|tab\b/i },
  { motif: 'api', match: /\bapi\b|sdk|developer|udvikler|code|kode|cli|endpoint/i },
  { motif: 'agent', match: /agent|workflow|arbejdsgang|automation|automatis|openclaw|cron|tool|mcp/i },
  { motif: 'model', match: /model|gpt|claude|gemini|openai|anthropic|reasoning|inference/i },
];

const motifPalettes = {
  security: ['#07131d', '#10283a', '#0f513f', '#34d399'],
  browser: ['#071426', '#172a4a', '#29457a', '#60a5fa'],
  api: ['#100d24', '#242044', '#4338ca', '#a78bfa'],
  agent: ['#08151d', '#15313a', '#0f766e', '#2dd4bf'],
  model: ['#120d20', '#2c1740', '#6d28d9', '#c084fc'],
  default: ['#0a1322', '#17253d', '#1d4f64', '#38bdf8'],
};

export function selectMotif(text) {
  return motifRules.find((rule) => rule.match.test(String(text)))?.motif || 'default';
}

function motifArtwork(motif, { height, accent }) {
  const compact = height < 800;
  const scale = compact ? 0.9 : height < 1000 ? 1.08 : 1.28;
  const x = compact ? 920 : 900;
  const y = compact ? 350 : Math.round(height * 0.58);
  const common = `transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke-linecap="round" stroke-linejoin="round"`;

  if (motif === 'security') return `
    <g ${common}>
      <path d="M0 -170 L128 -120 V-18 C128 78 72 144 0 180 C-72 144 -128 78 -128 -18 V-120 Z" fill="#071827" stroke="${accent}" stroke-width="8"/>
      <rect x="-54" y="-12" width="108" height="90" rx="20" fill="#0f3140" stroke="#a7f3d0" stroke-width="6"/>
      <path d="M-34 -14 V-48 A34 34 0 0 1 34 -48 V-14" stroke="#a7f3d0" stroke-width="8"/>
      <circle cx="0" cy="28" r="12" fill="${accent}" stroke="none"/><path d="M0 40 V58" stroke="${accent}" stroke-width="8"/>
      <circle cx="-174" cy="-86" r="13" fill="#60a5fa" stroke="none"/><circle cx="174" cy="-34" r="13" fill="#fbbf24" stroke="none"/>
      <path d="M-160 -78 L-112 -54 M160 -28 L126 -20" stroke="#94a3b8" stroke-width="4" stroke-dasharray="8 10"/>
    </g>`;
  if (motif === 'browser') return `
    <g ${common}>
      <rect x="-205" y="-155" width="410" height="310" rx="26" fill="#0b1830" stroke="${accent}" stroke-width="7"/>
      <path d="M-205 -92 H205" stroke="#93c5fd" stroke-width="5"/>
      <circle cx="-164" cy="-123" r="10" fill="#fb7185" stroke="none"/><circle cx="-132" cy="-123" r="10" fill="#fbbf24" stroke="none"/><circle cx="-100" cy="-123" r="10" fill="#34d399" stroke="none"/>
      <rect x="-158" y="-52" width="316" height="46" rx="13" fill="#14284a" stroke="#60a5fa" stroke-width="3"/>
      <rect x="-158" y="30" width="132" height="82" rx="16" fill="#1d4ed8" opacity="0.65" stroke="none"/>
      <path d="M6 40 H150 M6 72 H126 M6 104 H92" stroke="#bfdbfe" stroke-width="12"/>
    </g>`;
  if (motif === 'api') return `
    <g ${common}>
      <rect x="-196" y="-145" width="392" height="290" rx="28" fill="#15132f" stroke="${accent}" stroke-width="7"/>
      <path d="M-108 -72 L-168 0 L-108 72 M108 -72 L168 0 L108 72 M38 -96 L-38 96" stroke="#ddd6fe" stroke-width="14"/>
      <circle cx="-214" cy="-118" r="14" fill="#22d3ee" stroke="none"/><circle cx="214" cy="104" r="14" fill="#f59e0b" stroke="none"/>
      <path d="M-201 -110 L-158 -82 M201 96 L158 72" stroke="#94a3b8" stroke-width="4" stroke-dasharray="8 9"/>
    </g>`;
  if (motif === 'agent') return `
    <g ${common}>
      <path d="M-176 -92 H-62 M62 -92 H176 M-176 92 H-62 M62 92 H176 M0 -58 V58" stroke="#99f6e4" stroke-width="7" stroke-dasharray="12 12"/>
      <rect x="-62" y="-62" width="124" height="124" rx="30" fill="#0d3b3d" stroke="${accent}" stroke-width="7"/>
      <circle cx="-176" cy="-92" r="38" fill="#164e63" stroke="#67e8f9" stroke-width="6"/><circle cx="176" cy="-92" r="38" fill="#134e4a" stroke="#5eead4" stroke-width="6"/>
      <circle cx="-176" cy="92" r="38" fill="#422006" stroke="#fbbf24" stroke-width="6"/><circle cx="176" cy="92" r="38" fill="#3b174c" stroke="#e879f9" stroke-width="6"/>
      <path d="M-26 0 H26 M0 -26 V26" stroke="#ccfbf1" stroke-width="10"/>
    </g>`;
  if (motif === 'model') return `
    <g ${common}>
      <path d="M-168 -92 L0 -166 L168 -92 L0 -18 Z M-168 0 L0 74 L168 0 M-168 92 L0 166 L168 92" stroke="${accent}" stroke-width="7"/>
      <path d="M-168 -92 V92 M168 -92 V92 M0 -18 V166" stroke="#c4b5fd" stroke-width="4" stroke-dasharray="10 10"/>
      <circle cx="0" cy="-166" r="15" fill="#f0abfc" stroke="none"/><circle cx="-168" cy="-92" r="15" fill="#60a5fa" stroke="none"/><circle cx="168" cy="-92" r="15" fill="#34d399" stroke="none"/><circle cx="0" cy="166" r="15" fill="#fbbf24" stroke="none"/>
    </g>`;
  return `
    <g ${common}>
      <circle cx="0" cy="0" r="58" fill="#0c4a6e" stroke="${accent}" stroke-width="7"/>
      <circle cx="0" cy="0" r="118" stroke="#7dd3fc" stroke-width="5" stroke-dasharray="18 14"/>
      <circle cx="0" cy="0" r="184" stroke="#38bdf8" stroke-width="4" stroke-dasharray="8 18"/>
      <path d="M-232 0 H-58 M58 0 H232 M0 -232 V-58 M0 58 V232" stroke="#bae6fd" stroke-width="6"/>
    </g>`;
}

export function renderEditorialSvg({ width, height, date, headline, providers, overlay = false }) {
  const compact = height < 800;
  const safeHeadline = String(headline || `AI-nyheder, ${formatDate(date)}`).trim();
  const longHeadline = safeHeadline.length > 72;
  const wideUnbrokenHeadline = safeHeadline.length >= 70 && !/\s/.test(safeHeadline);
  const titleSize = wideUnbrokenHeadline
    ? (compact ? 38 : 42)
    : compact
      ? (longHeadline ? 38 : safeHeadline.length > 42 ? 46 : 56)
      : (longHeadline ? 48 : safeHeadline.length > 46 ? 54 : 64);
  const maxLines = wideUnbrokenHeadline ? 4 : longHeadline ? 4 : compact ? 3 : 4;
  const maxChars = wideUnbrokenHeadline
    ? Math.ceil(safeHeadline.length / maxLines)
    : longHeadline ? 26 : compact ? 24 : 22;
  const titleLines = wrapText(safeHeadline, maxChars, maxLines);
  const left = 78;
  const headlineWidth = 620;
  const titleY = compact ? (longHeadline ? 190 : 202) : 240;
  const lineHeight = longHeadline ? 1.1 : 1.12;
  const headlineBottom = titleY + ((titleLines.length - 1) * titleSize * lineHeight);
  const chipY = headlineBottom + 44;
  const dateY = height - 54;
  const motif = selectMotif(`${safeHeadline} ${providers.join(' ')}`);
  const [start, middle, end, accent] = motifPalettes[motif];

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-motif="${motif}" data-text-column-right="${left + headlineWidth}" data-headline-bottom="${Math.round(headlineBottom)}" data-copy-bottom="${Math.round(chipY + 38)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${overlay ? '#020617' : start}" stop-opacity="${overlay ? '0.58' : '1'}"/>
      <stop offset="54%" stop-color="${overlay ? '#020617' : middle}" stop-opacity="${overlay ? '0.68' : '1'}"/>
      <stop offset="100%" stop-color="${overlay ? '#020617' : end}" stop-opacity="${overlay ? '0.82' : '1'}"/>
    </linearGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0H0V44" fill="none" stroke="#ffffff" stroke-opacity="0.055" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  <circle cx="${width - 116}" cy="106" r="92" fill="${accent}" opacity="0.12"/>
  <circle cx="${width - 350}" cy="${height - 90}" r="180" fill="${accent}" opacity="0.08"/>
  <g opacity="${overlay ? '0.42' : '1'}">${motifArtwork(motif, { height, accent })}</g>
  <rect x="${left}" y="48" width="268" height="40" rx="20" fill="#020617" opacity="0.56" stroke="${accent}" stroke-opacity="0.5"/>
  <text x="${left + 20}" y="74" font-family="Arial, Segoe UI, sans-serif" font-size="18" font-weight="800" fill="#e2e8f0">SMARTBOLIG · AI NEWS</text>
  <text x="${left}" y="140" font-family="Arial, Segoe UI, sans-serif" font-size="18" font-weight="800" letter-spacing="2" fill="${accent}">LEAD STORY · HOVEDHISTORIE</text>
  ${svgText(titleLines, { x: left, y: titleY, size: titleSize, lineHeight, maxWidth: headlineWidth })}
  ${providers.map((provider, index) => chip(provider, index, left, chipY)).join('\n')}
  <text x="${left}" y="${dateY}" font-family="Arial, Segoe UI, sans-serif" font-size="22" font-weight="800" fill="#e2e8f0">${xmlEscape(formatDate(date))}</text>
</svg>
  `.trim();
}

async function compositeWithAiBackground({ aiBgPath, variant, date, meta, providers, outputPath }) {
  const overlaySvg = renderEditorialSvg({
    width: variant.width,
    height: variant.height,
    date,
    headline: meta.imageHeadline || meta.title,
    providers,
    overlay: true,
  });
  await sharp(aiBgPath)
    .resize(variant.width, variant.height, { fit: 'cover', position: 'center' })
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outputPath);
}

async function tryGenerateAiBackground({ date, meta, rootDir }) {
  if (!COMFY_ENABLED) {
    console.log('Using the offline editorial illustration. Set AI_NEWS_ENABLE_COMFYUI=1 to opt into a configured ComfyUI background.');
    return null;
  }
  const ready = await isReady();
  if (!ready) {
    try {
      console.log('Waiting briefly for the configured ComfyUI endpoint before using the offline illustration ...');
      await waitForReady();
    } catch (error) {
      console.warn(`AI background unavailable: ${error.message} — using the offline editorial illustration.`);
      return null;
    }
  }
  const aiBgDir = process.env.AI_NEWS_BG_CACHE_DIR || path.join(tmpdir(), 'smartbolig-ai-news-bg-cache');
  await mkdir(aiBgDir, { recursive: true });
  const aiBgPath = path.join(aiBgDir, `${date}.png`);
  try {
    await generateBackground({
      title: meta.imageHeadline || meta.title,
      date,
      outPath: aiBgPath,
    });
    return aiBgPath;
  } catch (error) {
    console.warn(`AI background generation failed: ${error.message} — using the offline editorial illustration.`);
    return null;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
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

  const allVariantsExist = !force && variants.every((variant) => existsSync(path.join(outputDir, `${date}${variant.suffix}.jpg`)));
  const aiBgPath = allVariantsExist ? null : await tryGenerateAiBackground({ date, meta, rootDir });

  for (const variant of variants) {
    const outputPath = path.join(outputDir, `${date}${variant.suffix}.jpg`);
    if (!force && existsSync(outputPath)) {
      console.log(`kept ${path.relative(rootDir, outputPath)}`);
      continue;
    }
    if (aiBgPath) {
      await compositeWithAiBackground({ aiBgPath, variant, date, meta, providers, outputPath });
      console.log(`wrote ${path.relative(rootDir, outputPath)} (AI background)`);
    } else {
      const svg = renderEditorialSvg({
        width: variant.width,
        height: variant.height,
        date,
        headline: meta.imageHeadline || meta.title,
        providers,
      });
      await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toFile(outputPath);
      console.log(`wrote ${path.relative(rootDir, outputPath)} (offline editorial illustration)`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
