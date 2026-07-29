#!/usr/bin/env bash
# Installs the SmartBolig AI News automation as a systemd user timer.
#
# This is the recommended way to run the daily automation: the runner script is
# deterministic bash and needs no LLM/agent layer. The timer replaces the legacy
# OpenClaw cron job (scripts/install-openclaw-ai-news-cron.sh), which depended on
# an agent harness exposing an exec tool and broke whenever that harness changed.
#
# What it sets up:
#   smartbolig-ai-news.service            - oneshot, runs openclaw-ai-news-daily.sh
#   smartbolig-ai-news-failure.service    - OnFailure hook, opens a GitHub issue
#   smartbolig-ai-news.timer              - daily at 07:20 local time, Persistent
#   smartbolig-ai-news-staleness.service  - watchdog, checks the published site
#   smartbolig-ai-news-staleness.timer    - daily at 09:00 local time, Persistent
#
# Idempotent: re-running overwrites the units and re-enables the timers.
set -euo pipefail

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER="${SITE_ROOT}/scripts/openclaw-ai-news-daily.sh"
NOTIFIER="${SITE_ROOT}/scripts/ai-news-failure-notify.sh"
STALENESS="${SITE_ROOT}/scripts/ai-news-staleness-check.sh"
UNIT_DIR="${SMARTBOLIG_AI_NEWS_UNIT_DIR:-${HOME}/.config/systemd/user}"
ON_CALENDAR="${SMARTBOLIG_AI_NEWS_ONCALENDAR:-*-*-* 07:20:00}"
STALENESS_ON_CALENDAR="${SMARTBOLIG_AI_NEWS_STALENESS_ONCALENDAR:-*-*-* 09:00:00}"
SYSTEMCTL_BIN="${SMARTBOLIG_AI_NEWS_SYSTEMCTL:-systemctl}"

# gh stores its token in the desktop keyring when one is reachable, and only
# falls back to a file otherwise. A keyring restart or a locked session then
# makes the token unreadable to this timer, which is exactly what silently
# broke the automation on 2026-07-24/25/28/29. Pointing GH_TOKEN at a plain
# 0600 file takes the desktop session out of the loop entirely.
#
# The leading '-' means systemd starts the unit even when the file is absent,
# so a host that still relies on `gh auth login` keeps working unchanged.
TOKEN_ENV_FILE="${SMARTBOLIG_AI_NEWS_TOKEN_ENV_FILE:-${HOME}/.config/smartbolig-ai-news/github.env}"

for required in "${RUNNER}" "${NOTIFIER}" "${STALENESS}"; do
  if [[ ! -x "${required}" ]]; then
    echo "Required script is missing or not executable: ${required}" >&2
    exit 1
  fi
done

mkdir -p "${UNIT_DIR}"

cat > "${UNIT_DIR}/smartbolig-ai-news.service" <<EOF
[Unit]
Description=SmartBolig AI News daily automation (publish + PR + editorial review)
# Notify via GitHub issue if the run fails, so silent breakage can't go unnoticed.
OnFailure=smartbolig-ai-news-failure.service

[Service]
Type=oneshot
# The script is self-contained: sync -> npm ci -> source-health -> publish ->
# ComfyUI images -> tests/validate/build -> commit -> push -> PR awaiting separate editorial review.
ExecStart=${RUNNER}
Environment=HOME=${HOME}
Environment=PATH=/usr/bin:${HOME}/.local/bin:${HOME}/.npm-global/bin:/usr/local/bin:/bin
# GH_TOKEN from a file, so the run never depends on the desktop keyring.
EnvironmentFile=-${TOKEN_ENV_FILE}
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
# The notifier is the one thing that must still work when everything else is
# broken, so it must not share the automation's keyring dependency either.
EnvironmentFile=-${TOKEN_ENV_FILE}
ExecStart=${NOTIFIER}
EOF

cat > "${UNIT_DIR}/smartbolig-ai-news-staleness.service" <<EOF
[Unit]
Description=Check that smartbolig.net is still publishing AI News
# Reuses the same notifier, with its own issue title so a stale site is not
# mistaken for a failed run — they have different causes and different fixes.
OnFailure=smartbolig-ai-news-staleness-failure.service

[Service]
Type=oneshot
Environment=HOME=${HOME}
Environment=PATH=/usr/bin:${HOME}/.local/bin:/bin
ExecStart=${STALENESS}
EOF

cat > "${UNIT_DIR}/smartbolig-ai-news-staleness-failure.service" <<EOF
[Unit]
Description=Notify (GitHub issue) when smartbolig.net has stopped publishing AI News

[Service]
Type=oneshot
Environment=HOME=${HOME}
Environment=PATH=/usr/bin:${HOME}/.local/bin:/bin
Environment=SMARTBOLIG_AI_NEWS_UNIT=smartbolig-ai-news-staleness.service
Environment=SMARTBOLIG_AI_NEWS_TITLE=Published AI News has gone stale
EnvironmentFile=-${TOKEN_ENV_FILE}
ExecStart=${NOTIFIER}
EOF

cat > "${UNIT_DIR}/smartbolig-ai-news-staleness.timer" <<EOF
[Unit]
Description=Check daily that smartbolig.net is still publishing AI News

[Timer]
# Well after the 07:20 run and its deploy, so a same-morning publish counts.
OnCalendar=${STALENESS_ON_CALENDAR}
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
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
"${SYSTEMCTL_BIN}" --user enable --now smartbolig-ai-news-staleness.timer

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
echo "Installed systemd timer: smartbolig-ai-news-staleness.timer (${STALENESS_ON_CALENDAR})"
echo "Runner: ${RUNNER}"
echo "Failure notifier: ${NOTIFIER}"
echo "Staleness check: ${STALENESS}"

if [[ -r "${TOKEN_ENV_FILE}" ]]; then
  echo "GitHub token: GH_TOKEN from ${TOKEN_ENV_FILE} (keyring-independent)"
else
  echo "GitHub token: ${TOKEN_ENV_FILE} not found — falling back to 'gh auth login' state." >&2
  echo "  That state lives in the desktop keyring and becomes unreadable to this" >&2
  echo "  timer whenever the keyring restarts or stays locked. To pin it down:" >&2
  echo "    mkdir -p '$(dirname "${TOKEN_ENV_FILE}")'" >&2
  echo "    printf 'GH_TOKEN=%s\\n' \"\$(gh auth token)\" > '${TOKEN_ENV_FILE}'" >&2
  echo "    chmod 600 '${TOKEN_ENV_FILE}'" >&2
fi
