import { aqara } from './aqara.mjs';
import { assistants } from './assistants.mjs';
import { cameras } from './cameras.mjs';
import { lighting } from './lighting.mjs';
import { robots } from './robots.mjs';
import { security } from './security.mjs';
import { sensors } from './sensors.mjs';
import { shelly } from './shelly.mjs';
import { shops } from './shops.mjs';
import { zigbee } from './zigbee.mjs';
import { zwave } from './zwave.mjs';

const groups = { aqara, assistants, cameras, lighting, robots, security, sensors, shelly, shops, zigbee, zwave };

/** @type {Record<string, import('./types.mjs').Product>} */
const merged = {};
for (const [group, entries] of Object.entries(groups)) {
  for (const [id, product] of Object.entries(entries)) {
    // A silent overwrite would send readers to the wrong shop page.
    if (Object.hasOwn(merged, id)) throw new Error(`Duplicate product id "${id}" (also in ${group}.mjs) in src/data/products/`);
    merged[id] = Object.freeze({ ...product });
  }
}

/** Every product link on the site, by id. Guides name a product; the shop URL lives only here. */
export const products = Object.freeze(merged);
