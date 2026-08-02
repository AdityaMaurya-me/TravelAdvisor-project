"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Compass, FolderHeart, Home, Info, Menu, MessageCircle, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getNavSection, getSectionDestination, type NavSection } from "@/lib/navigation/section-memory";

const links = [
  { section: "home", label: "Home", icon: Home },
  { section: "collections", label: "Collections", icon: FolderHeart },
  { section: "community", label: "Community", icon: MessageCircle },
  { section: "curate", label: "Curate", icon: Compass },
  { section: "about", label: "About", icon: Info },
] as const;

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();

  useEffect(() => { setIsOpen(false); }, [pathname]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        className="relative z-[70] rounded-md p-2 transition-colors duration-200 hover:bg-accent"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      {isOpen && createPortal(
        <nav
          id={menuId}
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 top-16 z-[60] border-t border-border bg-background px-4 py-6 shadow-2xl"
          style={{ backgroundColor: "#06111d" }}
        >
          <div className="mx-auto max-w-lg space-y-2">
            {links.map(({ section, label, icon: Icon }) => (
              <button
                key={section}
                type="button"
                onClick={() => { router.push(getSectionDestination(section as NavSection, pathname)); setIsOpen(false); }}
                aria-current={getNavSection(pathname) === section ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-base font-medium transition ${getNavSection(pathname) === section ? "bg-cyan-400/10 text-cyan-200" : "text-foreground hover:bg-accent"}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-lg px-4 text-sm text-muted-foreground">
            Notifications and profile controls remain available in the top-right corner.
          </p>
        </nav>
      , document.body)}
    </div>
  );
}
