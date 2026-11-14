// Just enough of the browser to run the tool scripts (zigbee-ui.mjs, battery-ui.mjs)
// in Node: elements with attributes, classes, text, hidden and events.

export function fakeElement(extra = {}) {
  const attributes = new Map();
  const listeners = {};
  const classes = new Set();
  return {
    dataset: {},
    value: "",
    textContent: "",
    hidden: false,
    id: "",
    ...extra,
    classList: {
      toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: (name) => (attributes.has(name) ? attributes.get(name) : null),
    addEventListener: (type, handler) => (listeners[type] ??= []).push(handler),
    fire(type) {
      for (const handler of listeners[type] ?? []) handler({ target: this });
    },
  };
}

/**
 * A tool root. `parts` are the data-part elements by name; `lists` map the
 * selectors the scripts use to arrays of elements.
 */
export function fakeRoot({ lang = "da", parts = {}, lists = {} } = {}) {
  return {
    dataset: { lang },
    parts,
    querySelector(selector) {
      const name = /^\[data-part="(.+)"\]$/.exec(selector)?.[1];
      return name ? (parts[name] ?? null) : null;
    },
    querySelectorAll: (selector) => lists[selector] ?? [],
  };
}
