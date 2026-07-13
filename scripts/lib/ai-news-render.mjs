import { sourceSetFingerprint, storyFingerprint } from "./ai-news-editorial.mjs";

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

function safeText(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .trim();
}

function safeLabel(value) {
  return safeText(value).replace(/[\[\]|`#]/g, " ").replace(/\s+/g, " ").trim();
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
  const words = text.split(" ").filter(Boolean).slice(0, 22);
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

function renderStories(items, locale) {
  const da = locale === "da";
  return items.map((item, index) => {
    const excerpt = sourceExcerpt(item);
    const published = formatSourceDate(item.published, da ? "da-DK" : "en-GB");
    if (da) {
      return `### ${index + 1}. ${safeLabel(provider(item))}: ${safeLabel(item.title)}

**Hvad ændrede sig:** ${safeLabel(provider(item))} offentliggjorde opdateringen ${published}. ${safeText(item.summary || "Den officielle side beskriver ændringen og dens aktuelle omfang.")}

${excerpt ? `> Kort kildeuddrag: ${excerpt}\n` : ""}
**Hvorfor det er relevant:** ${relevance(item, locale)}

**Sådan verificerer du det:** ${verification(item, locale)}

**Usikkerhed:** ${uncertainty(item, locale)}

[Læs den officielle kilde: ${safeLabel(item.title)}](${safeUrl(item.canonicalUrl || item.url)})`;
    }
    return `### ${index + 1}. ${safeLabel(provider(item))}: ${safeLabel(item.title)}

**What changed:** ${safeLabel(provider(item))} published the update on ${published}. ${safeText(item.summary || "The official page describes the change and its current scope.")}

${excerpt ? `> Short source excerpt: ${excerpt}\n` : ""}
**Why it matters:** ${relevance(item, locale)}

**How to verify it:** ${verification(item, locale)}

**Uncertainty:** ${uncertainty(item, locale)}

[Read the official source: ${safeLabel(item.title)}](${safeUrl(item.canonicalUrl || item.url)})`;
  }).join("\n\n");
}

export function renderIssue({ locale, date, editorialPackage }) {
  if (editorialPackage?.status !== "publish" || !editorialPackage.items?.length) {
    throw new Error("renderIssue requires an accepted editorial package");
  }
  const items = editorialPackage.items;
  const da = locale === "da";
  const formattedDate = formatDate(date, da ? "da-DK" : "en-GB");
  const title = da ? `AI-nyheder, ${formattedDate}` : `AI News, ${formattedDate}`;
  const description = da
    ? `Kurateret AI-overblik for ${formattedDate}: modeller, produkter, ChatGPT, Claude, Gemini, API-priser, privacy og agent-workflows.`
    : `Curated AI brief for ${formattedDate}: models, products, ChatGPT, Claude, Gemini, API pricing, privacy, and agent workflows.`;
  const sourceUrls = items.map((item) => safeUrl(item.canonicalUrl || item.url));
  const storyHash = storyFingerprint(items[0]);
  const setHash = editorialPackage.sourceSetFingerprint || sourceSetFingerprint(items);
  const providers = [...new Set(items.map(provider))].join(", ");
  const imageAlt = da
    ? `Redaktionelt AI-nyhedsbillede om ${providers}`
    : `Editorial AI news image about ${providers}`;
  const sourceRows = items.map((item) =>
    `| ${safeLabel(provider(item))} | [${safeLabel(item.title)}](${safeUrl(item.canonicalUrl || item.url)}) | ${formatSourceDate(item.published, da ? "da-DK" : "en-GB")} |`).join("\n");
  const frontmatter = [
    "---",
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `date: ${date}`,
    `lastUpdated: ${date}`,
    "heroImage:",
    `  src: ${yamlString(`/images/ai-news/${date}.png`)}`,
    `  alt: ${yamlString(imageAlt)}`,
    `  caption: ${yamlString(imageAlt)}`,
    "news:",
    "  editorialVersion: 2",
    `  storyFingerprint: ${yamlString(storyHash)}`,
    `  sourceSetFingerprint: ${yamlString(setHash)}`,
    `  signal: ${items.length >= 3 ? "high" : "medium"}`,
    "  sources:",
    ...sourceUrls.map((url) => `    - ${yamlString(url)}`),
    "sidebar:",
    `  label: ${yamlString(formattedDate)}`,
    "---",
  ].join("\n");

  if (da) {
    return `${frontmatter}

import { Aside } from "@astrojs/starlight/components";

<p class="ai-news-byline">Af SmartBolig.net Redaktionen · <time datetime="${date}">${formattedDate}</time> · ${items.length} ${items.length === 1 ? "primær kilde" : "udvalgte kilder"}</p>

<p class="ai-news-lede">Dagens udgave prioriterer dokumenterede ændringer frem for volumen. Hver historie skelner mellem kildefakta, praktisk betydning, kontrolpunkt og usikkerhed.</p>

<Aside type="note" title="Redaktionel metode">
Kandidater er kontrolleret for nylige URL-, emne- og kildesætdubletter. Originalkilderne er stadig den autoritative reference.
</Aside>

## Hovedhistorien

${renderStories(items, locale)}

## Hvorfor det betyder noget

- Fokus er ændringer, der kan påvirke AI-produkter, modeller, browseroplevelser, agents, API-brug, privacy, priser eller sikkerhed.
- En ny funktion er først nyttig i hjemmet, når adgang, logning og rollback er afprøvet.
- Artiklen adskiller dokumenterede oplysninger fra redaktionel vurdering og åbne spørgsmål.

## Kilder og videre læsning

| Udgiver | Kilde | Dato |
| --- | --- | --- |
${sourceRows}

## Redaktionsnote

SmartBolig.net brugte automatiseret research og deduplikering til kildeudvælgelsen. Redaktionelle regler kræver primær kilde, verificerbare links og tydelige usikkerheder.
`;
  }

  return `${frontmatter}

import { Aside } from "@astrojs/starlight/components";

<p class="ai-news-byline">By SmartBolig.net Editorial · <time datetime="${date}">${formattedDate}</time> · ${items.length} ${items.length === 1 ? "primary source" : "selected sources"}</p>

<p class="ai-news-lede">This issue prioritises documented change over volume. Each story separates source evidence, practical relevance, a verification point, and uncertainty.</p>

<Aside type="note" title="Editorial method">
Candidates are checked against recent URL, topic, and source-set duplicates. The original sources remain authoritative.
</Aside>

## Lead Story

${renderStories(items, locale)}

## Why It Matters

- The focus is changes that can affect AI products, models, browser experiences, agents, API usage, privacy, pricing, or security.
- A new feature is useful in the home only after access, logging, and rollback have been tested.
- The article separates documented information from editorial judgment and open questions.

## Sources and Further Reading

| Publisher | Source | Date |
| --- | --- | --- |
${sourceRows}

## Editorial Note

SmartBolig.net used automated research and deduplication for source selection. Editorial rules require a primary source, verifiable links, and explicit uncertainty.
`;
}
