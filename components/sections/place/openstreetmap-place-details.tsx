import { ExternalLink, MapPin, MessageCircle, Navigation } from "lucide-react";
import Link from "next/link";

import Navbar from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { DetailMap } from "@/components/maps/detail-map";
import { UniversalBackLink } from "@/components/navigation/universal-back-link";
import { PlacePhoto } from "@/components/ui/place-photo";
import type { OpenStreetMapPlace } from "@/lib/openstreetmap-places";

type Props = { place: OpenStreetMapPlace; backHref?: string; backLabel?: string };

/**
 * OpenStreetMap is our final search fallback. It deliberately follows the
 * same two-column place-detail shell as curated and live-Google places, while
 * keeping its source and verification state explicit to travellers.
 */
export function OpenStreetMapPlaceDetails({ place, backHref, backLabel }: Props) {
  const routeHref = `/route/mumbai-to-lonavala?destinationName=${encodeURIComponent(place.name)}&destinationLat=${place.latitude}&destinationLng=${place.longitude}&from=${encodeURIComponent(`/discover/${place.id}`)}&fromLabel=${encodeURIComponent(`Back to ${place.name}`)}`;
  const marker = {
    id: place.id,
    slug: place.id,
    name: place.name,
    locationLabel: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    rating: null,
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <PageContainer className="max-w-360 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,0.85fr)] lg:items-start">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <UniversalBackLink
                fallbackHref={backHref ?? "/"}
                fallbackLabel={backLabel ?? "Back to search"}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              />
              <a
                href={place.openStreetMapUri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-md border border-input bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Open source map
              </a>
            </div>

            <div className="relative aspect-16/10 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <PlacePhoto
                src="/placeholder.jpg"
                alt={place.name}
                query={`${place.name} ${place.address}`}
                allowFallbackSearch
                sizes="(min-width: 1024px) 66vw, 100vw"
                quality={90}
                className="object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full border border-cyan-300/30 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur">
                Live OpenStreetMap place
              </span>
            </div>

            <section>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{place.name}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/85 sm:text-base">
                A live place listing sourced from OpenStreetMap. TravelAdvisor has not verified these details yet, so confirm opening hours, access, and availability before you leave.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><MessageCircle className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-xl font-semibold">Community discussion</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    This source-only listing needs to be verified or imported before traveller reviews and saved-place features can be attached.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-cyan-300">Place information</p>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span>{place.address}</span></div>
                {place.primaryType && <p className="rounded-lg bg-accent px-3 py-2 capitalize text-muted-foreground">{place.primaryType.replace(/_/g, " ")}</p>}
                <a href={place.openStreetMapUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-100">
                  <ExternalLink className="h-4 w-4" />View source in OpenStreetMap
                </a>
              </div>
            </section>

            <DetailMap markers={[marker]} title={place.name} mode="place" routeHref={routeHref} />

            <Link href={routeHref} className="flex items-center justify-between rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-5 transition hover:border-cyan-400/60">
              <span>
                <span className="block font-semibold">Plan a route to {place.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">Set this as point B and choose your start.</span>
              </span>
              <Navigation className="h-5 w-5 text-cyan-300" />
            </Link>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
