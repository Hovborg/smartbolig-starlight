# Changelog

## 2026-07-31

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
  remains the quality-first model with a 30-second budget and 1,200-token cap;
  a Cloudflare-hosted fast Llama model gets one bounded 20-second fallback
  attempt with 900 tokens. The browser's 120-second cap covers the complete
  two-run AI Search path plus network overhead. Empty primary responses also
  fall back, and every fallback stage emits a sanitized request-correlated log.
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
