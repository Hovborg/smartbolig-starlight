# Changelog

## 2026-07-31

- Rebuilt the 404 page as a Home Assistant "entity unavailable" card in the
  site's own palette, replacing the off-brand indigo page. It shows the path
  that failed, and suggests the closest real guides from a build-time index of
  every page instead of the same four static links.
- Gave the 404 page a logbook, a `device_class: skuffelse` / `disappointment`
  attribute, and a "Restart Home Assistant" button that restarts, fails, and
  says so. Danish and English are written separately rather than translated,
  and a path with no language prefix now follows the browser's language.
- Added verified Home Assistant evidence for automation troubleshooting. The
  assistant now distinguishes reviewed official facts, SmartBolig-assisted
  answers, and general AI knowledge.
- Corrected the Danish and English trace guides: YAML-created automations need
  a unique `id` before Home Assistant stores debug traces.
- Added a 50-prompt Danish/English regression suite and lowered model
  temperature from `0.35` to `0.1` for less variable technical answers.
