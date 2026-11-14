// The texts for every part of a starter kit, in Danish and English, under the
// ids in starter-kit-items.mjs. `role` is what the part is, `why` is the one
// sentence on why it is in the kit, `guide` is the text of the link to its
// guide. A part with nothing to buy also has a `tag` that says so.
// starter-kit-copy.mjs hands these on as `items`; both languages must have
// the same keys (scripts/site-tools-kit.test.mjs).

export const partsCopy = {
  da: {
    "brain-ha": { role: "Home Assistant på en lille computer", why: "Home Assistant samler alle delene ét sted og kører hjemme hos dig. Den skal køre på en computer, der er tændt hele tiden: en lille computer for sig selv eller en server, du allerede har.", guide: "Guide: Vælg hardware" },
    "brain-own": { role: "Din Home Assistant", why: "Den har du, så her er intet at købe. Tag en backup, før du tilføjer nye dele.", guide: "Guide: Backup og sikkerhed", tag: "Har du" },
    "link-zigbee": { role: "Zigbee-koordinator", why: "En USB-pind, der forbinder sættets Zigbee-dele med Home Assistant. Sæt den i et USB-forlængerkabel, så den kommer væk fra computeren. Kablet køber du for sig, hvis du ikke har et.", guide: "Guide: Zigbee-koordinatorer" },
    "link-wifi": { role: "Dit eget Wi-Fi", why: "Wi-Fi-delene i sættet bruger den router, du har, så her er intet at købe.", guide: "Guide: Wi-Fi-enheder", tag: "Intet at købe" },
    "light-bulb": { role: "Smart pære", why: "Skrues i en lampe, du har. Den kan dæmpes og skifte farve, og den parres direkte med Zigbee-koordinatoren.", guide: "Guide: Smart belysning" },
    "light-button": { role: "Trådløs knap", why: "Tænder og slukker pæren uden telefon. Den kører på batteri, så den kan ligge, hvor du vil.", guide: "Guide: Zigbee-sensorer og knapper" },
    "light-motion": { role: "Bevægelsessensor", why: "Lader lyset tænde, når nogen kommer ind i rummet, og slukke igen bagefter. Den kører på batteri.", guide: "Guide: Bevægelseslys med overstyring" },
    "light-dimmer": { role: "Dimmer bag afbryderen", why: "Et alternativ til den smarte pære: dimmeren styrer de dæmpbare pærer, du har, og vægafbryderen virker som før. Til én lampe vælger du enten den smarte pære eller dimmeren, ikke begge.", guide: "Guide: Smart belysning" },
    "heat-trv": { role: "Radiatortermostat", why: "Erstatter det gamle termostathoved på radiatoren og styrer varmen efter tid og temperatur. Den kører på batteri. Tjek radiatorens ventiltype, før du køber: nogle ventiler, fx Danfoss RA, RAV og RAVL, kræver en adapter.", guide: "Guide: Smart termostater" },
    "heat-sensor": { role: "Temperatursensor til rummet", why: "Måler temperaturen dér, hvor du opholder dig, og ikke inde ved radiatoren. Better Thermostat bruger tallet til at styre termostaten.", guide: "Guide: Better Thermostat" },
    "heat-sensor-shared": { role: "Temperatursensor til rummet", why: "Brug sensoren fra Indeklima. Better Thermostat bruger dens tal til at styre termostaten.", guide: "Guide: Better Thermostat", tag: "Står under Indeklima" },
    "energy-plug": { role: "Smart stikkontakt med måler", why: "Sættes mellem stikkontakten og et apparat. Den viser, hvor meget strøm apparatet bruger, og kan tænde og slukke det.", guide: "Guide: Energistyring" },
    "energy-han": { role: "Aflæser til elmålerens HAN-port", why: "Viser hele boligens elforbrug direkte fra elmåleren. Guiden forklarer, hvordan porten bliver åbnet, og hvad du skal bruge.", guide: "Guide: Elmåleren via HAN-porten" },
    "security-door": { role: "Dør- og vinduessensor", why: "Fortæller, om en dør eller et vindue står åbent, så du kan få besked på telefonen. Den kører på batteri.", guide: "Guide: Zigbee-sensorer" },
    "security-motion": { role: "Bevægelsessensor", why: "Opdager, når nogen går i et rum, mens du er ude, så du kan få besked på telefonen. Den kører på batteri.", guide: "Guide: Zigbee-sensorer" },
    "security-motion-shared": { role: "Bevægelsessensor", why: "Brug sensoren fra Lys. Den samme sensor kan tænde lyset og give besked, når du er ude.", guide: "Guide: Zigbee-sensorer", tag: "Står under Lys" },
    "climate-sensor": { role: "Temperatur- og fugtsensor", why: "Måler temperatur og luftfugtighed i et rum, så du kan følge med og få besked, når luften bliver for fugtig. Den kører på batteri.", guide: "Guide: Zigbee-sensorer" },
    "diy-board": { role: "ESP32-kort", why: "Et lille printkort med Wi-Fi, som du programmerer med ESPHome og sætter sensorer på. Guiden hjælper dig med at vælge kort.", guide: "Guide: Kom godt i gang med ESP32" },
    "diy-light": { role: "LED-strip", why: "En lysstribe, du styrer fra et ESP32-kort.", guide: "Guide: LED-strip med ESP32" },
    "diy-motion": { role: "Bevægelsessensor til kortet", why: "En lille sensor, du selv sætter på et ESP32-kort, som alternativ til den færdige sensor.", guide: "Guide: Bevægelsessensor med ESP32" },
    "diy-climate": { role: "Temperatursensor til kortet", why: "En lille sensor, du selv sætter på et ESP32-kort, som alternativ til den færdige sensor.", guide: "Guide: Temperatursensor med ESP32" },
  },
  en: {
    "brain-ha": { role: "Home Assistant on a small computer", why: "Home Assistant brings all the parts together in one place and runs in your own home. It needs a computer that is always on: a small one of its own, or a server you already have.", guide: "Guide: Choose hardware" },
    "brain-own": { role: "Your Home Assistant", why: "You already have it, so there is nothing to buy here. Back it up before you add new parts.", guide: "Guide: Backup and security", tag: "You have it" },
    "link-zigbee": { role: "Zigbee coordinator", why: "A USB stick that connects the kit's Zigbee parts to Home Assistant. Plug it into a USB extension cable to keep it away from the computer. The cable is bought separately if you do not have one.", guide: "Guide: Zigbee coordinators" },
    "link-wifi": { role: "Your own Wi-Fi", why: "The Wi-Fi parts in the kit use the router you already have, so there is nothing to buy here.", guide: "Guide: Wi-Fi devices", tag: "Nothing to buy" },
    "light-bulb": { role: "Smart bulb", why: "Screws into a lamp you already have. It dims and changes colour, and it pairs directly with the Zigbee coordinator.", guide: "Guide: Smart lighting" },
    "light-button": { role: "Wireless button", why: "Switches the bulb on and off without a phone. It runs on a battery, so you can put it wherever you like.", guide: "Guide: Zigbee sensors and buttons" },
    "light-motion": { role: "Motion sensor", why: "Lets the light come on when someone enters the room and go off again afterwards. It runs on a battery.", guide: "Guide: Motion lighting with override" },
    "light-dimmer": { role: "Dimmer behind the switch", why: "An alternative to the smart bulb: the dimmer controls the dimmable bulbs you already have, and the wall switch works as before. For any one lamp, choose either the smart bulb or the dimmer, not both.", guide: "Guide: Smart lighting" },
    "heat-trv": { role: "Radiator thermostat", why: "Replaces the old thermostat head on the radiator and controls the heating by schedule and temperature. It runs on batteries. Check the radiator's valve type before you buy: some valves, such as Danfoss RA, RAV and RAVL, need an adapter.", guide: "Guide: Smart thermostats" },
    "heat-sensor": { role: "Temperature sensor for the room", why: "Measures the temperature where you actually sit, not right next to the radiator. Better Thermostat uses the reading to control the thermostat.", guide: "Guide: Better Thermostat" },
    "heat-sensor-shared": { role: "Temperature sensor for the room", why: "Use the sensor from Indoor climate. Better Thermostat uses its reading to control the thermostat.", guide: "Guide: Better Thermostat", tag: "Listed under Indoor climate" },
    "energy-plug": { role: "Smart plug with a meter", why: "Goes between the wall socket and an appliance. It shows how much power the appliance uses and can switch it on and off.", guide: "Guide: Energy management" },
    "energy-han": { role: "Reader for the meter's HAN port", why: "Shows the whole home's electricity use straight from the meter. The guide explains how to get the port opened and what you need.", guide: "Guide: The meter via the HAN port" },
    "security-door": { role: "Door and window sensor", why: "Tells you whether a door or a window is open, so you can get a message on your phone. It runs on a battery.", guide: "Guide: Zigbee sensors" },
    "security-motion": { role: "Motion sensor", why: "Notices when someone moves in a room while you are out, so you can get a message on your phone. It runs on a battery.", guide: "Guide: Zigbee sensors" },
    "security-motion-shared": { role: "Motion sensor", why: "Use the sensor from Light. The same sensor can switch the light on and send a message when you are out.", guide: "Guide: Zigbee sensors", tag: "Listed under Light" },
    "climate-sensor": { role: "Temperature and humidity sensor", why: "Measures temperature and humidity in a room, so you can keep an eye on them and get a message when the air gets too humid. It runs on a battery.", guide: "Guide: Zigbee sensors" },
    "diy-board": { role: "ESP32 board", why: "A small circuit board with Wi-Fi that you program with ESPHome and connect sensors to. The guide helps you choose a board.", guide: "Guide: Getting started with ESP32" },
    "diy-light": { role: "LED strip", why: "A light strip you control from an ESP32 board.", guide: "Guide: LED strip with ESP32" },
    "diy-motion": { role: "Motion sensor for the board", why: "A small sensor you connect to an ESP32 board yourself, as an alternative to the ready-made sensor.", guide: "Guide: Motion sensor with ESP32" },
    "diy-climate": { role: "Temperature sensor for the board", why: "A small sensor you connect to an ESP32 board yourself, as an alternative to the ready-made sensor.", guide: "Guide: Temperature sensor with ESP32" },
  },
};
