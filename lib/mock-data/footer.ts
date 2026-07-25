export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterNavigationGroup {
  title: string;
  links: FooterLink[];
}

export const FOOTER_NAVIGATION: FooterNavigationGroup[] = [
  {
    title: "Explore",
    links: [
      { label: "Destinations", href: "/destinations" },
      { label: "Collections", href: "/collections" },
      { label: "Community", href: "/community" },
      { label: "Journey planner", href: "/planner" },
    ],
  },
  {
    title: "TravelAdvisor",
    links: [
      { label: "About us", href: "/about" },
      { label: "Our journal", href: "/journal" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", href: "/help" },
      { label: "Accessibility", href: "/accessibility" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];
