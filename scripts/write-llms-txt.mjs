// Writes dist/llms.txt from the built pages (part of npm run build, after
// finalize-build.mjs has made the sitemap final).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readBuiltPages } from "./lib/llms-pages.mjs";
import { buildLlmsTxt } from "./lib/llms-txt.mjs";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const pages = await readBuiltPages(dist);
const text = buildLlmsTxt(pages);
await mkdir(dist, { recursive: true });
await writeFile(path.join(dist, "llms.txt"), text);
const links = (text.match(/^- \[/gm) ?? []).length;
console.log(`llms.txt: ${links} links from ${pages.length} pages, ${Math.round(Buffer.byteLength(text) / 1024)} KB.`);
