// The finishing pass on the picture: soft contact shadows where surfaces
// meet (ambient occlusion) and a glow around lit lamps. Used on the high
// quality tier only; phones draw the scene directly.
import { HalfFloatType, Vector2, WebGLRenderTarget } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/**
 * Less than one colour step of noise. Soft light on a dark wall otherwise
 * shows as rings (banding) on an ordinary 8-bit screen.
 */
const Dither = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      gl_FragColor = vec4(color.rgb + (noise - 0.5) / 255.0, color.a);
    }`,
};

/**
 * Contact shadows are worked out from solid surfaces only. Glass, glows,
 * data lines and leaf cards (userData.overlay) are left out, or they would
 * get dark outlines.
 */
class ContactShadowPass extends GTAOPass {
  _overrideVisibility() {
    super._overrideVisibility();
    const cache = this._visibilityCache;
    this.scene.traverse((object) => {
      if ((object.userData.overlay || object.isSprite) && object.visible) {
        object.visible = false;
        cache.push(object);
      }
    });
  }
}

export function createPost(renderer, scene, camera) {
  const target = new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const shadows = new ContactShadowPass(scene, camera, 2, 2);
  shadows.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.3, thickness: 1.4, scale: 1.25, samples: 16 });
  shadows.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16 });
  composer.addPass(shadows);
  // Only things brighter than a sunlit white wall glow: lamps and LEDs.
  composer.addPass(new UnrealBloomPass(new Vector2(2, 2), 0.32, 0.6, 1.6));
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass(Dither));
  return composer;
}
