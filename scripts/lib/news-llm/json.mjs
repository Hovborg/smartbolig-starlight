// Pulls the JSON object out of a model reply. Reasoning models may wrap the
// answer in <think> blocks or code fences; neither is part of the answer.
export function extractJson(text) {
  const stripped = String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in LLM output");
  return JSON.parse(stripped.slice(start, end + 1));
}
