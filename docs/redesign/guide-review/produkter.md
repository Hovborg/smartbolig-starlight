# Faktatjek af produktsiderne (da/en `produkter`)

Kontrolleret 2026-11-13. Omfang: 25 sider i `src/content/docs/da/produkter/` og de tilsvarende engelske sider. Ingen af siderne har et `lastUpdated`-felt i frontmatter, så ingen datofelter er ændret. Rækkefølgen er efter seneste git-dato (ældste først).

Afgrænsning: Gennemgangen er ikke udtømmende. Alle udgående links og alle Proshop-priser blev kontrolleret mekanisk. Specifikationer og Home Assistant-integrationer blev kontrolleret for de produkter, der er nævnt i tabellen nedenfor. Sider, hvor jeg ikke har gennemgået alle specifikationer, er markeret `uafklaret` med angivelse af, hvad der mangler.

Proshop (Cloudflare) begrænsede automatiske opslag efter de første forespørgsler. Ca. 60 Proshop-sider kunne derfor ikke læses i anden omgang; deres priser er ikke kontrolleret og står som uafklaret. Engelske sider bruger USD/EUR-priser uden Proshop-links; de kan ikke kontrolleres mod danske butikker og er ikke ændret (undtagen hvor producentens vejledende pris er kontrolleret).

## Mangler og forslag

1. Opdatér IKEA-afsnittet i `smart-belysning`: IKEA erstatter TRÅDFRI med Matter-over-Thread-produkter (fx KAJPLATS-pærer og BILRESA-fjernbetjening) ifølge flere nyhedskilder; bør bekræftes mod IKEA og beskrives (inkl. Home Assistant-brug via Thread/Matter eller Zigbee).
2. Ny side om Matter/Thread-enheder (Eve, IKEA, Aqara) med Home Assistant som Matter-controller. I dag er Thread kun nævnt som en kolonne i koordinatortabellerne.
3. Ny side om Zigbee-repeatere/routere (stik, pærer, dedikerede repeatere) og netværksopbygning; kun nævnt som tip i koordinatorsiden.
4. Ny side om smart-TV/AV-styring og IR-blastere (Sensibo, Broadlink) til aircondition og varmepumper; Sensibo er kun linket i Proshop-tabeller.
5. Ny side om varmepumper og klimaanlæg i Home Assistant (Panasonic, Daikin, Mitsubishi), som er meget udbredt i Danmark.
6. Ny side om lokal strømstyring til elbil/ladebokse (Easee, Zaptec, Wallbox) og dynamiske elpriser. `energistyring` nævner kun Nord Pool.
7. Tilføj en "sidst kontrolleret"-linje (dato) på alle produktsider i stedet for "Sidst opdateret: December 2025" nederst, så læsere kan se, hvad der er verificeret.
8. Samlet prisoversigt, hvor priser hentes fra én datakilde, så priser ikke står hårdkodet i 25 sider. Flere sider har allerede ændret sig siden sidste tjek.
9. Opdatér `smart-termostater` (Aqara E1 er udgået hos Proshop; Aqara Radiator Thermostat W600 er linket andre steder) og beskriv Sonoff TRVZB og Shelly BLU TRV samlet.
10. Gennemgå `smart-pool` for Sutro ("lukker 31. okt 2025" står stadig i nutid, men datoen er passeret).

## Status pr. side

