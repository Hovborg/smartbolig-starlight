const HOME_ASSISTANT_PATTERN = /\bhome assistant\b|\bha\b/iu;
const ESPHOME_PATTERN = /\besphome\b/iu;
const AUTOMATION_PATTERN = /\b(?:automation\p{L}*|automatisering\p{L}*)\b/iu;
const STRONG_HOME_ASSISTANT_AUTOMATION_PATTERN =
  /\b(?:run[ -]actions|kør[ -]handlinger)\b/iu;
const AUTOMATION_FAILURE_PATTERN =
  /\b(?:troubleshoot\p{L}*|fejlsøg\p{L}*|never fires|aldrig starter)\b/iu;
const YAML_CONFIG_PATTERN = /\b(?:yaml|configuration\.yaml)\b/iu;
const CONFIG_CHECK_ACTION_PATTERN =
  /\b(?:check|kontrollér|validate|validér|restart|genstart)\b/iu;
const AUTOMATION_MODE_LABEL_PATTERN =
  /\b(?:mode|modes|run mode|kørselstilstand)\b/iu;
const AUTOMATION_MODE_VALUE_PATTERN =
  /\b(?:single|restart|queued|parallel|max_exceeded)\b/iu;
const AUTOMATION_MODE_VALUES_PATTERN =
  /\b(?:single|restart|queued|parallel|max_exceeded)\b/giu;
const TEMPLATE_CONTEXT_PATTERN = /\b(?:template\p{L}*|skabelon\p{L}*|jinja)\b/iu;
const TEMPLATE_STATE_DETAIL_PATTERN =
  /\b(?:state\p{L}*|tilstand\p{L}*|unknown|unavailable|ukendt\p{L}*|utilgængelig\p{L}*|float conversion|numeric conversion|numerisk konvertering|tekst eller et tal|text or a number)\b/iu;
