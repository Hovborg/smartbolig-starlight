// Every text in the Zigbee channel picker, in Danish and English. Words in
// {braces} are filled in by fill() in format.mjs. Both languages must have the
// same keys; scripts/site-tools.test.mjs checks it.

export const zigbeeCopy = {
  da: {
    title: "Zigbee-kanalvælger",
    wifi: {
      label: "Wi-Fi-kanaler i brug",
      hint: "Tryk på de kanaler, din router og de stærkeste naboer bruger. Din routers kanal står i dens indstillinger.",
      channel: "Wi-Fi-kanal {n}",
      common: "1 / 6 / 11",
      commonHint: "Genvej: markerer kanal 1, 6 og 11.",
      clear: "Ryd",
    },
    strip: {
      label: "Frekvensstrimmel",
      legend: "Øverst Wi-Fi-kanalerne, nederst de 16 Zigbee-kanaler. Høj streg: ingen overlap. Kort stump: ligger under en markeret Wi-Fi-kanal. Trekant: anbefalet.",
    },
    result: {
      best: "Anbefalet Zigbee-kanal",
      overlap: "Overlapper Wi-Fi: {list}.",
      noOverlap: "Ingen Zigbee-kanal overlapper.",
      free: "Uden overlap: {list}.",
      noFree: "Ingen Zigbee-kanal er fri for overlap.",
      none: "Ingen Wi-Fi-kanal er markeret, så kanalerne er lige gode. Vi peger på 15, som både ZHA og Zigbee2MQTT nævner som en af de anbefalede.",
      apart: "Kanal {n} ligger længst fra Wi-Fi: {mhz} MHz fra kanten af det nærmeste markerede bånd.",
      inside: "Alle Zigbee-kanaler ligger under et markeret Wi-Fi-bånd. Kanal {n} er valgt efter rækkefølgen 15, 20, 25, 11.",
      summary: "Frekvensstrimmel. Markerede Wi-Fi-kanaler: {wifi}. Anbefalet Zigbee-kanal: {n}.",
      noWifi: "ingen",
    },
    note: "Sådan regner vi: Zigbee-kanal n ligger på 2405 + 5 × (n − 11) MHz og er 2 MHz bred. Wi-Fi-kanal m ligger på 2412 + 5 × (m − 1) MHz, og vi regner den 22 MHz bred, den bredeste almindelige maske. En Zigbee-kanal overlapper, når de to bånd rører mere end et punkt. Bedst er den kanal, hvis midte ligger længst fra kanten af et markeret Wi-Fi-bånd; står flere lige, vælges 15, 20, 25, 11 og derefter det laveste nummer. Kanal 26 bliver aldrig valgt først.",
  },
  en: {
    title: "Zigbee channel picker",
    wifi: {
      label: "Wi-Fi channels in use",
      hint: "Tap the channels your router and the strongest neighbours use. Your router's channel is in its settings.",
      channel: "Wi-Fi channel {n}",
      common: "1 / 6 / 11",
      commonHint: "Shortcut: marks channels 1, 6 and 11.",
      clear: "Clear",
    },
    strip: {
      label: "Frequency strip",
      legend: "Wi-Fi channels on top, the 16 Zigbee channels below. Tall bar: no overlap. Short stub: under a marked Wi-Fi channel. Triangle: recommended.",
    },
    result: {
      best: "Recommended Zigbee channel",
      overlap: "Overlaps Wi-Fi: {list}.",
      noOverlap: "No Zigbee channel overlaps.",
      free: "Without overlap: {list}.",
      noFree: "No Zigbee channel is free of overlap.",
      none: "No Wi-Fi channel is marked, so all the channels are equally good. We point to 15, which both ZHA and Zigbee2MQTT name as one of the recommended ones.",
      apart: "Channel {n} is furthest from Wi-Fi: {mhz} MHz from the edge of the nearest marked band.",
      inside: "Every Zigbee channel is under a marked Wi-Fi band. Channel {n} is picked in the order 15, 20, 25, 11.",
      summary: "Frequency strip. Marked Wi-Fi channels: {wifi}. Recommended Zigbee channel: {n}.",
      noWifi: "none",
    },
    note: "How we calculate: Zigbee channel n sits at 2405 + 5 × (n − 11) MHz and is 2 MHz wide. Wi-Fi channel m sits at 2412 + 5 × (m − 1) MHz, and we count it as 22 MHz wide, the widest common mask. A Zigbee channel overlaps when the two bands touch at more than a point. The best one is the channel whose centre is furthest from the edge of a marked Wi-Fi band; on a tie we pick 15, 20, 25, 11 and then the lowest number. Channel 26 is never picked first.",
  },
};
