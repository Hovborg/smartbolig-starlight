# AI CLI expansion research

Research date: 2026-04-11

Scope: expand SmartBolig.net with Danish starter guides for AI coding CLIs:
OpenAI Codex CLI, Anthropic Claude Code, and Google Gemini CLI.

## Executive direction

The first release should be a focused "AI CLI" section, not a broad AI portal.
The strongest entry point is "Kom godt i gang med AI i terminalen", followed by
three hands-on starter guides and one comparison/safety guide.

Recommended first content tree:

```text
src/content/docs/da/ai/
  index.mdx
  ai-cli/
    index.mdx
    codex-kom-godt-i-gang.mdx
    claude-code-kom-godt-i-gang.mdx
    gemini-cli-kom-godt-i-gang.mdx
    sammenligning.mdx
    sikkerhed-og-permissions.mdx
    agent-instruktioner.mdx
```

English mirrors now exist under `src/content/docs/en/ai/`.

Current published draft tree:

```text
src/content/docs/da/ai/
  index.mdx
  ai-cli/
    index.mdx
    codex-kom-godt-i-gang.mdx
    claude-code-kom-godt-i-gang.mdx
    gemini-cli-kom-godt-i-gang.mdx
    priser-og-planer.mdx
    projektmapper-og-workflows.mdx
    sammenligning.mdx
    sikkerhed-og-permissions.mdx
    agent-instruktioner.mdx

src/content/docs/en/ai/
  index.mdx
  ai-cli/
    index.mdx
    codex-kom-godt-i-gang.mdx
    claude-code-kom-godt-i-gang.mdx
    gemini-cli-kom-godt-i-gang.mdx
    priser-og-planer.mdx
    projektmapper-og-workflows.mdx
    sammenligning.mdx
    sikkerhed-og-permissions.mdx
    agent-instruktioner.mdx
```

## Target audience

Primary reader:

- Danish developer or technical smart home user
- Uses Windows/WSL, macOS, Linux, VS Code, Cursor, or terminal
- Wants a practical "start here" guide, not vendor marketing
- Needs safe defaults because these tools can edit files and run commands

Content tone:

- Practical, direct, Danish
- Show exact install commands and first prompts
- Explain when to choose which CLI
- Put safety and git checkpoints early
- Treat version/auth details as volatile and cite official docs

## Source-backed facts

### Codex CLI

Official sources:

- https://developers.openai.com/codex/quickstart#setup
- https://developers.openai.com/codex/cli
- https://developers.openai.com/codex/cli/features
- https://developers.openai.com/codex/cli/reference
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/agent-approvals-security
- https://developers.openai.com/codex/learn/best-practices
- https://developers.openai.com/codex/pricing
- https://platform.openai.com/docs/pricing

Current package check:

- `npm view @openai/codex version`: `0.120.0`

Important starter-guide facts:

- Official quickstart lists `npm install -g @openai/codex`.
- Official quickstart also lists Homebrew: `brew install codex`.
- Start with `codex` inside a project directory.
- First login can use ChatGPT account or OpenAI API key.
- Codex CLI page says macOS and Linux are primary; Windows support is
  experimental and WSL is recommended for the best Windows experience.
- OpenAI quickstart currently says the CLI is supported on macOS, Windows, and
  Linux. In our guide, handle this by saying: "Windows virker bedst via WSL."
- Interactive usage: `codex` or `codex "Explain this codebase to me"`.
- Scripting usage: `codex exec "fix the CI failure"`.
- Model switching: `/model` in-session or `codex --model gpt-5.4`.
- OpenAI docs currently recommend `gpt-5.4` for most Codex tasks.
- Safety: default local setup uses workspace sandboxing and approval prompts.
- `--full-auto` maps to workspace-write plus on-request approvals.
- `--yolo` / `--dangerously-bypass-approvals-and-sandbox` should be described
  as only for isolated environments.
- Project instructions use `AGENTS.md`.
- `AGENTS.md` can exist globally in `~/.codex/AGENTS.md` and per repository.
- Config lives in `~/.codex/config.toml`, with project overrides possible under
  `.codex/config.toml` after project trust.

Best first Codex guide structure:

