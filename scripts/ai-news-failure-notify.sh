#!/usr/bin/env bash
# Called by systemd (OnFailure=) when smartbolig-ai-news.service fails.
# Creates one GitHub issue per failure day so breakage is visible immediately
# (GitHub emails the repo owner about new issues).
#
# Security review L-1 (docs/verification/2026-07-13-security-review.md): the
# repository is public, so the issue must never contain raw journal output —
# logs can hold internal paths, tokens, or attacker-controlled feed text. The
# logs are only inspected locally to derive a coarse failure category.
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

logs="$(journalctl --user -u "${UNIT}" --since today --no-pager 2>/dev/null | tail -200 || true)"

# Map the last mentioned pipeline stage to a fixed category label. Only these
# hardcoded labels ever reach the public issue — never the log text itself.
category="unknown"
for entry in \
  "npm ci|dependency-install" \
  "source-health|source-health" \
  "ai-news-publish|draft-generation" \
  "render-image|image-rendering" \
  "ai-news:test|unit-tests" \
  "ai-news:validate|content-validation" \
  "run build|site-build" \
  "seo:validate|seo-validation" \
  "git push|github-publish" \
  "gh pr|github-publish"; do
  pattern="${entry%%|*}"
  label="${entry##*|}"
  if printf '%s' "${logs}" | grep -qF "${pattern}"; then
    category="${label}"
  fi
done

body="$(printf 'The systemd unit `%s` failed on the local runner.\n\nFailure category (derived locally, logs are not published): **%s**\n\nDebug on the runner: `journalctl --user -u %s -e`\n' \
  "${UNIT}" "${category}" "${UNIT}")"

gh issue create --repo "${REPO}" --title "${TITLE}" --body "${body}"
echo "Created failure issue for ${TODAY} (category: ${category})."
