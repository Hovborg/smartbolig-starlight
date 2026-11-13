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

const tokenCount = (value) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);

// What a finished call cost, from the token counts the model reported.
// Returns null unless both counts are real numbers above zero, and the caller
// then keeps the worst case: a call always reads and writes something, so a
// zero is a missing count, not a free call. When the total is larger than
// input plus output (reasoning tokens reported outside the output count),
// the difference is charged as output.
export function actualCost(model, usage) {
  const input = tokenCount(usage?.prompt_tokens ?? usage?.input_tokens);
  const reported = tokenCount(usage?.completion_tokens ?? usage?.output_tokens);
  if (input === null || reported === null) return null;
  const total = tokenCount(usage?.total_tokens);
  const output = total === null ? reported : Math.max(reported, total - input);
  return neuronsFor(model, input, output);
}
