// The words that decide when the site is searched for a question and what is searched for.
import assert from "node:assert/strict";
import test from "node:test";

import {
  asks,
  hasSmartHomeWord,
  isFollowUp,
  isThanks,
  joinedQuery,
  latestQuestion,
  pointsBack,
  standsForAThing,
} from "../functions/lib/chat/search-need.js";

const all = (check, expected, texts) => {
  for (const text of texts) assert.equal(check(text), expected, text);
};

test("the words a one-word question about the site needs count as smart home words", () => {
  all(hasSmartHomeWord, true, [
    "Hvad er en hub?",
    "Hvor sidder hubben?",
    "Hvad kan hubberne?",
    "Hvad er en gateway?",
    "Hvad koster gatewayen?",
    "Which gateways work?",
    "Hvilke gatewayer virker?",
    "Min pære blinker",
    "Hvilke pærer er bedst?",
    "Which bulb is best?",
    "Which bulbs are best?",
    "Hvilken termostat skal jeg vælge?",
    "Which thermostats work?",
    "Hvilken router skal jeg købe?",
    "Hvad koster routerne?",
    "Virker det med HomeKit?",
    "Kan Alexa tale dansk?",
    "Er Google Home godt?",
    "Er google-home godt?",
    "Hvad er Hue?",
    "Hvad koster det i IKEA?",
    "Hvad er Aqara?",
    "Kan jeg flashe en Sonoff?",
    "Er Tuya sikker?",
    "Hvad er ZHA?",
    "Hvad er Zigbee2MQTT?",
    "Hvad er WLED?",
    "Hvad er en VPN?",
    "Kan jeg bruge en Raspberry Pi?",
    "Kan jeg bruge en raspberry-pi?",
    "Hvad er Ok Nabu?",
    "Hvad koster Nabu Casa?",
    "Kan jeg skifte wake word?",
    "Hvilken robotstøvsuger er bedst?",
    "Hvad koster robotstøvsugeren?",
    "Hvilken stikkontakt kan måle forbrug?",
    "Which smart plug is best?",
    "Which smart-plug is best?",
    "Hvilken røgalarm er bedst?",
    "Hvad er en zigbee-sensor?",
    "Hvilke kameraer virker?",
    "Which cameras work?",
    "Hvilke automationer er gode?",
    "Hvor ser jeg elpriserne?",
    "Kan solceller betale sig?",
    "Does Matter need a hub?",
    "What is the Thread protocol?",
    "Is the security of Tuya good?",
    "Hvordan installerer jeg HA?",
  ]);
});

test("only whole words count, in either case, also next to æ, ø and å", () => {
  all(hasSmartHomeWord, false, [
    "Hvad er hubris?",
    "Hvordan laver jeg en pæretærte?",
    "Hvad er en hubstation?",
    "Jeg elsker pæha",
    "Hvem vandt VM i fodbold i 2022?",
    "Hvad er hovedstaden i Frankrig?",
    "Tak",
  ]);
  assert.equal(hasSmartHomeWord("HVAD ER EN HUB?"), true);
  assert.equal(hasSmartHomeWord("pæ-hub"), true);
});

test("the everyday meaning of a smart home word does not count where the wording gives it away", () => {
  all(hasSmartHomeWord, false, [
    "Ha' en god dag",
    "Ha’ det godt",
    "It does not matter",
    "It doesn't matter, forget it",
    "No matter what I do",
    "Can you summarise this thread?",
    "What is a social security number?",
  ]);
});

test("each word that points back does so, and so does an opening that continues", () => {
  all(pointsBack, true, [
    "Hvad koster den?",
    "Kan det bruges uden hub?",
    "Hvad koster de?",
    "Kan jeg købe dem?",
    "Er denne bedre?",
    "Hvad er dette?",
    "Er disse bedre?",
    "Hvad er dens pris?",
    "Hvad er dets pris?",
    "Hvad er deres pris?",
    "How much does it cost?",
    "What is its range?",
    "What is that?",
    "What is this?",
    "Are these better?",
    "Are those better?",
    "Do they work?",
    "Can I use them outdoors?",
    "What is their range?",
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
  ]);
});

test("a message that points back at nothing does not, also next to æ, ø and å", () => {
  all(pointsBack, false, [
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
    "Hvad er den bedste smart lås?",
    "Hvem vandt det danske mesterskab?",
    "Hvad er de nye regler?",
    "Hvad er den mest solgte sensor?",
    "Hvad er meningen med det hele?",
  ]);
});