| Fil | Status | Ændring / fund | Kilde | Kontrolleret |
|---|---|---|---|---|
| smart-kaeledyr | rettet | Tractive er indbygget (ikke HACS) og kræver Premium og e-mail-login; Litter-Robot (Whisker) er indbygget. Uafklaret: priser, entitetsnavne for Litter-Robot 4 (natlys/cycle-knap), SurePet Feeder | home-assistant.io/integrations/tractive, /litterrobot, /surepetcare | 2026-11-13 |
| smart-sundhed | rettet | Oura kræver OAuth2 (ikke personligt token), understøtter Gen 3/Ring 4/Ring 5 og HA 2026.3+. Eight Sleep: HACS-integration er korrekt (kerneintegrationen er fjernet). Uafklaret: øvrige produkter | github.com/louispires/Oura-Home-Assistant-Integration; home-assistant.io/integrations/eight_sleep | 2026-11-13 |
| smart-koekken | rettet | Anova og MEATER er indbyggede (ikke HACS); Anova kun Wi-Fi-modeller. Uafklaret: øvrige produkter og priser | home-assistant.io/integrations/anova, /meater | 2026-11-13 |
| smart-pool | uafklaret | HA-integrationer (PoolSense, Ondilo ICO, Balboa, OmniLogic) bekræftet. Sutro-lukkedato 31. okt 2025 kunne ikke bekræftes (virksomheden er lukket, dato ikke fundet) og står i nutid | home-assistant.io/integrations/poolsense, /ondilo_ico, /balboa, /omnilogic | 2026-11-13 |
| anbefalinger | uafklaret | Kun links kontrolleret: fire Proshop-links peger på forkerte produkter eller hjemmesiden (se linkafsnit). Priser ikke kontrolleret | Proshop | 2026-11-13 |
| energistyring | rettet | IoTaWatt og Nord Pool er indbyggede; Nord Pool sættes op i brugerfladen (ikke `nordpool:` i configuration.yaml); priser rettet (Aqara Smart Plug 189 kr, Shelly Pro 3EM-400A 1.488 kr, forhåndsbestilling). Eve 3-pack-link peger på kategorien | home-assistant.io/integrations/iotawatt, /nordpool; Proshop | 2026-11-13 |
| index | uafklaret | Kun links kontrolleret; ingen fund | - | 2026-11-13 |
| medier-entertainment | rettet | Jellyfin "HACS Add-on" fjernet (Jellyfin har indbygget integration); priser Fire TV Stick 4K Max 649 kr og Echo Dot 416 kr. Apple TV 4K (2022) er markeret Discontinued hos Proshop (1.799 kr, tekst siger 1.299 kr): uafklaret. Nest Hub-link er dødt | home-assistant.io/integrations/jellyfin; Proshop | 2026-11-13 |
| shelly | rettet | Plus 0-10V Dimmer kræver neutral (tabel og tip rettet); priser opdateret efter Proshop (1PM Mini Gen3 96 kr, Pro 3EM CT63 715 kr, DALI Dimmer Gen3 284 kr). Uafklaret: Shelly 3EM er udgået (755 kr, tekst 800 kr), Plus H&T/UNI udgået hos Proshop; øvrige priser uden Proshop-link | kb.shelly.cloud/knowledge-base/shelly-plus-0-10v-dimmer, /shelly-dimmer-2; Proshop | 2026-11-13 |
| smart-alarm | rettet | Ring-integrationen i HA har ingen alarmpanel (alarmen kræver ring-mqtt); Ring-sektion og tabel rettet; priser Ring 5-delt sæt 1.703 kr, ydresirene 599 kr. Uafklaret: "SimpliSafe 1.397+ brugere" (forældet brugertal), Konnected-priser (konnected.io gav 429), Ring Alarms tilgængelighed i Danmark | home-assistant.io/integrations/ring, /simplisafe, /abode | 2026-11-13 |
| smart-baby | rettet | Owlet: opdigtet REST-eksempel (api.owletdata.com giver 404) og alarmautomation fjernet; erstattet af korrekt oplysning om uofficielle HACS-integrationer og advarsel om, at HA ikke må bruges som alarm. Uafklaret: Nanit/Hatch | github.com/ray0711/owlet m.fl. | 2026-11-13 |
| smart-belysning | uafklaret | IKEA TRÅDFRI-pærer erstattes af KAJPLATS (Matter over Thread); kun bekræftet gennem nyhedskilder, ikke IKEA. Priser og DIRIGERA-pris ikke kontrolleret | matteralpha.com, homekitnews.com | 2026-11-13 |
| smart-garage | rettet | Priser Yale Smart Opener Garage 909 kr og ismartgate-sensor 339 kr. Uafklaret: ratgdo/Meross-detaljer | Proshop | 2026-11-13 |
| smart-gardiner | uafklaret | Kun links og Proshop-pris for MotionBlinds (631 kr) kontrolleret; IKEA FYRTUR-status ikke bekræftet | Proshop | 2026-11-13 |
| smart-haven | rettet | Philio-pris 408 kr (forhåndsbestilling). B-hyve: HACS er korrekt (ikke kerneintegration). Aeotec Water Sensor 7 Pro er udgået hos Proshop (279 kr, tekst ~400 kr): uafklaret | sebr/bhyve-home-assistant; Proshop | 2026-11-13 |
| smart-luftkvalitet | rettet | frient Luftkvalitetssensor 374 kr. MCO Home CO2 er udgået hos Proshop (1.392 kr, tekst ~1.421 kr): uafklaret | Proshop | 2026-11-13 |
| smart-rengoering | rettet | Ecovacs er indbygget (ikke HACS); Valetudo-link rettet til `/supported-robots/`. Uafklaret: Dreame-integrationens status (HACS) og modeller/priser. | home-assistant.io/integrations/ecovacs; valetudo.cloud | 2026-11-13 |
| smart-sikkerhed | rettet | Priser Aqara Door P2 249 kr, Vibration T1 119 kr, Hub M100 187 kr. Uafklaret: Eufy som "privacy first/lokal" og dets HA-integration; øvrige priser | Proshop | 2026-11-13 |
| smart-stemmestyring | rettet | Voice PE: vejledende pris 59 EUR inkl. moms / 69 USD ekskl. moms (stod som ~$59/500 kr); Echo Dot 416 kr. Nest Hub-link er dødt. Uafklaret: Echo Flex (udgået?), Homey Pro Mini-pris | home-assistant.io/voice-pe; Proshop | 2026-11-13 |
| smart-termostater | uafklaret | Aqara E1 er udgået hos Proshop (389 kr); siden angiver både 350 kr og 205 kr. 5-pak-link peger på kategorien | Proshop | 2026-11-13 |
| smart-vand | rettet | Flume er indbygget (stod som HACS); priser Tapo T300 128 kr, Aeotec SmartThings 222 kr, Eve Water Guard 745 kr. Uafklaret: Phyn-integrationens status og frient-link (Cloudflare-blokeret) | home-assistant.io/integrations/flume; Proshop | 2026-11-13 |
| tilstedevaerelse | rettet | SNZB-06P 96 kr. Aqara FP2-link (3166497) peger på et Belkin-beslag. Everything Presence-modellerne står som udsolgt hos producenten (usikker status): uafklaret | zigbee2mqtt.io/devices/SNZB-06P; shop.everythingsmart.io | 2026-11-13 |
| wifi-enheder | uafklaret | Kun links kontrolleret; ingen fund. Specifikationer ikke gennemgået | - | 2026-11-13 |
| zigbee-koordinatorer | rettet | SLZB-07 bruger EFR32MG21 (stod CC2652P); SkyConnect er udgået og afløst af ZBT-2; ZBT-2 vejledende 45 EUR/49 USD og kan køre Zigbee eller Thread, ikke begge; ConBee III 349 kr. Uafklaret: ZigStar UZG-01 (én anmeldelse nævner CC2652P, siden siger CC2652P7), Dongle Max-pris (~300 kr hos udenlandske butikker, siden siger 400 kr), ZBDongle-E-priser (120 vs 158 kr) | home-assistant.io/connect/zbt-2; smlight.tech; botland.store; smarthomescene.com; cnx-software.com | 2026-11-13 |
| zigbee-sensorer | rettet | Priser SNZB-03P 88 kr, Aqara Door T1 139 kr og P2 249 kr, SNZB-02P 92 kr, SNZB-06P 96 kr. FP300 er Zigbee (kan også sættes til Thread/Matter). Aqara FP2-link peger på et Belkin-beslag | Proshop; zigbee2mqtt.io/devices/PS-S04D | 2026-11-13 |