1. What Codex CLI is
2. Prerequisites: Git, Node or Homebrew, a project folder, ChatGPT/OpenAI login
3. Install: npm and Homebrew tabs
4. First run: `cd your-project && codex`
5. First prompt: "Forklar dette projekt og foresla de 3 sikreste forbedringer"
6. Permissions: start default/read-only before full-auto
7. `AGENTS.md`: add build/test commands and "done when" rules
8. Common commands: `/model`, `/permissions`, `/review`, `codex exec`,
   `codex resume`, `codex mcp`
9. Troubleshooting: PATH, auth, WSL, network approvals, dirty git state

### Claude Code

Official sources:

- https://code.claude.com/docs/en/overview
- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/security
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/costs
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/sub-agents

Current package check:

- `npm view @anthropic-ai/claude-code version`: `2.1.101`
- NPM still exists, but the current official overview recommends native install.

Important starter-guide facts:

- Claude Code is available in terminal, IDE, desktop app, and browser.
- Most surfaces require a Claude subscription or Anthropic Console account.
- Terminal CLI and VS Code also support third-party providers.
- Recommended install is native installer:
  - macOS/Linux/WSL: `curl -fsSL https://claude.ai/install.sh | bash`
  - Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
  - Windows CMD: `curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd`
- Homebrew option: `brew install --cask claude-code`.
- WinGet option: `winget install Anthropic.ClaudeCode`.
- Native installs auto-update in the background.
- Homebrew/WinGet do not auto-update; use `brew upgrade ...` or
  `winget upgrade Anthropic.ClaudeCode`.
- Start in a project with `claude`.
- Login happens on first use; `claude auth status` can verify login.
- Print/script mode uses `claude -p "query"`.
- Continue latest conversation: `claude -c`.
- Claude Code reads `CLAUDE.md` at session start.
- `CLAUDE.md` can live at project, user, local, or managed org scope.
- `/init` can generate or improve a project CLAUDE.md.
- Claude also has auto memory; use CLAUDE.md for written instructions and auto
  memory for learned patterns.
- Security docs say Claude Code uses strict read-only permissions by default.
- It asks for explicit permission for edits, tests, commands, and other actions.
- Write access is limited to the folder it was started in and subfolders unless
  explicit permission is granted.
- Network requests require approval by default.
- Prompt injection and untrusted content must be covered in our guide.

Best first Claude Code guide structure:

1. What Claude Code is
2. Which account you need: Claude subscription, Console, or third-party provider
3. Install with native installer; Homebrew/WinGet alternatives
4. First run: `cd your-project && claude`
5. Login and auth check
6. First prompt: "Lav en plan for at forsta projektet uden at aendre filer"
7. Permission model and safe first mode
8. `CLAUDE.md` and `/init`
9. Common commands: `claude`, `claude -p`, `claude -c`, `claude auth status`,
   `claude update`, `claude mcp`
10. Troubleshooting: PATH, Windows shell confusion, Git for Windows, permissions,
    native installer vs Homebrew updates

### Gemini CLI

Official/primary sources:

- https://github.com/google-gemini/gemini-cli
- https://geminicli.com/docs/get-started/
- https://geminicli.com/docs/get-started/installation/
- https://geminicli.com/docs/get-started/authentication/
- https://geminicli.com/docs/reference/commands/
- https://geminicli.com/docs/cli/gemini-md/
- https://geminicli.com/docs/cli/sandbox/
- https://geminicli.com/docs/resources/quota-and-pricing/
- https://geminicli.com/docs/cli/headless/
- https://geminicli.com/docs/cli/checkpointing/
- https://geminicli.com/docs/cli/git-worktrees/

Current package check:

- `npm view @google/gemini-cli version`: `0.37.1`
- Dist tags checked:
  - `latest`: `0.37.1`
  - `preview`: `0.38.0-preview.0`
  - `nightly`: `0.39.0-nightly.20260411.0957f7d3e`

Important starter-guide facts:

- Gemini CLI is an open-source AI agent in the terminal.
- Official GitHub README points to Gemini CLI documentation at geminicli.com.
- Recommended specs:
  - macOS 15+
  - Windows 11 24H2+
  - Ubuntu 20.04+
  - Node.js 20.0.0+
  - Bash, Zsh, or PowerShell
  - Internet connection
- Install:
  - npm: `npm install -g @google/gemini-cli`
  - Homebrew: `brew install gemini-cli`
  - MacPorts: `sudo port install gemini-cli`
  - Anaconda path for restricted environments
