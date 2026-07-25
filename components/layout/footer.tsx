import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Logo } from "@/components/navigation/logo";
import { FOOTER_NAVIGATION } from "@/lib/mock-data/footer";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-card/30">
      <PageContainer className="max-w-[1920px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 xl:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.75fr)_repeat(3,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Discover remarkable places and turn every trip into a journey
              worth remembering.
            </p>
          </div>

          {FOOTER_NAVIGATION.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-semibold text-foreground">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TravelAdvisor. All rights reserved.</p>
          <p>Built for curious travelers.</p>
        </div>
      </PageContainer>
    </footer>
  );
}
