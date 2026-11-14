// The Content-Security-Policy without 'unsafe-inline' for scripts: every
// script written straight into a page gets its hash in the policy instead.
// Run after the build (finalize-build.mjs). docs/sikkerhed.md.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Cloudflare ignores a _headers line longer than this.
export const MAX_HEADER_LINE = 2000;
// Not code: the browser never runs these, so the policy does not cover them.
const DATA_TYPES = new Set(["application/ld+json", "application/json"]);

/** The hashes of the inline scripts in one page, as the policy writes them. */
export function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const [, attributes, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/.test(attributes)) continue;
    const type = attributes.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
    if (type && DATA_TYPES.has(type)) continue;
    hashes.add(`'sha256-${createHash("sha256").update(code).digest("base64")}'`);
  }
  return hashes;
}

/** Every inline script hash in the built site, sorted. */
export async function collectInlineScriptHashes(distDir) {
  const hashes = new Set();
  for (const entry of await readdir(distDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const html = await readFile(path.join(entry.parentPath ?? entry.path, entry.name), "utf8");
    for (const hash of inlineScriptHashes(html)) hashes.add(hash);
  }
  return [...hashes].sort();
}

/** The policy with the hashes in place of 'unsafe-inline' in script-src. */
export function strictPolicy(policy, hashes) {
  const directives = policy.split(";").map((directive) => directive.trim()).filter(Boolean);
  const index = directives.findIndex((directive) => directive.startsWith("script-src "));
  if (index === -1 || !directives[index].includes(" 'unsafe-inline'")) {
    throw new Error("script-src with 'unsafe-inline' is missing from the Content-Security-Policy in public/_headers");
  }
  directives[index] = directives[index].replace(" 'unsafe-inline'", hashes.length ? ` ${hashes.join(" ")}` : "");
  return `${directives.join("; ")};`;
}

/**
 * The built _headers file with the strict policy added.
 * enforce false: the strict policy is only reported (Report-Only) and the
 * policy from public/_headers still decides. enforce true: it replaces it.
 */
export function withStrictPolicy(headers, hashes, { enforce }) {
  const line = headers.match(/^([ \t]*)Content-Security-Policy:[ \t]*(.+)$/m);
  if (!line) throw new Error("Content-Security-Policy is missing from _headers");
  const [whole, indent, policy] = line;
  const strict = strictPolicy(policy, hashes);
  const name = enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
  const added = `${indent}${name}: ${strict}`;
  if (added.length > MAX_HEADER_LINE) {
    throw new Error(`The strict Content-Security-Policy line is ${added.length} characters; Cloudflare allows ${MAX_HEADER_LINE}. Fewer inline scripts or fewer hosts are needed.`);
  }
  return headers.replace(whole, enforce ? added : `${whole}\n${added}`);
}
