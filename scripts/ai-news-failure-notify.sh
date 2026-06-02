#!/usr/bin/env bash
# Called by systemd (OnFailure=) when smartbolig-ai-news.service fails.
# Creates one GitHub issue per failure day so breakage is visible immediately
# (GitHub emails the repo owner about new issues).
set -euo pipefail

REPO="${SMARTBOLIG_AI_NEWS_REPO:-Hovborg/smartbolig-starlight}"
UNIT="${SMARTBOLIG_AI_NEWS_UNIT:-smartbolig-ai-news.service}"
TODAY="$(date +%F)"
TITLE="Daily AI-news automation failed ${TODAY}"

# Don't open duplicate issues for the same day.
existing="$(gh issue list --repo "${REPO}" --state open \
  --search "in:title \"${TITLE}\"" --json number --jq '.[0].number // ""')"
if [[ -n "${existing}" ]]; then
  echo "Issue for ${TODAY} already exists (#${existing}); not creating another."
  exit 0
fi

logs="$(journalctl --user -u "${UNIT}" --since today --no-pager | tail -60 || true)"

body="$(printf 'systemd unit `%s` failed on Shark.\n\nLast 60 log lines:\n\n```\n%s\n```\n\nDebug: `journalctl --user -u %s -e`\n' \
  "${UNIT}" "${logs}" "${UNIT}")"

gh issue create --repo "${REPO}" --title "${TITLE}" --body "${body}"
echo "Created failure issue for ${TODAY}."
