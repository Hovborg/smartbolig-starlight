// Shared offline fixtures for the ai-news-llm-*.test.mjs files. Not a test file
// itself (the npm glob only runs *.test.mjs), so nothing here touches a network.
import { LEDE_WRITER_SYSTEM, LEDE_REVIEWER_SYSTEM } from "./lib/news-llm/prompt-lede.mjs";
import { REVIEWER_SYSTEM } from "./lib/news-llm/prompt-review.mjs";
import { WRITER_SYSTEM } from "./lib/news-llm/prompt-write.mjs";

export const sourceItem = (overrides = {}) => ({
  sourceName: "OpenAI News",
  canonicalUrl: "https://openai.com/news/scoped-permissions",
  title: "OpenAI adds scoped permissions for home agents",
  summary: "The update adds scoped tool permissions and a visible approval step.",
  bodyText: "The official announcement describes a staged rollout and permission scopes for agents.",
  published: new Date("2026-07-11T08:00:00Z"),
  ...overrides,
});

// Every field has 10 or more words and no digits, so format and grounding pass.
export const validStory = (extra = "") => ({
  what: { en: `The vendor says it added scoped permissions for its agent products${extra}`, da: `Leverandøren siger at den har tilføjet afgrænsede tilladelser til sine agentprodukter${extra}` },
  why: { en: "The source says the change is aimed at teams that run agents with tools", da: "Kilden siger at ændringen er rettet mod teams der kører agenter med værktøjer" },
  verify: { en: "Read the official release notes and check which version you have installed", da: "Læs de officielle udgivelsesnoter og tjek hvilken version du har installeret" },
  uncertainty: { en: "The source does not state the rollout schedule or any regional limits", da: "Kilden oplyser hverken udrulningsplan eller eventuelle regionale begrænsninger" },
});

export const validLede = () => ({
  en: "Today's issue covers a permissions update for agents and what the source leaves open.",
  da: "Dagens udgave dækker en opdatering af tilladelser til agenter og hvad kilden lader stå åbent.",
});

export const PASS = { pass: true, issues: [] };
export const reject = (claim = "it is faster", field = "why.en") => ({
  pass: false,
  issues: [{ field, claim, type: "unsupported", source: "not in source" }],
});

const asText = (value) => (typeof value === "string" ? value : JSON.stringify(value));

// Scripted chat: each role has a queue; an Error in the queue is thrown.
export function scriptedChat({ writer = [], reviewer = [], writerModel = "writer-model", reviewerModel = "reviewer-model" } = {}) {
  const queues = { writer: [...writer], reviewer: [...reviewer] };
  const calls = [];
  async function chat(request) {
    calls.push(request);
    const queue = queues[request.role];
    if (queue.length === 0) throw new Error(`script exhausted for ${request.role}`);
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return { text: asText(next), model: request.role === "writer" ? writerModel : reviewerModel };
  }
  return { chat, calls, byRole: (role) => calls.filter((call) => call.role === role) };
}

// Router chat for issue-level tests: answers by prompt kind and candidate title.
// `verdicts` maps a title to false when the fact check should always reject it.
export function routedChat({ verdicts = {}, ledeOk = true, failWith } = {}) {
  const calls = [];
  const titleOf = (user) => user.match(/^title: (.*)$/m)?.[1];
  async function chat({ role, system, user }) {
    calls.push({ role, kind: system === WRITER_SYSTEM ? "story" : system === REVIEWER_SYSTEM ? "review" : system === LEDE_WRITER_SYSTEM ? "lede" : "lede-review", title: titleOf(user) });
    if (failWith?.(calls.at(-1))) throw failWith(calls.at(-1));
    if (system === WRITER_SYSTEM) return { text: JSON.stringify(validStory()), model: "writer-model" };
    if (system === REVIEWER_SYSTEM) return { text: JSON.stringify(verdicts[titleOf(user)] === false ? reject() : PASS), model: "reviewer-model" };
    if (system === LEDE_WRITER_SYSTEM) return { text: JSON.stringify(validLede()), model: "writer-model" };
    if (system === LEDE_REVIEWER_SYSTEM) return { text: JSON.stringify(ledeOk ? PASS : reject("bad lede", "lede.en")), model: "reviewer-model" };
    throw new Error("unknown prompt");
  }
  return { chat, calls, kinds: (kind) => calls.filter((call) => call.kind === kind) };
}

export const silent = () => {};
