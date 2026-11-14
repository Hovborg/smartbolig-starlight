// Reads what YAML output and automation mode the visitor asked for.

export function requestsFencedYamlOutput(content) {
  let decision = null;
  for (const clause of instructionClauses(content)) {
    const clauseDecision = classifyFencedYamlClause(clause);
    if (clauseDecision !== null) decision = clauseDecision;
  }
  return decision === true;
}

export function requestedHomeAssistantYamlShape(content) {
  const explicitlyFencedYaml =
    requestsFencedYamlOutput(content) ||
    /\b(?:fenced|code\s*block|kodeblok)[\s\S]{0,80}\b(?:configuration|automations)\.ya?ml\b/iu.test(
      content,
    );
  if (!explicitlyFencedYaml) return null;
  const hasAutomationContext = /\bautomation(?:s|er)?\b/iu.test(content);
  const hasHomeAssistantContext =
    /\bhome assistant\b/iu.test(content) ||
    /\bHA\b/u.test(content) ||
    requestedAutomationModes(content).length > 0;
  if (!hasAutomationContext) return null;
  if (/\bconfiguration\.ya?ml\b/iu.test(content)) return "configuration";
  if (/\bautomations\.ya?ml\b/iu.test(content)) return "automations";
  if (/\bblueprint\b/iu.test(content) && hasHomeAssistantContext) {
    return "blueprint";
  }
  if (/\bautomation\b/iu.test(content) && hasHomeAssistantContext) return "editor";
  return null;
}

export function requestedAutomationModes(content) {
  const modePattern = /\bmode\s*(:?)\s*(single|restart|queued|parallel)\b/giu;
  const requestedModes = new Set();
  for (const clause of instructionClauses(content)) {
    if (isConceptualQuestion(clause)) continue;
    const modeMatches = [...clause.matchAll(modePattern)].filter(
      (match) => !isNegatedModeMention(clause, match),
    );
    if (modeMatches.length === 0) continue;
    const requestsFencedYamlInClause = classifyFencedYamlClause(clause) === true;
    const hasExplicitKeyValue = modeMatches.some((match) => match[1] === ":");
    const intent = lastOutputIntent(clause, !hasExplicitKeyValue);
    const hasPositiveModeIntent = intent && !isNegatedIntent(clause, intent);
    if (!requestsFencedYamlInClause && !hasPositiveModeIntent) continue;

    for (const match of modeMatches) {
      if (requestsFencedYamlInClause || match[1] === ":" || hasModeConfigurationIntent(clause)) {
        requestedModes.add(match[2].toLowerCase());
      }
    }
  }
  return [...requestedModes];
}

function instructionClauses(content) {
  const protectedFilenames = content.replace(
    /\b(configuration|automations)\.(ya?ml)\b/giu,
    "$1-$2",
  );
  return (protectedFilenames.match(/[^.!?;\n]+[.!?]?/gu) || [])
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function classifyFencedYamlClause(clause) {
  const mentionsYaml = /\bya?ml\b/iu.test(clause);
  const mentionsFence =
    /\b(?:code\s*block|fenced|kodeblok|three\s+backticks?|tre\s+backticks?|triple\s+backticks?)\b|```/iu.test(clause);
  if (!mentionsYaml || !mentionsFence) return null;
  if (isExclusiveStructuredRequest(clause)) return true;
  if (isConceptualQuestion(clause)) return null;

  const intent = lastOutputIntent(clause);
  if (!intent) return null;
  if (hasDirectStructuredRejection(clause) || isNegatedIntent(clause, intent)) return false;
  return true;
}

function lastOutputIntent(content, modeConfigurationOnly = false) {
  const verbs = modeConfigurationOnly
    ? "build|create|generate|include|set|use|write|byg|brug|gener[eé]r|inklud[eé]r|lav|opret|skriv|sæt"
    : "answer|build|compare|create|generate|give|include|need|output|provide|put|respond|return|set|show|use|want|write|byg|brug|gener[eé]r|giv|inklud[eé]r|lav|opret|return[eé]r|sammenlign|skriv|svar|vis|vil|ønsker|sæt";
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}_])(${verbs})(?=$|[^\\p{L}\\p{N}_])`,
    "giu",
  );
  const matches = [...content.matchAll(pattern)];
  const match = matches.at(-1);
  if (!match) return null;
  const verbOffset = match[0].lastIndexOf(match[1]);
  return {
    index: (match.index || 0) + verbOffset,
    length: match[1].length,
  };
}

function isConceptualQuestion(clause) {
  if (!/\?\s*$/u.test(clause)) return false;
  return !/^(?:(?:can|could|will|would)\s+you|(?:kan|kunne|vil)\s+du|please|venligst|return|put|create|generate|show|write|opret|return[eé]r|skriv|vis)\b/iu.test(
    clause,
  );
}

function isExclusiveStructuredRequest(clause) {
  return /(?:anything\s+except|nothing\s+but|ikke\s+andet\s+end|kun)[\s\S]{0,80}(?:code\s*block|fenced|kodeblok|ya?ml)/iu.test(
    clause,
  );
}

function hasDirectStructuredRejection(clause) {
  return /(?:^|[^\p{L}\p{N}_])(?:(?:no|ingen|uden|without)\s+(?:(?:a|an|any|en|et)\s+)?|(?:not|ikke)\s+(?:(?:in|inside|i|med|som)\s+)?(?:(?:a|an|any|en|et)\s+)?)(?:code\s*block|fenced|kodeblok|three\s+backticks?|tre\s+backticks?|triple\s+backticks?|ya?ml)(?=$|[^\p{L}\p{N}_])/iu.test(
    clause,
  );
}

function isNegatedIntent(clause, intent) {
  const before = clause.slice(Math.max(0, intent.index - 16), intent.index);
  const after = clause.slice(intent.index + intent.length, intent.index + intent.length + 16);
  return /(?:do\s+not|don't|not)\s*$/iu.test(before) || /^\s+ikke\b/iu.test(after);
}

function hasModeConfigurationIntent(clause) {
  return Boolean(lastOutputIntent(clause, true));
}

function isNegatedModeMention(clause, match) {
  const start = match.index || 0;
  const end = start + match[0].length;
  const before = clause.slice(Math.max(0, start - 20), start);
  const after = clause.slice(end, end + 24);
  return /(?:ikke|not)\s*$/iu.test(before) || /^\s+(?:(?:must|should|må|skal)\s+)?(?:ikke|not)\b/iu.test(after);
}
