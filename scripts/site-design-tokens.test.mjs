import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { contrast, readTokens } from "./lib/color-contrast.mjs";

const css = await readFile(new URL("../src/styles/tokens/color.css", import.meta.url), "utf8");
const themes = {
  light: readTokens(css, ":root"),
  dark: readTokens(css, ':root[data-theme="dark"]'),
};

// [foreground, background, minimum ratio]. 4.5 = WCAG AA body text, 7 = AAA,
// 3 = large text and interface graphics.
const PAIRS = [
  ["--sb-ink-strong", "--sb-bg", 7],
  ["--sb-ink", "--sb-bg", 7],
  ["--sb-ink", "--sb-bg-subtle", 7],
  ["--sb-ink", "--sb-surface", 7],
  ["--sb-ink-muted", "--sb-bg", 7],
  ["--sb-ink-muted", "--sb-bg-subtle", 4.5],
  ["--sb-ink-subtle", "--sb-bg", 4.5],
  ["--sb-ink-subtle", "--sb-bg-subtle", 4.5],
  ["--sb-ink-subtle", "--sb-surface", 4.5],
  ["--sb-accent", "--sb-bg", 4.5],
  ["--sb-accent", "--sb-bg-subtle", 4.5],
  ["--sb-accent", "--sb-surface", 4.5],
  ["--sb-accent-strong", "--sb-accent-soft", 4.5],
  ["--sb-on-accent", "--sb-accent", 4.5],
  ["--sb-warm", "--sb-warm-soft", 4.5],
  ["--sb-warm", "--sb-bg", 4.5],
  ["--sb-sky", "--sb-sky-soft", 4.5],
  ["--sb-sky", "--sb-bg", 4.5],
  ["--sb-violet", "--sb-violet-soft", 4.5],
  ["--sb-danger", "--sb-danger-soft", 4.5],
  ["--sb-danger", "--sb-bg", 4.5],
  ["--sb-line-strong", "--sb-bg", 1.4],
  ["--sb-accent-vivid", "--sb-bg", 2],
];

for (const [name, tokens] of Object.entries(themes)) {
  test(`${name} theme: every text and background pair meets its contrast floor`, () => {
    const failures = [];
    for (const [fg, bg, floor] of PAIRS) {
      assert.ok(tokens[fg], `${fg} is missing in the ${name} theme`);
      assert.ok(tokens[bg], `${bg} is missing in the ${name} theme`);
      const ratio = contrast(tokens[fg], tokens[bg]);
      if (ratio < floor) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${floor}`);
    }
    assert.deepEqual(failures, []);
  });
}

test("light and dark themes define the same colour tokens", () => {
  assert.deepEqual(Object.keys(themes.dark).sort(), Object.keys(themes.light).sort());
});
