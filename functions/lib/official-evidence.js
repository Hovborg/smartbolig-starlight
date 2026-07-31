const HOME_ASSISTANT_PATTERN = /\bhome assistant\b|\bha\b/iu;
const AUTOMATION_PATTERN = /\b(?:automation\p{L}*|automatisering\p{L}*)\b/iu;
const AUTOMATION_TROUBLESHOOTING_DETAIL_PATTERN =
  /\b(?:trace\p{L}*|spor(?:et|ene|ing)?|run[ -]actions|kør[ -]handlinger|trigger\p{L}*|condition\p{L}*|betingelse\p{L}*|yaml|configuration\.yaml|check configuration|kontrollér konfiguration|developer tools|udviklerværktøjer)\b/iu;
const STRONG_HOME_ASSISTANT_AUTOMATION_PATTERN =
  /\b(?:run[ -]actions|kør[ -]handlinger|configuration\.yaml)\b/iu;
const HOME_ASSISTANT_CONFIG_CHECK_PATTERN =
  /(?:\bhome assistant\b|\bha\b).{0,100}\b(?:yaml|check configuration|kontrollér konfiguration|validate|validér|restart|genstart)\b|\b(?:yaml|check configuration|kontrollér konfiguration|validate|validér)\b.{0,100}(?:\bhome assistant\b|\bha\b)/iu;

export const OFFICIAL_EVIDENCE = Object.freeze([
  Object.freeze({
    id: "ha-automation-troubleshooting",
    lastVerified: "2026-07-31",
    facts: Object.freeze({
      da: Object.freeze([
        "YAML-oprettede automationer skal have et unikt id, før debug-spor gemmes.",
        "Kør handlinger springer triggere og betingelser over og kan derfor ikke bevise hele automationens naturlige forløb.",
        "Kontrollér YAML-syntaks via Udviklerværktøjer > YAML > Kontrollér konfiguration før genstart.",
        "Home Assistant gemmer som standard de seneste fem spor pr. automation; antallet kan ændres med trace.stored_traces.",
      ]),
      en: Object.freeze([
        "YAML-created automations need a unique id before debug traces are stored.",
        "Run actions skips triggers and conditions, so it cannot prove the automation's complete natural flow.",
        "Check YAML syntax with Developer tools > YAML > Check configuration before restarting.",
        "Home Assistant stores the five most recent traces per automation by default; trace.stored_traces changes the count.",
      ]),
    }),
    sources: Object.freeze([
      Object.freeze({
        title: "Home Assistant: Testing and troubleshooting automations",
        url: "https://www.home-assistant.io/docs/automation/troubleshooting/",
        type: "official",
      }),
      Object.freeze({
        title: "Home Assistant: Automation YAML",
        url: "https://www.home-assistant.io/docs/automation/yaml/",
        type: "official",
      }),
    ]),
  }),
]);

export function selectOfficialEvidence(message, locale = "da") {
  const text = typeof message === "string" ? message.trim() : "";
  const hasAutomationContext = AUTOMATION_PATTERN.test(text);
  const hasTroubleshootingDetail = AUTOMATION_TROUBLESHOOTING_DETAIL_PATTERN.test(text);
  const isHomeAssistantAutomationQuestion =
    (HOME_ASSISTANT_PATTERN.test(text) && (hasAutomationContext || hasTroubleshootingDetail)) ||
    (hasAutomationContext && hasTroubleshootingDetail) ||
    STRONG_HOME_ASSISTANT_AUTOMATION_PATTERN.test(text) ||
    HOME_ASSISTANT_CONFIG_CHECK_PATTERN.test(text);

  if (!text || !isHomeAssistantAutomationQuestion) {
    return { facts: [], sources: [], evidenceIds: [] };
  }

  const language = locale === "en" ? "en" : "da";
  const entry = OFFICIAL_EVIDENCE[0];
  return {
    facts: [...entry.facts[language]],
    sources: entry.sources.map((source) => ({ ...source })),
    evidenceIds: [entry.id],
  };
}
