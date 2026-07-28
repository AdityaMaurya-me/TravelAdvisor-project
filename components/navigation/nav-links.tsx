"use client";

import { usePathname, useRouter } from "next/navigation";
import { getNavSection, getSectionDestination, NAV_SECTIONS, type NavSection } from "@/lib/navigation/section-memory";

export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="hidden items-center gap-8 md:flex">
      {(Object.entries(NAV_SECTIONS) as [NavSection, typeof NAV_SECTIONS[NavSection]][]).map(([section, item]) => {
        const active = getNavSection(pathname) === section;

        const className = `
              relative pb-1 text-sm font-medium transition-colors duration-200
              after:absolute after:bottom-0 after:left-0
              after:h-0.5 after:w-0 after:rounded-full
              after:bg-cyan-400 after:transition-all after:duration-300
              hover:after:w-full
              ${
                active
                  ? "text-white after:w-full"
                  : "text-muted-foreground hover:text-white"
              }
            `;

        return (
          <button
            key={section}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => router.push(getSectionDestination(section, pathname))}
            className={className}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
