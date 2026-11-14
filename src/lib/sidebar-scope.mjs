// The sidebar opens on the section the reader is in: that section comes first
// and is expanded, the others follow collapsed. A page that is not in the
// sidebar itself (a news issue) belongs to the closest page above it.
// Used by src/route-data.ts.

const links = (entries) => entries.flatMap((entry) => (entry.type === "group" ? links(entry.entries) : [entry]));

function currentLink(sidebar, pathname) {
  const all = links(sidebar);
  return (
    all.find((link) => link.isCurrent) ??
    all
      // "/da/" is above every page, so it says nothing about the section.
      .filter((link) => pathname.startsWith(link.href) && link.href.split("/").length > 3)
      .sort((a, b) => b.href.length - a.href.length)[0]
  );
}

export function scopeSidebar(sidebar, pathname = "") {
  const collapsed = (entry) => (entry.type === "group" ? { ...entry, collapsed: true } : entry);
  const current = currentLink(sidebar, pathname);
  const section = current && sidebar.find((entry) => entry.type === "group" && links(entry.entries).includes(current));
  if (!section) return sidebar.map(collapsed);
  return [{ ...section, collapsed: false }, ...sidebar.filter((entry) => entry !== section).map(collapsed)];
}
