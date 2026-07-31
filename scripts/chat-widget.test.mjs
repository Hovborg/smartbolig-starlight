import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
    "Home Assistant",
    "ESPHome",
    "sensor",
    "homelab",
    "Adgangskoder",
    "Passwords",
  ]) {
    assert.match(source, new RegExp(copy, "i"), `missing localized/domain copy: ${copy}`);
  }

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

test("assistant renders copy controls and revalidates canonical SmartBolig sources", async () => {
  const source = await read("src/components/SmartBoligAssistant.astro");

  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /sourceUrl\.hostname\s*!==\s*["']smartbolig\.net["']/);
  assert.match(source, /sourceUrl\.protocol\s*!==\s*["']https:["']/);
  assert.match(source, /sourceLink\.rel\s*=\s*["']noopener noreferrer["']/);
  assert.match(source, /sourceLink\.target\s*=\s*["']_blank["']/);
  assert.match(source, /data-source-mode/);
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
