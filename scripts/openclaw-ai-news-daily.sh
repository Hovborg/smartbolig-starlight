#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${OPENCLAW_SMARTBOLIG_AI_NEWS_REPO:-Hovborg/smartbolig-starlight}"
WORKDIR="${OPENCLAW_SMARTBOLIG_AI_NEWS_WORKDIR:-${HOME}/.openclaw/workspaces/smartbolig-starlight-ai-news}"
DATE="${AI_NEWS_DATE:-$(TZ=Europe/Copenhagen date +%F)}"
BRANCH="${OPENCLAW_SMARTBOLIG_AI_NEWS_BRANCH:-ai-news/${DATE}-openclaw}"
DRY_RUN="${OPENCLAW_SMARTBOLIG_AI_NEWS_DRY_RUN:-0}"

SYNC_ITEMS=(
  ".github/workflows/ai-news.yml"
  "package.json"
  "package-lock.json"
  "scripts/ai-news-cron.test.mjs"
  "scripts/ai-news-pending-images.mjs"
  "scripts/ai-news-pending-images.test.mjs"
  "scripts/ai-news-post.test.mjs"
  "scripts/ai-news-public-copy.test.mjs"
  "scripts/ai-news-publish.mjs"
  "scripts/ai-news-render-image.mjs"
  "scripts/ai-news-source-health.mjs"
  "scripts/ai-news-sources.mjs"
  "scripts/ai-news-validate.mjs"
  "scripts/install-openclaw-ai-news-cron.sh"
  "scripts/openclaw-ai-news-daily.sh"
  "scripts/seo-validate.mjs"
  "src/components/AiNewsFeed.astro"
  "src/components/Head.astro"
  "src/components/MarkdownContent.astro"
  "src/content.config.ts"
  "src/content/docs/da/ai/nyheder"
  "src/content/docs/en/ai/nyheder"
  "src/pages/da/ai/nyheder/rss.xml.js"
  "src/pages/en/ai/news/rss.xml.js"
  "src/pages/en/ai/nyheder/rss.xml.js"
  "public/images/ai-news"
  "public/images/ai-news-og.png"
  "public/images/ai-news-og-16x9.png"
  "public/images/ai-news-og-4x3.png"
  "public/images/ai-news-og-1x1.png"
  "public/images/ai-news-og.svg"
)

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

  for item in "${SYNC_ITEMS[@]}"; do
    if [[ -d "${SITE_ROOT}/${item}" ]]; then
      mkdir -p "${WORKDIR}/${item}"
      rsync -rlt --delete --no-perms "${SITE_ROOT}/${item}/" "${WORKDIR}/${item}/"
    elif [[ -f "${SITE_ROOT}/${item}" ]]; then
      mkdir -p "$(dirname "${WORKDIR}/${item}")"
      rsync -lt --no-perms "${SITE_ROOT}/${item}" "${WORKDIR}/${item}"
    else
      echo "Skipping missing sync item: ${item}" >&2
    fi
  done

  for item in "${SYNC_ITEMS[@]}"; do
    if [[ -d "${WORKDIR}/${item}" ]]; then
      find "${WORKDIR}/${item}" -type f -exec chmod 0644 {} +
    elif [[ -f "${WORKDIR}/${item}" ]]; then
      chmod 0644 "${WORKDIR}/${item}"
    fi
  done
  chmod 0755 scripts/openclaw-ai-news-daily.sh
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
  local file
  file="$(mktemp)"
  cat >"${file}" <<EOF
Automated SmartBolig AI News draft for ${DATE}.

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
  require_cmd rsync

  if ! gh auth status >/dev/null 2>&1; then
    echo "GitHub CLI is not authenticated; cannot create AI News PR." >&2
    exit 1
  fi

  echo "SmartBolig AI News automation started for ${DATE}."
  echo "Source: ${SITE_ROOT}"
  echo "Workdir: ${WORKDIR}"

  sync_site_to_workdir
  cd "${WORKDIR}"

  npm ci
  npm run ai-news:source-health
  render_pending_images
  node scripts/ai-news-publish.mjs --write --date "${DATE}" --days 10

  if [[ -f "src/content/docs/da/ai/nyheder/${DATE}.mdx" ]]; then
    node scripts/ai-news-render-image.mjs --date "${DATE}"
  else
    echo "No AI News article exists for ${DATE}; continuing with sync/validation only."
  fi

  render_pending_images
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

  local body_file pr_url
  body_file="$(pr_body_file)"
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

  echo "SmartBolig AI News automation finished: PR ${pr_url}"
}

main "$@"
