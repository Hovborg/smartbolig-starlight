import { sourceSetFingerprint, storyFingerprint } from "./ai-news-editorial.mjs";

const HERO_EXT = ".jpg";

function yamlString(value) {
  return JSON.stringify(String(value));
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol)
      ? url.href.replace(/[<>{}"'()\\\s]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
      : "";
  } catch {
    return "";
  }
}

// Escapes untrusted text for MDX body context. Markdown-active characters are
// converted to numeric HTML entities (not backslash escapes) so they can never
// be re-interpreted as links, images, or code by the Markdown processor —
// see docs/verification/2026-07-13-security-review.md H-1.
function safeText(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
    .replace(/\[/g, "&#91;")
    .replace(/\]/g, "&#93;")
    .replace(/\(/g, "&#40;")
    .replace(/\)/g, "&#41;")
    .replace(/!/g, "&#33;")
    .replace(/`/g, "&#96;")
    .replace(/\*/g, "&#42;")
    .replace(/_/g, "&#95;")
    .trim();
}

// For link labels, headings, and table cells: strip structural characters from
// the raw value first (entity-escaping happens in safeText afterwards, so this
// must not run on already-escaped text).
function safeLabel(value) {
  return safeText(String(value).replace(/[|#]/g, " "));
}

function provider(item) {
  return item.sourceName || item.source?.name || item.sourceId || item.source?.id || "AI";
}

function formatDate(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatSourceDate(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function sourceExcerpt(item) {
  const text = `${item.summary || ""} ${item.bodyText || ""}`.replace(/\s+/g, " ").trim();
  // 20 words keeps the rendered blockquote inside the validator's 25-word cap
  // even with the localized label prefix in front.
  const words = text.split(" ").filter(Boolean).slice(0, 20);
  return words.length > 0 ? safeText(`${words.join(" ")}${text.split(" ").length > words.length ? "…" : ""}`) : "";
}

function relevance(item, locale) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const da = locale === "da";
  if (/permission|security|privacy|approval|tilladel|sikker/.test(text)) {
    return da
      ? "Ændringen er relevant, når en AI-assistent må læse sensorer eller udløse handlinger i hjemmet: smallere tilladelser og synlig godkendelse reducerer konsekvensen af en forkert beslutning."
      : "This matters when an AI assistant can read sensors or trigger home actions: narrower permissions and visible approval reduce the impact of a wrong decision.";
  }
  if (/price|pricing|cost|pris/.test(text)) {
    return da
      ? "Prisændringen kan flytte grænsen mellem lokal og cloudbaseret AI og bør regnes ind i faste automationer, før de skaleres."
      : "The pricing change can shift the boundary between local and cloud AI and should be calculated before a recurring automation is scaled.";
  }
  if (/model|context|reasoning|multimodal/.test(text)) {
    return da
      ? "Modelændringen kan påvirke svartid, datagrænser og hvor sikkert et workflow kan bruge værktøjer; den bør derfor måles på den konkrete hjemmeopgave."
      : "The model change can affect latency, data boundaries, and tool safety, so it should be measured on the actual home workflow.";
  }
  return da
    ? "Den praktiske værdi afhænger af, om ændringen løser en konkret opgave bedre uden at udvide adgang, cloudafhængighed eller driftsrisiko."
    : "Its practical value depends on solving a concrete task better without expanding access, cloud dependency, or operational risk.";
}

function verification(item, locale) {
  const da = locale === "da";
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (/permission|approval|security|privacy/.test(text)) {
    return da
      ? "Kontrollér i et testmiljø, at agenten kan udføre den tilladte handling, bliver stoppet ved en følsom handling og efterlader en brugbar log."
      : "Verify in a test environment that the agent can perform the allowed action, is stopped at a sensitive action, and leaves a useful log.";
  }
  return da
    ? "Sammenlign før/efter på den samme opgave, og mål resultat, svartid, omkostning og mulighed for rollback, før ændringen bruges i drift."
    : "Compare before and after on the same task, measuring outcome, latency, cost, and rollback before using the change in operations.";
}

function uncertainty(item, locale) {
  const text = `${item.summary} ${item.bodyText}`.toLowerCase();
  const da = locale === "da";
  if (/rollout|region|availability|preview|beta|gradual/.test(text)) {
    return da
      ? "Udrulning, region eller kontotype kan begrænse adgangen. Kilden bør genlæses for den konkrete konto, før funktionen planlægges som tilgængelig."
      : "Rollout, region, or account type may limit access. Recheck the source for the actual account before planning around availability.";
  }
  return da
    ? "Kilden dokumenterer ændringen, men viser ikke nødvendigvis langtidseffekt i et hjemmemiljø. Stabilitet og grænsetilfælde er derfor stadig usikre."
    : "The source documents the change but may not show long-term behavior in a home environment. Stability and edge cases remain uncertain.";
}

// Per-story copy: prefer validated LLM copy when present, otherwise fall back
// to the deterministic template sentences. All LLM text passes safeText here,
// so it is escaped exactly like feed-derived text.
function storyCopy(copy, index, field, locale, fallback) {
  const value = copy?.stories?.[index]?.[field]?.[locale];
  return typeof value === "string" && value.trim().length > 0 ? safeText(value) : fallback;
}

function renderStories(items, locale, copy) {
  const da = locale === "da";
  return items.map((item, index) => {
    const excerpt = sourceExcerpt(item);
    const published = formatSourceDate(item.published, da ? "da-DK" : "en-GB");
    const what = storyCopy(copy, index, "what", locale, safeText(item.summary || (da
      ? "Den officielle side beskriver ændringen og dens aktuelle omfang."
      : "The official page describes the change and its current scope.")));
    const why = storyCopy(copy, index, "why", locale, relevance(item, locale));
    const verify = storyCopy(copy, index, "verify", locale, verification(item, locale));
    const open = storyCopy(copy, index, "uncertainty", locale, uncertainty(item, locale));
    if (da) {
      return `### ${index + 1}. ${safeLabel(provider(item))}: ${safeLabel(item.title)}

**Hvad ændrede sig:** ${safeLabel(provider(item))} offentliggjorde opdateringen ${published}. ${what}

${excerpt ? `> Kort kildeuddrag: ${excerpt}\n` : ""}
**Hvorfor det er relevant:** ${why}

**Sådan verificerer du det:** ${verify}

**Usikkerhed:** ${open}

Kilde: [${safeLabel(item.title)}](${safeUrl(item.canonicalUrl || item.url)})`;
    }
    return `### ${index + 1}. ${safeLabel(provider(item))}: ${safeLabel(item.title)}

**What changed:** ${safeLabel(provider(item))} published the update on ${published}. ${what}

${excerpt ? `> Short source excerpt: ${excerpt}\n` : ""}
**Why it matters:** ${why}

**How to verify it:** ${verify}

**Uncertainty:** ${open}

Source: [${safeLabel(item.title)}](${safeUrl(item.canonicalUrl || item.url)})`;
  }).join("\n\n");
}

function signalLevel(count) {
  if (count >= 3) return "high";
  return count === 2 ? "medium" : "low";
}

function issueFrontmatter({ locale, date, items, setHash, copySource, signalOverride, extra = [] }) {
  const da = locale === "da";
  const formattedDate = formatDate(date, da ? "da-DK" : "en-GB");
  const title = da ? `AI-nyheder, ${formattedDate}` : `AI News, ${formattedDate}`;
  const description = da
    ? `Kurateret AI-overblik for ${formattedDate}: modeller, produkter, ChatGPT, Claude, Gemini, API-priser, privacy og agent-workflows.`
    : `Curated AI brief for ${formattedDate}: models, products, ChatGPT, Claude, Gemini, API pricing, privacy, and agent workflows.`;
  const sourceUrls = items.map((item) => safeUrl(item.canonicalUrl || item.url));
  const providers = [...new Set(items.map(provider))].join(", ");
  const imageAlt = da
    ? `Redaktionelt AI-nyhedsbillede om ${providers}`
    : `Editorial AI news image about ${providers}`;
  return {
    formattedDate,
    frontmatter: [
      "---",
      `title: ${yamlString(title)}`,
      `description: ${yamlString(description)}`,
      `date: ${date}`,
      `lastUpdated: ${date}`,
      "heroImage:",
      `  src: ${yamlString(`/images/ai-news/${date}${HERO_EXT}`)}`,
      `  alt: ${yamlString(imageAlt)}`,
      `  caption: ${yamlString(imageAlt)}`,
      "news:",
      "  editorialVersion: 3",
      `  copySource: ${copySource}`,
      `  storyFingerprint: ${yamlString(storyFingerprint(items[0]))}`,
      `  sourceSetFingerprint: ${yamlString(setHash)}`,
      `  signal: ${signalOverride || signalLevel(items.length)}`,
      ...extra,
      "  sources:",
      ...sourceUrls.map((url) => `    - ${yamlString(url)}`),
      "sidebar:",
      `  label: ${yamlString(formattedDate)}`,
      "---",
    ].join("\n"),
  };
}

function sourceTable(items, locale) {
  const da = locale === "da";
  const rows = items.map((item) =>
    `| ${safeLabel(provider(item))} | [${safeLabel(item.title)}](${safeUrl(item.canonicalUrl || item.url)}) | ${formatSourceDate(item.published, da ? "da-DK" : "en-GB")} |`).join("\n");
  return da
    ? `| Udgiver | Kilde | Dato |\n| --- | --- | --- |\n${rows}`
    : `| Publisher | Source | Date |\n| --- | --- | --- |\n${rows}`;
}

export function renderIssue({ locale, date, editorialPackage, copy = null }) {
  if (editorialPackage?.status !== "publish" || !editorialPackage.items?.length) {
    throw new Error("renderIssue requires an accepted editorial package");
  }
  const items = editorialPackage.items;
  const da = locale === "da";
  const setHash = editorialPackage.sourceSetFingerprint || sourceSetFingerprint(items);
  const { formattedDate, frontmatter } = issueFrontmatter({
    locale,
    date,
    items,
    setHash,
    copySource: copy ? "llm" : "template",
  });
  const storiesHeading = da
    ? (items.length > 1 ? "Dagens historier" : "Hovedhistorien")
    : (items.length > 1 ? "Today's Stories" : "Lead Story");
  const ledeFallback = da
    ? "Dagens udgave prioriterer dokumenterede ændringer frem for volumen. Hver historie skelner mellem kildefakta, praktisk betydning, kontrolpunkt og usikkerhed."
    : "This issue prioritises documented change over volume. Each story separates source evidence, practical relevance, a verification point, and uncertainty.";
  const lede = typeof copy?.lede?.[locale] === "string" && copy.lede[locale].trim().length > 0
    ? safeText(copy.lede[locale])
    : ledeFallback;

  if (da) {
    return `${frontmatter}

import { Aside } from "@astrojs/starlight/components";

<p class="ai-news-byline">Af SmartBolig.net Redaktionen · <time datetime="${date}">${formattedDate}</time> · ${items.length} ${items.length === 1 ? "primær kilde" : "udvalgte kilder"}</p>

<p class="ai-news-lede">${lede}</p>

<Aside type="note" title="Redaktionel metode">
Kandidater er kontrolleret for nylige URL-, emne- og kildesætdubletter. Originalkilderne er stadig den autoritative reference.
</Aside>

## ${storiesHeading}

${renderStories(items, locale, copy)}

## Hvorfor det betyder noget

- Fokus er ændringer, der kan påvirke AI-produkter, modeller, browseroplevelser, agents, API-brug, privacy, priser eller sikkerhed.
- En ny funktion er først nyttig i hjemmet, når adgang, logning og rollback er afprøvet.
- Artiklen adskiller dokumenterede oplysninger fra redaktionel vurdering og åbne spørgsmål.

## Kilder og videre læsning

${sourceTable(items, locale)}

## Redaktionsnote

SmartBolig.net brugte automatiseret research, deduplikering og udkast til denne udgave. Redaktionelle regler kræver primær kilde, verificerbare links og tydelige usikkerheder.
`;
  }

  return `${frontmatter}

import { Aside } from "@astrojs/starlight/components";

<p class="ai-news-byline">By SmartBolig.net Editorial · <time datetime="${date}">${formattedDate}</time> · ${items.length} ${items.length === 1 ? "primary source" : "selected sources"}</p>

<p class="ai-news-lede">${lede}</p>

<Aside type="note" title="Editorial method">
Candidates are checked against recent URL, topic, and source-set duplicates. The original sources remain authoritative.
</Aside>

## ${storiesHeading}

${renderStories(items, locale, copy)}

## Why It Matters

- The focus is changes that can affect AI products, models, browser experiences, agents, API usage, privacy, pricing, or security.
- A new feature is useful in the home only after access, logging, and rollback have been tested.
- The article separates documented information from editorial judgment and open questions.

## Sources and Further Reading

${sourceTable(items, locale)}

## Editorial Note

SmartBolig.net used automated research, deduplication, and drafting for this issue. Editorial rules require a primary source, verifiable links, and explicit uncertainty.
`;
}

// Honest short issue for days where discovery found no sources beyond the
// previous issue's set. Replaces the old practice of republishing the previous
// day's body verbatim under a new date.
export function renderRepeatIssue({ locale, date, repeatOfDate, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("renderRepeatIssue requires the previous issue's items");
  }
  const da = locale === "da";
  const setHash = sourceSetFingerprint(items);
  const { formattedDate, frontmatter } = issueFrontmatter({
    locale,
    date,
    items,
    setHash,
    copySource: "repeat",
    signalOverride: "low",
    extra: [`  repeatOf: ${yamlString(repeatOfDate)}`],
  });
  const previousFormatted = formatDate(repeatOfDate, da ? "da-DK" : "en-GB");
  const previousHref = da ? `/da/ai/nyheder/${repeatOfDate}/` : `/en/ai/nyheder/${repeatOfDate}/`;

  if (da) {
    return `${frontmatter}

<p class="ai-news-byline">Af SmartBolig.net Redaktionen · <time datetime="${date}">${formattedDate}</time> · gentagelses-udgave</p>

<p class="ai-news-lede">Ingen nye kvalificerede kilder er kommet til siden udgaven ${previousFormatted}. I stedet for at genudgive de samme historier som nyheder samler denne side kildelisten og henviser til den fulde gennemgang.</p>

## Status for dagen

Overvågningen af de officielle kilder fandt ikke nye historier, der opfyldte de redaktionelle krav om primær kilde og nyhedsværdi. Den seneste fulde gennemgang er fortsat [udgaven ${previousFormatted}](${previousHref}).

## Kilder fra seneste udgave

${sourceTable(items, locale)}

Kilde: Se den fulde gennemgang i [AI-nyheder, ${previousFormatted}](${previousHref}).
`;
  }

  return `${frontmatter}

<p class="ai-news-byline">By SmartBolig.net Editorial · <time datetime="${date}">${formattedDate}</time> · repeat digest</p>

<p class="ai-news-lede">No new qualified sources have appeared since the ${previousFormatted} issue. Rather than republishing the same stories as news, this page collects the source list and points to the full review.</p>

## Status for the Day

Monitoring of the official sources found no new stories that met the editorial requirements for a primary source and news value. The most recent full review remains the [${previousFormatted} issue](${previousHref}).

## Sources From the Latest Issue

${sourceTable(items, locale)}

Source: See the full review in [AI News, ${previousFormatted}](${previousHref}).
`;
}