- No install required option: `npx @google/gemini-cli`.
- Start with `gemini`.
- Recommended auth for most local users: Sign in with Google.
- Individual Google accounts usually do not require a Google Cloud project.
- Company/school/Workspace accounts often require Google Cloud project setup.
- API key option: set `GEMINI_API_KEY`.
- Vertex AI option exists for enterprise/Google Cloud users.
- Headless mode needs API key or Vertex AI if no cached sign-in exists.
- Context files use `GEMINI.md`.
- Gemini loads global `~/.gemini/GEMINI.md`, workspace context, and just-in-time
  context files.
- `/memory show`, `/memory reload`, and `/memory add` manage loaded memory.
- `settings.json` can change context file names, including using `AGENTS.md`.
- Sandboxing is a first-class topic; Gemini supports macOS Seatbelt,
  Docker/Podman, Windows Native Sandbox, gVisor/runsc, and LXC/LXD.
- Built-in slash commands include `/auth`, `/mcp`, `/model`, `/permissions`,
  `/plan`, `/resume`, `/stats`, `/tools`, and others.

Best first Gemini guide structure:

1. What Gemini CLI is
2. Prerequisites: Node 20+, OS requirements, Google account/API key
3. Install: npm first, Homebrew/npx alternatives
4. First run: `gemini`
5. Auth choice: Sign in with Google vs API key vs Vertex AI
6. First prompt: "Forklar denne mappe og lav en sikker laeseplan"
7. `GEMINI.md` context file and `/memory`
8. Sandboxing: start with default approvals; use container sandbox for risky work
9. Common commands: `/auth`, `/model`, `/permissions`, `/plan`, `/resume`,
   `/stats model`, `gemini -p`, `--output-format json`, `--output-format stream-json`
10. Troubleshooting: Node version, Google Workspace project, API key env,
    quota, Windows version

## Comparison matrix for the website

| Topic | Codex CLI | Claude Code | Gemini CLI |
| --- | --- | --- | --- |
| Main command | `codex` | `claude` | `gemini` |
| Main install path | npm or Homebrew | Native installer | npm or Homebrew |
| Current npm latest | 0.120.0 | 2.1.101 | 0.37.1 |
| Primary auth | ChatGPT or OpenAI API key | Claude subscription or Console | Google sign-in, API key, or Vertex AI |
| Project instruction file | `AGENTS.md` | `CLAUDE.md` | `GEMINI.md` |
| Script mode | `codex exec` | `claude -p` | `gemini -p` |
| MCP support | Yes | Yes | Yes |
| Beginner angle | Strong safety defaults and reviews | Strong workflow/memory ecosystem | Free Google sign-in path and big context |
| Main warning | Do not use `--yolo` casually | Native install vs package-manager updates | Workspace accounts may need GCP project |

## Recommended IA and SEO

Sidebar addition:

```js
{
  label: "AI",
  translations: { en: "AI" },
  items: [
    { label: "Oversigt", translations: { en: "Overview" }, link: "/ai/" },
    {
      label: "AI CLI'er",
      translations: { en: "AI CLIs" },
      collapsed: false,
      items: [
        { label: "Kom godt i gang", translations: { en: "Getting Started" }, link: "/ai/ai-cli/" },
        { label: "Codex CLI", link: "/ai/ai-cli/codex-kom-godt-i-gang/" },
        { label: "Claude Code", link: "/ai/ai-cli/claude-code-kom-godt-i-gang/" },
        { label: "Gemini CLI", link: "/ai/ai-cli/gemini-cli-kom-godt-i-gang/" },
        { label: "Sammenligning", translations: { en: "Comparison" }, link: "/ai/ai-cli/sammenligning/" },
        { label: "Sikkerhed", translations: { en: "Security" }, link: "/ai/ai-cli/sikkerhed-og-permissions/" },
        { label: "Agent instruktioner", translations: { en: "Agent Instructions" }, link: "/ai/ai-cli/agent-instruktioner/" }
      ]
    }
  ]
}
```

SEO titles:

- `AI CLI'er pa dansk: Codex, Claude Code og Gemini CLI`
- `Codex CLI guide: Installer, log ind og lav din forste sikre opgave`
- `Claude Code guide: Installer CLI'en og kom sikkert i gang`
- `Gemini CLI guide: Google AI i terminalen fra installation til forste prompt`
- `Codex vs Claude Code vs Gemini CLI: Hvilken AI CLI skal du vaelge?`

