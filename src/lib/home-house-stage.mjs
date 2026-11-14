// Connects the 3D house (house3d/) to the homepage: loads it when the visitor
// can use it, keeps its size, lets the visitor turn it, and places the
// hotspots on the model. Until it has loaded, the page shows a still picture.
const TURN_STEP = 35;

export function createHouseStage(win, doc, root, { onUnavailable } = {}) {
  const html = doc.documentElement;
  const screen = root.querySelector("[data-house-screen]");
  const canvas = root.querySelector("[data-house-canvas]");
  const spotBox = root.querySelector("[data-house-spots]");
  const turn = root.querySelector("[data-house-turn]");
  const spots = new Map([...root.querySelectorAll("[data-house-spot]")].map((el) => [el.dataset.houseSpot, el]));
  // Wide screens that are not touch-first get the full picture quality.
  const fine = win.matchMedia("(min-width: 64rem)").matches && !win.matchMedia("(pointer: coarse)").matches;
  const undo = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    undo.push(() => target.removeEventListener(type, handler, options));
  };
  let house = null;
  let loading = null;
  let gone = false;
  let wanted = { mode: "evening", view: "overview", focus: null };
  let shown = { ...wanted };

  const motionOn = () => html.dataset.homeMotion === "on";
  const ratio = () => Math.min(win.devicePixelRatio || 1, fine ? 2 : 1.5);

  function placeSpots(points) {
    for (const [id, element] of spots) {
      const point = points[id];
      const visible = Boolean(point?.shown);
      element.style.visibility = visible ? "" : "hidden";
      if (visible) element.style.transform = `translate(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px)`;
    }
  }

  function apply() {
    if (!house) return;
    if (wanted.mode !== shown.mode) house.setMode(wanted.mode);
    if (wanted.view !== shown.view) house.setView(wanted.view);
    if (wanted.focus !== shown.focus) house.setFocus(wanted.focus);
    shown = { ...wanted };
  }

  function still() {
    screen.dataset.state = "still";
    if (turn) turn.hidden = true;
    onUnavailable?.();
  }

  function start({ mountHouse }) {
    if (gone) return null;
    house = mountHouse(canvas, {
      ...wanted,
      time: 2.1,
      quality: fine ? "high" : "low",
      shadowSize: fine ? 2048 : 1024,
      background: win.getComputedStyle(screen).getPropertyValue("--sb-stage").trim() || undefined,
      motion: motionOn(),
      onFrame: placeSpots,
    });
    if (!house) return still();
    shown = { ...wanted };
    const size = () => house?.resize(screen.clientWidth, screen.clientHeight, ratio());
    size();
    if (win.ResizeObserver) {
      const sizes = new win.ResizeObserver(size);
      sizes.observe(screen);
      undo.push(() => sizes.disconnect());
    }
    if (win.IntersectionObserver) {
      const seen = new win.IntersectionObserver(([entry]) => house?.setVisible(entry.isIntersecting));
      seen.observe(screen);
      undo.push(() => seen.disconnect());
    }
    // The browser can take the graphics context away (memory pressure, a GPU
    // reset). The canvas would then cover the still picture with nothing.
    listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      if (!house) return;
      const lost = house;
      house = null;
      loading = Promise.resolve(null);
      lost.dispose();
      if (spotBox) spotBox.hidden = true;
      still();
    });
    const follow = new win.MutationObserver(() => house?.setMotion(motionOn()));
    follow.observe(html, { attributes: true, attributeFilter: ["data-home-motion"] });
    undo.push(() => follow.disconnect());
    // Two frames later the first picture is on the canvas: fade it in.
    win.requestAnimationFrame(() => win.requestAnimationFrame(() => {
      if (gone) return;
      screen.dataset.state = "live";
      if (spotBox) spotBox.hidden = false;
    }));
    return house;
  }

  function load() {
    if (loading || gone) return loading;
    screen.dataset.state = "loading";
    loading = import("./house3d/index.mjs").then(start).catch((error) => {
      console.warn("3D house failed to load:", error);
      return still();
    });
    return loading;
  }

  // Turning: drag sideways on the house, or use the two buttons.
  let drag = null;
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    house?.setDragging(false);
    delete screen.dataset.dragging;
  };
  listen(screen, "pointerdown", (event) => {
    if (!house || event.button !== 0 || event.target.closest("a, button")) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    screen.setPointerCapture?.(event.pointerId);
    house.setDragging(true);
    screen.dataset.dragging = "true";
  });
  listen(screen, "pointermove", (event) => {
    if (!drag || !house || event.pointerId !== drag.id) return;
    house.rotate((drag.x - event.clientX) * 0.3, (event.clientY - drag.y) * 0.12);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  listen(screen, "pointerup", endDrag);
  listen(screen, "pointercancel", endDrag);
  for (const button of root.querySelectorAll("[data-house-rotate]")) {
    listen(button, "click", async () => (await load())?.rotate(Number(button.dataset.houseRotate) * TURN_STEP));
  }
  if (turn) turn.hidden = false;

  // When to fetch the model: desktops when the page is idle; phones and
  // data-saving visitors after their first touch, scroll or key press.
  const saving = Boolean(win.navigator.connection?.saveData);
  if (fine && !saving) {
    const idle = () => (win.requestIdleCallback ? win.requestIdleCallback(load, { timeout: 3000 }) : win.setTimeout(load, 600));
    if (doc.readyState === "complete") idle();
    else listen(win, "load", idle, { once: true });
  } else {
    let timer = 0;
    const poke = () => {
      win.clearTimeout(timer);
      if (!loading) timer = win.setTimeout(load, 350);
    };
    const target = saving ? screen : win;
    for (const type of ["pointerdown", "keydown", "scroll"]) listen(target, type, poke, { passive: true });
    undo.push(() => win.clearTimeout(timer));
  }

  return {
    load,
    live: () => screen.dataset.state === "live",
    show(next) {
      wanted = { ...next };
      for (const [id, element] of spots) element.toggleAttribute("data-active", id === wanted.focus);
      apply();
    },
    dispose() {
      gone = true;
      undo.forEach((fn) => fn());
      house?.dispose();
      house = null;
      delete screen.dataset.state;
      delete screen.dataset.dragging;
      if (spotBox) spotBox.hidden = true;
      if (turn) turn.hidden = true;
    },
  };
}