## Døde eller tvivlsomme links

Affiliate-links er ikke rettet (regel). Forkerte produkter skal rettes af en person med adgang til Partner-Ads/Proshop-deeplinks.

| Side | Link | Resultat |
|---|---|---|
| anbefalinger, zigbee-koordinatorer, zigbee-sensorer | proshop.dk/Smart-Home/Sonoff-Zigbee-30-USB-Dongle-Plus-E/2951450 | Redirect til forsiden (produktet findes ikke mere). Linket med id 3213488 åbner "Sonoff Gateway ZigBee 3.0 USB Dongle Plus" |
| anbefalinger, zigbee-koordinatorer | proshop.dk/.../Conbee-III-Universal-Zigbee-USB-Gateway/3307230 | Åbner "Sonoff Smart plug WiFi S60TPF" (forkert produkt). Det rigtige ConBee III-id er 3312609 |
| anbefalinger, tilstedevaerelse, zigbee-sensorer | proshop.dk/.../Aqara-Presence-Sensor-FP2/3166497 | Åbner et Belkin-monteringsbeslag (forkert produkt). Det andet FP2-link (3157568) kunne ikke kontrolleres |
| anbefalinger | proshop.dk/.../Shelly-Plus-1PM/2950296 | Åbner "Maico E-style 100 mhy pro smart" (ventilation). Shelly-siden bruger id 3027897 |
| anbefalinger | proshop.dk/.../Shelly-2PM-Gen3/3428768 | Åbner Vision Techmount-vægbeslag (forkert produkt). Shelly-siden bruger id 3302030 |
| energistyring | proshop.dk/.../Eve-Energy-Matter-3-Pack/8500805 | Redirect til kategorien "Eve" |
| smart-termostater | proshop.dk/.../Aqara-Smart-Radiator-Thermostat-E1-5-Pack-Starter-Kit/8500638 | Redirect til kategorien "Aqara" |
| medier-entertainment, smart-stemmestyring | proshop.dk/Google-Nest-Hub-2-Gen | 404, redirect til søgning |
| smart-alarm | robotteronline.dk frient Smart Siren | 454 (Cloudflare-kontrol), ikke kontrolleret |
| smart-vand, zigbee-sensorer | robotteronline.dk frient Water Leak Detector | 454 (Cloudflare-kontrol), ikke kontrolleret |
| smart-rengoering | valetudo.cloud/.../supported-robots.html | 404. Rettet til `/supported-robots/` (ikke affiliate) |
| smart-baby | api.owletdata.com | 404; eksemplet er fjernet |
| smart-stemmestyring | shop.m5stack.com ATOM Echo | 429 (rate limit), ikke bekræftet død |
| smart-koekken, smart-pool, smart-rengoering, shelly | keurig.com, poolsense.net, roborock.com, ecovacs.dk, builder.dontvacuum.me, komplett.dk | Intet svar fra curl (timeout/TLS), ikke bekræftet døde |
| flere | williams-sonoma.com, printables.com, whoop.com, robbshop.nl, crutchfield.com, homedepot.com, elgiganten.dk, chewy.com | 403/429 (bot-beskyttelse), ikke bekræftet døde |
| smart-rengoering | dreame.dk | Redirect til et affiliate-sporingsdomæne (forventet) |

Cirka 215 af 239 unikke links gav HTTP 200.
