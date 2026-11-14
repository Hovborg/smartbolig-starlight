// The search_smartbolig tool: when it is required and how a model tool call is read.

import { MAX_SEARCH_QUERY_CHARS } from "./limits.js";
import { hasOnlyKeys, isPlainObject } from "./request.js";

const SMART_HOME_OR_HOMELAB_PATTERN =
  /\b(?:home assistant|ha|esphome|esp32|esp8266|sensor(?:er|s)?|zigbee|z-?wave|matter|thread|mqtt|bluetooth|wi-?fi|ethernet|vlan|dns|reverse[- ]proxy|docker|container(?:e|s)?|proxmox|virtualisering|virtualization|nas|backup|sikkerhed|security|automation|automatisering|smart[- ]?home|smartbolig|smart bolig|shelly|tasmota|truenas|opnsense|pfsense|homey|node-?red|frigate|kamera|camera|energi|energy|solcelle|elpris|homelab)\b/iu;

// What the model is told about the tool. Only offered when the site index can be read.
export const SEARCH_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_smartbolig",
      description:
        "Search SmartBolig.net for a relevant first-party guide or site-specific fact. Use only when it improves the answer.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            minLength: 2,
            maxLength: MAX_SEARCH_QUERY_CHARS,
            description: "A focused search query for SmartBolig.net",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
];

export function selectSearchToolCall(result) {
  const chatCompletionCalls = result?.choices?.[0]?.message?.tool_calls;
  const toolCalls = Array.isArray(chatCompletionCalls) ? chatCompletionCalls : result?.tool_calls;
  if (!Array.isArray(toolCalls)) return null;

  for (const toolCall of toolCalls.slice(0, 4)) {
    const name = toolCall?.name ?? toolCall?.function?.name;
    if (name !== "search_smartbolig") continue;

    let args = toolCall?.arguments ?? toolCall?.function?.arguments;
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        continue;
      }
    }
    if (!isPlainObject(args) || !hasOnlyKeys(args, new Set(["query"]))) continue;

    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (query.length < 2 || query.length > MAX_SEARCH_QUERY_CHARS) continue;
    const id =
      typeof toolCall?.id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(toolCall.id)
        ? toolCall.id
        : "search_smartbolig_1";
    return { id, query };
  }

  return null;
}

export function shouldRequireSmartboligSearch(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return SMART_HOME_OR_HOMELAB_PATTERN.test(latestUserMessage?.content || "");
}
