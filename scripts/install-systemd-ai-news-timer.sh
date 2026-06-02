#!/usr/bin/env bash
# Installs the SmartBolig AI News automation as a systemd user timer.
#
# This is the recommended way to run the daily automation: the runner script is
# deterministic bash and needs no LLM/agent layer. The timer replaces the legacy
# OpenClaw cron job (scripts/install-openclaw-ai-news-cron.sh), which depended on
# an agent harness exposing an exec tool and broke whenever that harness changed.
#
# What it sets up:
#   smartbolig-ai-news.service          - oneshot, runs openclaw-ai-news-daily.sh
#   smartbolig-ai-news-failure.service  - OnFailure hook, opens a GitHub issue
#   smartbolig-ai-news.timer            - daily at 07:20 local time, Persistent
#
# Idempotent: re-running overwrites the units and re-enables the timer.
set -euo pipefail

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER="${SITE_ROOT}/scripts/openclaw-ai-news-daily.sh"
NOTIFIER="${SITE_ROOT}/scripts/ai-news-failure-notify.sh"
UNIT_DIR="${SMARTBOLIG_AI_NEWS_UNIT_DIR:-${HOME}/.config/systemd/user}"
ON_CALENDAR="${SMARTBOLIG_AI_NEWS_ONCALENDAR:-*-*-* 07:20:00}"
SYSTEMCTL_BIN="${SMARTBOLIG_AI_NEWS_SYSTEMCTL:-systemctl}"

for required in "${RUNNER}" "${NOTIFIER}"; do
  if [[ ! -x "${required}" ]]; then
    echo "Required script is missing or not executable: ${required}" >&2
    exit 1
  fi
done

mkdir -p "${UNIT_DIR}"

cat > "${UNIT_DIR}/smartbolig-ai-news.service" <<EOF
[Unit]
Description=SmartBolig AI News daily automation (publish + PR + auto-merge)
# Notify via GitHub issue if the run fails, so silent breakage can't go unnoticed.
OnFailure=smartbolig-ai-news-failure.service

[Service]
Type=oneshot
# The script is self-contained: sync -> npm ci -> source-health -> publish ->
# ComfyUI images -> tests/validate/build -> commit -> push -> PR -> auto-merge.
ExecStart=${RUNNER}
Environment=HOME=${HOME}
Environment=PATH=/usr/bin:${HOME}/.local/bin:${HOME}/.npm-global/bin:/usr/local/bin:/bin
# npm ci + image generation + full Astro build can take several minutes.
TimeoutStartSec=2700
# Be polite to interactive/GPU work on the machine.
Nice=10
IOSchedulingClass=best-effort
IOSchedulingPriority=7
EOF

cat > "${UNIT_DIR}/smartbolig-ai-news-failure.service" <<EOF
[Unit]
Description=Notify (GitHub issue) when SmartBolig AI News automation fails

[Service]
Type=oneshot
Environment=HOME=${HOME}
Environment=PATH=/usr/bin:${HOME}/.local/bin:/bin
ExecStart=${NOTIFIER}
EOF

cat > "${UNIT_DIR}/smartbolig-ai-news.timer" <<EOF
[Unit]
Description=Run SmartBolig AI News automation daily at 07:20 (local time)

[Timer]
OnCalendar=${ON_CALENDAR}
# If the machine was off/asleep at the scheduled time, run as soon as it is back.
Persistent=true
# Small jitter so it does not collide with other jobs at the same minute.
RandomizedDelaySec=120

[Install]
WantedBy=timers.target
EOF

"${SYSTEMCTL_BIN}" --user daemon-reload
"${SYSTEMCTL_BIN}" --user enable --now smartbolig-ai-news.timer

# Disable the legacy OpenClaw cron job so the automation never double-runs.
if command -v openclaw >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
  legacy_ids="$(openclaw cron list --all --json 2>/dev/null \
    | jq -r '.jobs[]? | select(.name == "smartbolig-ai-news-daily") | select(.enabled == true) | .id' || true)"
  while IFS= read -r id; do
    [[ -n "${id}" ]] || continue
    if openclaw cron disable "${id}" >/dev/null; then
      echo "Disabled legacy OpenClaw cron job: ${id}"
    fi
  done <<<"${legacy_ids}"
fi

echo "Installed systemd timer: smartbolig-ai-news.timer (${ON_CALENDAR})"
echo "Runner: ${RUNNER}"
echo "Failure notifier: ${NOTIFIER}"
