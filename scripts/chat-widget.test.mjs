import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FALLBACK_MODEL_TIMEOUT_MS,
  MAX_MODEL_RUNS,
  PRIMARY_MODEL_TIMEOUT_MS,
  SEARCH_TIMEOUT_MS,
} from "../functions/api/chat.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("custom footer mounts one global SmartBolig assistant", async () => {
  const footer = await read("src/components/Footer.astro");
  assert.match(footer, /import SmartBoligAssistant from ['"]\.\/SmartBoligAssistant\.astro['"]/);
  assert.equal((footer.match(/<SmartBoligAssistant\b/g) || []).length, 1);
  assert.match(footer, /<SmartBoligAssistant\s+locale=\{locale\}/);
});

test("assistant has a localized accessible dialog and smart-domain starter prompts", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-labelledby="smartbolig-ai-title"/);
  assert.match(source, /aria-describedby="smartbolig-ai-description"/);
  assert.match(source, /aria-expanded="false"/);
  assert.match(source, /aria-controls="smartbolig-ai-panel"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /data-chat-close/);
  assert.match(source, /data-chat-reset/);

  for (const copy of [
    "Spørg SmartBolig AI",
    "Ask SmartBolig AI",
    "Officielle kilder kontrolleret",
    "Official sources checked",
    "Home Assistant",
    "ESPHome",
    "sensor",
    "homelab",
    "Adgangskoder",
    "Passwords",
  ]) {
    assert.match(source, new RegExp(copy, "i"), `missing localized/domain copy: ${copy}`);
  }
  assert.doesNotMatch(source, /Officielle HA-kilder kontrolleret|Official HA sources checked/);

  const promptButtons = source.match(/data-chat-prompt/g) || [];
  assert.ok(promptButtons.length >= 4, "assistant must expose at least four starter prompts");
});

