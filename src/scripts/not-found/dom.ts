/** Runs `apply` on the element with this id, if the page has it. */
export function set(id: string, apply: (el: HTMLElement) => void): void {
  const el = document.getElementById(id);
  if (el) apply(el);
}