test("thanks and goodbyes without a question are thanks; with a question they are not", () => {
  all(isThanks, true, [
    "Tak",
    "Mange tak",
    "Tak for det",
    "Det var fint, tak",
    "Tak, ha' det godt",
    "Jeg takker",
    "Thanks for that",
    "Got it, thanks",
    "Thank you very much",
    "thx",
    "Farvel",
    "That's all, bye",
    "Goodbye",
  ]);
  all(isThanks, false, [
    "Tak, men hvorfor?",
    "Thanks, but does it work with Hue?",
    "Taksten er høj",
    "Kontakt mig",
    "Hvad er Thanksgiving",
    "Super",
    "Det lyder godt",
  ]);
});

test("a question mark, a question word or a request at the start asks for something", () => {
  all(asks, true, [
    "Kan du uddybe?",
    "Forklar nærmere",
    "Uddyb",
    "Hvorfor",
    "hvordan gør jeg",
    "Vis mig et eksempel",
    "Giv mig et eksempel",
    "Jeg vil gerne se et eksempel",
    "Jeg har brug for et eksempel",
    "En billigere?",
    "Explain more",
    "Show me an example",
    "Why",
    "Please continue",
    "I'd like an example",
    "I need an example",
    "Æbler eller pærer?",
  ]);
  all(asks, false, ["Super", "ok", "Det lyder godt", "Fedt", "Ja", "Great", "Hvadbehager", "Showroom", "Det er en whyte"]);
});

test("a word that can only stand for a thing already named does", () => {
  all(standsForAThing, true, [
    "Virker den med Home Assistant?",
    "Kan den bruges uden hub?",
    "Hvad koster den?",
    "Hvor køber jeg dem?",
    "Hvad er dens rækkevidde?",
    "Hvad er deres pris?",
    "Does it work with Home Assistant?",
    "Doesn't it need a hub?",
    "Can it run without a hub?",
    "Will it work in Denmark?",
    "Which one is cheapest?",
    "Is that one better?",
    "Is this one better?",
    "What is their range?",
    "What is its range?",
    "Can I use them outdoors?",
  ]);
});

test("the article, an empty subject and a loose 'they' stand for nothing", () => {
  all(standsForAThing, false, [
    "Hvad er den bedste smart lås?",
    "Hvordan sætter jeg den nye Home Assistant Voice op?",
    "Hvad er den mest populære sensor?",
    "Hvad er den mindst støjende?",
    "Er det muligt at styre varmen?",
    "Hvad er de bedste pærer?",
    "Hvilke af disse protokoller er bedst?",
    "How does it work with solar panels?",
    "Is it possible to control heating?",
    "Do they make a smart lock?",
    "Are these any good?",
    "Hvad er hovedstaden i Frankrig?",
  ]);
});

test("a follow-up points back, or asks in words the site knows; thanks never are one", () => {
  // Points back: also when it brings a word the site does not know.
  assert.equal(isFollowUp("Hvad koster den i Bilka?", 1), true);
  assert.equal(isFollowUp("Og uden hub?", 0), true);
  // Asks, with no word from outside the site.
  assert.equal(isFollowUp("Kan du uddybe?", 0), true);
  assert.equal(isFollowUp("Forklar nærmere"), true);
  assert.equal(isFollowUp("Hvorfor?", 0), true);
  // Asks about something the site has no word for: a change of topic.
  assert.equal(isFollowUp("Hvad er hovedstaden i Frankrig?", 2), false);
  assert.equal(isFollowUp("Tell me a joke", 1), false);
  // Neither asks nor points back.
  assert.equal(isFollowUp("Ok super", 0), false);
  // Thanks, also with a pointing word.
  assert.equal(isFollowUp("Tak for det", 0), false);
  assert.equal(isFollowUp("Thanks for that", 0), false);
  assert.equal(isFollowUp("Tak, men hvad koster den?", 0), true);
});

const conversation = (...questions) =>
  questions.flatMap((content, index) => [...(index ? [{ role: "assistant", content: "Svar" }] : []), { role: "user", content }]);

test("the joined query is the latest question and the one user message before it, nothing older", () => {
  assert.equal(joinedQuery(conversation("Første", "Anden", "Hvad koster den?")), "Hvad koster den?\nAnden");
  assert.equal(joinedQuery(conversation("Anden", "Hvad koster den?")), "Hvad koster den?\nAnden");
  assert.equal(joinedQuery(conversation("Hvad koster den?")), null);
  assert.equal(joinedQuery([{ role: "assistant", content: "Svar" }]), null);
  assert.equal(latestQuestion(conversation("Første", "Anden")), "Anden");
  assert.equal(latestQuestion([{ role: "assistant", content: "Svar" }]), "");
});

test("the joined query is cut at the longest query the search takes, with the latest question first", () => {
  const latest = `Hvad koster den? ${"B".repeat(300)}`;
  const query = joinedQuery(conversation("A".repeat(300), latest));

  assert.equal(query.length, 400);
  assert.ok(query.startsWith("Hvad koster den?"));
});