const TEMPLATE_FUNCTION_PATTERN =
  /(?:\bstates\s*\(|\bstate_attr\s*\(|\bhas_value\s*\(|\bfloat\s*\(|\bint\s*\()/iu;
const SECURITY_PATTERN =
  /\b(?:mfa|2fa|multi-factor|password\p{L}*|adgangskode\p{L}*|secrets?\.yaml|remote access|fjernadgang|encrypt\p{L}*|krypter\p{L}*)\b/iu;
const EXPOSURE_PATTERN = /\b(?:expos\p{L}*|eksponer\p{L}*)\b/iu;
const PUBLIC_NETWORK_PATTERN =
  /\b(?:internet\p{L}*|public(?:ly)?|offentlig\p{L}*|wan|external network|eksternt netværk)\b/iu;
const SECURITY_ACTION_PATTERN =
  /\b(?:secure|securing|sikr(?:e|er|ing)|beskyt\p{L}*)\b/iu;
const ESPHOME_API_PATTERN = /\b(?:native api|api(?:'et|en)?)\b/iu;
const TRACE_PATTERN = /\b(?:trace\p{L}*|spor(?:et|ene|ing)?)\b/iu;
const ESPHOME_SAFE_MODE_PATTERN =
  /\b(?:safe[ _-]mode|boot[ -]?loop|bootfejl\p{L}*|boot failure\p{L}*|gentagne boot)\b/iu;
const SENSOR_PATTERN = /\bsensor\p{L}*\b/iu;
const ESPHOME_SENSOR_COMPONENT_DETAIL_PATTERN =
  /\b(?:on_value|on_raw_value|raw value|rå værdi|unit_of_measurement|accuracy_decimals|force_update)\b/iu;
const SENSOR_FILTER_PATTERN = /\b(?:filter\p{L}*|filtrering)\b/iu;
const SENSOR_FILTER_ORDER_PATTERN =
  /\b(?:order|sequence|rækkefølge)\b/iu;

function freezeEntry(entry) {
  return Object.freeze({
    ...entry,
    facts: Object.freeze({
      da: Object.freeze(entry.facts.da),
      en: Object.freeze(entry.facts.en),
    }),
    sources: Object.freeze(entry.sources.map((source) => Object.freeze(source))),
  });
}

export const OFFICIAL_EVIDENCE = Object.freeze([
  freezeEntry({
    id: "ha-automation-troubleshooting",
    lastVerified: "2026-07-31",
    facts: {
      da: [
        "YAML-oprettede automationer skal have et unikt id, før debug-spor gemmes.",
        "Kør handlinger springer triggere og betingelser over og kan derfor ikke bevise hele automationens naturlige forløb.",
        "Kontrollér YAML-syntaks via Udviklerværktøjer > YAML > Kontrollér konfiguration før genstart.",
        "Home Assistant gemmer som standard de seneste fem spor pr. automation; antallet kan ændres med trace.stored_traces.",
      ],
      en: [
        "YAML-created automations need a unique id before debug traces are stored.",
        "Run actions skips triggers and conditions, so it cannot prove the automation's complete natural flow.",
        "Check YAML syntax with Developer tools > YAML > Check configuration before restarting.",
        "Home Assistant stores the five most recent traces per automation by default; trace.stored_traces changes the count.",
      ],
    },
    sources: [
      {
        title: "Home Assistant: Testing and troubleshooting automations",
        url: "https://www.home-assistant.io/docs/automation/troubleshooting/",
        type: "official",
      },
      {
        title: "Home Assistant: Automation YAML",
        url: "https://www.home-assistant.io/docs/automation/yaml/",
        type: "official",
      },
    ],
  }),
  freezeEntry({
    id: "ha-automation-modes",
    lastVerified: "2026-07-31",
    facts: {
      da: [
        "single er standard og starter ikke en ny kørsel, mens automationen allerede kører.",
        "restart stopper den tidligere kørsel og starter kun forfra, hvis automationens betingelser er opfyldt.",
        "queued optager kun en ny kørsel i køen, hvis betingelserne er opfyldt ved trigger-tidspunktet, og køen afvikles i rækkefølge.",
        "parallel starter en uafhængig kørsel samtidig med tidligere kørsler.",
        "For queued og parallel styrer max antallet af aktive eller ventende kørsler; standarden er 10.",
      ],
      en: [
        "single is the default and does not start a new run while the automation is already running.",
        "restart stops the previous run and starts over only when the automation conditions are met.",
        "queued admits a new run only when its conditions are met at trigger time and executes queued runs in order.",
        "parallel starts an independent run alongside previous runs.",
        "For queued and parallel, max controls active or queued runs; the default is 10.",
      ],
    },
    sources: [
      {
        title: "Home Assistant: Automation modes",
        url: "https://www.home-assistant.io/docs/automation/modes/",
        type: "official",
      },
    ],
  }),
  freezeEntry({
    id: "ha-template-states",
    lastVerified: "2026-07-31",
    facts: {
      da: [
        "Home Assistant gemmer alle entity-tilstande som tekst, også når en sensor ser numerisk ud.",
        "Konvertér en sensorværdi med float eller int og en eksplicit fallback før matematik eller numeriske sammenligninger.",
        "unknown betyder, at værdien ikke kendes; unavailable betyder, at entityen ikke kan nås; en manglende entity giver også teksten unknown.",
        "has_value kan bruges til at afvise unknown og unavailable før en beslutning.",
        "En entity-tilstand kan højst være 255 tegn; længere data hører til i attributter.",
      ],
      en: [
        "Home Assistant stores every entity state as text, even when a sensor appears numeric.",
        "Convert a sensor value with float or int and an explicit fallback before arithmetic or numeric comparisons.",
        "unknown means the value is not known; unavailable means the entity cannot be reached; a missing entity also returns the text unknown.",
        "has_value can reject unknown and unavailable before making a decision.",
        "An entity state is limited to 255 characters; longer data belongs in attributes.",
      ],
    },
    sources: [
      {
        title: "Home Assistant: Working with states",
        url: "https://www.home-assistant.io/docs/templating/states/",
        type: "official",
      },
    ],
  }),
  freezeEntry({
    id: "ha-security",
    lastVerified: "2026-07-31",
    facts: {
      da: [
        "Brug en stærk, unik adgangskode til hver Home Assistant-konto og aktivér multifaktorgodkendelse.",
        "Giv kun administratoradgang til konti, der har brug for den.",
        "secrets.yaml samler hemmeligheder, men krypterer dem ikke.",
        "Brug en sikker fjernadgangsmetode frem for at eksponere Home Assistant direkte på internettet.",
      ],
      en: [
        "Use a strong, unique password for every Home Assistant account and enable multi-factor authentication.",
        "Grant administrator access only to accounts that need it.",
        "secrets.yaml centralizes secrets but does not encrypt them.",
        "Use a secure remote-access method instead of exposing Home Assistant directly to the internet.",
      ],
    },
    sources: [
      {
        title: "Home Assistant: Securing your Home Assistant",
        url: "https://www.home-assistant.io/docs/configuration/securing/",
        type: "official",
      },
    ],
  }),
  freezeEntry({
    id: "esphome-security",
    lastVerified: "2026-07-31",
    facts: {
      da: [
        "ESPHome er designet til betroede netværk og bør ikke eksponeres direkte på internettet eller andre fjendtlige netværk.",
        "Aktivér native API-kryptering med en unik nøgle pr. enhed, og gem nøglen via secrets.yaml.",
        "Beskyt ESPHome-webserveren med godkendelse, hvis den er aktiveret.",
        "Beskyt OTA med en stærk, unik adgangskode pr. enhed.",
        "Netværkssegmentering er et ekstra lag; mDNS-opdagelse virker normalt ikke på tværs af VLAN uden særskilt design.",
      ],
      en: [
        "ESPHome is designed for trusted networks and should not be exposed directly to the internet or other hostile networks.",
        "Enable native API encryption with a unique key per device and store the key through secrets.yaml.",
        "Protect the ESPHome web server with authentication when it is enabled.",
        "Protect OTA with a strong, unique password per device.",
        "Network segmentation adds a layer of protection; mDNS discovery normally does not cross VLANs without separate design.",
      ],
    },
    sources: [
      {
        title: "ESPHome: Security Best Practices",
        url: "https://esphome.io/guides/security_best_practices/",
        type: "official",
      },
      {
        title: "ESPHome: Native API Component",
        url: "https://esphome.io/components/api/",
        type: "official",
      },
    ],
  }),
  freezeEntry({
    id: "esphome-safe-mode",
    lastVerified: "2026-07-31",
    facts: {
      da: [
        "ESPHome kan aktivere safe mode efter gentagne bootfejl; standardgrænsen er 10 mislykkede bootforsøg.",
        "I safe mode er kun seriel logning, netværk og OTA aktive; blandt andet sensorer og displays er deaktiveret.",
        "OTA-komponenten konfigurerer automatisk safe mode, medmindre den udtrykkeligt deaktiveres.",
        "Standarderne er ét minut før et boot markeres som godt og fem minutters reboot-timeout i safe mode.",
      ],
      en: [
        "ESPHome can enter safe mode after repeated boot failures; the default threshold is 10 failed boot attempts.",
        "In safe mode, only serial logging, networking, and OTA remain active; components such as sensors and displays are disabled.",
        "The OTA component configures safe mode automatically unless it is explicitly disabled.",
        "The defaults are one minute before a boot is marked successful and a five-minute reboot timeout in safe mode.",
      ],
    },
    sources: [
      {
        title: "ESPHome: Safe Mode",
        url: "https://esphome.io/components/safe_mode/",
        type: "official",
      },
    ],
  }),
  freezeEntry({
    id: "esphome-sensors",
    lastVerified: "2026-07-31",
    facts: {
      da: [
        "unit_of_measurement annoncerer enheden, men konverterer ikke selve ESPHome-sensorværdien.",
        "Sensorfiltre anvendes i den rækkefølge, de står i konfigurationen.",
        "on_value udløses efter alle filtre; on_raw_value udløses på den rå værdi før filtrering.",
        "accuracy_decimals ændrer Home Assistants afrunding og visning, men ændrer ikke værdien sendt over API'et.",
        "force_update kan skabe state-changed-events for uændrede værdier og kan øge Home Assistant-databasens størrelse markant.",
      ],
      en: [
        "unit_of_measurement advertises the unit but does not convert the ESPHome sensor value itself.",
        "Sensor filters are applied in the order in which they appear in the configuration.",
        "on_value fires after all filters; on_raw_value fires for the raw value before filtering.",
        "accuracy_decimals changes Home Assistant rounding and display but not the value sent over the API.",
        "force_update can create state-changed events for unchanged values and can significantly increase the Home Assistant database size.",
      ],
    },
    sources: [
      {
        title: "ESPHome: Sensor Component",
        url: "https://esphome.io/components/sensor/",
        type: "official",
      },
    ],
  }),
]);

const EVIDENCE_MATCHERS = Object.freeze({
  "ha-automation-troubleshooting": (text) => {
    const hasHomeAssistantContext = HOME_ASSISTANT_PATTERN.test(text);
    const hasAutomationContext = AUTOMATION_PATTERN.test(text);
    const hasTroubleshootingDetail =
      TRACE_PATTERN.test(text) || AUTOMATION_FAILURE_PATTERN.test(text);
    return (
      (hasHomeAssistantContext && hasAutomationContext && hasTroubleshootingDetail) ||
      (hasHomeAssistantContext && STRONG_HOME_ASSISTANT_AUTOMATION_PATTERN.test(text)) ||
      (hasHomeAssistantContext &&
        YAML_CONFIG_PATTERN.test(text) &&
        CONFIG_CHECK_ACTION_PATTERN.test(text))
    );
  },
  "ha-automation-modes": (text) => {
    if (!HOME_ASSISTANT_PATTERN.test(text)) return false;
    if (AUTOMATION_MODE_LABEL_PATTERN.test(text) && AUTOMATION_MODE_VALUE_PATTERN.test(text)) {
      return true;
    }
    const modeValues = new Set(
      (text.match(AUTOMATION_MODE_VALUES_PATTERN) || []).map((value) => value.toLowerCase()),
    );
    return AUTOMATION_PATTERN.test(text) && modeValues.size >= 2;
  },
  "ha-template-states": (text) =>
    HOME_ASSISTANT_PATTERN.test(text) &&
    (TEMPLATE_FUNCTION_PATTERN.test(text) ||
      (TEMPLATE_CONTEXT_PATTERN.test(text) && TEMPLATE_STATE_DETAIL_PATTERN.test(text))),
  "ha-security": (text) =>
    HOME_ASSISTANT_PATTERN.test(text) &&
    (SECURITY_PATTERN.test(text) ||
      (EXPOSURE_PATTERN.test(text) && PUBLIC_NETWORK_PATTERN.test(text))),
  "esphome-security": (text) =>
    ESPHOME_PATTERN.test(text) &&
    (SECURITY_PATTERN.test(text) ||
      (EXPOSURE_PATTERN.test(text) && PUBLIC_NETWORK_PATTERN.test(text)) ||
      (ESPHOME_API_PATTERN.test(text) && SECURITY_ACTION_PATTERN.test(text))),
  "esphome-safe-mode": (text) =>
    ESPHOME_PATTERN.test(text) && ESPHOME_SAFE_MODE_PATTERN.test(text),
  "esphome-sensors": (text) => {
    if (!ESPHOME_PATTERN.test(text) || !SENSOR_PATTERN.test(text)) return false;
    if (ESPHOME_SENSOR_COMPONENT_DETAIL_PATTERN.test(text)) return true;
    return SENSOR_FILTER_PATTERN.test(text) && SENSOR_FILTER_ORDER_PATTERN.test(text);
  },
});

const EMPTY_EVIDENCE = Object.freeze({
  facts: Object.freeze([]),
  sources: Object.freeze([]),
  evidenceIds: Object.freeze([]),
  verifiedAt: null,
});

export function selectOfficialEvidence(message, locale = "da") {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return { facts: [], sources: [], evidenceIds: [], verifiedAt: null };

  const selected = OFFICIAL_EVIDENCE.filter((entry) => EVIDENCE_MATCHERS[entry.id]?.(text));
  if (selected.length === 0) return { ...EMPTY_EVIDENCE, facts: [], sources: [], evidenceIds: [] };

  const language = locale === "en" ? "en" : "da";
  const factSet = new Set();
  const sourceMap = new Map();

  for (const entry of selected) {
    for (const fact of entry.facts[language]) factSet.add(fact);
    for (const source of entry.sources) {
      if (!sourceMap.has(source.url)) sourceMap.set(source.url, { ...source });
    }
  }

  return {
    facts: [...factSet],
    sources: [...sourceMap.values()],
    evidenceIds: selected.map((entry) => entry.id),
    verifiedAt: selected.reduce(
      (oldest, entry) => (!oldest || entry.lastVerified < oldest ? entry.lastVerified : oldest),
      null,
    ),
  };
}
