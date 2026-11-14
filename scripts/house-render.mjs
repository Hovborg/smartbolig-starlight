// Renders still images of the 3D house with headless Chrome: the poster the
// homepage shows before the 3D model has loaded, and pictures for review.
//
//   node scripts/house-render.mjs <outDir> <name>|<width>x<height>|<mode>|<view>|<focus?>|<az?> ...
//
// From code, a job may carry its own camera instead of a named view:
//   { name, width, height, scale, mode, focus, camera: { az, el, dist, target: [x, y, z] } }
//
// The pictures are PNG on the dark page colour, drawn at twice the size and
// left to the caller to scale down (scripts/house-posters.mjs).
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#090d11}canvas{display:block}</style>
<canvas id="c"></canvas><script type="module">
import { mountHouse } from "/house.js";
window.renderHouse = (job) => {
  const canvas = document.getElementById("c");
  window.house?.dispose();
  const fresh = canvas.cloneNode();
  canvas.replaceWith(fresh);
  fresh.id = "c";
  fresh.style.width = job.width + "px";
  fresh.style.height = job.height + "px";
  const house = mountHouse(fresh, { still: true, mode: job.mode, view: job.camera || job.view, focus: job.focus || null, time: 2.1, shadowSize: 4096, quality: job.quality || "high", background: job.background || "#090d11" });
  if (!house) return false;
  window.house = house;
  house.resize(job.width, job.height, job.scale);
  if (job.az) house.rotate(job.az);
  house.renderStill();
  return true;
};
window.ready = true;
</script>`;

async function bundle() {
  const result = await build({
    entryPoints: ["src/lib/house3d/index.mjs"], bundle: true, format: "esm", write: false, minify: true, logLevel: "error",
  });
  return result.outputFiles[0].text;
}

export async function renderHouse(outDir, jobs) {
  const script = await bundle();
  const server = createServer((request, response) => {
    if (request.url === "/house.js") response.writeHead(200, { "content-type": "text/javascript" }).end(script);
    else response.writeHead(200, { "content-type": "text/html" }).end(PAGE);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const profile = await mkdtemp(join(tmpdir(), "house-render-"));
  const port = 9600 + Math.floor(Math.random() * 300);
  const chrome = spawn(CHROME, [
    "--headless=new", "--no-first-run", "--hide-scrollbars", "--enable-gpu", "--ignore-gpu-blocklist",
    "--use-angle=d3d11", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  try {
    let target;
    for (let i = 0; i < 60 && !target; i += 1) {
      await sleep(200);
      try {
        target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((entry) => entry.type === "page");
      } catch { /* Chrome is still starting. */ }
    }
    if (!target) throw new Error("Chrome did not start");
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
    let id = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    });
    const send = (method, params = {}) => new Promise((resolve) => {
      id += 1;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (reply.result?.exceptionDetails) throw new Error(JSON.stringify(reply.result.exceptionDetails).slice(0, 600));
      return reply.result?.result?.value;
    };
    await send("Page.enable");
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    await send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/` });
    for (let i = 0; i < 50 && !(await evaluate("window.ready === true")); i += 1) await sleep(200);
    await mkdir(outDir, { recursive: true });
    for (const job of jobs) {
      await send("Emulation.setDeviceMetricsOverride", { width: job.width, height: job.height, deviceScaleFactor: job.scale, mobile: false });
      const ok = await evaluate(`window.renderHouse(${JSON.stringify(job)})`);
      if (!ok) throw new Error("WebGL is not available in headless Chrome");
      await sleep(350);
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(outDir, `${job.name}.png`), Buffer.from(shot.result.data, "base64"));
      console.log("rendered", job.name);
    }
    socket.close();
  } finally {
    chrome.kill();
    server.close();
    await sleep(400);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

if (process.argv[1]?.endsWith("house-render.mjs")) {
  const [outDir, ...specs] = process.argv.slice(2);
  const jobs = specs.map((spec) => {
    const [name, size, mode = "evening", view = "overview", focus = "", az = "0"] = spec.split("|");
    const [width, height] = size.split("x").map(Number);
    return { name, width, height, mode, view, focus, az: Number(az), scale: 2 };
  });
  await renderHouse(outDir, jobs);
}
