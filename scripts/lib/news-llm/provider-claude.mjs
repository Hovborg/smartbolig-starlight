// Chat provider for a local headless Claude Code CLI. Used for manual runs on
// a machine that is logged in; the scheduled job uses the http provider.
import { spawn } from "node:child_process";

function runProcess({ bin, args, input, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${bin} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${bin} exited ${code}: ${stderr.slice(0, 400)}`));
    });
    child.stdin.end(input);
  });
}

// The prompt embeds untrusted feed text, so the CLI runs as a pure
// text-in/text-out call: no tools, no user/project settings (which would grant
// this machine's default permission mode), no MCP, no skills and no persisted
// session. See docs/verification/2026-07-13-security-review.md C-1.
// (--bare is deliberately absent: it disables OAuth login on subscription
// installs; these flags already yield a session that reports tools: [].)
export function claudeArgs(model) {
  return [
    "-p", "--output-format", "json", "--model", model,
    "--tools", "",
    "--setting-sources", "",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-session-persistence",
  ];
}

function resultText(raw) {
  const envelope = JSON.parse(raw);
  return typeof envelope?.result === "string" ? envelope.result : raw;
}

export function createClaudeChat({ bin = "claude", run = runProcess } = {}) {
  return async function chat({ model, system, user, timeoutMs = 240_000 }) {
    const raw = await run({ bin, args: claudeArgs(model), input: `${system}\n\n${user}`, timeoutMs });
    return { text: resultText(raw), usage: null };
  };
}
