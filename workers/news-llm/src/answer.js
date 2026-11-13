// Workers AI models answer in two shapes: { response } or OpenAI-style choices.
export function answerText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => (part?.type === "text" && typeof part.text === "string" ? part.text : "")).join("");
}

export function finishReason(result) {
  const reason = result?.choices?.[0]?.finish_reason || result?.finish_reason || result?.stop_reason;
  return typeof reason === "string" ? reason : "stop";
}
