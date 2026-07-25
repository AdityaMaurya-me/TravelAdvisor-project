import { Logo } from "@/components/navigation/logo"
import { MobileMenu } from "@/components/navigation/mobile-menu"
import { NavLinks } from "@/components/navigation/nav-links"
import { UserMenu } from "@/components/navigation/user-menu"
import { PageContainer } from "@/components/layout/page-container";
import { NavigationMemory } from "@/components/navigation/navigation-memory";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 xl:px-10">
      <NavigationMemory />
      <PageContainer className="flex h-16 items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          <MobileMenu />
          <Logo />
        </div>

        {/* Center */}
        <NavLinks />
        
        {/* Right */}
        <UserMenu />
      </PageContainer>
    </header>
  )
}
