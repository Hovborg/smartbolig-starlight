// Renderer, camera and lights. Knows nothing about the house itself.
import {
  Color, DirectionalLight, HemisphereLight, NeutralToneMapping, PCFShadowMap, PerspectiveCamera,
  PMREMGenerator, Scene, Vector3, WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createPost } from "./post.mjs";

const CENTER = new Vector3(0.6, 0, 0.7);
const RAD = Math.PI / 180;

/**
 * The colour to draw so the page colour comes out unchanged after tone
 * mapping (the reverse of the neutral curve, which only shifts dark tones).
 */
function beforeToneMapping(color) {
  const low = Math.min(color.r, color.g, color.b);
  const lift = low < 0.04 ? Math.sqrt(low / 6.25) - low : 0.04;
  return new Color(color.r + lift, color.g + lift, color.b + lift);
}

/**
 * Throws when the browser has no WebGL; the caller keeps its still image.
 * `quality` "high" adds the finishing pass (post.mjs); "low" draws directly.
 */
export function createStage(canvas, { still = false, shadowSize = 2048, quality = "high", background = "#090d11" } = {}) {
  const high = quality === "high";
  const renderer = new WebGLRenderer({
    canvas, antialias: !high, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: still,
  });
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  // The finishing pass tone-maps the whole picture, also the background.
  const page = new Color(background);
  scene.background = high ? beforeToneMapping(page) : page;
  // Soft studio reflections, so paint, glass and steel do not look flat.
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new PerspectiveCamera(26, 1, 2, 160);
  const sun = new DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 100 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  sun.shadow.radius = 2.5;
  sun.target.position.copy(CENTER);
  const sky = new HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(sun, sun.target, sky);
  const post = high ? createPost(renderer, scene, camera) : null;
  return { renderer, scene, camera, sun, sky, post };
}

/** The lighting of a mode as plain numbers and colours, ready to blend. */
export function lightingOf(mode) {
  return {
    az: mode.sun.az, el: mode.sun.el, power: mode.sun.power, color: new Color(mode.sun.color),
    skyPower: mode.sky.power, top: new Color(mode.sky.top), ground: new Color(mode.sky.ground), env: mode.env,
  };
}

/** Move `now` a step of size k (0..1) towards `goal`. */
export function blendLighting(now, goal, k) {
  for (const key of ["az", "el", "power", "skyPower", "env"]) now[key] += (goal[key] - now[key]) * k;
  now.color.lerp(goal.color, k);
  now.top.lerp(goal.top, k);
  now.ground.lerp(goal.ground, k);
}

export function applyLighting(stage, lighting) {
  const { sun, sky, scene } = stage;
  const el = lighting.el * RAD;
  const az = lighting.az * RAD;
  sun.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(45).add(CENTER);
  sun.intensity = lighting.power;
  sun.color.copy(lighting.color);
  sky.intensity = lighting.skyPower;
  sky.color.copy(lighting.top);
  sky.groundColor.copy(lighting.ground);
  scene.environmentIntensity = lighting.env;
}

/** Put the camera on a sphere around the target. Returns the direction it looks from. */
export function placeCamera(camera, view, aspect) {
  const fit = Math.max(1, 1.16 / aspect);
  const el = view.el * RAD;
  const az = view.az * RAD;
  const dir = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const target = new Vector3(...view.target);
  camera.position.copy(dir).multiplyScalar(view.dist * fit).add(target);
  camera.lookAt(target);
  return dir;
}

export function drawStage(stage) {
  if (stage.post) stage.post.render();
  else stage.renderer.render(stage.scene, stage.camera);
}

export function sizeStage(stage, width, height, pixelRatio) {
  stage.renderer.setPixelRatio(pixelRatio);
  stage.renderer.setSize(width, height, false);
  stage.post?.setPixelRatio(pixelRatio);
  stage.post?.setSize(width, height);
  stage.camera.aspect = width / height;
  stage.camera.updateProjectionMatrix();
}
