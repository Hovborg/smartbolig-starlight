import test from 'node:test';
import assert from 'node:assert/strict';
import { mountHomeMotion } from '../src/lib/home-motion.mjs';

class Target extends EventTarget {
  dataset = {}; hidden = false; attributes = {};
  classes = new Set();
  classList = { add: value => this.classes.add(value), remove: value => this.classes.delete(value) };
  setAttribute(key, value) { this.attributes[key] = value; }
}
function setup({ reduced = false, saved = null, blocked = false } = {}) {
  const win = new Target(), doc = new Target(), media = new Target();
  media.matches = reduced;
  win.matchMedia = () => media;
  win.localStorage = {
    getItem() { if (blocked) throw Error('blocked'); return saved; },
    setItem(_, value) { if (blocked) throw Error('blocked'); saved = value; },
  };
  const observers = [];
  win.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const stage = new Target(), entrance = new Target(), button = new Target(), reset = new Target(), status = new Target();
  doc.documentElement = new Target();
  doc.querySelectorAll = selector => selector === '[data-motion-stage]' ? [stage] : [entrance];
  const control = new Target();
  control.dataset = { pause: 'Pause', start: 'Start', system: 'System', manual: 'Manual' };
  control.querySelector = selector => ({ '[data-motion-toggle]': button, '[data-motion-system]': reset, '[data-motion-status]': status })[selector];
  const cleanup = mountHomeMotion(win, doc, control);
  return { win, doc, media, stage, entrance, button, reset, control, observers, cleanup, state: () => doc.documentElement.dataset.homeMotion };
}
test('reduced motion starts still with an accessible explicit opt-in; pause and system reset work', () => {
  const h = setup({ reduced: true });
  assert.equal(h.state(), 'off'); assert.equal(h.control.hidden, false);
  assert.equal(h.button.textContent, 'Start');
  h.button.dispatchEvent(new Event('click'));
  assert.equal(h.state(), 'on'); assert.equal(h.button.attributes['aria-pressed'], 'true');
  h.button.dispatchEvent(new Event('click')); assert.equal(h.state(), 'off');
  h.reset.dispatchEvent(new Event('click')); assert.equal(h.state(), 'off');
  h.media.matches = false; h.media.dispatchEvent(new Event('change')); assert.equal(h.state(), 'on');
  h.cleanup();
});
test('saved choices override device setting; blocked storage remains usable', () => {
  for (const [reduced, saved, expected] of [[true, 'on', 'on'], [false, 'off', 'off'], [true, 'invalid', 'off']]) {
    const h = setup({ reduced, saved }); assert.equal(h.state(), expected); h.cleanup();
  }
  const h = setup({ reduced: true, blocked: true });
  h.button.dispatchEvent(new Event('click')); assert.equal(h.state(), 'on'); h.cleanup();
});
test('offscreen stages pause, entrances run only once, hidden tabs suspend motion, cleanup removes state', () => {
  const h = setup();
  assert.equal(h.stage.dataset.motionInView, 'false');
  h.observers[0].callback([{ target: h.stage, isIntersecting: true }]);
  assert.equal(h.stage.dataset.motionInView, 'true');
  h.observers[1].callback([{ target: h.entrance, isIntersecting: true }]);
  assert.ok(h.entrance.classes.has('home-reveal-play'));
  const finished = new Event('animationend');
  Object.defineProperties(finished, { animationName: { value: 'home-reveal' }, target: { value: h.entrance } });
  h.doc.dispatchEvent(finished);
  assert.equal(h.entrance.classes.size, 0);
  h.observers[1].callback([{ target: h.entrance, isIntersecting: true }]);
  assert.equal(h.entrance.classes.size, 0);
  h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange')); assert.equal(h.state(), 'off');
  h.doc.hidden = false; h.doc.dispatchEvent(new Event('visibilitychange')); assert.equal(h.state(), 'on');
  h.cleanup(); assert.equal(h.state(), undefined); assert.ok(h.observers.every(o => o.disconnected));
  h.button.dispatchEvent(new Event('click')); assert.equal(h.state(), undefined);
});
