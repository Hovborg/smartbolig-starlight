// The words that decide when the site is searched for a question and what is searched for.
import assert from "node:assert/strict";
import test from "node:test";

import {
  CLOSING_WORDS,
  PADDING_WORDS,
  hasEarlierQuestion,
  hasSmartHomeWord,
  isClosing,
  latestQuestion,
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

test("thanks, a goodbye, a greeting and a short 'fine' are closings, with whatever pads them", () => {
  all(isClosing, true, [
    "Tak",
    "tak!",
    "Mange tak",
    "Tak for det",
    "Tusind tak skal du have",
    "Det var fint, tak",
    "Tak for hjælpen",
    "Tak, det var en stor hjælp",
    "Tak, ha' det godt",
    "Tak for din hjælp",
    "Mange tak for dit svar",
    "Tak for svar",
    "Tak og farvel",
    "Tak og god weekend",
    "Hav en god dag",
    "Tak, så prøver jeg det",
    "Tak, det vil jeg prøve",
    "Hej SmartBolig",
    "Takker",
    "Ok super",
    "Okay",
    "Nå okay",
    "Super",
    "Det lyder godt",
    "Det giver mening",
    "Godt at vide",
    "Fedt, det virker nu",
    "God weekend",
    "Godmorgen",
    "God morgen",
    "Godnat",
    "Hej",
    "Farvel",
    "Thanks",
    "Thank you very much",
    "Thanks for that",
    "Thanks, that was a big help",
    "Got it, thanks",
    "Got it",
    "thx",
    "Fine",
    "Good to know",
    "That makes sense",
    "Sounds good",
    "Cool, it works now",
    "That's great, thanks",
    "That’s great, thanks",
    "It's fine",
    "Have a nice weekend",
    "Good morning",
    "Good night",
    "That's all, bye",
    "Thanks for your help",
    "Thank you for your answer",
    "Thanks and goodbye",
    "Have a nice day",
    "Thanks, I'll give it a go",
    "Thanks, I'll try that",
    "Goodbye",
    "Hello",
  ]);
});

test("any other word, or a question mark, makes the message something to search for", () => {
  all(isClosing, false, [
    // A request or a problem with a thanks word in it.
    "Vis mig hvordan jeg sætter Zigbee2MQTT op, tak",
    "Tak, det virkede ikke",
    "Tak, men hvorfor?",
    "Tak for hjælpen med Zigbee",
    "Show me how to set up Zigbee2MQTT, thanks",
    "Thanks, but it still fails",
    "Thanks, but does it work with Hue?",
    "Okay, og uden hub",
    "Tak og hvad så nu",
    "Tak for dit svar om Zigbee",
    "Tak, jeg vil prøve en anden hub",
    "SmartBolig",
    "Thanks and what about the hub",
    "Er det godt?",
    // Only whole words count.
    "Taksten er høj",
    "Kontakt mig",
    "Hvad er Thanksgiving",
    "Hejs",
    "Godt, men hvad med i morgen tidlig",
    "Good morning routine",
    // An answer or a continuation is no closing.
    "Ja",
    "Nej",
    "Yes",
    "No",
    "Fortsæt",
    "Mere",
    "Hvorfor",
    "Det virkede ikke",
    "Det vil jeg prøve",
    "I'll try that",
    // Padding alone closes nothing; neither does an empty message.
    "Det er det",
    "That is it",
    "",
    "!",
  ]);
});

// The two word lists, word for word. A word that is taken out of a list, or
// one that slips into it, fails here.
const CLOSING = [
  "tak", "takker", "farvel", "hej", "hejsa", "goddag", "godmorgen", "godaften", "godnat", "ok", "okay", "super", "fint", "godt", "god",
  "perfekt", "fedt", "dejligt", "fantastisk", "forstået", "mening",
  "thanks", "thank", "thx", "cheers", "bye", "goodbye", "alright", "fine", "great", "perfect", "nice", "cool", "awesome", "understood",
  "sense", "good", "goodnight", "helps", "got", "hi", "hello", "hey",
];
const PADDING = [
  "for", "det", "den", "du", "dig", "din", "dit", "skal", "have", "hav", "hjælpen", "hjælp", "svaret", "svar", "nu", "nå", "så", "lige",
  "bare", "meget", "mange", "tusind", "var", "er", "alt", "giver", "lyder", "igen", "med", "en", "stor", "at", "vide", "virker", "og",
  "dag", "morgen", "aften", "nat", "weekend", "ha", "jeg", "vil", "prøve", "prøver", "smartbolig",
  "you", "your", "so", "much", "very", "a", "lot", "the", "help", "answer", "that", "that's", "it", "it's", "this", "was", "is", "all",
  "now", "i", "see", "sounds", "makes", "and", "day", "morning", "afternoon", "evening", "night", "one", "again", "to", "know", "big",
  "works", "i'll", "try", "give", "go",
];
// Words of a question, a problem or an answer: none may close a message or pad a closing.
const NEITHER = [
  "ja", "nej", "yes", "no", "fortsæt", "mere", "hvorfor", "hvordan", "hvad", "hvem", "kan", "ikke", "virkede", "men", "om", "uden",
  "anden", "hub", "fejl", "koster", "why", "how", "what", "who", "can", "not", "but", "about", "more", "continue", "failed", "cost",
];

test("the two lists in the code are these words and no others", () => {
  assert.deepEqual([...CLOSING_WORDS].sort(), [...CLOSING].sort());
  assert.deepEqual([...PADDING_WORDS].sort(), [...PADDING].sort());
});

test("every closing word closes a message on its own", () => {
  all(isClosing, true, CLOSING);
});

test("every padding word pads a closing and closes nothing on its own", () => {
  all(isClosing, false, PADDING);
  all(isClosing, true, PADDING.map((word) => `Tak ${word}`));
});

test("a question mark anywhere in the message makes it something to search for", () => {
  all(isClosing, false, ["Er det godt? Tak", "Tak? Okay", "Okay?", "Godt? Det var fint"]);
});

test("HA in capitals is Home Assistant and no padding; in small letters it is the verb", () => {
  all(isClosing, false, [
    "Hej, jeg skal have hjælp med HA",
    "Er HA godt",
    "HA virker fint",
    "Godt, jeg vil prøve HA nu",
    "Giver det mening at prøve HA",
    "Is HA good to try",
  ]);
  all(isClosing, true, ["Ha en god dag", "Tak, ha det godt", "Tak og ha en god weekend", "Tak, ha' en god dag"]);
});

test("in a message written all in capitals HA says nothing", () => {
  all(isClosing, true, ["TAK HA DET GODT", "OK HA", "HEJ, HJÆLP MED HA"]);
});

test("the letters HA inside a word in capitals are no Home Assistant", () => {
  all(isClosing, true, ["THANKS a lot", "THANKS, that was a big help"]);
});

test("a letter typed as a base letter and a combining mark reads like the letter", () => {
  const decomposed = (text) => text.normalize("NFD");
  assert.notEqual(decomposed("Forstået"), "Forstået");
  all(isClosing, true, [decomposed("Forstået"), decomposed("Nå, så tak"), decomposed("Nå, tak")]);
});

test("a word of a question, a problem or an answer neither closes a message nor pads a closing", () => {
  all(isClosing, false, NEITHER);
  all(isClosing, false, NEITHER.map((word) => `Tak ${word}`));
});

const conversation = (...questions) =>
  questions.flatMap((content, index) => [...(index ? [{ role: "assistant", content: "Svar" }] : []), { role: "user", content }]);

test("the latest question is the last user message, and only user messages count as earlier questions", () => {
  assert.equal(latestQuestion(conversation("Første", "Anden")), "Anden");
  assert.equal(latestQuestion([{ role: "assistant", content: "Svar" }]), "");

  assert.equal(hasEarlierQuestion(conversation("Første")), false);
  assert.equal(hasEarlierQuestion([{ role: "assistant", content: "Hej" }, { role: "user", content: "Første" }]), false);
  assert.equal(hasEarlierQuestion(conversation("Første", "Anden")), true);
  assert.equal(hasEarlierQuestion(conversation("Første", "Anden", "Tredje")), true);
  assert.equal(hasEarlierQuestion([]), false);
});
