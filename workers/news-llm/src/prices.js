// What a call costs, in neurons. Cloudflare bills Workers AI by tokens and
// publishes each model's price as neurons per million tokens:
// https://developers.cloudflare.com/workers-ai/platform/pricing/ (read 2026-11-14).
// A model without a row here cannot be called, so the ceiling always knows
// the price of what it lets through.
export const NEURONS_PER_MILLION_TOKENS = {
  "@cf/deepseek-ai/deepseek-v4.1-flash-1017": { input: 27273, output: 109091 },
  "@cf/google/gemma-4-26b-a4b-it": { input: 9091, output: 27273 },
  "@cf/openai/gpt-oss-120b": { input: 31818, output: 68182 },
  "@cf/nvidia/nemotron-3-120b-a12b": { input: 45455, output: 136364 },
};

export const isPriced = (model) => Object.hasOwn(NEURONS_PER_MILLION_TOKENS, model);

export function neuronsFor(model, inputTokens, outputTokens) {
  const price = NEURONS_PER_MILLION_TOKENS[model];
  return Math.ceil((inputTokens * price.input + outputTokens * price.output) / 1_000_000);
}

// The most a request can cost before it runs: a token is never shorter than
// one byte, so the body size bounds the input tokens, and the model cannot
// write more than max_tokens.
export const worstCase = (model, bodyBytes, maxTokens) => neuronsFor(model, bodyBytes, maxTokens);

// What a finished call cost, from the token counts the model reported.
// Returns null when they are missing, and the caller keeps the worst case.
export function actualCost(model, usage) {
  const input = Number(usage?.prompt_tokens ?? usage?.input_tokens);
  const output = Number(usage?.completion_tokens ?? usage?.output_tokens);
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return null;
  return neuronsFor(model, input, output);
}
