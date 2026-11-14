// Small DOM helpers the tools share. Elements are always built with DOM calls
// and text nodes, never from HTML text, so data can never become markup.

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function build(node, attributes, children) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null && value !== false) node.setAttribute(name, value === true ? "" : String(value));
  }
  node.append(...[children].flat().filter((child) => child !== null && child !== undefined && child !== false));
  return node;
}

/** An HTML element: el("td", { class: "x" }, "text") or with child nodes. */
export function el(name, attributes = {}, children = []) {
  return build(document.createElement(name), attributes, children);
}

/** An SVG element: svgEl("rect", { x: 1, width: 10 }). */
export function svgEl(name, attributes = {}, children = []) {
  return build(document.createElementNS(SVG_NAMESPACE, name), attributes, children);
}

/** The element marked data-part="name" inside a tool. */
export function part(root, name) {
  return root.querySelector(`[data-part="${name}"]`);
}

/**
 * Writes a text only when it differs, so a screen reader following the
 * element is not told the same thing twice.
 */
export function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

/** Shows or hides an element with the hidden attribute. */
export function show(element, visible) {
  element.hidden = !visible;
}

/**
 * Marks a field right or wrong and shows its error text. The text is named as
 * the field's description only while the field is wrong; a description that
 * is hidden is still read out, so it must not be named on a field that is fine.
 */
export function setInvalid(input, error, invalid) {
  input.setAttribute("aria-invalid", String(invalid));
  show(error, invalid);
  const others = (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== error.id);
  input.setAttribute("aria-describedby", [...(invalid ? [error.id] : []), ...others].join(" "));
}

/**
 * Wires a slider: paints the track up to the thumb and calls `onInput` with
 * the number, now and on every move. `describe` gives the words a screen
 * reader says for a value ("3 timer").
 */
export function bindRange(input, { onInput, describe }) {
  const update = () => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    // Set through the style object, which a strict Content-Security-Policy allows.
    input.style.setProperty("--fill", `${((value - min) / (max - min)) * 100}%`);
    if (describe) input.setAttribute("aria-valuetext", describe(value));
    onInput(value);
  };
  input.addEventListener("input", update);
  update();
}
