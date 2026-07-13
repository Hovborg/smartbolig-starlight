// Structured "official source" matching, shared by the content validator and
// the regenerate pipeline. Replaces the old substring check that accepted any
// URL merely containing an official domain — see security review M-3
// (docs/verification/2026-07-13-security-review.md).

// Apex domains; subdomains (platform.openai.com, code.claude.com, …) match too.
export const OFFICIAL_HOSTS = [
  "openai.com",
  "anthropic.com",
  "claude.com",
  "blog.google",
  "ai.google.dev",
];

// GitHub is only official for these exact owner/repository paths.
export const OFFICIAL_GITHUB_REPOS = [
  "anthropics/claude-code",
  "openai/codex",
  "google-gemini/gemini-cli",
  "openclaw/openclaw",
];

export function isOfficialUrl(value) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "github.com") {
    const repo = url.pathname.split("/").filter(Boolean).slice(0, 2).join("/").toLowerCase();
    return OFFICIAL_GITHUB_REPOS.includes(repo);
  }
  return OFFICIAL_HOSTS.some((base) => host === base || host.endsWith(`.${base}`));
}
