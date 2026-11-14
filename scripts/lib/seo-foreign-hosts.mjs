// A built page fetches nothing from another host by itself. What comes from
// Google or giscus is added by a script after the visitor's answer or click
// (docs/samtykke.md), so a foreign host written into the page is a mistake.
const OWN_HOST = "smartbolig.net";

// Elements the browser fetches when it reads the page, and the attribute that names the file.
const FETCHED = { script: "src", iframe: "src", img: "src", video: "src", audio: "src", source: "src", embed: "src", object: "data" };
// <link> fetches only for these rel values; canonical, alternate and the like are just addresses.
const FETCHING_RELS = new Set(["stylesheet", "preconnect", "dns-prefetch", "preload", "modulepreload", "prefetch", "prerender", "icon", "apple-touch-icon", "mask-icon", "manifest"]);

const TAG = /<(script|iframe|img|video|audio|source|embed|object|link)\b([^>]*)>/gi;

function attribute(attributes, name) {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

/** The host of an address that leaves the site, or null for a path, a data: address and the site itself. */
function foreignHost(address, ownHost) {
  const value = address?.trim();
  if (!value || !/^(?:https?:)?\/\//i.test(value)) return null;
  let host;
  try {
    host = new URL(value, `https://${ownHost}`).hostname.toLowerCase();
  } catch {
    return value;
  }
  return host === ownHost ? null : host;
}

// "a.webp 640w, https://x.example/b.webp 1280w" -> the two addresses.
const srcsetAddresses = (srcset) => (srcset ?? "").split(",").map((entry) => entry.trim().split(/\s+/)[0]).filter(Boolean);

/** One message for each thing the page would fetch from another host. */
export function foreignHosts(html, ownHost = OWN_HOST) {
  const messages = [];
  for (const [, rawName, attributes] of html.matchAll(TAG)) {
    const name = rawName.toLowerCase();
    let addresses;
    if (name === "link") {
      const rels = (attribute(attributes, "rel") ?? "").toLowerCase().split(/\s+/);
      if (!rels.some((rel) => FETCHING_RELS.has(rel))) continue;
      addresses = [attribute(attributes, "href"), ...srcsetAddresses(attribute(attributes, "imagesrcset"))];
    } else {
      addresses = [attribute(attributes, FETCHED[name]), ...srcsetAddresses(attribute(attributes, "srcset"))];
      if (name === "video") addresses.push(attribute(attributes, "poster"));
    }
    for (const address of addresses) {
      const host = foreignHost(address, ownHost);
      if (host) messages.push(`<${name}> fetches from ${host}; the page itself may only fetch from ${ownHost}`);
    }
  }
  return [...new Set(messages)];
}
