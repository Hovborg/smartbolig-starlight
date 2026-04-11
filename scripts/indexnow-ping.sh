#!/bin/bash
# IndexNow ping script for smartbolig.net
# Run this after deployment to notify search engines of content updates

INDEXNOW_KEY="${INDEXNOW_KEY:-$(find public -maxdepth 1 -name '*.txt' -print -quit | xargs -r basename | sed 's/\.txt$//')}"
SITE_URL="https://smartbolig.net"
SITEMAP_URL="${SITE_URL}/sitemap-index.xml"

if [ -z "${INDEXNOW_KEY}" ]; then
  echo "INDEXNOW_KEY is missing. Set it in the environment or keep the public key file in public/."
  exit 1
fi

echo "Pinging IndexNow with sitemap..."

# Ping Bing (primary IndexNow endpoint - shares with Yandex, Seznam, Naver)
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"smartbolig.net\",
    \"key\": \"${INDEXNOW_KEY}\",
    \"keyLocation\": \"${SITE_URL}/${INDEXNOW_KEY}.txt\",
    \"urlList\": [
      \"${SITE_URL}/\",
      \"${SITE_URL}/da/\",
      \"${SITE_URL}/en/\",
      \"${SITE_URL}/da/home-assistant/\",
      \"${SITE_URL}/en/home-assistant/\",
      \"${SITE_URL}/da/esp32/\",
      \"${SITE_URL}/en/esp32/\",
      \"${SITE_URL}/da/produkter/\",
      \"${SITE_URL}/en/produkter/\",
      \"${SITE_URL}/da/ai/\",
      \"${SITE_URL}/en/ai/\",
      \"${SITE_URL}/da/ai/nyheder/\",
      \"${SITE_URL}/en/ai/nyheder/\",
      \"${SITE_URL}/en/ai/news/\",
      \"${SITE_URL}/da/ai/ai-cli/\",
      \"${SITE_URL}/en/ai/ai-cli/\"
    ]
  }"

echo ""
echo "IndexNow ping complete!"
echo "Key file: ${SITE_URL}/${INDEXNOW_KEY}.txt"
