// The haze behind the house: the colour of the time of day in the middle of
// the picture, fading to the page colour at every edge. That is why the
// canvas has no visible border on the page.
import { Color, Mesh, PlaneGeometry, ShaderMaterial } from "three";

const vertexShader = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }";

// The last lines undo the tone mapping that follows (it only lifts dark
// tones), so the edge comes out as exactly the page colour.
const fragmentShader = `
  uniform vec3 uPage; uniform vec3 uGlow; uniform float uPower; varying vec2 vUv;
  void main() {
    float d = length((vUv - vec2(0.5, 0.56)) * vec2(1.0, 1.3));
    float haze = smoothstep(0.5, 0.0, d);
    vec3 c = mix(uPage, uGlow, haze * haze * uPower);
    float low = min(c.r, min(c.g, c.b));
    c += low < 0.04 ? sqrt(low / 6.25) - low : 0.04;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** A full-picture sheet drawn before everything else. `page` is the page colour. */
export function createBackdrop(page) {
  const material = new ShaderMaterial({
    uniforms: { uPage: { value: new Color(page) }, uGlow: { value: new Color(page) }, uPower: { value: 0 } },
    vertexShader, fragmentShader, depthTest: false, depthWrite: false,
  });
  const sheet = new Mesh(new PlaneGeometry(2, 2), material);
  sheet.frustumCulled = false;
  sheet.renderOrder = -1000;
  // Not a surface: keep it out of the contact-shadow pass (post.mjs).
  sheet.userData.overlay = true;
  return sheet;
}

export function setBackdrop(sheet, color, power) {
  sheet.material.uniforms.uGlow.value.copy(color);
  sheet.material.uniforms.uPower.value = power;
}
