#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEEDS, HIGH_SIGNAL_KEYWORDS, OFFICIAL_SOURCE_URLS } from './ai-news-sources.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(rootDir, 'src/content/docs');
const daNewsDir = path.join(docsDir, 'da/ai/nyheder');
const enNewsDir = path.join(docsDir, 'en/ai/nyheder');

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
const fixturePaths = String(args.get('--fixture') || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

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

function slugifyHeading(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function providerLabel(sourceId) {
  if (sourceId === 'openai-codex') return 'OpenAI Codex';
  if (sourceId === 'claude-code') return 'Claude Code';
  if (sourceId === 'gemini-cli') return 'Gemini CLI';
  if (sourceId === 'google-ai') return 'Google AI';
  if (sourceId === 'openai-news') return 'OpenAI';
  if (sourceId === 'openclaw') return 'OpenClaw';
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
  if (item.source.id === 'openclaw') {
    return 'OpenClaw-ændringer kan påvirke lokale agent-workflows, cron-jobs, ACP-integrationer og hvordan automatiserede repo-opgaver styres.';
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
  if (item.source.id === 'openclaw') {
    return 'OpenClaw changes can affect local agent workflows, cron jobs, ACP integrations, and how automated repository tasks are controlled.';
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

function countLabel(count, locale) {
  if (locale === 'da') return count === 1 ? '1 officiel kilde' : `${count} officielle kilder`;
  return count === 1 ? '1 official source' : `${count} official sources`;
}

function actionDa(item) {
  if (item.source.id === 'openai-codex') {
    return 'Test versionen i et separat repo, før du bruger den i workflows med auto-commit, MCP eller shell-adgang.';
  }
  if (item.source.id === 'claude-code') {
    return 'Læs ændringerne for permissions og team-opsætning, før du opdaterer en maskine der arbejder direkte i produktionsrepos.';
  }
  if (item.source.id === 'gemini-cli') {
    return 'Gem CLI-versionen sammen med projektets agent-instruktioner, så automatiske runs kan reproduceres.';
  }
  if (item.source.id === 'google-ai') {
    return 'Tjek om ændringen påvirker budget, latency eller modelvalg, før den bliver del af en fast automation.';
  }
  if (item.source.id === 'openclaw') {
    return 'Læs release notes før gateway eller cron-jobs opdateres, fordi runtime-ændringer hurtigt kan påvirke automatiserede opgaver.';
  }
  return 'Læs originalkilden og behandl nyheden som inspiration, indtil den har en konkret effekt på dit setup.';
}

function actionEn(item) {
  if (item.source.id === 'openai-codex') {
    return 'Test the version in a separate repository before using it in workflows with auto-commit, MCP, or shell access.';
  }
  if (item.source.id === 'claude-code') {
    return 'Read the permission and team setup notes before updating a machine that works directly inside production repositories.';
  }
  if (item.source.id === 'gemini-cli') {
    return 'Pin the CLI version alongside the project agent instructions so automated runs stay reproducible.';
  }
  if (item.source.id === 'google-ai') {
    return 'Check whether the change affects budget, latency, or model choice before adding it to a fixed automation.';
  }
  if (item.source.id === 'openclaw') {
    return 'Read release notes before updating gateways or cron jobs because runtime changes can quickly affect automated tasks.';
  }
  return 'Read the original source and treat the update as inspiration until it has a concrete effect on your setup.';
}

function renderStorySection({ items, locale }) {
  const isDa = locale === 'da';
  if (items.length === 0) {
    return isDa
      ? 'Der var ingen publicerbare høj-signal nyheder fra de overvågede officielle kilder.'
      : 'No publishable high-signal updates were found in the monitored official sources.';
  }

  return items.map((item, index) => {
    const sourceDate = formatShortDate(item.published, isDa ? 'da-DK' : 'en-US');
    const provider = providerLabel(item.source.id);
    if (isDa) {
      return `### ${index + 1}. ${provider}: ${item.title}

${item.source.name} publicerede opdateringen ${sourceDate}. Det er en officiel kilde med praktisk betydning for folk, der bruger AI-værktøjer i rigtige projekter.

For SmartBolig-læsere er den relevante vinkel: ${impactDa(item)}

Det næste skridt er konkret: ${actionDa(item)}

[Læs originalkilden hos ${item.source.name}](${item.url})`;
    }

    return `### ${index + 1}. ${provider}: ${item.title}

${item.source.name} published the update on ${sourceDate}. It is an official source with practical impact for people using AI tools in real projects.

For SmartBolig readers, the relevant angle is: ${impactEn(item)}

The next step is concrete: ${actionEn(item)}

[Read the original source at ${item.source.name}](${item.url})`;
  }).join('\n\n');
}

function renderTakeaways({ items, locale }) {
  const isDa = locale === 'da';
  if (items.length === 0) {
    return isDa
      ? '- Ingen ændringer kræver handling i dag.'
      : '- No changes require action today.';
  }

  const providers = [...new Set(items.map((item) => providerLabel(item.source.id)))];
  if (isDa) {
    return [
      `- Artiklen bygger på ${countLabel(items.length, locale)} fra ${providers.join(', ')}.`,
      "- Fokus er ændringer, der kan påvirke AI CLI'er, coding agents, API-brug, priser eller sikkerhed.",
      '- Opdater ikke aktive automatiseringer uden at læse originalkilden først.',
    ].join('\n');
  }

  return [
    `- This article is based on ${countLabel(items.length, locale)} from ${providers.join(', ')}.`,
    '- The focus is changes that can affect AI CLIs, coding agents, API usage, pricing, or security.',
    '- Do not update active automations before reading the original source.',
  ].join('\n');
}

function renderArticle({ locale, date, items, weakSignal }) {
  const isDa = locale === 'da';
  const formattedDate = formatDate(date, isDa ? 'da-DK' : 'en-US');
  const title = isDa ? `AI-nyheder, ${formattedDate}` : `AI News, ${formattedDate}`;
  const description = isDa
    ? `Kurateret AI-overblik for ${formattedDate}: OpenAI, Claude Code, Gemini CLI, API-priser og agent-workflows.`
    : `Curated AI brief for ${formattedDate}: OpenAI, Claude Code, Gemini CLI, API pricing, and agent workflows.`;
  const publishedMeta = isDa
    ? `<strong>Publiceret:</strong> <time datetime="${date}">${formattedDate}</time> | <strong>Opdateret:</strong> <time datetime="${date}">${formattedDate}</time>`
    : `<strong>Published:</strong> <time datetime="${date}">${formattedDate}</time> | <strong>Updated:</strong> <time datetime="${date}">${formattedDate}</time>`;
  const signal = weakSignal ? 'low' : items.length >= 4 ? 'high' : 'medium';
  const sourceUrls = [...new Set(items.map((item) => item.url))];

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

<Badge text="${signal === 'high' ? 'Høj signalværdi' : signal === 'medium' ? 'Middel signalværdi' : 'Lav signalværdi'}" variant="${signal === 'high' ? 'success' : signal === 'medium' ? 'note' : 'caution'}" />

<p class="ai-news-byline">Af SmartBolig.net Redaktionen · ${publishedMeta} · ${countLabel(items.length, locale)}</p>

<p class="ai-news-lede">${weakSignal ? 'Der var ikke nok stærke nyheder til en fuld dagsudgave. Derfor er dette en kort kildebaseret artikel, ikke fyld for kalenderens skyld.' : sourceSummaryDa(items)}</p>

<Aside type="note" title="Redaktionelt filter">
SmartBolig.net vælger hellere færre nyheder med klare kilder end et langt nyhedsfeed. Artiklen bruger egne formuleringer og linker til originalkilderne.
</Aside>

## Hovedhistorien

${renderStorySection({ items, locale })}

## Hvorfor det betyder noget

${renderTakeaways({ items, locale })}

## Hvad du bør gøre nu

1. Læs originalkilden, før du opdaterer en CLI eller ændrer et agent-workflow.
2. Test nye agent- eller API-versioner i et separat projekt, før de bruges i drift.
3. Spring dagens udgave over, hvis kilderne ikke giver nok signal.

## Kilder og videre læsning

| Område | Kilde | Dato |
| --- | --- | --- |
${sourceRows || '| AI | Ingen publicerbar kilde | - |'}

## Redaktionsnote

Artiklen bygger på officielle kilder og korte parafraser. Lange citater, kopieret brødtekst og private tekniske detaljer er fravalgt.
`;
  }

  return `${frontmatter}

import { Badge, Aside } from "@astrojs/starlight/components";

<Badge text="${signal === 'high' ? 'High signal' : signal === 'medium' ? 'Medium signal' : 'Low signal'}" variant="${signal === 'high' ? 'success' : signal === 'medium' ? 'note' : 'caution'}" />

<p class="ai-news-byline">By SmartBolig.net Editorial · ${publishedMeta} · ${countLabel(items.length, locale)}</p>

<p class="ai-news-lede">${weakSignal ? 'There were not enough strong updates for a full daily issue. This is a short source-backed article, not filler for the calendar.' : sourceSummaryEn(items)}</p>

<Aside type="note" title="Editorial filter">
SmartBolig.net prefers fewer updates with clear sources over a long news feed. The article uses original wording and links back to the source material.
</Aside>

## Lead Story

${renderStorySection({ items, locale })}

## Why It Matters

${renderTakeaways({ items, locale })}

## What To Do Now

1. Read the original source before updating a CLI or changing an agent workflow.
2. Test new agent or API versions in a separate project before using them in operations.
3. Skip the daily issue if the sources do not provide enough signal.

## Sources and Further Reading

| Area | Source | Date |
| --- | --- | --- |
${sourceRows || '| AI | No publishable source | - |'}

## Editorial Note

The article is based on official sources and short paraphrases. Long quotes, copied body text, and private technical details are deliberately avoided.
`;
}

function renderIndex({ locale, entries }) {
  const isDa = locale === 'da';
  const latest = entries[0];
  const title = isDa ? 'AI-nyheder' : 'AI News';
  const description = isDa
    ? 'Dagligt kildebaseret overblik over OpenAI, Claude Code, Gemini CLI, API-priser og AI-agent workflows.'
    : 'Daily source-backed brief for OpenAI, Claude Code, Gemini CLI, API pricing, and AI-agent workflows.';

  if (isDa) {
    return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
lastUpdated: ${latest?.date || new Date().toISOString().slice(0, 10)}
sidebar:
  label: "AI-nyheder"
---

import AiNewsFeed from "../../../../../components/AiNewsFeed.astro";

AI-nyheder fra SmartBolig.net er korte, redaktionelle artikler om AI CLI'er, coding agents, modeller, API-priser og sikkerhed. Fokus er officielle kilder, praktisk betydning og egne formuleringer.

<AiNewsFeed locale="da" />
`;
  }

  return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
lastUpdated: ${latest?.date || new Date().toISOString().slice(0, 10)}
sidebar:
  label: "AI News"
---

import AiNewsFeed from "../../../../../components/AiNewsFeed.astro";

SmartBolig.net AI News is a set of short editorial articles about AI CLIs, coding agents, models, API pricing, and security. The focus is official sources, practical impact, and original wording.

<AiNewsFeed locale="en" />
`;
}

async function fetchItems() {
  if (fixturePaths.length > 0) {
    const source = FEEDS.find((feed) => feed.id === 'openai-codex') || FEEDS[0];
    const results = [];
    for (const fixturePath of fixturePaths) {
      const xml = await readFile(path.resolve(fixturePath), 'utf8');
      results.push(...parseFeed(xml, source));
    }
    return results;
  }

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
