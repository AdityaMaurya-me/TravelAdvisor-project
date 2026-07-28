export const SECTION_MEMORY_PREFIX = "traveladvisor:last-section-route:";

export const NAV_SECTIONS = {
  home: { label: "Home", href: "/" },
  collections: { label: "Collections", href: "/collections" },
  community: { label: "Community", href: "/community" },
  curate: { label: "Curate", href: "/curation/locations" },
  about: { label: "About", href: "/about" },
} as const;

export type NavSection = keyof typeof NAV_SECTIONS;

export function getNavSection(pathname: string): NavSection {
  if (pathname === "/collections" || pathname.startsWith("/collections/")) return "collections";
  if (pathname === "/community" || pathname.startsWith("/community/")) return "community";
  if (pathname === "/curation/locations" || pathname.startsWith("/curation/locations/")) return "curate";
  if (pathname === "/about" || pathname.startsWith("/about/")) return "about";
  return "home";
}

export function getSectionMemoryKey(section: NavSection) {
  return `${SECTION_MEMORY_PREFIX}${section}`;
}

export function getSectionDestination(section: NavSection, currentPathname: string): string {
  const root = NAV_SECTIONS[section].href;
  if (getNavSection(currentPathname) === section) return root;
  return sessionStorage.getItem(getSectionMemoryKey(section)) || root;
}
