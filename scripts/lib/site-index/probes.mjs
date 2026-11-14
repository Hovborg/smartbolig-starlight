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
