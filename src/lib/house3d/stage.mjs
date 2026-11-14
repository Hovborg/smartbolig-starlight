// Renderer, camera and lights. Knows nothing about the house itself.
import {
  Color, DirectionalLight, HemisphereLight, NeutralToneMapping, PCFShadowMap, PerspectiveCamera,
  PMREMGenerator, Scene, Vector3, WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createBackdrop, setBackdrop } from "./backdrop.mjs";
import { createPost } from "./post.mjs";

const CENTER = new Vector3(0.6, 0, 0.7);
const RAD = Math.PI / 180;
// Names of WebGL drawn by the processor instead of a graphics chip.
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** The name of the graphics chip, or "" when the browser hides it. */
function chipName(gl) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
}

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
 * A live house also needs a graphics chip: drawn in software it would use the
 * whole processor. Still pictures are drawn once and may take their time.
 * `quality` "high" adds the finishing pass (post.mjs); "low" draws directly.
 */
export function createStage(canvas, { still = false, shadowSize = 2048, quality = "high", background = "#090d11" } = {}) {
  const high = quality === "high";
  const renderer = new WebGLRenderer({
    canvas, antialias: !high, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: still,
    failIfMajorPerformanceCaveat: !still,
  });
  if (!still && SOFTWARE.test(chipName(renderer.getContext()))) {
    renderer.dispose();
    throw new Error("WebGL is drawn in software");
  }
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
  const backdrop = createBackdrop(page);
  scene.add(sun, sun.target, sky, backdrop);
  const post = high ? createPost(renderer, scene, camera) : null;
  return { renderer, scene, camera, sun, sky, backdrop, post };
}

/**
 * The lighting of a mode as plain numbers and colours, ready to blend.
 * `haze` is the colour of that time of day (palette.mjs).
 */
export function lightingOf(mode, haze) {
  return {
    haze: new Color(haze), hazePower: mode.haze,
    az: mode.sun.az, el: mode.sun.el, power: mode.sun.power, color: new Color(mode.sun.color),
    skyPower: mode.sky.power, top: new Color(mode.sky.top), ground: new Color(mode.sky.ground), env: mode.env,
  };
}

/** Move `now` a step of size k (0..1) towards `goal`. */
export function blendLighting(now, goal, k) {
  for (const key of ["az", "el", "power", "skyPower", "env", "hazePower"]) now[key] += (goal[key] - now[key]) * k;
  now.color.lerp(goal.color, k);
  now.top.lerp(goal.top, k);
  now.ground.lerp(goal.ground, k);
  now.haze.lerp(goal.haze, k);
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
  setBackdrop(stage.backdrop, lighting.haze, lighting.hazePower);
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

/**
 * Compile the shaders before the first frame. Where the browser can
 * (KHR_parallel_shader_compile) that happens beside the drawing, so nothing
 * else on the graphics chip waits for it. The finishing pass draws the scene
 * into its own target, which picks other shader variants than the screen
 * does, so that target is set while the list of shaders is made.
 */
export function compileStage(stage) {
  const { renderer, scene, camera, post } = stage;
  const before = renderer.getRenderTarget();
  if (post) renderer.setRenderTarget(post.readBuffer);
  const done = renderer.compileAsync(scene, camera);
  renderer.setRenderTarget(before);
  return done;
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
