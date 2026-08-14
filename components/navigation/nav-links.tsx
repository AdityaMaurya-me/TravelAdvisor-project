"use client";

import { usePathname, useRouter } from "next/navigation";
import { getNavSection, getSectionDestination, NAV_SECTIONS, type NavSection } from "@/lib/navigation/section-memory";
import { startRouteLoading } from "@/components/navigation/page-transition-loader";

export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="hidden items-center gap-5 md:flex" aria-label="Primary navigation">
      {(Object.entries(NAV_SECTIONS) as [NavSection, typeof NAV_SECTIONS[NavSection]][]).map(([section, item]) => {
        const active = getNavSection(pathname) === section;

        return (
          <button
            key={section}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => { const destination = getSectionDestination(section, pathname); if (destination !== pathname) startRouteLoading(); router.push(destination); }}
            data-button-skin="off"
            className={`nav-main-link ${active ? "nav-main-link--active" : ""}`}
          >
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
