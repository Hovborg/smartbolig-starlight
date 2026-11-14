// Every file a module loads, followed import by import. For tests that keep
// something out of a bundle or out of a worker.
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

/**
 * The entries and everything they reach through relative imports, static or
 * dynamic. Returns a Map from the file's path in the repo to its source.
 */
export async function importGraph(...entries) {
  const seen = new Map();
  const follow = async (path) => {
    if (seen.has(path)) return;
    seen.set(path, "");
    const source = await read(path);
    seen.set(path, source);
    for (const [, target] of source.matchAll(/(?:from|import)\s*\(?\s*["'](\.\.?\/[^"']+)["']/g)) {
      await follow(new URL(target, `file:///${path}`).pathname.slice(1));
    }
  };
  for (const entry of entries) await follow(entry);
  return seen;
}