URL decision:

- Use ASCII slugs:
  - `/da/ai/`
  - `/da/ai/ai-cli/`
  - `/da/ai/ai-cli/codex-kom-godt-i-gang/`
  - `/da/ai/ai-cli/claude-code-kom-godt-i-gang/`
  - `/da/ai/ai-cli/gemini-cli-kom-godt-i-gang/`

## Starter guide template

Each guide should use the same structure:

```md
---
title: ...
description: ...
sidebar:
  badge:
    text: Start her
    variant: success
---

import { Steps, Aside, Tabs, TabItem, Card, CardGrid, Badge } from '@astrojs/starlight/components';

<Badge text="Begynder" variant="success" /> <Badge text="15 min" variant="note" />

Intro: who this is for and what will work when done.

## Hvad er [tool]?

## Hvad skal du bruge?

## Installer

<Tabs>
  <TabItem label="npm">...</TabItem>
  <TabItem label="Homebrew">...</TabItem>
  <TabItem label="Windows/WSL">...</TabItem>
</Tabs>

## Log ind

## Din forste sikre session

<Steps>
1. `git status`
2. Start CLI
3. Ask read-only/explain task first
4. Review permissions
5. Only then allow edits
</Steps>

## Lav en projekt-instruktionsfil

## Kommandoer du faktisk bruger

## Fejlfinding

## Naeste skridt
```

## Safety position

Every starter guide should include this baseline:

1. Start in a git repo.
2. Run `git status` before delegating work.
3. Start with read-only/explain prompts before edit prompts.
4. Do not paste secrets into prompts.
5. Keep API keys in environment variables or the vendor's auth flow.
6. Avoid bypass/full-access modes unless inside a VM/container or trusted repo.
7. Review diffs before committing.
8. Run tests/builds yourself or have the CLI run them with explicit approval.

Cross-tool safety page should explain:

- Permissions and approval prompts
- Sandboxing
- Prompt injection from web content and docs
- MCP server trust
- Secrets in `.env`
- Git checkpoints and worktrees
- When to use read-only vs auto vs full access

## Implementation phases

### Phase 1: Starter guides

Implement:

- `da/ai/index.mdx`
- `da/ai/ai-cli/index.mdx`
- Three tool-specific starter guides
- `da/ai/ai-cli/sammenligning.mdx`
- Sidebar navigation in `astro.config.mjs`

Keep each page concise enough to rank and convert:

- 800-1,500 words per starter guide
- Tables for install/auth differences
- Clear Danish command blocks
- Official source links at the bottom

### Phase 2: Power-user guides

Implement:

- Permissions and sandboxing deep dive
- `AGENTS.md` vs `CLAUDE.md` vs `GEMINI.md`
- MCP setup across all three tools
- Worktrees and parallel agents
- Non-interactive scripting/CI
- Troubleshooting by OS

### Phase 3: AI plus smart home bridge

Potential later pages:

- Use AI CLIs to write Home Assistant automation drafts safely
- Review YAML and dashboard configs with AI
- Use AI to document your homelab
- Build small ESPHome configs with AI, then verify manually

This bridge keeps AI content relevant to the existing SmartBolig audience.

## Risks and editorial notes

- These tools change quickly. Each guide needs a "Sidst tjekket" date near the
  source section.
- Avoid claiming one tool is universally best. Recommend by account/workflow.
- Keep all install commands from official docs only.
- Do not teach unsafe flags early.
- Do not put API keys in screenshots or examples except as placeholders.
- For Windows, be explicit about PowerShell vs CMD where commands differ.
- Use Danish terms consistently:
  - "AI CLI"
  - "terminal"
  - "projekt-instruktioner"
  - "tilladelser"
  - "sandbox"
  - "MCP-server"

## Suggested first page order

1. AI CLI overview
2. Codex CLI starter guide
3. Claude Code starter guide
4. Gemini CLI starter guide
5. Comparison guide
6. Safety guide
7. Instruction files guide

Codex first makes sense because it matches the user's current workflow and this
workspace already uses AGENTS.md heavily. Claude Code second is valuable because
many Danish readers will know Claude. Gemini third has a strong free/sign-in
angle and should be positioned as the easiest way for Google-account users to
try an AI terminal agent.
