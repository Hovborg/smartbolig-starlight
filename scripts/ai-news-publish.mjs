#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(rootDir, 'src/content/docs');
const daNewsDir = path.join(docsDir, 'da/ai/nyheder');
const enNewsDir = path.join(docsDir, 'en/ai/nyheder');

const OFFICIAL_SOURCE_URLS = [
  'https://openai.com/news/rss.xml',
  'https://github.com/openai/codex/releases.atom',
  'https://platform.openai.com/docs/changelog',
  'https://www.anthropic.com/news',
  'https://docs.anthropic.com/en/release-notes/claude-code',
  'https://github.com/anthropics/claude-code/releases.atom',
  'https://blog.google/technology/ai/rss/',
  'https://ai.google.dev/gemini-api/docs/changelog',
  'https://github.com/google-gemini/gemini-cli/releases.atom',
  'https://github.com/openclaw/openclaw/releases',
];

const FEEDS = [
  {
    id: 'openai-codex',
    name: 'OpenAI Codex releases',
    url: 'https://github.com/openai/codex/releases.atom',
    priority: 10,
  },
  {
    id: 'claude-code',
    name: 'Claude Code releases',
    url: 'https://github.com/anthropics/claude-code/releases.atom',
    priority: 10,
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI releases',
    url: 'https://github.com/google-gemini/gemini-cli/releases.atom',
    priority: 9,
  },
  {
    id: 'google-ai',
    name: 'Google AI Blog',
    url: 'https://blog.google/technology/ai/rss/',
    priority: 7,
  },
  {
    id: 'openai-news',
    name: 'OpenAI News',
    url: 'https://openai.com/news/rss.xml',
    priority: 6,
  },
];

