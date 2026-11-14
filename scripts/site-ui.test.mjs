import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function themeFixture(storage) {
  const source = await readFile(new URL('../src/components/ThemeSelect.astro', import.meta.url), 'utf8');
  const button = new EventTarget();
  const document = { documentElement: { dataset: { theme: 'dark' } } };
  let Constructor;
  vm.runInNewContext(source.match(/<script>([\s\S]*?)<\/script>/)[1], {
    HTMLElement: class extends EventTarget { querySelector() { return button; } },
    document, localStorage: storage,
    customElements: { get() {}, define(_name, value) { Constructor = value; } },
  });
  return { element: new Constructor(), button, document };
}

test('reconnecting a theme toggle does not register a second click handler', async () => {
  const fixture = await themeFixture({ setItem() {} });
  fixture.element.connectedCallback();
  fixture.element.disconnectedCallback?.();
  fixture.element.connectedCallback();
  fixture.button.dispatchEvent(new Event('click'));
  assert.equal(fixture.document.documentElement.dataset.theme, 'light');
});

test('theme starts dark, keeps a stored choice and still initializes when browser storage is disabled', async () => {
  const source = await readFile(new URL('../src/components/chrome/ThemeProvider.astro', import.meta.url), 'utf8');
  const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
  const run = ({ stored, storageThrows = false } = {}) => {
    const meta = { content: '#dark', dataset: { dark: '#dark', light: '#light' } };
    const observers = [];
    const listeners = {};
    const document = { documentElement: { dataset: {} }, querySelector: () => meta };
    const localStorage = { getItem() { if (storageThrows) throw new Error('Storage denied'); return stored ?? null; } };
    class MutationObserver { constructor(fn) { observers.push(fn); } observe() {} }
    const addEventListener = (type, fn) => { listeners[type] = fn; };
    vm.runInNewContext(script, { document, localStorage, MutationObserver, addEventListener });
    return { document, meta, observers, listeners };
  };
  // Dark is the default, whatever the device prefers; the script never asks the device.
  assert.doesNotMatch(script, /prefers-color-scheme|matchMedia/);
  assert.equal(run().document.documentElement.dataset.theme, 'dark');
  assert.equal(run({ storageThrows: true }).document.documentElement.dataset.theme, 'dark');
  assert.equal(run({ stored: 'light' }).document.documentElement.dataset.theme, 'light');
  assert.equal(run({ stored: 'dark' }).document.documentElement.dataset.theme, 'dark');
  // An unknown stored value is ignored instead of being written to the page.
  assert.equal(run({ stored: '<x>' }).document.documentElement.dataset.theme, 'dark');
  // The browser's theme colour follows the theme, also when the switch changes it later.
  assert.equal(run({ stored: 'light' }).meta.content, '#light');
  const live = run();
  assert.equal(live.meta.content, '#dark');
  live.document.documentElement.dataset.theme = 'light';
  live.observers.forEach((fn) => fn());
  assert.equal(live.meta.content, '#light');
  // Print uses the light theme and returns to the theme the page had.
  const printed = run();
  printed.listeners.beforeprint();
  assert.equal(printed.document.documentElement.dataset.theme, 'light');
  printed.listeners.afterprint();
  assert.equal(printed.document.documentElement.dataset.theme, 'dark');
  // A theme picked in this visit survives printing even when storage is blocked.
  const picked = run({ storageThrows: true });
  picked.document.documentElement.dataset.theme = 'light';
  picked.listeners.beforeprint();
  picked.listeners.afterprint();
  assert.equal(picked.document.documentElement.dataset.theme, 'light');
});

test('print hides the site chrome and never keeps the dark colour set', async () => {
  const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const print = await read('src/styles/print.css');
  for (const selector of ['.sb-header__nav', '.sb-header__tools', '.smartbolig-ai', '.giscus-wrapper']) {
    assert.ok(print.includes(selector), selector);
  }
  assert.match(await read('src/styles/index.css'), /@import "\.\/print\.css";/);
  // The header rule must be at least as specific as the one in chrome/header.css.
  assert.ok(print.includes('.page > header.header'));
  assert.ok((await read('src/styles/chrome/header.css')).includes('.page > header.header'));
  assert.match(await read('src/components/not-found/NotFoundLayout.astro'), /styles\/print\.css/);
  for (const path of ['src/styles/tokens/color.css', 'src/styles/tokens/scale.css']) {
    assert.match(await read(path), /@media not print \{\s*:root\[data-theme="dark"\]/, path);
  }
});

test('narrow phones keep a language choice when the top bar drops its link', async () => {
  const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const header = await read('src/components/chrome/Header.astro');
  // Only pages with a menu hide the link; the homepage has no menu and keeps it.
  assert.match(header, /@media \(max-width: 25rem\) \{\s*:global\(html\[data-has-sidebar\]\) \.sb-header__lang \{\s*display: none;/);
  // The menu's footer is Starlight's own (theme and language select), so it must not be replaced.
  assert.equal((await read('config/components.mjs')).includes('MobileMenuFooter'), false);
});

test("JSON written into a script block cannot close the block", async () => {
  const { scriptJson } = await import("../src/lib/script-json.ts");
  const out = scriptJson({ title: "</script><img src=x onerror=alert(1)>", n: 1 });
  assert.equal(out.includes("<"), false);
  assert.deepEqual(JSON.parse(out), { title: "</script><img src=x onerror=alert(1)>", n: 1 });
});
