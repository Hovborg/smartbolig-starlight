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
  newsLink: HomeLink;
  imageAlt: string;
  imageCaption: string;
  topics: string[];
  scene: HomeSceneCopy;
  motion: HomeMotionCopy;
}

export type HomeSceneMode = "morning" | "day" | "evening" | "night";
export type HomeSceneSystem = "light" | "heat" | "energy" | "security";

export interface HomeSceneCopy {
  title: string;
  choose: string;
  note: string;
  modes: { id: HomeSceneMode; label: string; rule: string }[];
  systems: Record<HomeSceneSystem, string>;
}

export interface HomeMotionCopy {
  start: string;
  pause: string;
  system: string;
  manual: string;
  reset: string;
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
  photoAlt: string;
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
