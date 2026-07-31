# SmartBolig AI Official Coverage Design

## Outcome

SmartBolig AI should retain broad Workers AI knowledge while giving visitors
reviewed, source-bound guidance for the most common Home Assistant and ESPHome
failure modes. The source badge must describe only facts selected by the server;
it must never imply that the model's full answer or private installation state
was officially verified.

## Selected architecture

Extend the existing deterministic `official-evidence.js` registry into a generic
multi-topic selector. Each entry contains bilingual paraphrased facts, a review
date, fixed official HTTPS sources, and a narrowly scoped matcher. A question may
select more than one entry; facts and sources are deduplicated before the same
bounded Workers AI call.

The first expansion covers:

- Home Assistant automation run modes;
- Home Assistant template state and numeric-conversion safety;
- Home Assistant account, secret, and remote-access security;
- ESPHome API, OTA, web-server, and network security;
- ESPHome safe-mode recovery;
- ESPHome sensor metadata, filtering, and raw/filtered events.

The existing automation-trace package remains unchanged and continues to
override conflicting broad model knowledge only for its listed facts.

## Rejected alternatives

### Bulk-upload the official docs to AI Search

Cloudflare AI Search can combine built-in file storage with the existing
SmartBolig website crawler. Home Assistant and ESPHome documentation are both
licensed CC BY-NC-SA 4.0, while SmartBolig has affiliate/commercial elements.
Bulk mirroring therefore creates avoidable licensing, attribution, and stale
snapshot risk. This phase will not copy either documentation corpus.

### Let the model browse arbitrary URLs

The public chat endpoint must not accept or fetch user-controlled URLs. Arbitrary
fetching would add SSRF, prompt-injection, latency, and availability risk. Only
fixed server-owned source URLs are returned.

### Give every technical answer an official badge

The broad model knows substantially more than the reviewed registry, but model
training knowledge is not evidence that a current exact claim was checked. An
official badge remains limited to questions matched by reviewed fact packages.

## Contracts

- `selectOfficialEvidence(message, locale)` returns
  `{ facts, sources, evidenceIds, verifiedAt }`.
- `verifiedAt` is the oldest `lastVerified` date among selected entries, or
  `null` when no entry matches.
- Official source hosts remain exactly `www.home-assistant.io` and `esphome.io`.
- ESPHome evidence requires explicit ESPHome context; generic OTA, boot-loop,
  safe-mode, sensor-conversion, class-choice, and filter-choice questions remain
  broad AI knowledge unless a reviewed package directly covers them.
- A selected package sets API `sourceMode` to `official`; otherwise existing
  `mixed` and `general` behavior is unchanged.
- Widget copy becomes product-neutral:
  `Officielle kilder kontrolleret` / `Official sources checked`.
- No new Cloudflare resource, secret, dependency, model call, or private Home
  Assistant access is introduced.

## Verification

- Selector regression prompts cover every package in Danish and English plus
  false-positive cases for GitHub Actions, generic security, generic sensors,
  Wi-Fi, and non-ESPHome firmware.
- API tests prove multiple packages are deduplicated, official reference data is
  server-controlled, and the oldest review date is returned.
- Widget tests prove the generalized badge and existing strict source allowlist.
- Full site, content, AI-news, build, SEO, Worker build, audit, and Wrangler
  dry-run gates must pass before merge.
- Production is verified with one Home Assistant mode question, one template
  question, one ESPHome security question, one safe-mode question, and one
  sensor-filter question.
