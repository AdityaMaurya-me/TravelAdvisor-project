"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getNavSection, getSectionMemoryKey, isRememberedSectionRoute, NAV_SECTIONS } from "@/lib/navigation/section-memory";

export const LAST_ROUTE_KEY = "traveladvisor:last-route";
export const LAST_DETAIL_ROUTE_KEY = "traveladvisor:last-detail-route";
const CURRENT_ROUTE_KEY = "traveladvisor:current-route";

export function NavigationMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const currentRoute = `${pathname}${query ? `?${query}` : ""}`;
    const trackedCurrentRoute = sessionStorage.getItem(CURRENT_ROUTE_KEY);

    if (trackedCurrentRoute && trackedCurrentRoute !== currentRoute) {
      sessionStorage.setItem(LAST_ROUTE_KEY, trackedCurrentRoute);
    }
    sessionStorage.setItem(CURRENT_ROUTE_KEY, currentRoute);

    const section = getNavSection(pathname);
    // Main navbar pages are deliberate reset destinations. Keep the last
    // deeper route so switching away and back resumes where the user stopped.
    if (isRememberedSectionRoute(section, pathname)) {
      sessionStorage.setItem(getSectionMemoryKey(section), currentRoute);
    }

    if (pathname.startsWith("/place/") || pathname.startsWith("/destination/")) {
      sessionStorage.setItem(LAST_DETAIL_ROUTE_KEY, currentRoute);
    }
  }, [pathname, searchParams]);

  return null;
}
