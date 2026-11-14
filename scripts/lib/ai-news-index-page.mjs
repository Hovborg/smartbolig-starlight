// Renders the news index page for one locale. Only `lastUpdated` changes from
// day to day; the feed itself is built by the AiNewsFeed component.
const COPY = {
  da: {
    title: "AI-nyheder",
    label: "AI-nyheder",
    description: "Dagligt kildebaseret overblik over de vigtigste AI-nyheder fra OpenAI, Anthropic, Google, modeller, produkter, API-priser, privacy og AI-agent workflows.",
    intro: "AI-nyheder fra SmartBolig.net er korte, redaktionelle artikler om de vigtigste AI-nyheder: modeller, ChatGPT, Claude, Gemini, AI i browseren, apps, API-priser, privacy, sikkerhed og agent-workflows. Fokus er officielle kilder, praktisk betydning og egne formuleringer.",
  },
  en: {
    title: "AI News",
    label: "AI News",
    description: "Daily source-backed brief for the most important AI news from OpenAI, Anthropic, Google, models, products, API pricing, privacy, and AI-agent workflows.",
    intro: "SmartBolig.net AI News is a set of short editorial articles about the most important AI news: models, ChatGPT, Claude, Gemini, AI in the browser, apps, API pricing, privacy, security, and agent workflows. The focus is official sources, practical impact, and original wording.",
  },
};

const yamlString = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export function renderIndex({ locale, latestDate }) {
  const copy = COPY[locale];
  return `---
title: ${yamlString(copy.title)}
description: ${yamlString(copy.description)}
lastUpdated: ${latestDate || new Date().toISOString().slice(0, 10)}
sidebar:
  label: ${yamlString(copy.label)}
---

import AiNewsFeed from "../../../../../components/AiNewsFeed.astro";

${copy.intro}

<AiNewsFeed locale="${locale}" />
`;
}
