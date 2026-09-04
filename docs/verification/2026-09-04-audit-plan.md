# SmartBolig audit and repair plan — 2026-09-04

Target: `Hovborg/smartbolig-starlight`, starting at `764d9a88794006393e3979a491b58708832f24e3`.

Goal: repair verified defects in the public site, chat, content checks and news tooling, with reproducible evidence. Work takes place on `fix/security-quality-audit-20260904`. Use the repository's normal pull-request checks and deployment workflow after local verification; the separate hub remains outside this change.

1. Complete an independent repository security review and validate source-backed candidates against their actual callers and trust boundaries.
2. Add regression coverage, then share the bounded external-source fetch across discovery, regeneration and health checks. Repair vulnerable development dependencies and audit them in CI.
3. Repair Windows content validation and empty remote-branch handling, bilingual changed-issue selection, RSS index filtering, chat composition and theme persistence defects.
4. Bring development configuration and documentation into line with the verified behavior.
5. Run site/news/Python tests, content validation, full dependency audit, production build, SEO validation, Worker compilation and deployment dry run. Check rendered links and browser behavior locally, then obtain an independent final review.
6. Publish the verified branch and pull request, check the actual Linux CI results, and integrate through the existing Git workflow. Record production verification separately from local tests.

The final verification record will distinguish local evidence from live Cloudflare, real AI inference and Scheduled Task execution.
