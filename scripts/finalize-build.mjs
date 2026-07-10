import { createHash } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";

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
