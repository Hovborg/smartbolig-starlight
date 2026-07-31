import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OFFICIAL_EVIDENCE,
  selectOfficialEvidence,
} from "../functions/lib/official-evidence.js";

const evidenceCases = [
  {
    id: "ha-automation-troubleshooting",
    prompts: [
      ["da", "Skal min Home Assistant YAML-automation have et id for at gemme spor?"],
      ["da", "Hvad tester Kør handlinger i en Home Assistant-automation?"],
      ["da", "Hvordan validerer jeg configuration.yaml før genstart af HA?"],
      ["da", "Hvordan fejlsøger jeg en Home Assistant-automation, der aldrig starter?"],
      ["en", "Does a Home Assistant YAML automation need an id for stored traces?"],
      ["en", "Does Run actions test Home Assistant triggers and conditions?"],
      ["en", "How do I check Home Assistant YAML before a restart?"],
      ["en", "Help me diagnose a Home Assistant automation that never fires"],
    ],
  },
  {
    id: "ha-automation-modes",
    prompts: [
      ["da", "Hvad er forskellen på single, restart, queued og parallel i en Home Assistant-automation?"],
      ["da", "Hvornår skal min HA-automation bruge mode queued?"],
      ["da", "Stopper mode restart den tidligere kørsel i Home Assistant?"],
      ["en", "How do Home Assistant automation modes single and parallel differ?"],
      ["en", "When should an HA automation use queued mode?"],
      ["en", "Does restart mode stop the previous Home Assistant automation run?"],
    ],
  },
  {
    id: "ha-template-states",
    prompts: [
      ["da", "Hvorfor skal jeg bruge float(0) på en sensor state i en Home Assistant-template?"],
      ["da", "Hvordan håndterer en HA Jinja-template unknown og unavailable?"],
      ["da", "Er states('sensor.temperatur') tekst eller et tal i Home Assistant?"],
      ["da", "Hvordan håndterer en Home Assistant-skabelon ukendte og utilgængelige værdier?"],
      ["en", "Why should a Home Assistant template convert a sensor state with float(0)?"],
      ["en", "How do HA Jinja templates handle unknown and unavailable states?"],
      ["en", "Does states('sensor.temperature') return text or a number in Home Assistant?"],
    ],
  },
  {
    id: "ha-security",
    prompts: [
      ["da", "Hvordan sikrer jeg fjernadgang til Home Assistant?"],
      ["da", "Krypterer secrets.yaml mine Home Assistant-hemmeligheder?"],
      ["da", "Bør jeg aktivere MFA på Home Assistant?"],
      ["da", "Hvordan bruger jeg adgangskoder i Home Assistant?"],
      ["en", "How should I secure remote access to Home Assistant?"],
      ["en", "Does secrets.yaml encrypt Home Assistant secrets?"],
      ["en", "Should I enable MFA for Home Assistant accounts?"],
    ],
  },
  {
    id: "esphome-security",
    prompts: [
      ["da", "Hvordan beskytter jeg ESPHome native API med kryptering?"],
      ["da", "Skal hver ESPHome-enhed have sin egen OTA-adgangskode?"],
      ["da", "Er det sikkert at eksponere en ESPHome web server direkte på internettet?"],
      ["en", "How do I enable encryption for the ESPHome native API?"],
      ["en", "Should every ESPHome device use a unique OTA password?"],
      ["en", "Can I expose an ESPHome web server directly to the internet?"],
    ],
  },
  {
    id: "esphome-safe-mode",
    prompts: [
      ["da", "Hvad gør ESPHome safe mode efter en boot loop?"],
      ["da", "Virker sensorer i ESPHome safe mode, mens jeg laver OTA recovery?"],
      ["da", "Hvordan redder jeg en ESPHome-enhed efter gentagne bootfejl?"],
      ["da", "Hvorfor starter ESPHome safe mode efter OTA og en boot loop?"],
      ["en", "What does ESPHome safe mode do after a boot loop?"],
      ["en", "Are sensors active during ESPHome safe mode OTA recovery?"],
      ["en", "How can I recover an ESPHome device after repeated boot failures?"],
    ],
  },
  {
    id: "esphome-sensors",
    prompts: [
      ["da", "I hvilken rækkefølge kører filters på en ESPHome-sensor?"],
      ["da", "Hvad er forskellen på on_value og on_raw_value for en ESPHome-sensor?"],
      ["da", "Konverterer unit_of_measurement værdien i en ESPHome-sensor?"],
      ["en", "In which order are ESPHome sensor filters applied?"],
      ["en", "What is the difference between on_value and on_raw_value for an ESPHome sensor?"],
      ["en", "Does unit_of_measurement convert an ESPHome sensor value?"],
    ],
  },
];

