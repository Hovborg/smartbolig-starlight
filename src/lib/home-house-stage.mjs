// Connects the 3D house (house3d/) to the homepage: loads it when the visitor
// can use it, keeps its size and places the hotspots on the model. Until it
// has loaded, the page shows a still picture. The house is drawn in a worker
// where the browser can, so the page stays responsive while the model starts
// and while it moves. Turning and the moment of loading: home-house-input.mjs.
import { bindTurning, scheduleLoad } from "./home-house-input.mjs";
import { drawingPlace } from "./house3d/probe.mjs";

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
  let live = false;
  // True once the canvas has been handed to a worker; it cannot be taken back.
  let handedOver = false;
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

  function onFrame(points) {
    // A worker that was stopped can still have a picture on its way.
    if (!house) return;
    placeSpots(points);
    if (live || gone) return;
    // The first finished picture is on the canvas: fade it in.
    live = true;
    screen.dataset.state = "live";
    if (spotBox) spotBox.hidden = false;
  }

  // The browser can take the graphics context away (memory pressure, a GPU
  // reset), and a worker can fail to draw. The canvas would then cover the
  // still picture with nothing.
  function lose() {
    if (!house) return;
    const lost = house;
    house = null;
    loading = Promise.resolve(null);
    lost.dispose();
    if (spotBox) spotBox.hidden = true;
    still();
  }

  async function mount(options) {
    // Asked first: a browser that cannot draw the house fetches none of it.
    const place = drawingPlace(win, doc);
    if (place === "none") return null;
    if (place === "worker") {
      const remote = await import("./house3d/remote.mjs");
      // Removed while the file was fetched: the canvas stays with the page.
      if (gone) return null;
      const house = remote.mountHouse(canvas, options);
      handedOver = Boolean(house);
      if (house) return house;
    }
    // Browsers that cannot draw a canvas from a worker draw it on the page.
    const onPage = await import("./house3d/index.mjs");
    return gone ? null : onPage.mountHouse(canvas, options);
  }

  async function start() {
    const first = { ...wanted };
    const mounted = await mount({
      ...first,
      time: 2.1,
      quality: fine ? "high" : "low",
      shadowSize: fine ? 2048 : 1024,
      background: win.getComputedStyle(screen).getPropertyValue("--sb-stage").trim() || undefined,
      motion: motionOn(),
      onFrame,
      onGone: lose,
    });
    if (gone) {
      mounted?.dispose();
      return null;
    }
    if (!mounted) return still();
    house = mounted;
    // The visitor may have picked another time of day, or switched motion
    // off, while the house loaded.
    shown = first;
    apply();
    house.setMotion(motionOn());
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
    // Drawn on the page, the canvas itself reports a lost context; a worker
    // reports it through onGone.
    listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      lose();
    });
    const follow = new win.MutationObserver(() => house?.setMotion(motionOn()));
    follow.observe(html, { attributes: true, attributeFilter: ["data-home-motion"] });
    undo.push(() => follow.disconnect());
    return house;
  }

  function load() {
    if (loading || gone) return loading;
    screen.dataset.state = "loading";
    loading = start().catch((error) => {
      console.warn("3D house failed to load:", error);
      return still();
    });
    return loading;
  }

  bindTurning({ root, screen, listen, house: () => house, load });
  if (turn) turn.hidden = false;
  undo.push(scheduleLoad({ win, doc, screen, fine, listen, load, started: () => Boolean(loading) }));

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
      // A canvas that went to a worker cannot draw again: leave a fresh one.
      if (handedOver) canvas.replaceWith(canvas.cloneNode(false));
      delete screen.dataset.state;
      delete screen.dataset.dragging;
      if (spotBox) spotBox.hidden = true;
      if (turn) turn.hidden = true;
    },
  };
}
