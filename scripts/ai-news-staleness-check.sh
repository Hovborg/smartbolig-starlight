#!/usr/bin/env bash
# Fails when the PUBLISHED site has gone stale.
#
# Why this exists: on 2026-07-29 the live site was found stuck on the
# 2026-07-14 issue — for 15 days. Three independent things had broken (an
# unreadable gh token, a dependency-audit gate that blocked every deploy, and
# unmerged drafts), and each one failed quietly. The daily automation's own
# OnFailure hook could not report any of it, because it authenticated with the
# same token that had stopped working.
#
# So this check deliberately looks at the live site over plain HTTPS. It shares
# no credential, no code path and no host state with the automation it watches,
# which is the only way it can still speak up when that automation cannot.
#
# It answers "is the site stale?", never "why?". A quiet news week trips it just
# as a broken deploy does — the novelty gate legitimately skips days when the
# feeds repeat themselves. That is intended: a week without a published issue is
# worth a look either way. Raise SMARTBOLIG_AI_NEWS_MAX_AGE_DAYS if the noise
# outweighs the signal.
set -euo pipefail

INDEX_URL="${SMARTBOLIG_AI_NEWS_INDEX_URL:-https://smartbolig.net/da/ai/nyheder/}"
MAX_AGE_DAYS="${SMARTBOLIG_AI_NEWS_MAX_AGE_DAYS:-4}"

if ! html="$(curl -fsS --max-time 30 "${INDEX_URL}")"; then
  echo "Could not fetch ${INDEX_URL} — the site may be down, or DNS/network is broken." >&2
  exit 1
fi

# The index links every issue as /da/ai/nyheder/YYYY-MM-DD; the newest sorts last.
latest="$(printf '%s' "${html}" \
  | grep -oE '/da/ai/nyheder/[0-9]{4}-[0-9]{2}-[0-9]{2}' \
  | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' \
  | sort -u | tail -1)"

if [[ -z "${latest}" ]]; then
  echo "Fetched ${INDEX_URL} but found no issue links — the page layout may have changed." >&2
  exit 1
fi

latest_epoch="$(date -d "${latest}" +%s)"
now_epoch="$(date +%s)"
age_days=$(( (now_epoch - latest_epoch) / 86400 ))

if (( age_days > MAX_AGE_DAYS )); then
  echo "STALE: newest published AI News is ${latest}, ${age_days} days old (threshold ${MAX_AGE_DAYS})." >&2
  echo "Check, in this order: journalctl --user -u smartbolig-ai-news.service" >&2
  echo "                      gh run list --repo Hovborg/smartbolig-starlight" >&2
  echo "                      gh pr list --repo Hovborg/smartbolig-starlight --state open" >&2
  exit 1
fi

echo "OK: newest published AI News is ${latest}, ${age_days} days old (threshold ${MAX_AGE_DAYS})."