const compoundCases = [
  [
    "da",
    "Hvordan beskytter jeg ESPHome API'et, og hvad gør safe mode ved en boot loop?",
    ["esphome-security", "esphome-safe-mode"],
  ],
  [
    "en",
    "Which Home Assistant queued automation mode should I use when my template needs float conversion?",
    ["ha-automation-modes", "ha-template-states"],
  ],
];

const unrelatedCases = [
  ["da", "Hvordan segmenterer jeg mit Proxmox-netværk med VLAN?"],
  ["da", "Hvilken Zigbee-sensor skal jeg vælge?"],
  ["da", "Skriv en almindelig ESPHome-konfiguration til en temperatursensor"],
  ["da", "Min GitHub Actions-automation bruger mode parallel"],
  ["da", "Hvordan sikrer jeg min Docker-host?"],
  ["da", "Min Arduino-sensor støjer, hvilket filter skal jeg bruge?"],
  ["da", "Hvordan starter Windows i safe mode?"],
  ["da", "Hvad er ESPHome?"],
  ["da", "Skal Home Assistant bruge internet?"],
  ["da", "Hvilken tilstand har min Home Assistant-alarm?"],
  ["da", "Kan Home Assistant køre på en single Raspberry Pi?"],
  ["da", "Min Node-RED-automation fejler, hvordan fejlsøger jeg den?"],
  ["en", "How should I segment a Proxmox network with VLANs?"],
  ["en", "Which Zigbee sensor should I choose?"],
  ["en", "Write a basic ESPHome temperature sensor configuration"],
  ["en", "My GitHub Actions automation uses parallel mode"],
  ["en", "How do I secure a Docker host?"],
  ["en", "Which filter should I use for a noisy Arduino sensor?"],
  ["en", "How do I boot Android in safe mode?"],
  ["en", "What is ESPHome?"],
  ["en", "Does Home Assistant need internet?"],
  ["en", "What state is my Home Assistant alarm?"],
  ["en", "Can Home Assistant run on a single Raspberry Pi?"],
  ["en", "My GitHub Actions automation never fires"],
  ["da", "Hvorfor starter safe mode efter OTA og en boot loop?"],
  ["en", "Can I install an Android OTA update in safe mode?"],
  ["en", "Does Windows safe mode fix a boot loop?"],
  ["en", "How do I convert an ESPHome binary sensor to a sensor?"],
  ["en", "Which filter removes noise from an ESPHome sensor?"],
  ["da", "Hvordan virker filtrering på min ESPHome-sensor?"],
  ["en", "Which device_class should I use for an ESPHome sensor?"],
  ["en", "Which state_class should I use for an ESPHome sensor?"],
  ["en", "Recommend a filter for noise from an ESPHome sensor"],
  ["en", "How should I filter noise from an ESPHome sensor?"],
  ["en", "How do I run actions in GitHub?"],
  ["en", "Will my Home Assistant automation restart after an update?"],
  ["en", "GitHub YAML automation id trace"],
  ["en", "Home Assistant template card styling"],
  ["en", "Which filter should I try first for ESPHome sensor noise?"],
  ["en", "Which trigger should my Home Assistant automation use?"],
  ["en", "Which condition should my Home Assistant automation use?"],
  ["da", "Er det sikkert at genstarte Home Assistant?"],
  ["da", "Er det sikkert at genstarte ESPHome?"],
  ["en", "How do I recover a deleted ESPHome YAML file?"],
  ["en", "How do I secure an ESPHome enclosure to the wall?"],
  ["en", "How do I protect an ESPHome device from rain?"],
  ["en", "What is the secret to Home Assistant success?"],
  ["en", "How do I expose a Home Assistant entity to Alexa?"],
  ["en", "How do I expose an ESPHome sensor to Home Assistant?"],
];

