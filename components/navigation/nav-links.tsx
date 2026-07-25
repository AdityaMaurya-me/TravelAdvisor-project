"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Collections", href: "/collections" },
  { label: "Community", href: "/community" },
  { label: "Curate", href: "/curation/locations" },
  { label: "About", href: "/about" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-8 md:flex">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;

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
          <Link
            key={item.href}
            href={item.href}
            className={className}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
