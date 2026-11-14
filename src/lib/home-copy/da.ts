import type { HomeCopy } from "./types.ts";

export const da: HomeCopy = {
  hero: {
    kicker: "Uafhængige guides · Lokal kontrol",
    titleLines: ["Et smart hjem,", "du selv styrer"],
    tagline:
      "Gennemarbejdede guides til Home Assistant, ESPHome og automationer — med lokal kontrol og privatliv i fokus.",
    primary: { label: "Start her", href: "/da/start/" },
    secondary: { label: "Gå direkte til guidebiblioteket", href: "/da/home-assistant/" },
    imageAlt:
      "3D-model af et smart hjem i aftenlys, set oppefra: stue, køkken, soveværelse og bad, solceller på garagen og en elbil, der lader.",
    search: {
      label: "Søg i guiderne",
      placeholder: "Hvad skal dit hjem kunne? Prøv »lys ved bevægelse«",
      askAi: "Spørg AI",
      suggestionsLabel: "Populært lige nu",
      suggestions: [
        { label: "Lys ved bevægelse", href: "/da/automationer/bevaegelseslys-med-overstyring/" },
        { label: "Følg elprisen", href: "/da/home-assistant/elpris-integration/" },
        { label: "Zigbee uden cloud", href: "/da/home-assistant/zigbee2mqtt/" },
      ],
    },
    scene: {
      title: "Et døgn i et smart hjem",
      choose: "Vælg tidspunkt",
      note: "Illustration · Eksempler på automationer, du selv kan bygge",
      modes: [
        { id: "morning", label: "Morgen", rule: "Vækkeuret ringer: lyset tænder blødt, og badeværelset er varmt." },
        { id: "day", label: "Dag", rule: "Solcellerne producerer: opvaskemaskinen og elbilen får strøm, mens den er billigst." },
        { id: "evening", label: "Aften", rule: "Solen går ned: lamperne tænder, og gardinerne lukker." },
        { id: "night", label: "Nat", rule: "Alle sover: lyset slukker, døren låser, og varmen sænkes." },
      ],
      systems: { light: "Lys", heat: "Varme", energy: "Energi", security: "Sikkerhed" },
    },
    stage: {
      label: "3D-model af et smart hjem, som du kan dreje",
      hint: "Træk for at dreje huset",
      rotateLeft: "Drej huset mod venstre",
      rotateRight: "Drej huset mod højre",
      spots: [
        { id: "light", label: "Lys", href: "#tour-light" },
        { id: "heat", label: "Varme", href: "#tour-heat" },
        { id: "energy", label: "Energi", href: "#tour-energy" },
        { id: "security", label: "Sikkerhed", href: "#tour-security" },
        { id: "hub", label: "Hjernen", href: "/da/home-assistant/" },
        { id: "diy", label: "Byg selv", href: "/da/esp32/" },
      ],
    },
    tour: {
      eyebrow: "Et døgn i et smart hjem",
      title: "Rul ned, og se hvad huset gør af sig selv",
      chapters: [
        {
          id: "heat",
          mode: "morning",
          time: "06:30",
          label: "Varme",
          title: "Varmen er klar, før du står op",
          text: "Badeværelsesgulvet er lunt, og radiatoren i stuen har skruet op, mens du sov. Resten af dagen sænker huset selv temperaturen, når ingen er hjemme.",
          points: [
            "Gulvvarme og radiatorer følger tidsplan og fravær",
            "Varmepumpen arbejder, når strømmen er billigst",
          ],
          links: [
            { label: "Better Thermostat", href: "/da/home-assistant/better-thermostat/" },
            { label: "Smarte termostater", href: "/da/produkter/smart-termostater/" },
          ],
        },
        {
          id: "energy",
          mode: "day",
          time: "12:00",
          label: "Energi",
          title: "Solen lader bilen, mens du er væk",
          text: "Solcellerne producerer mest midt på dagen. Huset sender strømmen til elbilen og vaskemaskinen først og venter med resten, til prisen er lav.",
          points: [
            "Forbrug og produktion samlet på ét dashboard",
            "Opladning og vask starter efter elprisen",
          ],
          links: [
            { label: "Energi-dashboardet", href: "/da/home-assistant/energy-dashboard/" },
            { label: "Elpriser i Home Assistant", href: "/da/home-assistant/elpris-integration/" },
            { label: "Udstyr til energistyring", href: "/da/produkter/energistyring/" },
          ],
        },
        {
          id: "light",
          mode: "evening",
          time: "19:30",
          label: "Lys",
          title: "Lyset følger jer gennem aftenen",
          text: "Når solen går ned, tænder lamperne dæmpet, og gardinerne ruller ned. Går nogen ud i køkkenet, tænder lyset dér og slukker igen af sig selv.",
          points: [
            "Bevægelsesstyret lys, som kontakten stadig kan overstyre",
            "Scener til film, mad og godnat",
          ],
          links: [
            { label: "Bevægelseslys med overstyring", href: "/da/automationer/bevaegelseslys-med-overstyring/" },
            { label: "Smart belysning", href: "/da/produkter/smart-belysning/" },
            { label: "Byg en LED-strip", href: "/da/esp32/led-strip/" },
          ],
        },
        {
          id: "security",
          mode: "night",
          time: "23:00",
          label: "Sikkerhed",
          title: "Huset låser og holder øje om natten",
          text: "Når alle sover, låser døren, lyset slukker, og sensorerne vågner. Sker der noget, får du besked på telefonen. Automationerne kører lokalt, også når internettet er nede.",
          points: [
            "Dørlås, sensorer og kamera samlet ét sted",
            "Besked på mobilen, når noget er galt",
          ],
          links: [
            { label: "Smart sikkerhed", href: "/da/produkter/smart-sikkerhed/" },
            { label: "Sikker fjernadgang", href: "/da/sikkerhed/fjernadgang/" },
            { label: "Mobilnotifikationer", href: "/da/home-assistant/mobilnotifikationer/" },
          ],
        },
      ],
    },
    motion: {
      start: "Start animationer",
      pause: "Pause animationer",
      system: "Følger din enhed",
      manual: "Dit valg",
      reset: "Følg enheden",
    },
  },
  navigator: {
    eyebrow: "Vælg din retning",
    title: "Hvad skal dit hjem kunne?",
    beginner: {
      question: "Ny i smart home?",
      description:
        "Følg den guidede startrute: seks trin fra platform til første automation og backup.",
      link: { label: "Følg startruten", href: "/da/start/" },
    },
    rows: [
      {
        id: "home-assistant",
        title: "Home Assistant",
        description: "Installation, integrationer og vedligehold af hjernen i dit smarte hjem.",
        href: "/da/home-assistant/",
      },
      {
        id: "automations",
        title: "Automationer",
        description: "Pålidelig hverdagslogik med konkrete, testede eksempler.",
        href: "/da/automationer/",
      },
      {
        id: "esp32",
        title: "ESP32 & ESPHome",
        description: "Byg dine egne lokale sensorer og enheder med YAML, du kan forstå.",
        href: "/da/esp32/",
      },
      {
        id: "products",
        title: "Produkter & udstyr",
        description: "Kompatibelt udstyr valgt efter funktion og lokal kontrol.",
        href: "/da/produkter/",
      },
      {
        id: "ai",
        title: "AI i praksis",
        description: "Værktøjer og workflows, når AI reelt hjælper dit smarte hjem.",
        href: "/da/ai/",
      },
    ],
  },
  fieldGuide: {
    eyebrow: "Feltguiden",
    title: "Tre etaper til et hjem, der passer sig selv",
    intro:
      "Rækkefølgen er vigtigere end udstyret — byg fundamentet først, og undgå at starte forfra.",
    steps: [
      {
        title: "Vælg og installér platformen",
        description:
          "Find den Home Assistant-installation, der passer til dit hjem og dit vedligeholdsniveau.",
      },
      {
        title: "Forbind dine første enheder",
        description:
          "Start med én protokol, få netværket stabilt, og hold navngivningen konsekvent fra begyndelsen.",
      },
      {
        title: "Automatisér — og sikr det hele",
        description:
          "Byg en enkel automation, du kan stole på, og få backup på plads, før opsætningen vokser.",
      },
    ],
    outro: { label: "Se hele startruten med alle seks trin", href: "/da/start/" },
  },
  tools: {
    eyebrow: "Værktøjer",
    title: "Regn på dit eget hjem",
    intro: "Små beregnere med rigtige tal: elprisen lige nu, hvad dine apparater koster at have tændt, hvilken Zigbee-kanal der passer, og hvor længe et batteri holder.",
    all: { label: "Alle værktøjer", href: "/da/vaerktoejer/" },
    price: {
      label: "Elprisen lige nu",
      unit: "øre/kWh",
      runLabel: "Billigste 3 timer i træk:",
      legendNow: "nu",
      legendBest: "billigste 3 timer",
      idleTitle: "Se elprisen time for time",
      idleText: "Spotprisen i dag og i morgen, og de billigste timer i træk til opvask, vask og opladning.",
      link: { label: "Se alle timer og skift område", href: "/da/vaerktoejer/elpris/" },
      note: "Spotpris med moms, uden afgift og nettarif. Kilde: Energinet, CC BY 4.0.",
      sparkLabel: "Elprisen time for time i dag. Laveste time: {min} {minAt}. Højeste time: {max} {maxAt}.",
    },
  },
  guides: {
    eyebrow: "Udvalgte guides",
    title: "Begynd med det, der holder",
    photoAlt: "3D-model af et smart hjem i morgenlys: lyset er tændt i soveværelset og køkkenet, og solen står lavt over haven.",
    lead: {
      title: "Kom godt i gang med Home Assistant",
      description:
        "Det samlede overblik, før du vælger installation: hardware, begreber og de valg, der er svære at lave om senere.",
      href: "/da/home-assistant/kom-godt-i-gang/",
      tag: "Fundament",
    },
    more: [
      {
        title: "Din første automation",
        description: "Trigger, betingelse og handling — forklaret gennem én enkel automation.",
        href: "/da/home-assistant/foerste-automation/",
        tag: "Automation",
      },
      {
        title: "Backup & sikkerhed",
        description: "Beskyt opsætningen, før hjemmet bliver afhængigt af den.",
        href: "/da/home-assistant/backup-sikkerhed/",
        tag: "Drift",
      },
      {
        title: "Matter & Thread 2026",
        description: "Tilføj nye enheder og forstå dit Thread-netværk i praksis.",
        href: "/da/home-assistant/thread-matter/",
        tag: "Enheder",
      },
    ],
  },
  trust: {
    eyebrow: "Sådan arbejder vi",
    title: "Troværdighed, du kan efterprøve",
    items: [
      {
        title: "Officielle kilder i hver guide",
        description:
          "Tekniske guides linker til officiel dokumentation, så du selv kan efterprøve hvert trin.",
        link: { label: "Om SmartBolig.net", href: "/da/om-os/" },
      },
      {
        title: "Lokal kontrol før cloud",
        description:
          "Vi foretrækker løsninger, der virker uden internetadgang, hvor det praktisk kan lade sig gøre — dine data bliver hjemme.",
        link: { label: "Netværkssikkerhed", href: "/da/sikkerhed/" },
      },
      {
        title: "Åbent om affiliate-links",
        description:
          "Produktlinks kan være affiliate-links. Anbefalinger vælges før økonomi, og prisen er den samme for dig.",
        link: { label: "Affiliate-oplysning", href: "/da/juridisk/affiliate-disclosure/" },
      },
      {
        title: "Fejl bliver rettet",
        description:
          "Finder du en upræcis oplysning, retter vi den og daterer opdateringen.",
        link: { label: "Kontakt & rettelser", href: "/da/kontakt/" },
      },
    ],
  },
  news: {
    eyebrow: "AI-nyheder",
    title: "Seneste AI-nyheder",
  },
  closing: {
    title: "Byg videre i dit eget tempo",
    text:
      "Guidebiblioteket dækker installation, enheder, automationer og stabil drift — og vi tager gerne imod ønsker til nye guides.",
    primary: { label: "Udforsk alle guides", href: "/da/home-assistant/" },
    secondary: { label: "Foreslå en guide", href: "/da/kontakt/" },
  },
};