const HIGH_SIGNAL_KEYWORDS = [
  ['codex', 10],
  ['claude code', 10],
  ['gemini cli', 10],
  ['agent', 7],
  ['release', 7],
  ['api', 7],
  ['pricing', 7],
  ['price', 7],
  ['cost', 6],
  ['security', 6],
  ['sandbox', 6],
  ['permission', 6],
  ['deprecation', 6],
  ['model', 5],
  ['mcp', 5],
  ['tool', 4],
  ['workflow', 4],
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

const args = parseArgs(process.argv.slice(2));
const writeFiles = args.has('--write');
const force = args.has('--force');
const allowWeakSignal = args.has('--allow-weak-signal');
const targetDate = args.get('--date') || process.env.AI_NEWS_DATE || new Date().toISOString().slice(0, 10);
const lookbackDays = Number(args.get('--days') || 10);
const minScore = Number(args.get('--min-score') || 14);
const maxItems = Number(args.get('--max-items') || 7);
const maxPerSource = Number(args.get('--max-per-source') || 1);

function decodeEntities(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function readLink(block) {
  const textLink = readTag(block, 'link');
  if (textLink) return textLink;
  const href = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return href ? decodeEntities(href[1]) : '';
}

function parseFeed(xml, source) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.map((block) => {
    const publishedRaw = readTag(block, 'pubDate') || readTag(block, 'published') || readTag(block, 'updated');
    const published = new Date(publishedRaw);
    return {
      source,
      title: readTag(block, 'title'),
      url: readLink(block),
      summary: readTag(block, 'description') || readTag(block, 'summary') || readTag(block, 'content'),
      published,
      publishedRaw,
    };
  }).filter((item) => item.title && item.url && !Number.isNaN(item.published.getTime()));
}

function scoreItem(item) {
  const haystack = `${item.source.name} ${item.title}`.toLowerCase();
  let score = item.source.priority;

  for (const [keyword, weight] of HIGH_SIGNAL_KEYWORDS) {
    if (haystack.includes(keyword)) score += weight;
  }

  if (/\bv?\d+\.\d+\.\d+\b/.test(item.title)) score += 6;
  if (/\bnightly\b/i.test(item.title)) score -= 8;
  if (/\balpha\b/i.test(item.title)) score -= 4;
  if (/\b(academy|customer success|research with chatgpt|data analysis)\b/i.test(item.title)) score -= 5;

  return score;
}

function dateWindow(dateString, days) {
  const end = new Date(`${dateString}T23:59:59.999Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { start, end };
}

function formatDate(dateString, locale) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function formatShortDate(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function yamlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function providerLabel(sourceId) {
  if (sourceId === 'openai-codex') return 'OpenAI Codex';
  if (sourceId === 'claude-code') return 'Claude Code';
  if (sourceId === 'gemini-cli') return 'Gemini CLI';
  if (sourceId === 'google-ai') return 'Google AI';
  if (sourceId === 'openai-news') return 'OpenAI';
  return 'AI';
}

function impactDa(item) {
  if (item.source.id === 'openai-codex') {
    return 'Codex CLI kan ændre agent-workflow, sandboxing, MCP-værktøjer og review-flow. Opdater først i et testrepo og læs release notes før produktionsarbejde.';
  }
  if (item.source.id === 'claude-code') {
    return 'Claude Code bruges ofte direkte i lokale repos. Nye features og rettelser kan påvirke permissions, team-workflows, hooks, rate-limit feedback og enterprise-netværk.';
  }
  if (item.source.id === 'gemini-cli') {
    return 'Gemini CLI ændrer sig hurtigt. Tjek versionsnoter, især hvis du bruger API key, Vertex AI, checkpoints eller automatiserede agent-runs.';
  }
  if (item.source.id === 'google-ai') {
    return 'Gemini API-ændringer kan påvirke pris, latency, reliability og hvordan man designer automationer med budgetkontrol.';
  }
  return 'Værd at læse, men bør behandles som produkt- eller læringsnyt med lavere prioritet end konkrete release notes.';
}

function impactEn(item) {
  if (item.source.id === 'openai-codex') {
    return 'Codex CLI changes can affect agent workflow, sandboxing, MCP tools, and review flows. Update in a test repository and read the release notes before production work.';
  }
  if (item.source.id === 'claude-code') {
    return 'Claude Code is often used directly inside local repositories. New features and fixes can affect permissions, team workflows, hooks, rate-limit feedback, and enterprise networking.';
  }
  if (item.source.id === 'gemini-cli') {
    return 'Gemini CLI changes quickly. Check release notes if you use API keys, Vertex AI, checkpoints, or automated agent runs.';
  }
  if (item.source.id === 'google-ai') {
    return 'Gemini API changes can affect cost, latency, reliability, and how you design budget-aware automation.';
  }
  return 'Worth reading, but treat it as product or learning news with lower priority than concrete release notes.';
}

function sourceSummaryDa(items) {
  const providers = [...new Set(items.map((item) => providerLabel(item.source.id)))];
  if (providers.length === 0) return 'Der var ingen stærke officielle signaler i den valgte periode.';
  return `Dagens stærkeste signaler kommer fra ${providers.join(', ')}. Fokus er release notes, CLI-agent ændringer og API-ændringer med praktisk betydning.`;
}

function sourceSummaryEn(items) {
  const providers = [...new Set(items.map((item) => providerLabel(item.source.id)))];
  if (providers.length === 0) return 'No strong official signals were found in the selected window.';
  return `Today's strongest signals come from ${providers.join(', ')}. The focus is release notes, CLI-agent changes, and API updates with practical impact.`;
}

function renderArticle({ locale, date, items, weakSignal }) {
  const isDa = locale === 'da';
  const formattedDate = formatDate(date, isDa ? 'da-DK' : 'en-US');
  const title = isDa ? `AI-nyheder, ${formattedDate}` : `AI News, ${formattedDate}`;
  const description = isDa
    ? `Kurateret AI-overblik for ${formattedDate}: OpenAI, Claude Code, Gemini CLI, API-priser og agent-workflows.`
    : `Curated AI brief for ${formattedDate}: OpenAI, Claude Code, Gemini CLI, API pricing, and agent workflows.`;
  const publishedMeta = isDa
    ? `<p><strong>Publiceret:</strong> <time datetime="${date}">${formattedDate}</time> | <strong>Opdateret:</strong> <time datetime="${date}">${formattedDate}</time></p>`
    : `<p><strong>Published:</strong> <time datetime="${date}">${formattedDate}</time> | <strong>Updated:</strong> <time datetime="${date}">${formattedDate}</time></p>`;
  const signal = weakSignal ? 'low' : items.length >= 4 ? 'high' : 'medium';
  const sourceUrls = [...new Set(items.map((item) => item.url))];

  const headlineBlocks = items.map((item, index) => {
    const sourceDate = formatShortDate(item.published, isDa ? 'da-DK' : 'en-US');
    if (isDa) {
      return `### ${index + 1}. ${providerLabel(item.source.id)}: ${item.title}

- Hvad skete der: ${item.source.name} publicerede denne opdatering ${sourceDate}.
- Hvorfor det betyder noget: ${impactDa(item)}
- Hvad bør du gøre: Læs kilden, opdater kontrolleret og hold øje med ændringer i permissions, pricing, API-brug og projektmapper.

Kilde: [${item.source.name}](${item.url})`;
    }

    return `### ${index + 1}. ${providerLabel(item.source.id)}: ${item.title}

- What happened: ${item.source.name} published this update on ${sourceDate}.
- Why it matters: ${impactEn(item)}
- What to do: Read the source, update carefully, and watch for changes in permissions, pricing, API usage, and project folders.

Source: [${item.source.name}](${item.url})`;
  }).join('\n\n');

  const sourceRows = items.map((item) => {
    const sourceDate = formatShortDate(item.published, isDa ? 'da-DK' : 'en-US');
    return `| ${providerLabel(item.source.id)} | [${item.title}](${item.url}) | ${sourceDate} |`;
  }).join('\n');

  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `date: ${date}`,
    `lastUpdated: ${date}`,
    'news:',
    `  signal: ${signal}`,
    '  sources:',
    ...sourceUrls.map((url) => `    - ${url}`),
    'sidebar:',
    `  label: ${yamlString(formattedDate)}`,
    '---',
  ].join('\n');

  if (isDa) {
    return `${frontmatter}

import { Badge, Aside } from "@astrojs/starlight/components";

<Badge text="AI Radar" variant="note" /> <Badge text="${signal === 'high' ? 'Høj signalværdi' : signal === 'medium' ? 'Middel signalværdi' : 'Lav signalværdi'}" variant="${signal === 'high' ? 'success' : signal === 'medium' ? 'note' : 'caution'}" />

${publishedMeta}

${weakSignal ? 'Der var ikke nok høj-signal nyheder til en fuld dagsudgave. Denne side er derfor en kort kildebaseret status, ikke en fyldartikel.' : sourceSummaryDa(items)}

<Aside type="caution" title="Kildeførst">
Denne side må ikke kopiere lange tekststykker fra kilderne. Brug links, korte forklaringer og konkrete handlinger.
</Aside>

## Kort sagt

- ${items.length} officielle signaler blev udvalgt til denne udgave.
- Prioriteten er AI CLI'er, coding agents, API-ændringer, modelændringer, pricing og sikkerhed.
- Læs altid release notes før du opdaterer en CLI i et aktivt projekt.

## Vigtigste nyt

${headlineBlocks || 'Ingen høj-signal nyheder fra de overvågede officielle kilder.'}

## Kildeoverblik

| Område | Kilde | Dato |
| --- | --- | --- |
${sourceRows || '| AI | Ingen publicerbar kilde | - |'}

## Redaktionsregler

- Officielle kilder prioriteres over rygter og sociale medier.
- Interne OpenClaw-rapporter, lokale filstier og private tokens må aldrig publiceres.
- Hvis der ikke er nok signal, springes dagsudgaven over eller markeres tydeligt som lav signalværdi.
`;
  }

  return `${frontmatter}

import { Badge, Aside } from "@astrojs/starlight/components";

<Badge text="AI Radar" variant="note" /> <Badge text="${signal === 'high' ? 'High signal' : signal === 'medium' ? 'Medium signal' : 'Low signal'}" variant="${signal === 'high' ? 'success' : signal === 'medium' ? 'note' : 'caution'}" />

${publishedMeta}

${weakSignal ? 'There were not enough high-signal updates for a full daily issue. This page is a short source-backed status, not filler content.' : sourceSummaryEn(items)}

<Aside type="caution" title="Source first">
This page must not copy long passages from sources. Use links, short explanations, and concrete actions.
</Aside>

## Short Version

- ${items.length} official signals were selected for this issue.
- The priority is AI CLIs, coding agents, API changes, model changes, pricing, and security.
- Always read release notes before updating a CLI in an active project.

## Main Updates

${headlineBlocks || 'No high-signal updates from the monitored official sources.'}

## Source Overview

| Area | Source | Date |
| --- | --- | --- |
${sourceRows || '| AI | No publishable source | - |'}

## Editorial Rules

- Official sources rank above rumors and social media.
- Internal OpenClaw reports, local file paths, and private tokens must never be published.
- If signal is weak, the daily issue is skipped or clearly marked as low signal.
`;
}

function renderIndex({ locale, entries }) {
  const isDa = locale === 'da';
  const latest = entries[0];
  const title = isDa ? 'AI-nyheder' : 'AI News';
  const description = isDa
    ? 'Dagligt kildebaseret overblik over OpenAI, Claude Code, Gemini CLI, API-priser og AI-agent workflows.'
    : 'Daily source-backed brief for OpenAI, Claude Code, Gemini CLI, API pricing, and AI-agent workflows.';
  const baseHref = isDa ? '/da/ai/nyheder' : '/en/ai/nyheder';
  const rssHref = isDa ? '/da/ai/nyheder/rss.xml' : '/en/ai/news/rss.xml';
  const archiveCards = entries.slice(0, 12).map((entry) => {
    const dateLabel = formatDate(entry.date, isDa ? 'da-DK' : 'en-US');
    return `  <LinkCard
    title="${isDa ? 'AI-nyheder' : 'AI News'}: ${dateLabel}"
    description="${isDa ? 'Kurateret daglig udgave med officielle kilder.' : 'Curated daily issue with official sources.'}"
    href="${baseHref}/${entry.date}/"
  />`;
  }).join('\n');

  const sourceList = OFFICIAL_SOURCE_URLS.map((url) => `- [${url}](${url})`).join('\n');

  if (isDa) {
    return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
lastUpdated: ${latest?.date || new Date().toISOString().slice(0, 10)}
sidebar:
  label: "AI-nyheder"
---

import { Card, CardGrid, LinkCard, Aside } from "@astrojs/starlight/components";

AI-nyheder er SmartBolig.net's separate AI Radar: korte, kildebaserede opdateringer om AI CLI'er, coding agents, modeller, API-priser og sikkerhed.

<Aside type="note" title="Ikke en rå nyhedsfeed">
Siden publicerer kun når der er nok signal. Målet er færre, bedre opdateringer med officielle kilder og konkrete handlinger.
</Aside>

<CardGrid>
  <Card title="Fokus">
    OpenAI Codex, Claude Code, Gemini CLI, OpenClaw, modelændringer, API-priser, deprecations og agent-sikkerhed.
  </Card>
  <Card title="Publicering">
    OpenClaw eller GitHub Actions laver et dagligt udkast. Build, validering og PR fungerer som publiceringsgate.
  </Card>
  <Card title="RSS">
    Følg nyhederne via [AI News RSS](${rssHref}).
  </Card>
</CardGrid>

## Seneste udgaver

<CardGrid>
${archiveCards || `  <Card title="Ingen udgaver endnu">
    Første daglige udgave bliver publiceret når der er nok officielle signaler.
  </Card>`}
</CardGrid>

## Kilder der overvåges

${sourceList}

## Redaktionsregler

- Brug officielle kilder først.
- Publicer ikke rygter, leaks eller tynde opsummeringer.
- Kopier ikke lange passager fra kilder.
- Publicer aldrig lokale OpenClaw-logs, filstier, tokens eller intern drift.
- Skriv hvad læseren konkret bør holde øje med.
`;
  }

  return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
lastUpdated: ${latest?.date || new Date().toISOString().slice(0, 10)}
sidebar:
  label: "AI News"
---

import { Card, CardGrid, LinkCard, Aside } from "@astrojs/starlight/components";

AI News is SmartBolig.net's separate AI Radar: short, source-backed updates about AI CLIs, coding agents, models, API pricing, and security.

<Aside type="note" title="Not a raw news feed">
This section publishes only when there is enough signal. The goal is fewer, better updates with official sources and concrete actions.
</Aside>

<CardGrid>
  <Card title="Focus">
    OpenAI Codex, Claude Code, Gemini CLI, OpenClaw, model changes, API pricing, deprecations, and agent security.
  </Card>
  <Card title="Publishing">
    OpenClaw or GitHub Actions creates a daily draft. Build, validation, and PR review act as the publishing gate.
  </Card>
  <Card title="RSS">
    Follow updates through [AI News RSS](${rssHref}).
  </Card>
</CardGrid>

## Latest Issues

<CardGrid>
${archiveCards || `  <Card title="No issues yet">
    The first daily issue will publish when there are enough official signals.
  </Card>`}
</CardGrid>

## Watched Sources

${sourceList}

## Editorial Rules

- Use official sources first.
- Do not publish rumors, leaks, or thin summaries.
- Do not copy long passages from sources.
- Never publish local OpenClaw logs, file paths, tokens, or internal operations.
- Explain what readers should concretely watch or do next.
`;
}

async function fetchItems() {
  const results = [];
  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'SmartBolig AI News Bot (+https://smartbolig.net/da/ai/nyheder/)',
          Accept: 'application/rss+xml, application/atom+xml, text/xml;q=0.9, */*;q=0.5',
        },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const xml = await response.text();
      results.push(...parseFeed(xml, feed));
    } catch (error) {
      console.warn(`Could not fetch ${feed.name}: ${error.message}`);
    }
  }
  return results;
}

