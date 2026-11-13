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

test('theme follows the device and still initializes when browser storage is disabled', async () => {
  const source = await readFile(new URL('../src/components/chrome/ThemeProvider.astro', import.meta.url), 'utf8');
  const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
  const run = ({ prefersDark, stored, storageThrows = false }) => {
    const document = { documentElement: { dataset: {} } };
    const listeners = [];
    const media = { matches: prefersDark, addEventListener: (_type, fn) => listeners.push(fn) };
    const localStorage = { getItem() { if (storageThrows) throw new Error('Storage denied'); return stored ?? null; } };
    vm.runInNewContext(script, { document, localStorage, window: { matchMedia: () => media } });
    return { document, media, listeners };
  };
  assert.equal(run({ prefersDark: true, storageThrows: true }).document.documentElement.dataset.theme, 'dark');
  assert.equal(run({ prefersDark: false, storageThrows: true }).document.documentElement.dataset.theme, 'light');
  assert.equal(run({ prefersDark: true, stored: 'light' }).document.documentElement.dataset.theme, 'light');
  assert.equal(run({ prefersDark: false, stored: 'dark' }).document.documentElement.dataset.theme, 'dark');
  // An unknown stored value is ignored instead of being written to the page.
  assert.equal(run({ prefersDark: false, stored: '<x>' }).document.documentElement.dataset.theme, 'light');
  // A device change is followed live while the visitor has not chosen.
  const live = run({ prefersDark: false });
  live.media.matches = true;
  live.listeners.forEach((fn) => fn());
  assert.equal(live.document.documentElement.dataset.theme, 'dark');
});
