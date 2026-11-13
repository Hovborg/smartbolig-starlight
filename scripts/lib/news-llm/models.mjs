// Which model writes and which model checks, per provider. Each list is a
// fallback chain: the next model is used when the previous one fails or is
// retired. Override with AI_NEWS_WRITER_MODELS / AI_NEWS_REVIEWER_MODELS
// (comma-separated). Choice and measurements: docs/nyhedsflow.md.
export const DEFAULT_MODELS = {
  http: {
    writer: ["@cf/deepseek-ai/deepseek-v4.1-flash-1017", "@cf/google/gemma-4-26b-a4b-it"],
    reviewer: ["@cf/openai/gpt-oss-120b", "@cf/nvidia/nemotron-3-120b-a12b"],
  },
  claude: {
    writer: ["sonnet"],
    reviewer: ["sonnet"],
  },
};

const list = (value) => String(value || "").split(",").map((name) => name.trim()).filter(Boolean);

export function modelsFor(kind, env = process.env) {
  const defaults = DEFAULT_MODELS[kind];
  if (!defaults) throw new Error(`Unknown AI_NEWS_LLM_PROVIDER: ${kind}`);
  const writer = list(env.AI_NEWS_WRITER_MODELS);
  const reviewer = list(env.AI_NEWS_REVIEWER_MODELS);
  return {
    writer: writer.length > 0 ? writer : defaults.writer,
    reviewer: reviewer.length > 0 ? reviewer : defaults.reviewer,
  };
}
