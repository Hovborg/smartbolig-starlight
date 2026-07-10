import { appendFile, readFile } from "node:fs/promises";

const workerPath = new URL("../dist/pagefind/pagefind-worker.js", import.meta.url);
const marker = "// SmartBolig build policy: CSP permits Pagefind WebAssembly.\n";
const worker = await readFile(workerPath, "utf8");

if (!worker.endsWith(marker)) {
  await appendFile(workerPath, `\n${marker}`);
}

console.log("Finalized Pagefind worker cache policy.");
