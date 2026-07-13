import assert from "node:assert/strict";
import test from "node:test";

import { isOfficialUrl } from "./lib/ai-news-official.mjs";

// Regression for security review M-3
// (docs/verification/2026-07-13-security-review.md): the previous check used
// substring matching, so any URL merely CONTAINING an official domain counted
// as official.

test("isOfficialUrl accepts the real official hosts and GitHub repos", () => {
  assert.ok(isOfficialUrl("https://openai.com/index/some-story"));
  assert.ok(isOfficialUrl("https://platform.openai.com/docs/changelog"));
  assert.ok(isOfficialUrl("https://www.anthropic.com/news/some-story"));
  assert.ok(isOfficialUrl("https://code.claude.com/docs/en/changelog"));
  assert.ok(isOfficialUrl("https://blog.google/technology/ai/some-story/"));
  assert.ok(isOfficialUrl("https://ai.google.dev/gemini-api/docs/changelog"));
  assert.ok(isOfficialUrl("https://github.com/anthropics/claude-code/releases/tag/v2.0.0"));
  assert.ok(isOfficialUrl("https://github.com/openai/codex/releases"));
  assert.ok(isOfficialUrl("https://github.com/google-gemini/gemini-cli/releases.atom"));
  assert.ok(isOfficialUrl("https://github.com/openclaw/openclaw/releases"));
});

test("isOfficialUrl rejects lookalike and embedded-domain urls", () => {
  assert.equal(isOfficialUrl("https://openai.com.attacker.example/"), false);
  assert.equal(isOfficialUrl("https://attacker.example/openai.com"), false);
  assert.equal(isOfficialUrl("https://attacker.example/?ref=anthropic.com"), false);
  assert.equal(isOfficialUrl("https://github.com/attacker/claude-code"), false);
  assert.equal(isOfficialUrl("https://github.com/anthropics-evil/claude-code"), false);
  assert.equal(isOfficialUrl("https://github.com"), false);
  assert.equal(isOfficialUrl("http://openai.com/downgraded-to-http"), false);
  assert.equal(isOfficialUrl("javascript:alert(1)"), false);
  assert.equal(isOfficialUrl(""), false);
  assert.equal(isOfficialUrl(null), false);
});
