// Homepage copy for both languages. The texts live in home-copy/da.ts and
// home-copy/en.ts, the shapes in home-copy/types.ts.
import { da } from "./home-copy/da.ts";
import { en } from "./home-copy/en.ts";
import type { HomeCopy, HomeLocale } from "./home-copy/types.ts";

export type * from "./home-copy/types.ts";

export const homeCopy: Record<HomeLocale, HomeCopy> = { da, en };

export function getHomeCopy(locale: HomeLocale): HomeCopy {
  return homeCopy[locale];
}
