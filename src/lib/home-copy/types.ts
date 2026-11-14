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
  /** Describes the still picture of the 3D house. */
  imageAlt: string;
  search: HomeSearchCopy;
  scene: HomeSceneCopy;
  stage: HomeStageCopy;
  tour: HomeTourCopy;
  motion: HomeMotionCopy;
}

export interface HomeSearchCopy {
  label: string;
  placeholder: string;
  /** The button beside the search field that opens the assistant. */
  askAi: string;
  suggestionsLabel: string;
  suggestions: HomeLink[];
}

/** The 3D house: labels for the controls and the hotspots on the model. */
export interface HomeStageCopy {
  label: string;
  hint: string;
  rotateLeft: string;
  rotateRight: string;
  spots: { id: HomeSceneSystem | "hub" | "diy"; label: string; href: string }[];
}

/** The tour through a day: one chapter per system, in the order of the day. */
export interface HomeTourChapter {
  id: HomeSceneSystem;
  mode: HomeSceneMode;
  time: string;
  label: string;
  title: string;
  text: string;
  points: string[];
  links: HomeLink[];
}

export interface HomeTourCopy {
  eyebrow: string;
  title: string;
  chapters: HomeTourChapter[];
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

export type HomeTopicId = "home-assistant" | "automations" | "esp32" | "products" | "ai";

export interface HomeNavigatorRow {
  /** Picks the picture: public/images/home/topic-<id>-*. */
  id: HomeTopicId;
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
