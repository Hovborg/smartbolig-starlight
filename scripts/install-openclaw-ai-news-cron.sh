#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER="${SITE_ROOT}/scripts/openclaw-ai-news-daily.sh"
JOB_NAME="${OPENCLAW_SMARTBOLIG_AI_NEWS_JOB_NAME:-smartbolig-ai-news-daily}"
CRON_EXPR="${OPENCLAW_SMARTBOLIG_AI_NEWS_CRON:-20 7 * * *}"
TZ_NAME="${OPENCLAW_SMARTBOLIG_AI_NEWS_TZ:-Europe/Copenhagen}"
AGENT_ID="${OPENCLAW_SMARTBOLIG_AI_NEWS_AGENT:-main}"
TOOLS="${OPENCLAW_SMARTBOLIG_AI_NEWS_TOOLS:-exec}"

if ! command -v openclaw >/dev/null 2>&1; then
  echo "openclaw CLI was not found in PATH." >&2
  exit 1
fi

if [[ ! -x "${RUNNER}" ]]; then
  echo "AI News runner is not executable: ${RUNNER}" >&2
  exit 1
fi

existing_ids="$(openclaw cron list --all --json | jq -r --arg name "${JOB_NAME}" '.jobs[]? | select(.name == $name) | .id')"
if [[ -n "${existing_ids}" ]]; then
  while IFS= read -r id; do
    [[ -n "${id}" ]] || continue
    openclaw cron rm "${id}" >/dev/null
  done <<<"${existing_ids}"
fi

openclaw approvals allowlist add --agent "${AGENT_ID}" "${RUNNER}" >/dev/null

message="$(cat <<EOF
Run the unattended SmartBolig AI News automation.

Execute exactly this command as one exec tool call:
${RUNNER}

Do not run pwd, git status, npm, gh, cat, ls, cd, bash, sh, or any other separate shell command before it.
Do not inspect files first.
Return only the runner's final result summary.
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
  --light-context \
  --no-deliver >/dev/null

echo "Installed OpenClaw cron job: ${JOB_NAME} (${CRON_EXPR}, ${TZ_NAME}, agent=${AGENT_ID}, tools=${TOOLS}, runner=${RUNNER})"
