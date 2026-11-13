// Sidebar section: AI.
export default {
  label: "AI",
  translations: { en: "AI" },
  items: [
    {
      label: "Oversigt",
      translations: { en: "Overview" },
      link: "/ai/",
    },
    {
      label: "AI-nyheder",
      translations: { en: "AI News" },
      link: "/ai/nyheder/",
    },
    {
      label: "AI CLI'er",
      translations: { en: "AI CLIs" },
      collapsed: false,
      items: [
        {
          label: "Kom godt i gang",
          translations: { en: "Getting Started" },
          link: "/ai/ai-cli/",
        },
        {
          label: "Codex CLI",
          link: "/ai/ai-cli/codex-kom-godt-i-gang/",
        },
        {
          label: "Claude Code",
          link: "/ai/ai-cli/claude-code-kom-godt-i-gang/",
        },
        {
          label: "Gemini CLI",
          link: "/ai/ai-cli/gemini-cli-kom-godt-i-gang/",
        },
        {
          label: "Antigravity CLI (agy)",
          link: "/ai/ai-cli/antigravity-cli-kom-godt-i-gang/",
        },
        {
          label: "Priser og planer",
          translations: { en: "Pricing and Plans" },
          link: "/ai/ai-cli/priser-og-planer/",
        },
        {
          label: "Projektmapper",
          translations: { en: "Project Folders" },
          link: "/ai/ai-cli/projektmapper-og-workflows/",
        },
        {
          label: "Sammenligning",
          translations: { en: "Comparison" },
          link: "/ai/ai-cli/sammenligning/",
        },
        {
          label: "Sikkerhed",
          translations: { en: "Security" },
          link: "/ai/ai-cli/sikkerhed-og-permissions/",
        },
        {
          label: "Agent-instruktioner",
          translations: { en: "Agent Instructions" },
          link: "/ai/ai-cli/agent-instruktioner/",
        },
      ],
    },
  ],
};