const selectorPromptCount =
  evidenceCases.reduce((count, entry) => count + entry.prompts.length, 0) +
  compoundCases.length +
  unrelatedCases.length;

test("official evidence registry contains only reviewed allowlisted sources", () => {
  const expectedIds = evidenceCases.map((entry) => entry.id);
  assert.equal(OFFICIAL_EVIDENCE.length, 7);
  assert.deepEqual(OFFICIAL_EVIDENCE.map((entry) => entry.id), expectedIds);
  assert.equal(new Set(expectedIds).size, expectedIds.length);

  for (const entry of OFFICIAL_EVIDENCE) {
    assert.match(entry.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.facts.da.length >= 3);
    assert.ok(entry.facts.en.length >= 3);
    for (const source of entry.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(["www.home-assistant.io", "esphome.io"].includes(url.hostname));
      assert.equal(source.type, "official");
    }
  }
});

test("selector routes seven reviewed topic families without overclaiming unrelated questions", () => {
  assert.equal(selectorPromptCount, 98);

  for (const { id, prompts } of evidenceCases) {
    for (const [locale, prompt] of prompts) {
      const evidence = selectOfficialEvidence(prompt, locale);
      assert.deepEqual(evidence.evidenceIds, [id], `unexpected evidence routing for: ${prompt}`);
      assert.ok(evidence.sources.length >= 1);
      assert.ok(evidence.facts.length >= 3);
      assert.match(evidence.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
  }

  for (const [locale, prompt, expectedIds] of compoundCases) {
    const evidence = selectOfficialEvidence(prompt, locale);
    assert.deepEqual(evidence.evidenceIds, expectedIds, `unexpected compound evidence for: ${prompt}`);
    assert.equal(new Set(evidence.sources.map((source) => source.url)).size, evidence.sources.length);
  }

  for (const [locale, prompt] of unrelatedCases) {
    const evidence = selectOfficialEvidence(prompt, locale);
    assert.deepEqual(
      evidence,
      { facts: [], sources: [], evidenceIds: [], verifiedAt: null },
      `unexpected evidence for: ${prompt}`,
    );
  }
});

test("bilingual trace guides and project docs describe the verified evidence contract", async () => {
  const [daGuide, enGuide, readme, changelog] = await Promise.all([
    readFile("src/content/docs/da/home-assistant/aktivitet-og-spor.mdx", "utf8"),
    readFile("src/content/docs/en/home-assistant/aktivitet-og-spor.mdx", "utf8"),
    readFile("README.md", "utf8"),
    readFile("CHANGELOG.md", "utf8"),
  ]);

  assert.match(daGuide, /YAML-oprettede automationer[^.]*unikt `id`[^.]*spor/is);
  assert.match(enGuide, /YAML-created automations[^.]*unique `id`[^.]*traces/is);
  for (const guide of [daGuide, enGuide]) {
    assert.match(guide, /https:\/\/www\.home-assistant\.io\/docs\/automation\/yaml\//);
  }

  assert.match(readme, /Officielle kilder\s+kontrolleret/);
  assert.match(readme, /SmartBolig-kilder \+ bred AI-viden/);
  assert.match(readme, /Generel\s+AI-viden/);
  assert.match(readme, /syv[^\n]*evidenspakker/i);
  for (const topic of [
    "automationsmåder",
    "template-tilstande",
    "Home Assistant-sikkerhed",
    "ESPHome-sikkerhed",
    "safe mode",
    "sensorfiltre",
  ]) {
    assert.match(readme, new RegExp(topic, "i"), `README mangler evidensområde: ${topic}`);
  }
  assert.match(readme, /kopierer ikke[^\n]*(?:Home Assistant|ESPHome)[^\n]*dokumentation/i);
  assert.match(readme, /officialVerifiedAt/);
  assert.match(readme, new RegExp(`\\*\\*${selectorPromptCount}\\s+testspørgsmål`));
  assert.match(changelog, /syv[^\n]*Home Assistant[^\n]*ESPHome|expanded[^\n]*Home Assistant[^\n]*ESPHome/i);
});
