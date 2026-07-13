#!/usr/bin/env bash
set -euo pipefail

REPO="${OPENCLAW_SMARTBOLIG_AI_NEWS_REPO:-Hovborg/smartbolig-starlight}"
WORKDIR="${OPENCLAW_SMARTBOLIG_AI_NEWS_WORKDIR:-${HOME}/.openclaw/workspaces/smartbolig-starlight-ai-news}"
DATE="${AI_NEWS_DATE:-$(TZ=Europe/Copenhagen date +%F)}"
BRANCH="${OPENCLAW_SMARTBOLIG_AI_NEWS_BRANCH:-ai-news/${DATE}-openclaw}"
DRY_RUN="${OPENCLAW_SMARTBOLIG_AI_NEWS_DRY_RUN:-0}"

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="1"
  shift
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

COMFYUI_SERVICE="${COMFYUI_SERVICE:-comfyui.service}"
COMFYUI_READY_URL="${COMFYUI_READY_URL:-http://127.0.0.1:8188/system_stats}"
COMFYUI_READY_TRIES="${COMFYUI_READY_TRIES:-30}"

start_comfyui_if_available() {
  if ! systemctl --user list-unit-files "${COMFYUI_SERVICE}" --no-legend 2>/dev/null | grep -q "${COMFYUI_SERVICE}"; then
    echo "ComfyUI service not installed; AI image generation will fall back to procedural SVG."
    return 0
  fi
  echo "Starting ${COMFYUI_SERVICE} for AI image generation ..."
  systemctl --user start "${COMFYUI_SERVICE}" || {
    echo "Failed to start ${COMFYUI_SERVICE}; continuing with procedural SVG fallback." >&2
    return 0
  }
  for ((i=1; i<=COMFYUI_READY_TRIES; i++)); do
    if curl -sf -m 2 "${COMFYUI_READY_URL}" >/dev/null 2>&1; then
      echo "ComfyUI ready after ${i} probe(s)."
      return 0
    fi
    sleep 2
  done
  echo "ComfyUI did not become ready within $((COMFYUI_READY_TRIES * 2))s; continuing with procedural SVG fallback." >&2
  return 0
}

stop_comfyui() {
  if systemctl --user is-active "${COMFYUI_SERVICE}" >/dev/null 2>&1; then
    systemctl --user stop "${COMFYUI_SERVICE}" >/dev/null 2>&1 || true
    echo "Stopped ${COMFYUI_SERVICE}."
  fi
}

sync_site_to_workdir() {
  mkdir -p "$(dirname "${WORKDIR}")"

  if [[ ! -d "${WORKDIR}/.git" ]]; then
    rm -rf "${WORKDIR}"
    gh repo clone "${REPO}" "${WORKDIR}" >/dev/null
  fi

  cd "${WORKDIR}"
  git reset --hard >/dev/null
  git clean -fd -e node_modules >/dev/null
  git fetch origin main --prune
  git switch main >/dev/null
  git reset --hard origin/main >/dev/null
  git switch -C "${BRANCH}" >/dev/null
}

pending_dates() {
  node --input-type=module -e '
    const data = JSON.parse(await new Promise((resolve) => {
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => { input += chunk; });
      process.stdin.on("end", () => resolve(input));
    }));
    for (const item of data.pending || []) console.log(item.date);
  '
}

render_pending_images() {
  local pending_json dates
  pending_json="$(node scripts/ai-news-pending-images.mjs --json)"
  dates="$(printf '%s' "${pending_json}" | pending_dates)"

  if [[ -z "${dates}" ]]; then
    echo "AI News images: no pending date-specific variants."
    return
  fi

  while IFS= read -r image_date; do
    [[ -n "${image_date}" ]] || continue
    echo "AI News images: rendering ${image_date}."
    node scripts/ai-news-render-image.mjs --date "${image_date}"
  done <<<"${dates}"
}

pr_body_file() {
  local file copy_source
  copy_source="$(node --input-type=module -e '
    import { readFile } from "node:fs/promises";
    try {
      const result = JSON.parse(await readFile(process.argv[1], "utf8"));
      process.stdout.write(result.copySource || "unknown");
    } catch { process.stdout.write("unknown"); }
  ' "${WORKDIR}/.ai-news-result.json" 2>/dev/null || echo unknown)"
  file="$(mktemp)"
  cat >"${file}" <<EOF
Automated SmartBolig AI News draft for ${DATE}.

Editorial copy source: ${copy_source} (llm = unique per-story analysis via headless Claude; template = deterministic fallback).

Checks run:
- npm run ai-news:source-health
- node scripts/ai-news-pending-images.mjs --fail-on-pending
- npm run ai-news:validate
- npm run build
- npm run seo:validate

Image status:
- Date-specific AI News image variants were generated before validation when needed.

Review note:
- Needs editorial review before merge.
- No direct push to main was performed.
EOF
  printf '%s' "${file}"
}

