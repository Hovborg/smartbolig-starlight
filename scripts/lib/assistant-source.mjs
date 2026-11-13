// Reads the SmartBolig assistant's source files (markup parts, styles, client modules, copy) as one string.
import { readdir, readFile } from "node:fs/promises";

const ROOT = new URL("../../", import.meta.url);
const DIRECTORIES = ["src/components/assistant", "src/scripts/assistant"];
const FILES = ["src/components/SmartBoligAssistant.astro", "src/lib/assistant-copy.ts"];

export async function assistantSourcePaths() {
  const paths = [...FILES];
  for (const directory of DIRECTORIES) {
    const names = (await readdir(new URL(`${directory}/`, ROOT))).sort();
    paths.push(...names.map((name) => `${directory}/${name}`));
  }
  return paths;
}

export async function readAssistantSource() {
  const paths = await assistantSourcePaths();
  const parts = await Promise.all(paths.map((path) => readFile(new URL(path, ROOT), "utf8")));
  return parts.join("\n");
}
