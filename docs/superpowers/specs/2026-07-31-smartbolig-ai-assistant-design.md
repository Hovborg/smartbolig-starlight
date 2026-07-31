# SmartBolig AI Assistant Design

**Date:** 2026-07-31
**Status:** Approved by the user's request to build the complete assistant, with
the explicit correction that SmartBolig AI Search must not be its only
knowledge source.

## Outcome

SmartBolig.net gets a polished, accessible chat assistant in the lower-right
corner. The assistant is a broad smart-home and homelab expert powered by
Workers AI. It can answer about Home Assistant, ESPHome, sensors, Zigbee,
Z-Wave, Matter, Thread, MQTT, Docker, Proxmox, networking, local AI and adjacent
topics even when SmartBolig.net has not published a guide about the question.

The existing `smartbolig-ai-search` instance is an optional retrieval tool. It
grounds answers in SmartBolig's own pages when that improves the answer, but it
never limits the assistant to indexed site content.

## Architecture

```text
Browser widget
    |
    | same-origin POST /api/chat
    v
Cloudflare Pages Function
    |
    +-- validates origin, body, roles, size and rate limit
    |
    +-- Workers AI: @cf/google/gemma-4-26b-a4b-it
    |      broad multilingual expert reasoning and response
    |
    +-- supplemental SmartBolig retrieval
           AI Search binding -> smartbolig-ai-search
           source-backed SmartBolig excerpts and links
```

There is no separate D1 or hand-built Vectorize database. AI Search already
owns the retrieval index for SmartBolig content. A separate database would add
operational burden without improving this assistant.

## Backend contract

`POST /api/chat`

Request:

```json
{
  "locale": "da",
  "messages": [
    { "role": "user", "content": "Hvordan vælger jeg en Zigbee-sensor?" }
  ]
}
```

Response:

```json
{
  "answer": "…",
  "sources": [
    {
      "title": "Zigbee-sensorer",
      "url": "https://smartbolig.net/da/produkter/zigbee-sensorer/"
    }
  ],
  "sourceMode": "mixed"
}
```

`sourceMode` is `general` or `mixed`. It describes whether canonical SmartBolig
sources were used in addition to broad model knowledge; it is not a confidence
score.

## Model behavior

The system instruction establishes that the assistant:

- has broad general knowledge across the requested smart-home and homelab
  domains;
- supplements substantive smart-home and homelab questions with one bounded
  `smartbolig-ai-search` lookup when the binding is available, while still
  reasoning from broad model knowledge;
- never invents SmartBolig citations;
- distinguishes site-backed information from general model knowledge;
- marks version-sensitive or safety-critical details for verification when no
  current SmartBolig source supports them;
- cannot control the visitor's systems and does not pretend to have inspected
  their installation;
- prefers safe, reversible steps and valid paste-ready YAML/code;
- answers in Danish or English according to the active locale and the visitor's
  language.

`@cf/google/gemma-4-26b-a4b-it` is the default because Cloudflare documents
Gemma 4 as its most intelligent Gemma family, with reasoning, multilingual
support and lower per-token pricing than the evaluated GPT-OSS alternative.
Live Danish comparisons also produced the clearest complete answer. The model
name is kept in one exported constant so it can be evaluated and replaced
without rewriting the endpoint.

## Security and privacy

- The public endpoint is same-origin and rejects foreign browser origins.
- Only `user` and `assistant` history is accepted; clients cannot inject
  `system` or `tool` messages.
- Request bytes, message count, message length and total conversation length
  are bounded before the model is called.
- A Cloudflare Rate Limiting binding limits anonymous abuse by connecting IP.
- The native Workers AI binding performs one final model call for ordinary
  domain answers, optionally preceded by one bounded AI Search lookup. A
  model-selected retrieval fallback remains capped at two model calls. Model
  output and retrieval result counts are bounded, and optional retrieval fails
  over to broad model knowledge after five seconds.
- Returned source URLs are allowlisted to canonical SmartBolig hosts.
- Errors sent to visitors never include stack traces, binding details or model
  payloads.
- Responses use `Cache-Control: no-store`.
- The widget renders all model text with DOM text nodes, never `innerHTML`.
- Conversation history is stored only in `sessionStorage`, capped to the same
  server-side history limit, and cleared when the browser session ends.
- The widget warns visitors not to submit passwords, tokens or personal data.
- The Danish and English privacy policies describe the AI processing before
  release.

## User experience

The closed state is a restrained animated orb with a short label. It does not
auto-open. The open state is a glassy, high-contrast panel on desktop and a
bottom sheet on narrow screens. It includes:

- clear `AI` and online status treatment;
- four useful starter prompts;
- readable user and assistant bubbles;
- loading, retry and rate-limit states;
- copy-answer controls;
- source chips that open only canonical SmartBolig URLs;
- keyboard focus management, Escape-to-close, live-region status and
  reduced-motion support;
- localized Danish and English copy.

The visual treatment follows SmartBolig's existing palette rather than
introducing a stock Cloudflare widget or an unrelated brand.

## Explicit non-goals

- No autonomous control of Home Assistant or visitor infrastructure.
- No long-term conversation database or user accounts.
- No public administration interface.
- No separate `chat.smartbolig.net` deployment; the API stays same-origin on
  SmartBolig.net.
- No claim that AI Search contains all smart-home knowledge.
- No AI Gateway caching in front of AI Search.

## Verification bar

The change is complete only after unit/contract tests, existing project gates,
Cloudflare Pages Function compilation, a production build, and desktop/mobile
visual inspection pass. A real Workers AI/AI Search roundtrip is reported
separately because it consumes Cloudflare resources and depends on the correct
account bindings being available.
