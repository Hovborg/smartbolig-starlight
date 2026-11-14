// Runs the house: blends between modes, moves the camera, lowers the walls
// that face the viewer and animates the small things. Draws only when
// something changes, unless motion is on and the house is on screen.
import { Vector3 } from "three";
import { linkLevels, modes, views } from "./modes.mjs";
import { animateLinks } from "./parts/links.mjs";
import { createRig } from "./rig.mjs";
import { applyLighting, blendLighting, createStage, drawStage, lightingOf, placeCamera, sizeStage } from "./stage.mjs";

const SETTLE_MS = 2600;
const LOW_WALL = 0.17;

export function createEngine(canvas, options) {
  const { colors, still = false, onFrame } = options;
  const stage = createStage(canvas, {
    still, shadowSize: options.shadowSize, quality: options.quality, background: options.background,
  });
  const rig = createRig(colors);
  // Still pictures can swap the house for a scene of their own (stills.mjs).
  options.extend?.(rig, colors);
  stage.scene.add(rig.root);
  for (const mover of Object.values(rig.movers)) mover.body.traverse((part) => { part.castShadow = false; });

  let mode = options.mode ?? "evening";
  let focus = options.focus ?? null;
  let motion = options.motion ?? true;
  let visible = true;
  let dragging = false;
  let clock = options.time ?? 0;
  let last = 0;
  let raf = 0;
  let activeUntil = 0;
  let width = 1;
  let height = 1;

  const goals = { ...modes[mode].levels, ...linkLevels(focus) };
  const levels = { ...goals };
  let lightGoal = lightingOf(modes[mode], colors.time[mode]);
  const light = lightingOf(modes[mode], colors.time[mode]);
  // A view is a name from modes.mjs, or a camera of its own (still pictures).
  const viewOf = (view) => (view && typeof view === "object" ? view : views[view ?? "overview"]);
  let viewGoal = viewOf(options.view) ?? views.overview;
  const view = { ...viewGoal, target: [...viewGoal.target] };
  const orbit = { az: 0, el: 0, goalAz: 0, goalEl: 0, sway: 0 };
  const point = new Vector3();

  function step(dt, snap) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 3.4);
    const slow = snap ? 1 : 1 - Math.exp(-dt * 2.2);
    for (const [name, goal] of Object.entries(goals)) {
      levels[name] += (goal - levels[name]) * k;
      rig.channels[name]?.(levels[name]);
    }
    blendLighting(light, lightGoal, slow);
    applyLighting(stage, light);

    for (const key of ["az", "el", "dist"]) view[key] += (viewGoal[key] - view[key]) * slow;
    for (let i = 0; i < 3; i += 1) view.target[i] += (viewGoal.target[i] - view.target[i]) * slow;
    orbit.az += (orbit.goalAz - orbit.az) * k;
    orbit.el += (orbit.goalEl - orbit.el) * k;
    // A slow sway shows that the house is a real model, not a picture.
    const swayGoal = motion && !dragging && !still ? Math.sin(clock * 0.28) * 7 : 0;
    orbit.sway += (swayGoal - orbit.sway) * (snap ? 1 : Math.min(1, dt * 2));
    const dir = placeCamera(stage.camera, {
      az: view.az + orbit.az + orbit.sway,
      el: Math.min(62, Math.max(15, view.el + orbit.el)),
      dist: view.dist,
      target: view.target,
    }, width / height);

    let busy = false;
    for (const wall of rig.walls) {
      const goal = wall.normal.x * dir.x + wall.normal.z * dir.z > 0.12 ? LOW_WALL : 1;
      if (Math.abs(goal - wall.level) > 0.01) busy = true;
      wall.level += (goal - wall.level) * (snap ? 1 : 1 - Math.exp(-dt * 6));
      wall.group.scale.y = wall.level;
      wall.extras.visible = wall.level > 0.6;
    }

    const moving = motion && !still;
    const { vacuum, mower } = rig.movers;
    if (vacuum.level > 0.5 && moving) vacuum.phase += dt * 0.55;
    vacuum.body.position.set(-3.8 + Math.cos(vacuum.phase) * 0.82, vacuum.body.position.y, 0.45 + Math.sin(vacuum.phase) * 0.98);
    vacuum.body.rotation.y = -vacuum.phase;
    if (mower.level > 0.5 && moving) mower.phase += dt * 0.3;
    mower.body.position.x = -3.4 + Math.sin(mower.phase) * 3.1;
    mower.body.rotation.y = Math.cos(mower.phase) > 0 ? Math.PI / 2 : -Math.PI / 2;
    for (const item of rig.spin) if (moving) item.object.rotation.z += dt * item.speed * item.level;
    const { rings, level } = rig.pulses.sensor;
    for (const ring of rings) {
      const t = ((moving ? clock * 0.45 : 0.3) + ring.userData.offset) % 1;
      ring.scale.setScalar(0.25 + t * 1.5);
      ring.material.opacity = level * (1 - t) * 0.8;
    }
    animateLinks(rig, clock, moving);
    return busy;
  }

  function draw() {
    drawStage(stage);
    if (!onFrame) return;
    const spots = {};
    for (const [name, anchor] of Object.entries(rig.anchors)) {
      point.copy(anchor).project(stage.camera);
      spots[name] = { x: (point.x * 0.5 + 0.5) * width, y: (-point.y * 0.5 + 0.5) * height, shown: point.z < 1 };
    }
    onFrame(spots);
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (motion) clock += dt;
    // Shadows are redrawn only while something that throws them is changing.
    stage.renderer.shadowMap.autoUpdate = now < activeUntil;
    // With motion off there are no flights or fades: the picture changes in one step.
    if (step(dt, !motion)) activeUntil = Math.max(activeUntil, now + 400);
    draw();
    if (visible && (motion || now < activeUntil)) raf = requestAnimationFrame(frame);
  }

  function wake() {
    activeUntil = performance.now() + SETTLE_MS;
    if (!raf && !still) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function resize(w, h, pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2)) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    sizeStage(stage, width, height, pixelRatio);
    wake();
  }

  return {
    setMode(name) {
      if (!modes[name]) return;
      mode = name;
      Object.assign(goals, modes[name].levels);
      lightGoal = lightingOf(modes[name], colors.time[name]);
      wake();
    },
    setFocus(system) {
      focus = system;
      Object.assign(goals, linkLevels(focus));
      wake();
    },
    setView(name) {
      if (!viewOf(name)) return;
      viewGoal = viewOf(name);
      orbit.goalAz = 0;
      orbit.goalEl = 0;
      wake();
    },
    /** Turn the house: degrees to the right and up, added to the current view. */
    rotate(az, el = 0) {
      orbit.goalAz += az;
      orbit.goalEl = Math.min(26, Math.max(-16, orbit.goalEl + el));
      wake();
    },
    setDragging(value) { dragging = value; wake(); },
    setMotion(value) { motion = value; wake(); },
    setVisible(value) { visible = value; if (value) wake(); },
    resize,
    /** Draw one finished frame, without blending. For posters and sprites. */
    renderStill() {
      stage.renderer.shadowMap.autoUpdate = true;
      step(0, true);
      draw();
    },
    dispose() {
      cancelAnimationFrame(raf);
      stage.post?.dispose();
      stage.renderer.dispose();
      stage.renderer.forceContextLoss();
    },
  };
}
