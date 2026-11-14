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
      legend: "Øverst Wi-Fi-kanalerne, nederst de 16 Zigbee-kanaler. Høj streg: intet overlap. Kort stump: ligger under en markeret Wi-Fi-kanal. Trekant: anbefalet.",
    },
    result: {
      best: "Anbefalet Zigbee-kanal",
      overlap: "Overlapper Wi-Fi: {list}.",
      noOverlap: "Ingen Zigbee-kanal overlapper.",
      free: "Uden overlap: {list}.",
      noFree: "Ingen Zigbee-kanal er fri for overlap.",
      none: "Ingen Wi-Fi-kanal er markeret, så kanalerne er lige gode. Vi peger på 15, som både ZHA og Zigbee2MQTT nævner som en af de anbefalede.",
      apart: "Kanal {n} er den af de anbefalede kanaler (11, 15, 20 og 25) uden overlap, der ligger længst fra det markerede Wi-Fi: {mhz} MHz fra kanten af det nærmeste markerede bånd.",
      other: "De anbefalede kanaler (11, 15, 20 og 25) ligger alle under et markeret Wi-Fi-bånd. Kanal {n} er fri for de markerede Wi-Fi-kanaler og ligger længst fra dem af kanalerne 11 til 25: {mhz} MHz fra kanten af det nærmeste bånd. Den er ikke blandt de kanaler, Zigbee2MQTT og ZHA anbefaler, fordi de alle er dækket.",
      inside: "Alle Zigbee-kanaler fra 11 til 25 ligger under et markeret Wi-Fi-bånd. Kanal {n} er valgt efter rækkefølgen 15, 20, 25, 11.",
      free26: "Kanal 26 er fri, men vi anbefaler den ikke: den er ikke blandt de kanaler, Zigbee2MQTT og ZHA anbefaler, og vi har ikke fundet en officiel kilde, der siger, hvorfor lige den kanal er dårligere. Det er en forsigtig regel og ikke en påstand.",
      summary: "Frekvensstrimmel. Markerede Wi-Fi-kanaler: {wifi}. Anbefalet Zigbee-kanal: {n}.",
      noWifi: "ingen",
    },
    note: "Sådan regner vi: Zigbee-kanal n ligger på 2405 + 5 × (n − 11) MHz og er 2 MHz bred. Wi-Fi-kanal m ligger på 2412 + 5 × (m − 1) MHz, og vi regner den 22 MHz bred, som i figur 1 i AN5185. En Zigbee-kanal overlapper, når de to bånd deler mere end ét punkt. Vi anbefaler først en af de kanaler, Zigbee2MQTT og ZHA nævner (15, 20, 25 og 11), som ikke overlapper et markeret Wi-Fi-bånd: den, hvis midte ligger længst fra kanten af et markeret bånd; står flere lige, vælges 15, 20, 25, 11. Er de alle dækket, vælger vi en anden kanal fra 11 til 25 uden overlap, den der ligger længst væk. Er alle kanaler fra 11 til 25 dækket, vælges 15, 20, 25, 11 og derefter det laveste nummer. Kanal 26 bliver aldrig anbefalet.",
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
      apart: "Channel {n} is the one of the recommended channels (11, 15, 20 and 25) without overlap that lies furthest from the marked Wi-Fi: {mhz} MHz from the edge of the nearest marked band.",
      other: "The recommended channels (11, 15, 20 and 25) are all under a marked Wi-Fi band. Channel {n} is free of the marked Wi-Fi channels and lies furthest from them of channels 11 to 25: {mhz} MHz from the edge of the nearest band. It is not among the channels Zigbee2MQTT and ZHA recommend, because those are all covered.",
      inside: "Every Zigbee channel from 11 to 25 is under a marked Wi-Fi band. Channel {n} is picked in the order 15, 20, 25, 11.",
      free26: "Channel 26 is free, but we do not recommend it: it is not among the channels Zigbee2MQTT and ZHA recommend, and we have not found an official source that says why that channel is worse. It is a cautious rule and not a claim.",
      summary: "Frequency strip. Marked Wi-Fi channels: {wifi}. Recommended Zigbee channel: {n}.",
      noWifi: "none",
    },
    note: "How we calculate: Zigbee channel n sits at 2405 + 5 × (n − 11) MHz and is 2 MHz wide. Wi-Fi channel m sits at 2412 + 5 × (m − 1) MHz, and we count it as 22 MHz wide, as in AN5185 figure 1. A Zigbee channel overlaps when the two bands share more than one point. We first recommend one of the channels Zigbee2MQTT and ZHA name (15, 20, 25 and 11) that does not overlap a marked Wi-Fi band: the one whose centre is furthest from the edge of a marked band; on a tie 15, 20, 25, 11. If they are all covered, we pick another channel from 11 to 25 without overlap, the one furthest away. If every channel from 11 to 25 is covered, we pick 15, 20, 25, 11 and then the lowest number. Channel 26 is never recommended.",
  },
};
