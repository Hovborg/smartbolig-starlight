// The tools on the site, in the order the overview page shows them
// (ToolCards.astro). A new tool is one entry here plus its page in both
// languages; docs/vaerktoejer.md has the whole recipe.
//
// `slug` is the page name under /vaerktoejer/. `icon` is a drawing in
// src/components/tools/ToolIcon.astro.

export const TOOLS = [
  {
    slug: "elpris",
    icon: "price",
    da: {
      title: "Elprisen lige nu og de billigste timer",
      text: "Se spotprisen time for time i dag og i morgen. Find de billigste timer i træk til opvask, vask eller opladning.",
    },
    en: {
      title: "Electricity price right now and the cheapest hours",
      text: "See the spot price hour by hour today and tomorrow. Find the cheapest hours in a row for the dishes, the laundry or charging.",
    },
  },
];

/** The words on every card that are not about one tool. */
export const CARD_COPY = {
  da: { open: "Åbn værktøjet" },
  en: { open: "Open the tool" },
};
