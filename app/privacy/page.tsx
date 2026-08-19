import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, Eye, MapPinned, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How TravelAdvisor handles account, location, collection, and community data.",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    icon: Database,
    title: "Information stored for your account",
    body: "When you create an account, TravelAdvisor stores the information needed to operate it, such as your email address, display name, profile image, saved places, saved routes, collections, and community contributions. Authentication and account data are managed through Supabase.",
  },
  {
    icon: MapPinned,
    title: "Location and trip planning",
    body: "Your browser asks before sharing your location. It is used to show nearby places and calculate a route from your current position. You can disable location access at any time in browser or device settings. TravelAdvisor does not need to store your live location to show nearby results.",
  },
  {
    icon: Eye,
    title: "Public content and third parties",
    body: "Reviews, tips, and location submissions may be visible to other users after publication. Maps, place search, directions, weather, image, or AI features can send the minimum query or coordinates needed to their configured providers, such as Google Maps services, MapTiler, OpenRouteService, weather providers, and Gemini. Their own privacy terms apply to those requests.",
  },
  {
    icon: ShieldCheck,
    title: "Your choices",
    body: "You can edit or remove your own contributions and collections. You can sign out at any time. Account deletion is available from Profile and permanently removes the account data handled by the application, subject to any legally required retention or provider-controlled records.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
        <header className="mt-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">TravelAdvisor</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Privacy at a glance</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            This page explains the practical data use of the TravelAdvisor project. It should be reviewed and updated before a public commercial launch.
          </p>
        </header>
        <div className="mt-10 grid gap-5">
          {sections.map(({ icon: Icon, title, body }) => (
            <section key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">Last updated: August 15, 2026</p>
      </div>
    </main>
  );
}
