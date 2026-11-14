// Questions the index must answer after every build: the page named in `page`
// must be among the three best results. A failed probe stops the build, so a
// change that breaks the assistant's search never reaches the site.

export const PROBES = {
  da: [
    { query: "lys der tænder ved bevægelse og kan overstyres", page: "/da/automationer/bevaegelseslys-med-overstyring/" },
    { query: "hvordan tænder jeg lyset når der er bevægelse", page: "/da/esp32/bevaegelsessensor/" },
    { query: "zigbee2mqtt opsætning", page: "/da/home-assistant/zigbee2mqtt/" },
    { query: "billigste timer til opvaskemaskinen", page: "/da/automationer/billige-timer/" },
    { query: "elmåler HAN-port", page: "/da/home-assistant/elmaaler-han-port/" },
    { query: "ferietilstand", page: "/da/automationer/ferietilstand/" },
    { query: "hvilken hardware skal Home Assistant køre på", page: "/da/home-assistant/hardware-valg/" },
    { query: "ld2410 mmwave sensor", page: "/da/esp32/ld2410-mmwave/" },
    { query: "backup af Home Assistant", page: "/da/home-assistant/backup-sikkerhed/" },
    { query: "smart home i lejebolig", page: "/da/produkter/smart-home-i-lejebolig/" },
    { query: "solceller og batteri energi dashboard", page: "/da/home-assistant/solceller-og-batteri/" },
  ],
  en: [
    { query: "light that turns on with motion and a manual override", page: "/en/automationer/bevaegelseslys-med-overstyring/" },
    { query: "turn on the light when there is motion", page: "/en/esp32/bevaegelsessensor/" },
    { query: "zigbee2mqtt setup", page: "/en/home-assistant/zigbee2mqtt/" },
    { query: "cheapest hours for the dishwasher", page: "/en/automationer/billige-timer/" },
    { query: "electricity meter HAN port", page: "/en/home-assistant/elmaaler-han-port/" },
    { query: "vacation mode", page: "/en/automationer/ferietilstand/" },
    { query: "ld2410 mmwave sensor", page: "/en/esp32/ld2410-mmwave/" },
  ],
};

// Questions without a smart home word, for the score line the assistant draws
// (USEFUL_SCORE in functions/lib/site-search/search.js): the best result of an
// off-topic question should stay below it, the best result of an on-topic one
// should reach it. The build warns when one does not; it does not stop.
// Scores measured on 2026-11-14 with the stop words of that day (an on-topic
// question must not hold a word of the smart home pattern in
// functions/lib/chat/search-need.js, which would force the search). Do not add
// a question the index answers too well: "Who won the 2022 World Cup?" scored
// 9.40, "Write a poem about autumn" 11.65 and "Good morning" 15.26, all too
// close to the line or over it to hold.
export const OFF_TOPIC = {
  da: [
    "Hvad er hovedstaden i Frankrig?",
    "Skriv et digt om efteråret",
    "Hej",
    "Hvem vandt VM i fodbold i 2022?",
    "Hvordan bager jeg et rugbrød?",
    "tak for hjælpen",
    "ja tak",
    "Fortæl en vittighed",
  ],
  en: [
    "What is the capital of France?",
    "How do I bake bread?",
    "Hello",
    "thanks for the help",
    "Tell me a joke",
    "Thank you",
  ],
};

export const ON_TOPIC = {
  da: [
    "Hvordan kommer jeg i gang?",
    "Hvordan lader jeg elbilen billigt?",
    "Hvordan får jeg lyset til at tænde ved bevægelse?",
    "Hvad koster det at holde en computer tændt hele året?",
  ],
  en: [
    "Which plug can measure power?",
    "What is the best way to get started?",
    "My light keeps flickering, what do I do?",
  ],
};
