// The Content-Security-Policy without 'unsafe-inline' for scripts.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inlineScriptHashes, MAX_HEADER_LINE, strictPolicy, withStrictPolicy } from "./lib/csp-inline.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const hashOf = (code) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`;
const POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline' https://example.com; style-src 'self' 'unsafe-inline';";

test("every script written into a page gets a hash, data blocks and files do not", () => {
  const html = `
    <script>one()</script>
    <script type="module">two()</script>
    <SCRIPT>three()</SCRIPT >
    <script type="application/ld+json">{"@type":"Thing"}</script>
    <script type="application/json" id="data">{}</script>
    <script src="/_astro/file.js"></script>
    <script type="module" src="/_astro/other.js"></script>
    <script>one()</script>`;
  assert.deepEqual([...inlineScriptHashes(html)].sort(), [hashOf("one()"), hashOf("two()"), hashOf("three()")].sort());
});

test("the hashes replace 'unsafe-inline' for scripts only", () => {
  const strict = strictPolicy(POLICY, ["'sha256-a'", "'sha256-b'"]);
  assert.equal(strict, "default-src 'self'; script-src 'self' 'sha256-a' 'sha256-b' https://example.com; style-src 'self' 'unsafe-inline';");
  assert.equal(strictPolicy(POLICY, []), "default-src 'self'; script-src 'self' https://example.com; style-src 'self' 'unsafe-inline';");
  assert.throws(() => strictPolicy("default-src 'self'; style-src 'unsafe-inline';", []), /script-src/);
  assert.throws(() => strictPolicy("script-src 'self';", []), /unsafe-inline/);
});

test("the strict policy is reported next to the current one, or replaces it", () => {
  const headers = `/*\n  X-Frame-Options: SAMEORIGIN\n  Content-Security-Policy: ${POLICY}\n`;
  const reported = withStrictPolicy(headers, ["'sha256-a'"], { enforce: false });
  assert.ok(reported.includes(`  Content-Security-Policy: ${POLICY}\n  Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'sha256-a' https://example.com;`));

  const enforced = withStrictPolicy(headers, ["'sha256-a'"], { enforce: true });
  assert.doesNotMatch(enforced, /unsafe-inline' https|Report-Only/);
  assert.match(enforced, /^  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-a' https:\/\/example\.com;/m);
});

test("a policy line Cloudflare would ignore stops the build", () => {
  const headers = `/*\n  Content-Security-Policy: ${POLICY}\n`;
  const many = Array.from({ length: 40 }, (_, index) => hashOf(String(index)));
  assert.throws(() => withStrictPolicy(headers, many, { enforce: false }), new RegExp(`Cloudflare allows ${MAX_HEADER_LINE}`));
  assert.throws(() => withStrictPolicy("/*\n  X-Frame-Options: DENY\n", [], { enforce: false }), /missing/);
});

test("the site's policy has room for the hashes and no retired hosts", async () => {
  const [headers, vite, finalize] = await Promise.all([read("public/_headers"), read("config/vite.mjs"), read("scripts/finalize-build.mjs")]);
  const line = headers.split("\n").find((entry) => entry.trim().startsWith("Content-Security-Policy:"));
  assert.ok(line.length + 10 * 53 < MAX_HEADER_LINE, "room for ten inline script hashes");
  assert.doesNotMatch(headers, /ezoic/);
  assert.match(headers, /script-src-attr 'none'/);
  assert.match(vite, /assetsInlineLimit/, "small scripts stay files, so they need no hash");
  assert.match(finalize, /withStrictPolicy\(/);
});
