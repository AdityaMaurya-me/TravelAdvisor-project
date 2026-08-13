export const SECTION_MEMORY_PREFIX = "traveladvisor:last-section-route:";

export const NAV_SECTIONS = {
  home: { label: "Home", href: "/" },
  collections: { label: "Collections", href: "/collections" },
  community: { label: "Community", href: "/community" },
  curate: { label: "Curate", href: "/curation/locations" },
  about: { label: "About", href: "/about" },
} as const;

export type NavSection = keyof typeof NAV_SECTIONS;

// Routes outside the main product navigation (authentication, password
// recovery, admin tools, and one-off utility pages) must never become the
// remembered destination for the Home navbar button.
export function isRememberedSectionRoute(section: NavSection, pathname: string) {
  if (pathname === NAV_SECTIONS[section].href) return false;

  if (section === "home") {
    return [
      "/place/",
      "/destination/",
      "/categories",
      "/search/",
      "/route/",
      "/planner",
      "/journey",
      "/destinations",
      "/discover/",
      "/discover-destination/",
    ].some((prefix) => pathname === prefix || pathname.startsWith(prefix));
  }

  return pathname.startsWith(NAV_SECTIONS[section].href);
}

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
  const remembered = sessionStorage.getItem(getSectionMemoryKey(section));
  return remembered && isRememberedSectionRoute(section, remembered) ? remembered : root;
}
