import type { HomeCopy } from "./types.ts";

export const da: HomeCopy = {
  hero: {
    kicker: "Uafhængige guides · Lokal kontrol",
    titleLines: ["Et smart hjem,", "du selv styrer"],
    tagline:
      "Gennemarbejdede guides til Home Assistant, ESPHome og automationer — med lokal kontrol og privatliv i fokus.",
    primary: { label: "Start her", href: "/da/start/" },
    secondary: { label: "Gå direkte til guidebiblioteket", href: "/da/home-assistant/" },
    newsLink: { label: "Læs AI-nyheder", href: "/da/ai/nyheder/" },
    imageAlt:
      "Roligt aftenlys i en moderne stue og et køkken, hvor diskret smart home-teknologi falder naturligt ind i boligen.",
    imageCaption: "Teknologi, der passer ind i dit hjem.",
    topics: ["Home Assistant", "ESPHome", "Lokal kontrol"],
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
        title: "Home Assistant",
        description: "Installation, integrationer og vedligehold af hjernen i dit smarte hjem.",
        href: "/da/home-assistant/",
      },
      {
        title: "Automationer",
        description: "Pålidelig hverdagslogik med konkrete, testede eksempler.",
        href: "/da/automationer/",
      },
      {
        title: "ESP32 & ESPHome",
        description: "Byg dine egne lokale sensorer og enheder med YAML, du kan forstå.",
        href: "/da/esp32/",
      },
      {
        title: "Produkter & udstyr",
        description: "Kompatibelt udstyr valgt efter funktion og lokal kontrol.",
        href: "/da/produkter/",
      },
      {
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
  guides: {
    eyebrow: "Udvalgte guides",
    title: "Begynd med det, der holder",
    photoAlt: "Detalje af et printkort med chips og forbindelser.",
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
