"use client";

import { ExternalLink, MapPin, Navigation, Star } from "lucide-react";

import Navbar from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { DetailMap } from "@/components/maps/detail-map";
import { UniversalBackLink } from "@/components/navigation/universal-back-link";
import { PlacePhoto } from "@/components/ui/place-photo";
import type { GooglePlaceDetail } from "@/lib/google-places";

type ExternalPlaceDetailsProps = {
  place: GooglePlaceDetail;
  backHref?: string;
  backLabel?: string;
};

export function ExternalPlaceDetails({ place, backHref = "/", backLabel = "Back to search" }: ExternalPlaceDetailsProps) {
  const marker = {
    id: place.id,
    slug: `google-${place.id}`,
    name: place.name,
    locationLabel: place.address || "Google place",
    latitude: place.latitude,
    longitude: place.longitude,
    rating: place.rating ?? null,
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <PageContainer className="max-w-360 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,0.85fr)] lg:items-start">
          <div className="space-y-6">
            <UniversalBackLink fallbackHref={backHref} fallbackLabel={backLabel} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground" />
            <div className="relative aspect-16/10 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <PlacePhoto src="/placeholder.jpg" alt={place.name} query={`${place.name} ${place.address}`} sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
              <span className="absolute left-4 top-4 rounded-full border border-cyan-300/30 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur">Live Google place</span>
            </div>
            <section>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{place.name}</h1>
                {place.rating !== undefined && <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-sm font-medium text-amber-200"><Star className="h-4 w-4 fill-current" />{place.rating.toFixed(1)}{place.userRatingCount ? ` (${place.userRatingCount.toLocaleString()})` : ""}</span>}
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/85 sm:text-base">A live place listing sourced from Google. TravelAdvisor has not verified its details yet, so confirm opening hours and availability before you leave.</p>
            </section>
          </div>
          <aside className="space-y-5 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-cyan-300">Place information</p>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span>{place.address || "Address is not available."}</span></div>
                {place.primaryType && <p className="rounded-lg bg-accent px-3 py-2 capitalize text-muted-foreground">{place.primaryType.replace(/_/g, " ")}</p>}
                {place.googleMapsUri && <a href={place.googleMapsUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-100"><ExternalLink className="h-4 w-4" />View in Google Maps</a>}
              </div>
            </section>
            <DetailMap markers={[marker]} title={place.name} mode="place" />
            {place.openingHours?.length ? <section className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-medium text-cyan-300">Opening hours</p><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{place.openingHours.map((hours) => <li key={hours}>{hours}</li>)}</ul></section> : null}
            <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5"><Navigation className="h-5 w-5 text-cyan-300" /><h2 className="mt-3 font-semibold">Ready to travel?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Use the route action under this map to set this place as point B and choose your own starting point.</p></section>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
