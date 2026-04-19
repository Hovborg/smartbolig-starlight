#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JOB_NAME="${OPENCLAW_SMARTBOLIG_AI_NEWS_JOB_NAME:-smartbolig-ai-news-daily}"
CRON_EXPR="${OPENCLAW_SMARTBOLIG_AI_NEWS_CRON:-20 7 * * *}"
TZ_NAME="${OPENCLAW_SMARTBOLIG_AI_NEWS_TZ:-Europe/Copenhagen}"
AGENT_ID="${OPENCLAW_SMARTBOLIG_AI_NEWS_AGENT:-main}"
TOOLS="${OPENCLAW_SMARTBOLIG_AI_NEWS_TOOLS:-exec,read,write,web}"

if ! command -v openclaw >/dev/null 2>&1; then
  echo "openclaw CLI was not found in PATH." >&2
  exit 1
fi

existing_ids="$(openclaw cron list --all --json | jq -r --arg name "${JOB_NAME}" '.jobs[]? | select(.name == $name) | .id')"
if [[ -n "${existing_ids}" ]]; then
  while IFS= read -r id; do
    [[ -n "${id}" ]] || continue
    openclaw cron rm "${id}" >/dev/null
  done <<<"${existing_ids}"
fi

message="$(cat <<EOF
Create the daily public-safe SmartBolig AI News draft.

Project root: ${SITE_ROOT}
Current date: use Europe/Copenhagen date.

Rules:
- Work only in the SmartBolig site repo.
- Use official sources first: OpenAI, OpenAI Codex releases, Anthropic Claude Code releases/docs, Google AI/Gemini docs, Gemini CLI releases, OpenClaw releases.
- Publish only the strongest AI news. Skip the day if the signal is weak.
- Write in a natural editorial blog-post style under SmartBolig.net, not as an AI-generated digest.
- Do not copy source text. Use your own short synthesis and source links only.
- Do not publish rumors, leaks, social recap posts, local OpenClaw report internals, private file paths, phone numbers, tokens, credentials, raw logs, or generator wording.
- Do not push directly to main.
- If there is not enough signal, do not create filler content.

Workflow:
1. cd ${SITE_ROOT}
2. Check git status and pull/rebase main if clean.
3. Run: npm run ai-news:source-health
4. Run: node scripts/ai-news-publish.mjs --write --date "\$(TZ=Europe/Copenhagen date +%F)" --days 10
5. Run: npm run ai-news:validate
6. Run: npm run build
7. If there are no changes, stop and report that no public AI News draft was needed.
8. If there are changes, create a branch named ai-news/\$(TZ=Europe/Copenhagen date +%F)-openclaw, commit the news files, push the branch, and create a GitHub PR against main.
9. Keep the PR body concise: mention official sources, source health, validation, build status, and that it needs editorial review before merge.
EOF
)"

openclaw cron add \
  --name "${JOB_NAME}" \
  --cron "${CRON_EXPR}" \
  --tz "${TZ_NAME}" \
  --agent "${AGENT_ID}" \
  --timeout-seconds 1200 \
  --tools "${TOOLS}" \
  --message "${message}" \
  --no-deliver >/dev/null

echo "Installed OpenClaw cron job: ${JOB_NAME} (${CRON_EXPR}, ${TZ_NAME}, agent=${AGENT_ID}, tools=${TOOLS})"
