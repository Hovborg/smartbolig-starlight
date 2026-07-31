# Changelog

## 2026-07-31

- Extended the Gemma timeout after production tail logs proved that otherwise
  valid English requests could hit the previous 40-second limit under load.
  The Qwen fallback prompt now selects a separate Home Assistant YAML contract
  for editor output, `configuration.yaml`, `automations.yaml`, or an automation
  blueprint. Post-inference validators enforce each requested root shape,
  current `triggers`/`actions` keys, top-level mode placement, and reject
  invalid wrappers, list roots, singular legacy keys, and invented `max_runs`.
  Non-Home-Assistant YAML remains outside this specialist validation, and
  malformed model output fails closed. The browser/diagnostic ceiling is
  aligned at 180 seconds.
- Prevented broad technical answers from ending mid-sentence by increasing the
  reasoning-aware completion budgets, tightening the response-length prompt,
  treating provider token-limit finish reasons as invalid, and recognizing
  dangling legacy responses even when finish metadata is absent. A truncated
  primary answer now uses Qwen; a truncated fallback fails closed. Oversized
  answers are rejected instead of being silently cut at the public character
  cap, while explicit provider `stop` reasons remain authoritative.
- Replaced the weak 8B fallback with Cloudflare-hosted Qwen3 30B-A3B and added
  strict final-answer checks for internal retrieval leakage and explicitly
  requested fenced YAML or automation modes.
- Separated the tool-enabled planning prompt from the post-retrieval answer
  prompt. Final primary and fallback calls can no longer be told to invoke a
  search tool that is not actually available, closing the live
  `search_smartbolig` command leak.
- Tightened technical-answer instructions against invented UI controls and
  related-but-noncompliant code examples. Invalid fallback output now fails
  closed rather than being displayed as a plausible answer. Explicit YAML
  mode requirements accept only active top-level keys, handle every requested
  mode and do not turn conceptual questions into literal syntax requirements.
- Turned the bilingual assistant into a technical AI console with four visible,
  editable work modes for debugging, building, explaining and comparing. The
  modes add no hidden system prompt or permissions.
- Added an honest active-request display that measures elapsed browser wait
  time without claiming access to internal model progress.
- Added per-answer operational diagnostics for the allowlisted model route,
  bounded edge duration, request trace and validated source count. Traces carry
  no prompt or answer data, and the rail is explicitly not a correctness score.
- Added DOM-only fenced code and YAML consoles with preserved indentation and a
  dedicated copy button; model-generated HTML remains prohibited.
- Fixed follow-up questions after long answers by bounding persisted and
  retransmitted context to the API contract while keeping the fresh answer
  fully visible.
- Fixed live chat failures in the primary 26B Workers AI inference path. Gemma
  remains the quality-first model with a 55-second budget and 2,400-token cap;
  each Gemma call can make one bounded 25-second Qwen3 30B-A3B fallback attempt
  with 1,600 tokens. The browser's 180-second cap covers the conservative
  two-run AI Search path, both possible fallbacks and network overhead. Empty
  primary responses also fall back, and every fallback stage emits a sanitized
  request-correlated log.
- Rebuilt the 404 page as a Home Assistant "entity unavailable" card in the
  site's own palette, replacing the off-brand indigo page. It shows the path
  that failed, and suggests the closest real guides from a build-time index of
  every page instead of the same four static links.
- Gave the 404 page a logbook, a `device_class: skuffelse` / `disappointment`
  attribute, and a "Restart Home Assistant" button that restarts, fails, and
  says so. Danish and English are written separately rather than translated,
  and a path with no language prefix now follows the browser's language.
- Expanded reviewed official coverage to seven Home Assistant and ESPHome
  evidence packages: automation troubleshooting, automation modes, template
  states, Home Assistant security, ESPHome security, safe mode, and sensors.
- Generalized the official source badge for both products and added the API
  field `officialVerifiedAt` so clients can see the oldest review date used.
- Kept the official documentation out of AI Search; the registry stores only
  short reviewed paraphrases and direct allowlisted source links.
- Tightened evidence matching so generic internet, alarm-state, Raspberry Pi,
  GitHub Actions, Node-RED, ordinary post-update restarts, sensor class/filter
  choice, template-card styling, standalone non-HA YAML, trigger/condition
  selection, operational meanings of secure/recover, entity exposure, and
  non-ESPHome safe-mode questions cannot receive an official badge.
- Added verified Home Assistant evidence for automation troubleshooting. The
  assistant now distinguishes reviewed official facts, SmartBolig-assisted
  answers, and general AI knowledge.
- Corrected the Danish and English trace guides: YAML-created automations need
  a unique `id` before Home Assistant stores debug traces.
- Added a 50-prompt Danish/English regression suite and lowered model
  temperature from `0.35` to `0.1` for less variable technical answers.
