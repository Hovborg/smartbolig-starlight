// Abstract vector motifs for the news image, drawn in the accent colour only.
// Everything is deterministic: the same seed gives the same picture.

export function seedFrom(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h;
}

function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => n.toFixed(1);
const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

function arcs({ cx, cy, r, c, rnd }) {
  const start = rnd() * 360;
  let out = "";
  for (let i = 1; i <= 4; i += 1) {
    const radius = (r * i) / 4;
    const a0 = start + i * 47;
    const [x0, y0] = polar(cx, cy, radius, a0);
    const [x1, y1] = polar(cx, cy, radius, a0 + 150);
    out += `<path d="M${f(x0)} ${f(y0)}A${f(radius)} ${f(radius)} 0 0 1 ${f(x1)} ${f(y1)}" fill="none" stroke="${c.accent}" stroke-width="${7 - i}" stroke-linecap="round" opacity="${(1.05 - i * 0.18).toFixed(2)}"/>`;
    const [nx, ny] = polar(cx, cy, radius, a0 + 150 + 38);
    out += `<circle cx="${f(nx)}" cy="${f(ny)}" r="${(9 - i).toFixed(1)}" fill="${c.accent}" opacity="${(1.05 - i * 0.14).toFixed(2)}"/>`;
  }
  return out + `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.1)}" fill="${c.accent}"/>`;
}

function network({ cx, cy, r, c, rnd }) {
  const ring = (count, radius, jitter, offset) =>
    Array.from({ length: count }, (_, i) => {
      const [x, y] = polar(cx, cy, radius * (1 - jitter / 2 + rnd() * jitter), offset + (i * 360) / count + (rnd() - 0.5) * 22);
      return [x, y];
    });
  const inner = ring(6, r * 0.5, 0.3, rnd() * 60);
  const outer = ring(8, r, 0.22, rnd() * 45);
  const edge = (a, b, w, o) => `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="${c.accent}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
  let out = "";
  inner.forEach((p, i) => {
    out += edge([cx, cy], p, 3, 0.55) + edge(p, inner[(i + 1) % inner.length], 2, 0.3);
  });
  outer.forEach((p) => {
    const near = inner.reduce((best, q) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(best[0] - p[0], best[1] - p[1]) ? q : best));
    out += edge(p, near, 2, 0.4);
  });
  inner.forEach((p) => (out += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r * 0.055)}" fill="${c.bg}" stroke="${c.accent}" stroke-width="4"/>`));
  outer.forEach((p) => (out += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r * 0.03 + rnd() * 3)}" fill="${c.accent}" opacity="0.9"/>`));
  return out + `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.15)}" fill="${c.accent}"/><circle cx="${cx}" cy="${cy}" r="${f(r * 0.06)}" fill="${c.bg}"/>`;
}

function shield({ cx, cy, r, c, rnd }) {
  const s = r / 100;
  const p = (x, y) => `${f(cx + x * s)} ${f(cy + y * s)}`;
  let out =
    `<path d="M${p(0, -95)}L${p(78, -62)}L${p(78, 0)}C${p(78, 52)} ${p(40, 86)} ${p(0, 104)}C${p(-40, 86)} ${p(-78, 52)} ${p(-78, 0)}L${p(-78, -62)}Z" fill="none" stroke="${c.accent}" stroke-width="7" stroke-linejoin="round"/>` +
    `<path d="M${p(-32, 4)}L${p(-8, 30)}L${p(36, -22)}" fill="none" stroke="${c.accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = polar(cx, cy, r * (1.08 + rnd() * 0.14), -70 + i * 62 + rnd() * 20);
    out += `<path d="M${f(cx)} ${f(cy)}L${f(x)} ${f(y)}" stroke="${c.accent}" stroke-width="2" opacity="0.3"/><circle cx="${f(x)}" cy="${f(y)}" r="${6 + Math.round(rnd() * 5)}" fill="${c.accent}" opacity="0.9"/>`;
  }
  return out;
}

const drawers = { security: shield, default: arcs, browser: network, api: network, agent: network, model: network };

/** Motif geometry, a soft glow behind it, and a blurred copy that makes the lines glow. */
export function motifSvg(motif, { cx, cy, r, colors, seed }) {
  const body = (drawers[motif] || arcs)({ cx, cy, r, c: colors, rnd: random(seed) });
  return (
    `<defs><radialGradient id="mg" cx="${cx}" cy="${cy}" r="${f(r * 1.45)}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${colors.accent}" stop-opacity="0.26"/><stop offset="1" stop-color="${colors.accent}" stop-opacity="0"/></radialGradient>` +
    `<filter id="mb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${f(r * 1.45)}" fill="url(#mg)"/>` +
    `<g filter="url(#mb)" opacity="0.75">${body}</g><g>${body}</g>`
  );
}