main() {
  require_cmd gh
  require_cmd git
  require_cmd node
  require_cmd npm

  if ! gh auth status >/dev/null 2>&1; then
    echo "GitHub CLI is not authenticated; cannot create AI News PR." >&2
    exit 1
  fi

  echo "SmartBolig AI News automation started for ${DATE}."
  echo "Source: origin/main from ${REPO}"
  echo "Workdir: ${WORKDIR}"

  sync_site_to_workdir
  cd "${WORKDIR}"

  npm ci
  npm run ai-news:source-health

  # AI_NEWS_LLM=1 asks headless Claude Code to draft unique editorial copy per
  # story; on any failure the deterministic template takes over automatically,
  # so the run never blocks on the LLM layer. Set AI_NEWS_LLM=0 to disable.
  # The invocation is tool-free and settings-free (see scripts/lib/ai-news-llm.mjs
  # and security review C-1), and the resulting PR is never auto-merged.
  AI_NEWS_RESULT_PATH="${WORKDIR}/.ai-news-result.json" \
  AI_NEWS_LLM="${AI_NEWS_LLM:-1}" \
    node scripts/ai-news-publish.mjs --write --date "${DATE}" --days 10

  local ai_news_status
  ai_news_status="$(node --input-type=module -e '
    import { readFile } from "node:fs/promises";
    const result = JSON.parse(await readFile(process.argv[1], "utf8"));
    if (!result || !["publish", "skip"].includes(result.status)) process.exit(2);
    process.stdout.write(result.status);
  ' "${WORKDIR}/.ai-news-result.json")"

  if [[ "${ai_news_status}" == "skip" ]]; then
    echo "AI_NEWS_STATUS=skip: no article, image, commit, push, or PR will be created."
    return 0
  fi
  if [[ "${ai_news_status}" != "publish" ]]; then
    echo "Invalid AI News status: ${ai_news_status}" >&2
    return 1
  fi

  start_comfyui_if_available
  trap 'stop_comfyui' EXIT

  render_pending_images
  if [[ -f "src/content/docs/da/ai/nyheder/${DATE}.mdx" ]]; then
    node scripts/ai-news-render-image.mjs --date "${DATE}"
  else
    echo "No AI News article exists for ${DATE}; continuing with sync/validation only."
  fi

  render_pending_images

  stop_comfyui
  trap - EXIT

  # Full validation gate before anything can reach the auto-merge below:
  # unit tests + content validation + image check + production build + SEO check.
  npm run ai-news:test
  npm run ai-news:validate
  node scripts/ai-news-pending-images.mjs --fail-on-pending
  npm run build
  npm run seo:validate

  if [[ -z "$(git status --short)" ]]; then
    echo "SmartBolig AI News automation finished: no changes to publish."
    return
  fi

  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "SmartBolig AI News automation dry-run finished: changes were produced, but no commit, push, or PR was created."
    git status --short
    return
  fi

  git add -A
  if git diff --cached --quiet; then
    echo "SmartBolig AI News automation finished: no staged changes after validation."
    return
  fi

  git commit -m "Draft AI news for ${DATE}"
  git push --force-with-lease origin "${BRANCH}"

  close_stale_ai_news_prs

  local body_file pr_url
  body_file="$(pr_body_file)"
  # Clean up the temp body file even if a gh command below fails (set -e).
  trap 'rm -f "${body_file}"' EXIT
  pr_url="$(gh pr list --repo "${REPO}" --head "${BRANCH}" --state open --json url --jq '.[0].url // ""')"
  if [[ -n "${pr_url}" ]]; then
    gh pr edit "${pr_url}" --repo "${REPO}" --body-file "${body_file}" >/dev/null
  else
    pr_url="$(gh pr create \
      --repo "${REPO}" \
      --base main \
      --head "${BRANCH}" \
      --title "Draft AI news for ${DATE}" \
      --body-file "${body_file}")"
  fi
  rm -f "${body_file}"
  trap - EXIT

  # Security review M-1 (docs/verification/2026-07-13-security-review.md):
  # the draft contains text derived from external feeds, so it must never
  # reach main without a human editorial review. No auto-merge.
  echo "SmartBolig AI News automation finished: PR ${pr_url} (awaiting editorial review — merge manually)"
}

close_stale_ai_news_prs() {
  local stale_pr
  while IFS= read -r stale_pr; do
    [[ -n "${stale_pr}" ]] || continue
    gh pr close "${stale_pr}" --repo "${REPO}" --delete-branch \
      --comment "Closed automatically — superseded by ${BRANCH}" >/dev/null || true
  done < <(
    gh pr list --repo "${REPO}" --state open --json number,headRefName \
      --jq '.[] | select(.headRefName | startswith("ai-news/")) | "\(.number) \(.headRefName)"' \
      | awk -v current="${BRANCH}" '$2 != current { print $1 }'
  )
}

main "$@"
