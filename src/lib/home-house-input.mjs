// The visitor's part of the 3D house on the homepage: turning it, and the
// moment the model is fetched. Used by home-house-stage.mjs.
const TURN_STEP = 35;

/**
 * Turning: drag sideways on the house, or use the two buttons.
 * house() gives the mounted house or null; load() fetches it.
 */
export function bindTurning({ root, screen, listen, house, load }) {
  let drag = null;
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    house()?.setDragging(false);
    delete screen.dataset.dragging;
  };
  listen(screen, "pointerdown", (event) => {
    if (!house() || event.button !== 0 || event.target.closest("a, button")) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    screen.setPointerCapture?.(event.pointerId);
    house().setDragging(true);
    screen.dataset.dragging = "true";
  });
  listen(screen, "pointermove", (event) => {
    if (!drag || !house() || event.pointerId !== drag.id) return;
    house().rotate((drag.x - event.clientX) * 0.3, (event.clientY - drag.y) * 0.12);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  listen(screen, "pointerup", endDrag);
  listen(screen, "pointercancel", endDrag);
  for (const button of root.querySelectorAll("[data-house-rotate]")) {
    listen(button, "click", async () => (await load())?.rotate(Number(button.dataset.houseRotate) * TURN_STEP));
  }
}

/**
 * When to fetch the model: desktops when the page is idle; phones and
 * data-saving visitors after their first touch, scroll or key press.
 * Returns a function that cancels a fetch that has not started.
 */
export function scheduleLoad({ win, doc, screen, fine, listen, load, started }) {
  const saving = Boolean(win.navigator.connection?.saveData);
  if (fine && !saving) {
    const idle = () => (win.requestIdleCallback ? win.requestIdleCallback(load, { timeout: 3000 }) : win.setTimeout(load, 600));
    if (doc.readyState === "complete") idle();
    else listen(win, "load", idle, { once: true });
    return () => {};
  }
  let timer = 0;
  const poke = () => {
    win.clearTimeout(timer);
    if (!started()) timer = win.setTimeout(load, 350);
  };
  const target = saving ? screen : win;
  for (const type of ["pointerdown", "keydown", "scroll"]) listen(target, type, poke, { passive: true });
  return () => win.clearTimeout(timer);
}
