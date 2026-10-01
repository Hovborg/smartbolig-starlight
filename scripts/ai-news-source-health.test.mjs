import assert from "node:assert/strict";
import test from "node:test";

import * as sourceHealth from "./ai-news-source-health.mjs";

const anthropicFeed = {
  id: "anthropic-news", name: "Anthropic News",
  url: "https://www.anthropic.com/news", kind: "html-listing", primary: true,
};

test("source health counts only Anthropic entries the news parser can read", () => {
  const liveMarkup = `<a href="/news/barclays-scales-claude">
    <time>Oct 1, 2026</time><span class="subject">Announcements</span>
    <span class="title body-3">Barclays scales Claude to upgrade operations and improve client experience</span>
  </a>`;
  const unusableMarkup = `<a href="/news/barclays-scales-claude">
    <time>Oct 1, 2026</time><span class="subject">Announcements</span>
  </a>`;
  assert.equal(sourceHealth.countEntries?.(anthropicFeed, liveMarkup), 1);
  assert.equal(sourceHealth.countEntries?.(anthropicFeed, unusableMarkup), 0);
});
