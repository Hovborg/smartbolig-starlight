import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COMFY_HOST = process.env.COMFYUI_HOST || '127.0.0.1';
const COMFY_PORT = process.env.COMFYUI_PORT || '8188';
const COMFY_BASE = `http://${COMFY_HOST}:${COMFY_PORT}`;
const READY_TIMEOUT_MS = Number(process.env.COMFYUI_READY_TIMEOUT_MS || 60_000);
const GEN_TIMEOUT_MS = Number(process.env.COMFYUI_GEN_TIMEOUT_MS || 180_000);

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.join(moduleDir, 'ai-news-comfyui-workflow.json');

const NEGATIVE_PROMPT = 'text, watermark, logo, blurry, low quality, distorted, ugly, deformed, signature, words, letters';

const THEME_RULES = [
  { match: /codex|gpt-?5|openai/i, theme: 'code automation and AI agents at work' },
  { match: /claude|anthropic/i, theme: 'AI assistant orchestration and reasoning' },
  { match: /gemini|google ai|deepmind/i, theme: 'neural network architecture flowing data' },
  { match: /openclaw|cron|local agent|workflow/i, theme: 'automated workflow pipelines and infrastructure' },
  { match: /chatgpt|llm|model/i, theme: 'large language model neural patterns' },
  { match: /smart home|home assistant|iot/i, theme: 'connected smart devices and ambient intelligence' },
];

const STYLE_SUFFIX = 'glowing neon circuits, abstract data streams, cyan and emerald color palette, dark background, cinematic lighting, high detail, 4k, digital art, no text, no logos';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function deriveTheme(title) {
  if (!title) return 'AI news and machine learning';
  for (const rule of THEME_RULES) {
    if (rule.match.test(title)) return rule.theme;
  }
  return 'AI news and machine learning';
}

export function buildPrompt(title) {
  return `Editorial tech illustration of ${deriveTheme(title)}, ${STYLE_SUFFIX}`;
}

export async function isReady() {
  try {
    const res = await fetch(`${COMFY_BASE}/system_stats`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function waitForReady({ logger = console, timeoutMs = READY_TIMEOUT_MS } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReady()) {
      logger.log('ComfyUI is ready.');
      return;
    }
    await sleep(2000);
  }
  throw new Error(`ComfyUI did not become ready within ${timeoutMs / 1000}s at ${COMFY_BASE}`);
}

// Per-request timeout so a stalled HTTP call can never hang past the
// outer GEN_TIMEOUT_MS deadline (which is only checked between iterations).
const REQUEST_TIMEOUT_MS = Number(process.env.COMFYUI_REQUEST_TIMEOUT_MS || 15_000);

async function loadWorkflow(prompt, negativePrompt, seed) {
  const raw = await readFile(WORKFLOW_PATH, 'utf8');
  let workflow;
  try {
    workflow = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Workflow JSON at ${WORKFLOW_PATH} is not valid JSON: ${error.message}`);
  }
  for (const nodeId of ['3', '6', '7']) {
    if (!workflow[nodeId]?.inputs) {
      throw new Error(`Workflow JSON at ${WORKFLOW_PATH} is missing expected node '${nodeId}'`);
    }
  }
  workflow['6'].inputs.text = prompt;
  workflow['7'].inputs.text = negativePrompt;
  workflow['3'].inputs.seed = seed;
  return workflow;
}

async function submitPrompt(workflow) {
  const res = await fetch(`${COMFY_BASE}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ComfyUI /prompt returned ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (!body.prompt_id) throw new Error(`ComfyUI /prompt response missing prompt_id: ${JSON.stringify(body)}`);
  return body.prompt_id;
}

async function pollHistory(promptId) {
  const deadline = Date.now() + GEN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${COMFY_BASE}/history/${promptId}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        const body = await res.json();
        const entry = body[promptId];
        if (entry && entry.outputs) return entry.outputs;
      }
    } catch {
      // Transient poll failure (timeout/network) — retry until the deadline.
    }
    await sleep(1500);
  }
  throw new Error(`ComfyUI generation timed out after ${GEN_TIMEOUT_MS / 1000}s`);
}

function findOutputImage(outputs, promptId) {
  for (const nodeId of Object.keys(outputs)) {
    const images = outputs[nodeId]?.images;
    if (!images) continue;
    for (const image of images) {
      if (image.filename && image.type === 'output') return image;
    }
  }
  throw new Error(`No output image in ComfyUI history for ${promptId}`);
}

async function downloadImage(image, outPath) {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder || '',
    type: image.type || 'output',
  });
  const res = await fetch(`${COMFY_BASE}/view?${params.toString()}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ComfyUI /view returned ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buffer);
  return outPath;
}

export async function generateBackground({ title, date, outPath, seed, logger = console }) {
  const prompt = buildPrompt(title);
  const seedValue = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2_147_483_647);
  logger.log(`ComfyUI prompt (${date}): ${prompt}`);
  const workflow = await loadWorkflow(prompt, NEGATIVE_PROMPT, seedValue);
  const promptId = await submitPrompt(workflow);
  logger.log(`ComfyUI submitted prompt_id=${promptId}, polling for completion ...`);
  const outputs = await pollHistory(promptId);
  const image = findOutputImage(outputs, promptId);
  const local = await downloadImage(image, outPath);
  logger.log(`ComfyUI image saved to ${local}`);
  return { path: local, promptId, prompt, seed: seedValue };
}
