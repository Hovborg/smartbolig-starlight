export type HomeLocale = "da" | "en";

export interface HomeLink {
  label: string;
  href: string;
}

export interface HomeHeroCopy {
  kicker: string;
  titleLines: [string, string];
  tagline: string;
  primary: HomeLink;
  secondary: HomeLink;
  imageAlt: string;
}

export interface HomeNavigatorRow {
  title: string;
  description: string;
  href: string;
}

export interface HomeNavigatorCopy {
  eyebrow: string;
  title: string;
  beginner: {
    question: string;
    description: string;
    link: HomeLink;
  };
  rows: HomeNavigatorRow[];
}

export interface HomeFieldGuideStep {
  title: string;
  description: string;
}

export interface HomeFieldGuideCopy {
  eyebrow: string;
  title: string;
  intro: string;
  steps: HomeFieldGuideStep[];
  outro: HomeLink;
}

export interface HomeGuideItem {
  title: string;
  description: string;
  href: string;
  tag: string;
}

export interface HomeFeaturedGuidesCopy {
  eyebrow: string;
  title: string;
  lead: HomeGuideItem;
  more: HomeGuideItem[];
}

export interface HomeTrustItem {
  title: string;
  description: string;
  link: HomeLink;
}

export interface HomeTrustCopy {
  eyebrow: string;
  title: string;
  items: HomeTrustItem[];
}

export interface HomeNewsCopy {
  eyebrow: string;
  title: string;
}

export interface HomeClosingCopy {
  title: string;
  text: string;
  primary: HomeLink;
  secondary: HomeLink;
}

export interface HomeCopy {
  hero: HomeHeroCopy;
  navigator: HomeNavigatorCopy;
  fieldGuide: HomeFieldGuideCopy;
  guides: HomeFeaturedGuidesCopy;
  trust: HomeTrustCopy;
  news: HomeNewsCopy;
  closing: HomeClosingCopy;
}

export const homeCopy: Record<HomeLocale, HomeCopy> = {
  da: {
    hero: {
      kicker: "Uafhængige guides · Lokal kontrol",
      titleLines: ["Et smart hjem,", "du selv styrer"],
      tagline:
        "Gennemarbejdede guides til Home Assistant, ESPHome og automationer — med lokal kontrol og privatliv i fokus.",
      primary: { label: "Start her", href: "/da/start/" },
      secondary: { label: "Gå direkte til guidebiblioteket", href: "/da/home-assistant/" },
      imageAlt:
        "Roligt aftenlys i en moderne stue og et køkken, hvor diskret smart home-teknologi falder naturligt ind i boligen.",
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
      title: "Kort nyt om AI",
    },
    closing: {
      title: "Byg videre i dit eget tempo",
      text:
        "Guidebiblioteket dækker installation, enheder, automationer og stabil drift — og vi tager gerne imod ønsker til nye guides.",
      primary: { label: "Udforsk alle guides", href: "/da/home-assistant/" },
      secondary: { label: "Foreslå en guide", href: "/da/kontakt/" },
    },
  },
  en: {
    hero: {
      kicker: "Independent guides · Local control",
      titleLines: ["A smart home", "you run yourself"],
      tagline:
        "Thorough guides to Home Assistant, ESPHome and automations — with local control and privacy in focus.",
      primary: { label: "Start here", href: "/en/start/" },
      secondary: { label: "Go straight to the guide library", href: "/en/home-assistant/" },
      imageAlt:
        "Calm evening light in a modern living room and kitchen where discreet smart home technology blends into the home.",
    },
    navigator: {
      eyebrow: "Choose your route",
      title: "What should your home be able to do?",
      beginner: {
        question: "New to smart homes?",
        description:
          "Follow the guided start route: six steps from platform to first automation and backup.",
        link: { label: "Follow the start route", href: "/en/start/" },
      },
      rows: [
        {
          title: "Home Assistant",
          description: "Installation, integrations and upkeep of the brain of your smart home.",
          href: "/en/home-assistant/",
        },
        {
          title: "Automations",
          description: "Reliable everyday logic with concrete, tested examples.",
          href: "/en/automationer/",
        },
        {
          title: "ESP32 & ESPHome",
          description: "Build your own local sensors and devices with YAML you can understand.",
          href: "/en/esp32/",
        },
        {
          title: "Products & gear",
          description: "Compatible hardware chosen for function and local control.",
          href: "/en/produkter/",
        },
        {
          title: "Practical AI",
          description: "Tools and workflows for when AI genuinely helps your smart home.",
          href: "/en/ai/",
        },
      ],
    },
    fieldGuide: {
      eyebrow: "The field guide",
      title: "Three stages to a home that runs itself",
      intro:
        "The order matters more than the gear — build the foundation first and avoid starting over.",
      steps: [
        {
          title: "Choose and install the platform",
          description:
            "Find the Home Assistant installation that fits your home and how much you want to maintain.",
        },
        {
          title: "Connect your first devices",
          description:
            "Start with one protocol, make the network stable, and keep naming consistent from day one.",
        },
        {
          title: "Automate — and secure it all",
          description:
            "Build one simple automation you can trust, and put backups in place before the setup grows.",
        },
      ],
      outro: { label: "See the full start route with all six steps", href: "/en/start/" },
    },
    guides: {
      eyebrow: "Featured guides",
      title: "Start with what lasts",
      lead: {
        title: "Getting started with Home Assistant",
        description:
          "The full overview before you choose an installation: hardware, concepts and the choices that are hard to undo later.",
        href: "/en/home-assistant/kom-godt-i-gang/",
        tag: "Foundation",
      },
      more: [
        {
          title: "Your first automation",
          description: "Trigger, condition and action — explained through one simple automation.",
          href: "/en/home-assistant/foerste-automation/",
          tag: "Automation",
        },
        {
          title: "Backup & security",
          description: "Protect the setup before your home depends on it.",
          href: "/en/home-assistant/backup-sikkerhed/",
          tag: "Operations",
        },
        {
          title: "Matter & Thread 2026",
          description: "Commission new devices and understand your Thread network in practice.",
          href: "/en/home-assistant/thread-matter/",
          tag: "Devices",
        },
      ],
    },
    trust: {
      eyebrow: "How we work",
      title: "Credibility you can verify",
      items: [
        {
          title: "Official sources in every guide",
          description:
            "Technical guides link to official documentation so you can verify every step yourself.",
          link: { label: "About SmartBolig.net", href: "/en/om-os/" },
        },
        {
          title: "Local control before cloud",
          description:
            "We prefer solutions that work without internet access whenever practical — your data stays at home.",
          link: { label: "Network security", href: "/en/sikkerhed/" },
        },
        {
          title: "Open about affiliate links",
          description:
            "Product links may be affiliate links. Recommendations come before economics, and the price stays the same for you.",
          link: { label: "Affiliate disclosure", href: "/en/juridisk/affiliate-disclosure/" },
        },
        {
          title: "Errors get fixed",
          description: "If you find something inaccurate, we correct it and date the update.",
          link: { label: "Contact & corrections", href: "/en/kontakt/" },
        },
      ],
    },
    news: {
      eyebrow: "AI news",
      title: "AI, briefly",
    },
    closing: {
      title: "Keep building at your own pace",
      text:
        "The guide library covers installation, devices, automations and reliable operation — and we welcome requests for new guides.",
      primary: { label: "Explore all guides", href: "/en/home-assistant/" },
      secondary: { label: "Suggest a guide", href: "/en/kontakt/" },
    },
  },
};

export function getHomeCopy(locale: HomeLocale): HomeCopy {
  return homeCopy[locale];
}
