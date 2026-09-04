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

test('theme initialization still works when browser storage is disabled', async () => {
  const source = await readFile(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  const script = source.slice(source.indexOf('// Force dark mode')).match(/content: `([\s\S]*?)`/)[1];
  const document = { documentElement: { dataset: {} } };
  vm.runInNewContext(script, { document, localStorage: { getItem() { throw new Error('Storage denied'); } } });
  assert.equal(document.documentElement.dataset.theme, 'dark');
});
