import { createHash } from "node:crypto";
import { appendFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addLastmod } from "./lib/sitemap-lastmod.mjs";

const workerPath = new URL("../dist/pagefind/pagefind-worker.js", import.meta.url);
const headersPath = new URL("../public/_headers", import.meta.url);
const [worker, headers] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(headersPath, "utf8"),
]);
const csp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];

if (!csp) throw new Error("Content-Security-Policy is missing from public/_headers");

const fingerprint = createHash("sha256").update(csp).digest("hex").slice(0, 16);
const marker = `// SmartBolig CSP fingerprint: ${fingerprint}.\n`;

if (!worker.endsWith(marker)) {
  await appendFile(workerPath, `\n${marker}`);
}

console.log("Finalized Pagefind worker cache policy.");

// Enrich the Starlight-generated sitemap with <lastmod> from content
// frontmatter (lastUpdated preferred, else date). Pages without a date keep
// their entry without lastmod — a truthful partial signal beats a fake one.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "src/content/docs");
const sitemapPath = path.join(rootDir, "dist/sitemap-0.xml");

async function collectLastmodMap() {
  const map = new Map();
  const entries = await readdir(docsDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
    const filePath = path.join(entry.parentPath ?? entry.path, entry.name);
    const relative = path.relative(docsDir, filePath).replace(/\\/g, "/");
    const slug = relative.replace(/\.mdx$/, "").replace(/\/index$/, "").replace(/^index$/, "");
    const url = `https://smartbolig.net/${slug}${slug ? "/" : ""}`;
    const source = await readFile(filePath, "utf8");
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const date = frontmatter.match(/^lastUpdated:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$/m)?.[1]
      || frontmatter.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$/m)?.[1];
    if (date) map.set(url, date);
  }
  return map;
}

const lastmodMap = await collectLastmodMap();
const sitemapXml = await readFile(sitemapPath, "utf8");
const enriched = addLastmod(sitemapXml, (loc) => lastmodMap.get(loc));
await writeFile(sitemapPath, enriched);
const count = (enriched.match(/<lastmod>/g) || []).length;
console.log(`Sitemap enriched with lastmod for ${count} of ${lastmodMap.size} dated page(s).`);
