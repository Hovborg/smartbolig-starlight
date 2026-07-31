import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OFFICIAL_EVIDENCE,
  selectOfficialEvidence,
} from "../functions/lib/official-evidence.js";

const automationCases = [
  ["da", "Skal min YAML-automation have et id for at gemme spor?"],
  ["da", "Hvorfor har min Home Assistant-automation ingen trace?"],
  ["da", "Hvad tester knappen Kør handlinger i en automation?"],
  ["da", "Bliver triggeren kørt, når jeg vælger Kør handlinger?"],
  ["da", "Hvordan kontrollerer jeg YAML før en genstart af Home Assistant?"],
  ["da", "Hvordan fejlsøger jeg en Home Assistant-automation?"],
  ["da", "Hvor finder jeg automationens spor?"],
  ["da", "Gemmer Home Assistant debug-spor for automationer i YAML?"],
  ["da", "Min automation stopper ved en betingelse — hvordan ser jeg hvorfor?"],
  ["da", "Kan Kør handlinger bevise at betingelserne virker?"],
  ["da", "Hvordan tester jeg en trigger i en HA-automation sikkert?"],
  ["da", "Hvor mange spor gemmer en automation normalt?"],
  ["da", "Hvad betyder trace i en Home Assistant-automation?"],
  ["da", "Min YAML automation kører, men der er ingen spor"],
  ["da", "Skal alias eller id bruges for automation traces?"],
  ["da", "Hvordan bruger jeg Udviklerværktøjer til at tjekke automations-YAML?"],
  ["da", "Automationens handling virker manuelt, men triggeren gør ikke"],
  ["da", "Hvordan ser jeg hvilken betingelse en automatisering fejlede på?"],
  ["da", "Kan jeg teste en automation uden at springe triggeren over?"],
  ["da", "Hvordan validerer jeg configuration.yaml før restart?"],
  ["en", "Does a YAML automation need an id for traces?"],
  ["en", "Why does my Home Assistant automation have no trace?"],
  ["en", "Does Run actions test automation triggers and conditions?"],
  ["en", "How do I check Home Assistant YAML before a restart?"],
  ["en", "How should I troubleshoot a Home Assistant automation?"],
  ["en", "Where can I inspect an automation trace?"],
  ["en", "My YAML automation runs but does not store debug traces"],
  ["en", "Can Run actions prove that a condition works?"],
  ["en", "How do I safely test an automation trigger?"],
  ["en", "How many traces does an automation store by default?"],
  ["en", "What does trace mean for a Home Assistant automation?"],
  ["en", "Should I use alias or id for automation traces?"],
  ["en", "How do I validate automation YAML in Developer tools?"],
  ["en", "The action works manually but the automation trigger does not"],
  ["en", "How can I see which automation condition failed?"],
  ["en", "Can I test an automation without bypassing the trigger?"],
  ["en", "How do I use Check configuration before restarting HA?"],
  ["en", "Why did my Home Assistant automation stop at a condition?"],
  ["en", "Will a YAML-created automation automatically save traces?"],
  ["en", "Help me diagnose a Home Assistant automation that never fires"],
];

const unrelatedCases = [
  ["da", "Hvordan segmenterer jeg mit Proxmox-netværk med VLAN?"],
  ["da", "Hvilken Zigbee-sensor skal jeg vælge?"],
  ["da", "Skriv en ESPHome-konfiguration til en temperatursensor"],
  ["da", "Min GitHub Actions-automation fejler i CI"],
  ["da", "Hvordan automatiserer jeg et cron-job?"],
  ["en", "How should I segment a Proxmox network with VLANs?"],
  ["en", "Which Zigbee sensor should I choose?"],
  ["en", "Write an ESPHome temperature sensor configuration"],
  ["en", "My GitHub Actions automation failed in CI"],
  ["en", "How do I automate a cron job?"],
];

test("official evidence registry contains only reviewed allowlisted sources", () => {
  assert.equal(OFFICIAL_EVIDENCE.length, 1);
  assert.equal(OFFICIAL_EVIDENCE[0].id, "ha-automation-troubleshooting");

  for (const entry of OFFICIAL_EVIDENCE) {
    for (const source of entry.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(["www.home-assistant.io", "esphome.io"].includes(url.hostname));
      assert.equal(source.type, "official");
    }
  }
});

test("50-case selector routes automation troubleshooting without overclaiming other topics", () => {
  assert.equal(automationCases.length + unrelatedCases.length, 50);

  for (const [locale, prompt] of automationCases) {
    const evidence = selectOfficialEvidence(prompt, locale);
    assert.deepEqual(
      evidence.evidenceIds,
      ["ha-automation-troubleshooting"],
      `expected official automation evidence for: ${prompt}`,
    );
    assert.equal(evidence.sources.length, 2);
    assert.ok(evidence.facts.length >= 3);
  }

  for (const [locale, prompt] of unrelatedCases) {
    const evidence = selectOfficialEvidence(prompt, locale);
    assert.deepEqual(evidence, { facts: [], sources: [], evidenceIds: [] }, `unexpected evidence for: ${prompt}`);
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

  assert.match(readme, /Officielle HA-kilder\s+kontrolleret/);
  assert.match(readme, /SmartBolig-kilder \+ bred AI-viden/);
  assert.match(readme, /Generel\s+AI-viden/);
  assert.match(readme, /50[^\n]*(?:case|spørgsmål|prompter)/i);
  assert.match(changelog, /verified Home Assistant evidence|verificeret Home Assistant-evidens/i);
});
