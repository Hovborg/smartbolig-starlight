# Six AI Guide Pairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish six durable, source-backed AI guides in matching Danish and English routes.

**Architecture:** Each subject uses a shared slug across locales so Starlight translation pairing remains canonical. A manifest-driven test locks routes, headings, verification sections and official-source requirements before content is written.

**Tech Stack:** Starlight MDX, Astro content collections, Node quality tests, Pagefind build output.

## Global Constraints

- Vendor-specific facts must be checked against current official sources during implementation.
- Guides distinguish requirements, optional choices, risks, verification and rollback.
- No invented privacy, security, cost, compatibility or performance claims.
- English and Danish versions have equivalent technical meaning, not literal awkward translation.
- No date in titles unless a migration genuinely requires it.

---

### Task 1: Lock guide manifest, routes and navigation

**Files:**
- Create: `scripts/ai-guide-manifest.mjs`
- Modify: `scripts/site-quality.test.mjs`
- Modify: `astro.config.mjs`

**Interfaces:**
- Produces six entries `{ slug, daTitle, enTitle, requiredHeadings, officialDomains }`.

- [ ] Add manifest entries for `home-assistant-ollama-cloud`, `sikre-ai-agenter`, `mcp-forklaret`, `chatgpt-claude-gemini-privatliv`, `lokal-ai-ollama`, and `paalidelige-ai-workflows`.
- [ ] Add failing tests requiring both locale files, identical heading keys and sidebar links.
- [ ] Run the focused site test; expect twelve missing-file failures.
- [ ] Add a collapsed “AI guides” sidebar group with translated labels and the six shared-slug links.
- [ ] Commit manifest/navigation/tests with `git commit -m "test: define six AI guide contracts"`.

### Task 2: Home Assistant local Ollama versus cloud pair

**Files:**
- Create: `src/content/docs/da/ai/home-assistant-ollama-cloud.mdx`
- Create: `src/content/docs/en/ai/home-assistant-ollama-cloud.mdx`

- [ ] Research current official Home Assistant conversation/LLM integration and Ollama documentation; record accessed URLs in Sources.
- [ ] Write prerequisites, architecture decision table, local/cloud setup, secrets/network boundary, fallback, latency/hardware expectations, verification and rollback.
- [ ] Run content audit and focused manifest test; fix every finding.
- [ ] Commit with `git commit -m "docs: add Home Assistant AI model guide"`.

### Task 3: Safe home AI agents pair

**Files:**
- Create: `src/content/docs/da/ai/sikre-ai-agenter.mdx`
- Create: `src/content/docs/en/ai/sikre-ai-agenter.mdx`

- [ ] Research primary security/tool-permission guidance.
- [ ] Cover least privilege, read/write separation, approval gates, secret handling, logs, prompt injection, rollback and a safe Home Assistant example.
- [ ] Add verification checklist proving the agent cannot access an excluded entity/action.
- [ ] Run audit/tests and commit with `git commit -m "docs: add safe home AI agents guide"`.

### Task 4: MCP explained pair

**Files:**
- Create: `src/content/docs/da/ai/mcp-forklaret.mdx`
- Create: `src/content/docs/en/ai/mcp-forklaret.mdx`

- [ ] Research current official MCP architecture/security documentation.
- [ ] Explain client/server/tools/resources/prompts/transports/auth with a household analogy that does not replace technical definitions.
- [ ] Include permission review, local versus remote server, malicious-tool risk and connection verification.
- [ ] Run audit/tests and commit with `git commit -m "docs: explain MCP connections and permissions"`.

### Task 5: Vendor privacy controls pair

**Files:**
- Create: `src/content/docs/da/ai/chatgpt-claude-gemini-privatliv.mdx`
- Create: `src/content/docs/en/ai/chatgpt-claude-gemini-privatliv.mdx`

- [ ] Browse only current official OpenAI, Anthropic and Google privacy/data-control pages for factual settings.
- [ ] Add a dated “verified against” field, comparison table, training/retention/account caveats, sensitive-home-data decision tree and recheck instructions.
- [ ] Avoid claiming one vendor is categorically private; label plan/region differences.
- [ ] Run audit/tests and commit with `git commit -m "docs: compare AI privacy controls"`.

### Task 6: Local AI with Ollama pair

**Files:**
- Create: `src/content/docs/da/ai/lokal-ai-ollama.mdx`
- Create: `src/content/docs/en/ai/lokal-ai-ollama.mdx`

- [ ] Research current official install, model, API and security documentation.
- [ ] Cover hardware sizing method, model/context tradeoffs, install/update, binding/network exposure, storage, verification, removal and realistic limitations.
- [ ] Commands must be directly runnable and avoid unsafe public binding defaults.
- [ ] Run audit/tests and commit with `git commit -m "docs: add practical local Ollama guide"`.

### Task 7: Reliable AI workflows pair

**Files:**
- Create: `src/content/docs/da/ai/paalidelige-ai-workflows.mdx`
- Create: `src/content/docs/en/ai/paalidelige-ai-workflows.mdx`

- [ ] Define a source → structured output → validation → human review → retry/stop workflow.
- [ ] Include concrete JSON schema, three-case evaluation table, failure budget, audit log and rollback example.
- [ ] Verify code blocks and links, then commit with `git commit -m "docs: add reliable AI workflow guide"`.

### Task 8: Integrate and browser-verify all twelve pages

**Files:**
- Modify: `src/content/docs/da/ai/index.mdx`
- Modify: `src/content/docs/en/ai/index.mdx`
- Modify: `src/components/HomePortal.astro`
- Modify: `README.md`
- Create: `docs/verification/YYYY-MM-DD-six-ai-guides.md`

- [ ] Link all six from localized AI hubs and select at most two for existing recommended homepage cards.
- [ ] Document the six-guide set and source-refresh rule.
- [ ] Run `npm run site:test`, AI News gates, content audit, build, SEO validate and `git diff --check`.
- [ ] Serve production output and verify twelve routes, locale switching, headings, tables, code, links and Pagefind search terms.
- [ ] Record evidence and commit with `git commit -m "docs: integrate and verify AI guide series"`.
