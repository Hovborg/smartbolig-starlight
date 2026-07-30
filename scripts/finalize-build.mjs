import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { appendFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  contentRelativePathToUrl,
  extractFrontmatterLastmod,
  gitLastmodLogArgs,
  parseGitLastmodLog,
} from "./lib/content-lastmod.mjs";
import { addLastmod } from "./lib/sitemap-lastmod.mjs";

const execFileAsync = promisify(execFile);
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

// Enrich the Starlight-generated sitemap with truthful <lastmod> dates.
// Editorial frontmatter wins; otherwise use the latest content-file commit.
// Never use the build date because it does not describe a page modification.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "src/content/docs");
const sitemapPath = path.join(rootDir, "dist/sitemap-0.xml");

async function collectLastmodMap() {
  const { stdout: gitLog } = await execFileAsync("git", gitLastmodLogArgs, {
    cwd: rootDir,
    maxBuffer: 16 * 1024 * 1024,
  });
  const gitDates = parseGitLastmodLog(gitLog);
  const map = new Map();
  const missing = [];
  const entries = await readdir(docsDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
    const filePath = path.join(entry.parentPath ?? entry.path, entry.name);
    const relative = path.relative(docsDir, filePath).replace(/\\/g, "/");
    const repositoryPath = `src/content/docs/${relative}`;
    const url = contentRelativePathToUrl(relative);
    const source = await readFile(filePath, "utf8");
    const date = extractFrontmatterLastmod(source) || gitDates.get(repositoryPath);
    if (date) map.set(url, date);
    else missing.push(repositoryPath);
  }

  if (missing.length > 0) {
    throw new Error(
      `Could not resolve truthful lastmod dates for ${missing.length} content file(s). `
      + `Ensure the checkout has full git history. First missing file: ${missing[0]}`,
    );
  }

  return map;
}

const lastmodMap = await collectLastmodMap();
const sitemapXml = await readFile(sitemapPath, "utf8");
const enriched = addLastmod(sitemapXml, (loc) => lastmodMap.get(loc));
await writeFile(sitemapPath, enriched);
const count = (enriched.match(/<lastmod>/g) || []).length;
console.log(`Sitemap enriched with truthful lastmod for ${count} of ${lastmodMap.size} page(s).`);
