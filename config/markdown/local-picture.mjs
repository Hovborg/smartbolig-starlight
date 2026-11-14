// Which pictures in a guide Astro optimizes: the ones written as a path
// relative to the MDX file ("../../assets/a.webp", "./a.webp", "a.webp").
// An address ("/images/...") or a URL is served as written.

export function isLocalPicture(src) {
  const value = String(src ?? "");
  return value !== "" && !/^(?:\/|#|[a-z][a-z0-9+.-]*:)/i.test(value);
}