test("assistant uses same-origin bounded session-only chat without unsafe HTML sinks", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /fetch\(["']\/api\/chat["']/);
  assert.match(source, /sessionStorage/);
  assert.match(source, /MAX_HISTORY_MESSAGES\s*=\s*10/);
  assert.match(source, /textContent\s*=/);
  assert.match(source, /createTextNode/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.doesNotMatch(source, /insertAdjacentHTML/);
  assert.doesNotMatch(source, /document\.write/);
  assert.doesNotMatch(source, /localStorage/);
});

test("assistant bounds persisted and outbound context without shortening the current rendered answer", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /history\.slice\(-MAX_HISTORY_MESSAGES\)\.map\(normalizeStoredMessage\)\.filter\(Boolean\)/);
  assert.match(source, /const MAX_HISTORY_CHARS\s*=\s*8_000/);
  assert.match(source, /function createRequestMessages\(\)/);
  assert.match(source, /requestMessages\.length\s*<\s*MAX_HISTORY_MESSAGES/);
  assert.match(source, /Math\.min\(MAX_MESSAGE_CHARS,\s*remainingChars\)/);
  assert.match(source, /requestMessages\[0\]\?\.role\s*!==\s*["']user["']/);
  assert.match(source, /messages:\s*createRequestMessages\(\)/);
  assert.match(source, /result\.answer\.trim\(\)\.slice\(0,\s*12_000\)/);
});

test("assistant safely formats model Markdown without an HTML sink", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /function createSafeRichText\(content\)/);
  assert.match(source, /function appendInlineFormatting\(element,\s*content\)/);
  assert.match(source, /document\.createElement\(["']strong["']\)/);
  assert.match(source, /document\.createElement\(["']code["']\)/);
  assert.match(source, /document\.createElement\(["'](?:ul|ol)["']\)/);
  assert.match(source, /bubble\.append\(createSafeRichText\(message\.content\)\)/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});

test("assistant renders fenced technical code with a DOM-only copyable console", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /function createSafeCodeBlock\(code,\s*language\)/);
  assert.match(source, /document\.createElement\(["']pre["']\)/);
  assert.match(source, /document\.createElement\(["']code["']\)/);
  assert.match(source, /safeLanguagePattern/);
  assert.match(source, /codeElement\.textContent\s*=\s*code/);
  assert.match(source, /fenceMatch/);
  assert.match(source, /Kopiér kode/);
  assert.match(source, /Copy code/);
  assert.match(source, /smartbolig-ai__code-shell/);
  assert.match(source, /smartbolig-ai__code-head/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.doesNotMatch(source, /insertAdjacentHTML/);
});

test("assistant shows allowlisted bilingual model, route, edge, trace and source diagnostics", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  for (const copy of [
    "MODEL",
    "RUTE",
    "ROUTE",
    "EDGE",
    "SPOR",
    "TRACE",
    "KILDER",
    "SOURCES",
    "PRIMÆR",
    "PRIMARY",
    "FALLBACK",
  ]) {
    assert.match(source, new RegExp(copy), `missing localized diagnostic copy: ${copy}`);
  }

  assert.match(source, /function normalizeDiagnostics\(diagnostics\)/);
  assert.match(source, /ALLOWED_DIAGNOSTIC_MODELS/);
  assert.match(source, /ALLOWED_DIAGNOSTIC_ROUTES/);
  assert.match(source, /qwen3-30b-a3b-fp8/);
  assert.match(source, /QWEN 3 · 30B A3B/);
  assert.doesNotMatch(source, /llama-3\.1-8b-instruct-fast/);
  assert.match(source, /smartbolig-ai__diagnostics/);
  assert.match(source, /data-diagnostic-route/);
  assert.match(source, /message\.diagnostics/);
  assert.match(source, /result\.diagnostics/);
  assert.match(source, /Math\.min\(150_000/);
  assert.match(source, /trace\.slice\(0,\s*64\)/);
  assert.match(source, /overflow-x:\s*auto/);
});

test("assistant keeps four visible bilingual expert work modes beside the composer", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  for (const copy of [
    "ARBEJDSPROFIL",
    "WORK MODE",
    "Fejlsøg",
    "Debug",
    "Byg",
    "Build",
    "Forklar",
    "Explain",
    "Sammenlign",
    "Compare",
    "sikre trin, verifikation og rollback",
    "safe steps, verification and rollback",
    "Prompten blev afkortet",
    "The prompt was shortened",
  ]) {
    assert.match(source, new RegExp(copy, "i"), `missing localized work-mode copy: ${copy}`);
  }

  const modeButtons = source.match(/<button[^>]*data-chat-mode/g) || [];
  assert.equal(modeButtons.length, 4, "assistant must expose exactly four persistent work modes");
  assert.match(source, /data-chat-modes/);
  assert.match(source, /data-template=/);
  assert.match(source, /aria-pressed="false"/);
  assert.match(source, /button\.dataset\.template/);
  assert.match(source, /input\.value\s*=/);
  assert.match(source, /input\.dispatchEvent\(new Event\(["']input["']\)\)/);
  assert.match(source, /MAX_MESSAGE_CHARS\s*-\s*template\.length/);
  assert.match(source, /remainder\.slice\(0,\s*availableChars\)/);
  assert.match(source, /activeModeTemplate\s*&&\s*!input\.value\.startsWith\(activeModeTemplate\)/);
});

test("assistant shows an honest elapsed edge request console and clears its timer", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /EDGE-FORESPØRGSEL AKTIV/);
  assert.match(source, /EDGE REQUEST ACTIVE/);
  assert.match(source, /WORKER · CONTEXT · MODEL/);
  assert.match(source, /data-chat-elapsed/);
  assert.match(source, /performance\.now\(\)/);
  assert.match(source, /setInterval\(/);
  assert.match(source, /function stopLoadingTimer\(\)/);
  assert.match(source, /clearInterval\(loadingTimer\)/);
  assert.match(source, /renderLoading\(\)[\s\S]*return article/);
  assert.match(source, /elapsed\.setAttribute\(["']aria-hidden["'],\s*["']true["']\)/);
  assert.match(source, /elapsed\.dataset\.chatElapsed\s*=/);
  assert.match(source, /function closeAssistant\(\)\s*\{\s*stopLoadingTimer\(\)/);
  assert.match(source, /function resetConversation\(\)[\s\S]{0,160}stopLoadingTimer\(\)/);
  assert.match(
    source,
    /if \(abortController === requestController\) \{\s*stopLoadingTimer\(\)/,
    "a stale request must not stop the timer owned by a newer request",
  );
});

test("assistant renders copy controls and revalidates canonical SmartBolig and official sources", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /const SAFE_SOURCE_HOSTS\s*=\s*new Set/);
  for (const hostname of ["smartbolig.net", "www.home-assistant.io", "esphome.io"]) {
    assert.match(source, new RegExp(hostname.replaceAll(".", "\\.")));
  }
  assert.match(source, /SAFE_SOURCE_HOSTS\.has\(sourceUrl\.hostname\)/);
  assert.match(source, /sourceUrl\.protocol\s*!==\s*["']https:["']/);
  assert.match(source, /sourceUrl\.port/);
  assert.match(source, /sourceUrl\.username/);
  assert.match(source, /sourceUrl\.password/);
  assert.match(source, /sourceLink\.rel\s*=\s*["']noopener noreferrer["']/);
  assert.match(source, /sourceLink\.target\s*=\s*["']_blank["']/);
  assert.match(source, /sourceLink\.dataset\.sourceType/);
  assert.match(source, /data-source-mode/);
  assert.match(source, /data-label-official/);
  assert.match(source, /message\.sourceMode\s*===\s*["']official["']/);
  assert.match(source, /root\.dataset\.labelOfficial/);
  assert.match(source, /sources:\s*["']Sources["']/);
  assert.match(source, /sources:\s*["']Kilder["']/);
});

test("assistant handles loading, server failures, Escape and focus restoration", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /AbortController/);
  assert.match(source, /statusCode\s*===\s*429/);
  assert.match(source, /statusCode\s*===\s*503/);
  assert.match(source, /const failureMessage\s*=\s*messageForFailure/);
  assert.match(source, /renderError\(failureMessage\)/);
  assert.match(source, /setStatus\(failureMessage\)/);
  assert.match(source, /let requestSequence\s*=\s*0/);
  assert.match(source, /const requestId\s*=\s*\+\+requestSequence/);
  assert.match(source, /const requestController\s*=\s*new AbortController\(\)/);
  const requestTimeoutMatch = source.match(/const REQUEST_TIMEOUT_MS\s*=\s*([\d_]+)/);
  assert.ok(requestTimeoutMatch, "widget request timeout must stay explicit");
  const requestTimeoutMs = Number(requestTimeoutMatch[1].replaceAll("_", ""));
  const modelRunBudgetMs = PRIMARY_MODEL_TIMEOUT_MS + FALLBACK_MODEL_TIMEOUT_MS;
  const maximumServerPathMs = modelRunBudgetMs * MAX_MODEL_RUNS + SEARCH_TIMEOUT_MS;
  assert.equal(requestTimeoutMs, 150_000);
  assert.ok(
    requestTimeoutMs >= maximumServerPathMs + 10_000,
    "browser timeout must cover search, every allowed model run and network overhead",
  );
  assert.match(source, /requestId\s*!==\s*requestSequence/);
  assert.match(source, /abortController\s*===\s*requestController/);
  assert.match(source, /event\.key\s*===\s*["']Escape["']/);
  assert.match(source, /launcher\.focus\(\)/);
  assert.match(source, /input\.focus\(\)/);
  assert.match(source, /aria-busy/);
});

test("assistant is a fixed premium panel, a mobile bottom sheet and motion-safe", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /position:\s*fixed/);
  assert.match(source, /backdrop-filter:\s*blur/);
  assert.match(source, /linear-gradient/);
  assert.match(source, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(source, /<style\s+is:global>/);
  assert.match(source, /@media\s*\(max-width:\s*640px\)/);
  assert.match(source, /inset-inline:\s*0/);
  assert.match(source, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(source, /\[data-theme=['"]light['"]\]\s+\.smartbolig-ai/);
});

test("assistant presents a semantic smart-home intelligence console", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /data-chat-system-status/);
  assert.match(source, /EDGE AI/);
  assert.match(source, /smartbolig-ai__core-visual/);
  assert.match(source, /smartbolig-ai__core-ring/);
  assert.match(source, /smartbolig-ai__capability-grid/);
  assert.match(source, /smartbolig-ai__prompt-icon/);
  assert.match(source, /smartbolig-ai__command-prompt/);

  for (const token of ["--ai-surface", "--ai-signal", "--ai-grid"]) {
    assert.match(source, new RegExp(token), `missing semantic console token: ${token}`);
  }

  assert.match(source, /\.smartbolig-ai__prompts\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(source, /\.smartbolig-ai__panel::after/);
  assert.match(source, /radial-gradient/);
});

test("Cloudflare bindings and bilingual privacy copy stay coupled to the assistant", async () => {
  const [wranglerSource, daPrivacy, enPrivacy, readme] = await Promise.all([
    read("wrangler.jsonc"),
    read("src/content/docs/da/juridisk/privatlivspolitik.mdx"),
    read("src/content/docs/en/juridisk/privatlivspolitik.mdx"),
    read("README.md"),
  ]);
  const wrangler = JSON.parse(wranglerSource);

  assert.ok(wrangler.compatibility_date >= "2026-03-27");
  assert.ok(
    wrangler.compatibility_date <= new Date().toISOString().slice(0, 10),
    "Cloudflare compatibility_date must not be in the future in UTC",
  );
  assert.equal(
    wrangler.compatibility_date,
    "2026-04-16",
    "compatibility_date must stay within the runtime bundled by pinned Wrangler 4.81.1",
  );
  assert.equal(wrangler.ai.binding, "AI");
  assert.deepEqual(wrangler.ai_search, [
    {
      binding: "SMARTBOLIG_SEARCH",
      instance_name: "smartbolig-ai-search",
      remote: true,
    },
  ]);
  assert.deepEqual(wrangler.ratelimits, [
    {
      name: "CHAT_RATE_LIMITER",
      namespace_id: "2026073101",
      simple: { limit: 12, period: 60 },
    },
  ]);

  for (const policy of [daPrivacy, enPrivacy]) {
    assert.match(policy, /Workers AI/);
    assert.match(policy, /AI Search/);
    assert.match(policy, /sessionStorage/);
    assert.match(policy, /10/);
    assert.match(policy, /password|adgangskod/i);
  }
  assert.match(readme, /AI Search er ikke assistentens eneste viden/);
  assert.match(readme, /@cf\/google\/gemma-4-26b-a4b-it/);
});
