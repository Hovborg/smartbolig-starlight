import { products } from '../data/products/index.mjs';

/**
 * Looks a product up in the register. Unknown ids throw, so a typo in a guide
 * stops the build instead of shipping a dead buy link.
 * @param {string} id
 * @returns {{ id: string, name: string, store: import('./affiliate').AffiliateStore, url: string }}
 */
export function productLink(id) {
  if (!Object.hasOwn(products, id)) {
    throw new Error(`Unknown affiliate product "${id}". Add it to the register in src/data/products/ (one file per group).`);
  }
  return { id, ...products[id] };
}