function selectItems(items) {
  const { start, end } = dateWindow(targetDate, lookbackDays);
  const byUrl = new Map();

  for (const item of items) {
    if (item.published < start || item.published > end) continue;
    const daysOld = Math.max(0, (end.getTime() - item.published.getTime()) / 86_400_000);
    const recencyBoost = Math.max(0, 8 - Math.floor(daysOld));
    const score = scoreItem(item) + recencyBoost;
    const scored = { ...item, score };
    const existing = byUrl.get(item.url);
    if (!existing || existing.score < score) byUrl.set(item.url, scored);
  }

  const selected = [];
  const sourceCounts = new Map();

  for (const item of [...byUrl.values()]
    .filter((item) => item.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.published - a.published;
    })
  ) {
    const sourceCount = sourceCounts.get(item.source.id) || 0;
    if (sourceCount >= maxPerSource) continue;
    selected.push(item);
    sourceCounts.set(item.source.id, sourceCount + 1);
    if (selected.length >= maxItems) break;
  }

  return selected;
}

async function listEntries() {
  const names = existsSync(daNewsDir) ? await readdir(daNewsDir) : [];
  return names
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.mdx$/.test(name))
    .map((name) => ({ date: name.replace(/\.mdx$/, '') }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function writeIfChanged(filePath, content) {
  if (!force && existsSync(filePath) && filePath.endsWith(`${targetDate}.mdx`)) {
    return { path: filePath, changed: false, reason: 'exists' };
  }

  let previous = '';
  if (existsSync(filePath)) previous = await readFile(filePath, 'utf8');
  if (previous === content) return { path: filePath, changed: false, reason: 'unchanged' };
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  return { path: filePath, changed: true };
}

async function main() {
  const rawItems = await fetchItems();
  const selected = selectItems(rawItems);
  const weakSignal = selected.length < 2;

  if (weakSignal && !allowWeakSignal) {
    console.log(`No AI News draft written. Only ${selected.length} high-signal item(s) found for ${targetDate}.`);
    process.exit(0);
  }

  const daPath = path.join(daNewsDir, `${targetDate}.mdx`);
  const enPath = path.join(enNewsDir, `${targetDate}.mdx`);
  const daArticle = renderArticle({ locale: 'da', date: targetDate, items: selected, weakSignal });
  const enArticle = renderArticle({ locale: 'en', date: targetDate, items: selected, weakSignal });

  if (!writeFiles) {
    console.log(daArticle);
    return;
  }

  const writes = [
    await writeIfChanged(daPath, daArticle),
    await writeIfChanged(enPath, enArticle),
  ];

  const entries = await listEntries();
  const nextEntries = entries.some((entry) => entry.date === targetDate)
    ? entries
    : [{ date: targetDate }, ...entries].sort((a, b) => b.date.localeCompare(a.date));

  writes.push(await writeIfChanged(path.join(daNewsDir, 'index.mdx'), renderIndex({ locale: 'da', entries: nextEntries })));
  writes.push(await writeIfChanged(path.join(enNewsDir, 'index.mdx'), renderIndex({ locale: 'en', entries: nextEntries })));

  for (const result of writes) {
    const rel = path.relative(rootDir, result.path);
    console.log(`${result.changed ? 'wrote' : 'kept'} ${rel}${result.reason ? ` (${result.reason})` : ''}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
