// Validates one chat request. Everything the model receives is bounded here,
// so a leaked secret cannot be used for arbitrary or unbounded inference.
const MAX_BODY_BYTES = 96 * 1024;
const MAX_MESSAGES = 8;
// Reasoning models spend output tokens on thinking before the answer.
const MAX_OUTPUT_TOKENS = 8000;
const ROLES = new Set(["system", "user", "assistant"]);

export function allowedModels(env) {
  return new Set(String(env.ALLOWED_MODELS || "").split(",").map((name) => name.trim()).filter(Boolean));
}

export async function parseRequest(request, models) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error("body too large");
  const body = JSON.parse(raw);
  if (!models.has(body?.model)) throw new Error("model not allowed");
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    throw new Error("messages must be a non-empty array");
  }
  const messages = body.messages.map((message) => {
    if (!ROLES.has(message?.role) || typeof message.content !== "string" || !message.content.trim()) {
      throw new Error("invalid message");
    }
    return { role: message.role, content: message.content };
  });
  const maxTokens = Number.isInteger(body.max_tokens) ? body.max_tokens : 1200;
  const temperature = typeof body.temperature === "number" ? body.temperature : 0.2;
  const effort = ["low", "medium", "high"].includes(body.reasoning_effort) ? { reasoning_effort: body.reasoning_effort } : {};
  return {
    ...effort,
    model: body.model,
    messages,
    max_tokens: Math.min(Math.max(maxTokens, 16), MAX_OUTPUT_TOKENS),
    temperature: Math.min(Math.max(temperature, 0), 1),
  };
}
