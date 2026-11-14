// The drawn faces of the workbench (workbench.mjs): the hole pattern of the
// breadboard, the print on the circuit board and the phone's screen. The
// screen shows numbers and a curve only, so it reads the same in every
// language.
import { CanvasTexture, SRGBColorSpace } from "three";
import { blankCanvas } from "../canvas.mjs";

function drawn(width, height, draw) {
  const canvas = blankCanvas(width, height);
  draw(canvas.getContext("2d"), width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** 16.3 x 5.3 cm at 80 px per cm: two power rails on each side of ten rows. */
export function breadboardFace() {
  return drawn(1304, 424, (ctx, w, h) => {
    ctx.fillStyle = "#ebe8df";
    ctx.fillRect(0, 0, w, h);
    const step = 20.32;
    const left = (w - 62 * step) / 2;
    const hole = (x, y) => {
      ctx.fillStyle = "#d3cfc4";
      ctx.fillRect(x - 5.5, y - 5.5, 11, 11);
      ctx.fillStyle = "#2b2b29";
      ctx.fillRect(x - 3.6, y - 3.6, 7.2, 7.2);
    };
    const rows = (top, count) => {
      for (let row = 0; row < count; row += 1) for (let col = 0; col < 63; col += 1) hole(left + col * step, top + row * step);
    };
    const rail = (top) => {
      for (let row = 0; row < 2; row += 1) {
        for (let col = 2; col < 61; col += 1) if ((col - 2) % 6 !== 5) hole(left + col * step, top + row * step);
      }
    };
    for (const [top, red, blue] of [[22, 8, 56], [h - 42, h - 56, h - 8]]) {
      rail(top);
      ctx.fillStyle = "#c9443a";
      ctx.fillRect(left, red, w - left * 2, 2.5);
      ctx.fillStyle = "#3f6fc4";
      ctx.fillRect(left, blue, w - left * 2, 2.5);
    }
    rows(88, 5);
    rows(h - 88 - 4 * step, 5);
    // The groove down the middle.
    ctx.fillStyle = "#d6d2c7";
    ctx.fillRect(0, h / 2 - 15, w, 30);
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(0, h / 2 - 15, w, 3);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(0, h / 2 + 12, w, 3);
  });
}

const PINS_A = ["5V", "CMD", "D3", "D2", "13", "GND", "12", "14", "27", "26", "25", "33", "32", "35", "34", "VN", "VP", "EN", "3V3"];
const PINS_B = ["CLK", "D0", "D1", "15", "2", "0", "4", "16", "17", "5", "18", "19", "GND", "21", "RX", "TX", "22", "23", "GND"];

/** 5.16 x 2.76 cm at 160 px per cm: solder mask, traces, pads and pin names. */
export function circuitFace() {
  return drawn(826, 442, (ctx, w, h) => {
    ctx.fillStyle = "#14171a";
    ctx.fillRect(0, 0, w, h);
    // Traces, a shade lighter than the mask, running from the pins inwards.
    ctx.strokeStyle = "#1f252a";
    ctx.lineWidth = 3;
    const step = 40.64;
    const left = (w - 18 * step) / 2;
    for (let i = 0; i < 19; i += 1) {
      const x = left + i * step;
      for (const [y, dir] of [[26, 1], [h - 26, -1]]) {
        const run = 40 + ((i * 37) % 70);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + dir * run);
        ctx.lineTo(x + (i % 2 ? 24 : -24), y + dir * (run + 24));
        ctx.lineTo(x + (i % 2 ? 24 : -24), y + dir * (run + 60));
        ctx.stroke();
      }
    }
    ctx.font = "600 15px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 19; i += 1) {
      const x = left + i * step;
      for (const [y, names, text] of [[20, PINS_A, 62], [h - 20, PINS_B, h - 62]]) {
        ctx.fillStyle = "#c9a24a";
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(x, text);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "rgba(236, 238, 240, 0.85)";
        ctx.fillText(names[i], 0, 1);
        ctx.restore();
      }
    }
    // Outlines printed around the larger parts.
    ctx.strokeStyle = "rgba(236, 238, 240, 0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(108, 176, 70, 116);
    ctx.strokeRect(286, 104, 96, 96);
  });
}

/** 6.9 x 15.1 cm: a reading, a curve over the day and two small tiles. */
export function phoneScreen() {
  return drawn(552, 1208, (ctx, w, h) => {
    ctx.fillStyle = "#0a0e12";
    ctx.fillRect(0, 0, w, h);
    const card = (x, y, cw, ch) => {
      ctx.fillStyle = "#141b22";
      ctx.beginPath();
      ctx.roundRect(x, y, cw, ch, 28);
      ctx.fill();
    };
    ctx.fillStyle = "#2ee6a3";
    ctx.beginPath();
    ctx.arc(64, 96, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a343d";
    ctx.beginPath();
    ctx.roundRect(92, 84, 190, 24, 12);
    ctx.fill();

    card(36, 150, w - 72, 500);
    ctx.fillStyle = "#f2f5f7";
    ctx.font = "700 150px Arial, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("21,4°", 72, 350);
    ctx.fillStyle = "#8a97a3";
    ctx.font = "600 44px Arial, sans-serif";
    ctx.fillText("48 %", 76, 422);
    // The curve over the day, with a soft fill under it.
    const values = [0.42, 0.4, 0.36, 0.35, 0.4, 0.52, 0.6, 0.66, 0.62, 0.7, 0.74, 0.68, 0.72];
    const px = (i) => 72 + (i * (w - 144)) / (values.length - 1);
    const py = (v) => 610 - v * 170;
    ctx.beginPath();
    values.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
    ctx.strokeStyle = "#2ee6a3";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.lineTo(px(values.length - 1), 618);
    ctx.lineTo(px(0), 618);
    ctx.closePath();
    ctx.fillStyle = "rgba(46, 230, 163, 0.14)";
    ctx.fill();

    for (const [x, color, level] of [[36, "#f5a524", 0.62], [w / 2 + 10, "#4ea3ff", 0.38]]) {
      card(x, 686, w / 2 - 46, 250);
      ctx.fillStyle = "#2a343d";
      ctx.beginPath();
      ctx.roundRect(x + 32, 732, 110, 20, 10);
      ctx.fill();
      ctx.fillStyle = "#222b33";
      ctx.beginPath();
      ctx.roundRect(x + 32, 860, w / 2 - 110, 22, 11);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + 32, 860, (w / 2 - 110) * level, 22, 11);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 62, 808, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    card(36, 972, w - 72, 150);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i === 0 ? "#2ee6a3" : "#2a343d";
      ctx.beginPath();
      ctx.roundRect(72 + i * 146, 1024, 116, 46, 23);
      ctx.fill();
    }
  });
}
