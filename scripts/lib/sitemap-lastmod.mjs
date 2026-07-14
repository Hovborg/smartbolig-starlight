// Starlight auto-generates the sitemap without <lastmod>; Google uses lastmod
// (when consistently truthful) to prioritise recrawling. finalize-build.mjs
// enriches the generated sitemap with dates from content frontmatter.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function addLastmod(xml, resolveLastmod) {
  return xml.replace(/<url><loc>([^<]+)<\/loc>/g, (match, loc) => {
    const lastmod = resolveLastmod(loc);
    if (typeof lastmod !== "string" || !DATE_PATTERN.test(lastmod)) return match;
    return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>`;
  });
}
