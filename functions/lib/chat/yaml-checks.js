// Checks fenced Home Assistant YAML in a model answer against the requested shape.

export function hasModeKeyValue(content, requestedMode) {
  const modeValue = `(?:${requestedMode}\\b|"${requestedMode}"|'${requestedMode}')`;
  return new RegExp(`\\bmode\\s*:\\s*${modeValue}`, "iu").test(content);
}

function hasTopLevelYamlMode(yaml, requestedMode) {
  return hasYamlModeAtIndent(yaml, requestedMode, 0);
}

export function hasYamlModeAtIndent(yaml, requestedMode, spaces) {
  const modeValue = `(?:${requestedMode}|"${requestedMode}"|'${requestedMode}')`;
  const modeLine = new RegExp(
    `^ {${spaces}}mode\\s*:\\s*${modeValue}\\s*(?:#.*)?$`,
    "iu",
  );
  return yaml.split(/\r?\n/u).some((line) => modeLine.test(line));
}

export function hasValidRequestedHomeAssistantYaml(yaml, requestedYamlShape) {
  if (requestedYamlShape === "editor") return hasValidSingleAutomationEditorRoot(yaml);
  if (requestedYamlShape === "configuration") return hasValidConfigurationYamlAutomation(yaml);
  if (requestedYamlShape === "automations") return hasValidAutomationsYamlEntry(yaml);
  if (requestedYamlShape === "blueprint") return hasValidAutomationBlueprint(yaml);
  return false;
}

function hasInvalidAutomationKeyAtIndent(yaml, spaces) {
  const invalidKey = new RegExp(
    `^ {${spaces}}(?:trigger|condition|action|max_runs)\\s*:`,
    "iu",
  );
  return yaml.split(/\r?\n/u).some((line) =>
    invalidKey.test(line),
  );
}

function collectAllowedRootKeys(yaml, allowedRootKeys) {
  const rootKeys = new Set();
  for (const line of yaml.split(/\r?\n/u)) {
    if (!line.trim() || /^\s/u.test(line) || /^#/u.test(line)) continue;
    const keyMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:/u);
    if (!keyMatch || !allowedRootKeys.has(keyMatch[1])) return null;
    rootKeys.add(keyMatch[1]);
  }
  return rootKeys;
}

function hasValidSingleAutomationEditorRoot(yaml) {
  const lines = yaml.split(/\r?\n/u);
  const firstMeaningfulLine = lines.find((line) => line.trim() && !/^\s*#/u.test(line));
  if (!firstMeaningfulLine || !/^alias\s*:/iu.test(firstMeaningfulLine)) return false;

  const allowedRootKeys = new Set([
    "alias",
    "id",
    "description",
    "initial_state",
    "trace",
    "variables",
    "trigger_variables",
    "mode",
    "max",
    "max_exceeded",
    "triggers",
    "conditions",
    "actions",
  ]);
  const rootKeys = collectAllowedRootKeys(yaml, allowedRootKeys);
  if (!rootKeys) return false;

  return rootKeys.has("alias") && rootKeys.has("triggers") && rootKeys.has("actions");
}

function hasValidConfigurationYamlAutomation(yaml) {
  const lines = yaml.split(/\r?\n/u);
  const firstMeaningfulLine = lines.find((line) => line.trim() && !/^\s*#/u.test(line));
  if (!firstMeaningfulLine || !/^automation\s+[A-Za-z0-9_-]+\s*:/u.test(firstMeaningfulLine)) {
    return false;
  }
  if (hasInvalidAutomationKeyAtIndent(yaml, 4)) return false;
  const rootLines = lines.filter((line) => line.trim() && !/^\s/u.test(line) && !/^#/u.test(line));
  const listItems = lines.filter((line) => /^\s{2}-\s+(?:id|alias)\s*:/u.test(line));
  const hasAlias = lines.some((line) =>
    /^\s{2}-\s+alias\s*:|^\s{4}alias\s*:/u.test(line),
  );
  return (
    rootLines.length === 1 &&
    listItems.length === 1 &&
    hasAlias &&
    lines.some((line) => /^\s{4}triggers\s*:/u.test(line)) &&
    lines.some((line) => /^\s{4}actions\s*:/u.test(line))
  );
}

function hasValidAutomationsYamlEntry(yaml) {
  const lines = yaml.split(/\r?\n/u);
  const firstMeaningfulLine = lines.find((line) => line.trim() && !/^\s*#/u.test(line));
  if (!firstMeaningfulLine || !/^-\s+id\s*:/u.test(firstMeaningfulLine)) return false;
  if (hasInvalidAutomationKeyAtIndent(yaml, 2)) return false;
  const rootListItems = lines.filter((line) => /^-\s+/u.test(line));
  return (
    rootListItems.length === 1 &&
    lines.some((line) => /^\s{2}alias\s*:/u.test(line)) &&
    lines.some((line) => /^\s{2}triggers\s*:/u.test(line)) &&
    lines.some((line) => /^\s{2}actions\s*:/u.test(line))
  );
}

function hasValidAutomationBlueprint(yaml) {
  const lines = yaml.split(/\r?\n/u);
  const firstMeaningfulLine = lines.find((line) => line.trim() && !/^\s*#/u.test(line));
  if (firstMeaningfulLine !== "blueprint:") return false;
  const rootKeys = collectAllowedRootKeys(
    yaml,
    new Set([
      "blueprint",
      "variables",
      "trigger_variables",
      "mode",
      "max",
      "max_exceeded",
      "triggers",
      "conditions",
      "actions",
    ]),
  );
  if (!rootKeys) return false;
  return (
    lines.some((line) => /^\s{2}name\s*:/u.test(line)) &&
    lines.some((line) => /^\s{2}domain\s*:\s*automation\s*(?:#.*)?$/iu.test(line)) &&
    rootKeys.has("triggers") &&
    rootKeys.has("actions")
  );
}
