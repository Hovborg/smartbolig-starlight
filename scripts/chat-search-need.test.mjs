// The words that decide when the site is searched for a question and what is searched for.
import assert from "node:assert/strict";
import test from "node:test";

import { followUpQuery, hasSmartHomeWord, isFollowUp, latestQuestion } from "../functions/lib/chat/search-need.js";

test("the words a one-word question about the site needs count as smart home words", () => {
  for (const question of [
    "Hvad er en hub?",
    "Hvad er en gateway?",
    "Min pære blinker",
    "Hvilke pærer er bedst?",
    "Which bulb is best?",
    "Which bulbs are best?",
    "Hvilken termostat skal jeg vælge?",
    "Which thermostats work?",
    "Hvilken router skal jeg købe?",
    "Virker det med HomeKit?",
    "Kan Alexa tale dansk?",
    "Er Google Home godt?",
    "Hvad er forskellen på Hue og IKEA?",
    "Hvad er Aqara?",
    "Kan jeg flashe en Sonoff?",
    "Er Tuya sikker?",
    "Hvad er ZHA?",
    "Hvad er Zigbee2MQTT?",
    "Hvad er WLED?",
    "Hvad er en VPN?",
    "Kan jeg bruge en Raspberry Pi?",
    "Hvilken robotstøvsuger er bedst?",
    "Hvad koster robotstøvsugeren?",
    "Hvilken stikkontakt kan måle forbrug?",
    "Which smart plug is best?",
    "Hvilken røgalarm er bedst?",
    "Hvad er en zigbee-sensor?",
  ]) {
    assert.equal(hasSmartHomeWord(question), true, question);
  }
});

test("only whole words count, in either case, also next to æ, ø and å", () => {
  for (const question of [
    "Hvad er hubris?",
    "Hvordan laver jeg en pæretærte?",
    "Hvad er en hubstation?",
    "Jeg elsker pæha",
    "Hvem vandt VM i fodbold i 2022?",
    "Hvad er hovedstaden i Frankrig?",
    "Tak",
  ]) {
    assert.equal(hasSmartHomeWord(question), false, question);
  }
  assert.equal(hasSmartHomeWord("HVAD ER EN HUB?"), true);
  assert.equal(hasSmartHomeWord("pæ-hub"), true);
});

test("a word that points back, or an opening that continues, makes a follow-up", () => {
  for (const text of [
    "Hvad koster den?",
    "Kan det bruges uden hub?",
    "Hvad med dem?",
    "Hvad er dette?",
    "Er disse bedre?",
    "Hvad er deres pris?",
    "Hvad er dens pris?",
    "How much does it cost?",
    "What is that?",
    "Are these better?",
    "Do they work?",
    "Which one is better, this or that?",
    "Og uden hub?",
    "og uden hub?",
    "And without a hub?",
    "Hvad med prisen?",
    "Hvad så med prisen?",
    "What about the price?",
    "DEN er dyr",
    "Er den?",
    "Er den åben?",
    "Er det æbler?",
  ]) {
    assert.equal(isFollowUp(text), true, text);
  }
});

test("a message that points back at nothing is no follow-up, also next to æ, ø and å", () => {
  for (const text of [
    "Tak",
    "Ok super",
    "Hvad er hovedstaden i Frankrig?",
    "Hvordan bager jeg et rugbrød?",
    "Hvad er pæden?",
    "Hvad er røden?",
    "Hvad koster en pære?",
    "Hvem er Ogden?",
    "Tell me a joke",
    "Items and itself",
  ]) {
    assert.equal(isFollowUp(text), false, text);
  }
});

test("the follow-up query is the latest question and the one user message before it, nothing older", () => {
  const conversation = (...questions) =>
    questions.flatMap((content, index) => [...(index ? [{ role: "assistant", content: "Svar" }] : []), { role: "user", content }]);

  assert.equal(followUpQuery(conversation("Første", "Anden", "Hvad koster den?")), "Hvad koster den?\nAnden");
  assert.equal(followUpQuery(conversation("Anden", "Hvad koster den?")), "Hvad koster den?\nAnden");
  assert.equal(followUpQuery(conversation("Hvad koster den?")), null);
  assert.equal(followUpQuery(conversation("Anden", "Tak")), null);
  assert.equal(latestQuestion(conversation("Første", "Anden")), "Anden");
  assert.equal(latestQuestion([{ role: "assistant", content: "Svar" }]), "");
});

test("the follow-up query is cut at the longest query the search takes, with the latest question first", () => {
  const latest = `Hvad koster den? ${"B".repeat(300)}`;
  const earlier = "A".repeat(300);
  const query = followUpQuery([
    { role: "user", content: earlier },
    { role: "assistant", content: "Svar" },
    { role: "user", content: latest },
  ]);

  assert.equal(query.length, 400);
  assert.ok(query.startsWith("Hvad koster den?"));
});
