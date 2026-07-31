# Changelog

## 2026-07-31

- Added verified Home Assistant evidence for automation troubleshooting. The
  assistant now distinguishes reviewed official facts, SmartBolig-assisted
  answers, and general AI knowledge.
- Corrected the Danish and English trace guides: YAML-created automations need
  a unique `id` before Home Assistant stores debug traces.
- Added a 50-prompt Danish/English regression suite and lowered model
  temperature from `0.35` to `0.1` for less variable technical answers.
