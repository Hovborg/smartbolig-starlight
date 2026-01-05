#!/bin/bash
# IndexNow ping script for smartbolig.net
# Run this after deployment to notify search engines of content updates

INDEXNOW_KEY="a09aba2939b14bb7927e3849e0ea0ab4"
SITE_URL="https://smartbolig.net"
SITEMAP_URL="${SITE_URL}/sitemap-index.xml"

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
      \"${SITE_URL}/en/produkter/\"
    ]
  }"

echo ""
echo "IndexNow ping complete!"
echo "Key file: ${SITE_URL}/${INDEXNOW_KEY}.txt"
