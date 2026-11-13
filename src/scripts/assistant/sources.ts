// Builds a link for an answer source, but only for the allowlisted HTTPS hosts.
import { SAFE_SOURCE_HOSTS } from "./constants";

export function createSafeSourceLink(source: any) {
  if (!source || typeof source.title !== "string" || typeof source.url !== "string") return null;
  let sourceUrl;
  try {
    sourceUrl = new URL(source.url);
  } catch {
    return null;
  }
  if (sourceUrl.protocol !== "https:" || sourceUrl.port || sourceUrl.username || sourceUrl.password) return null;
  if (!SAFE_SOURCE_HOSTS.has(sourceUrl.hostname)) return null;

  const sourceLink = document.createElement("a");
  sourceLink.className = "smartbolig-ai__source";
  sourceLink.dataset.sourceType = sourceUrl.hostname === "smartbolig.net" ? "smartbolig" : "official";
  sourceLink.href = sourceUrl.toString();
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  sourceLink.textContent = source.title.slice(0, 100);
  return sourceLink;
}
