"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, MessageCircle, Navigation, Phone, Star, Globe2 } from "lucide-react";

import { ensureExternalGooglePlace, type ManagedExternalPlace } from "@/app/actions/external-places";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import Navbar from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { DetailMap } from "@/components/maps/detail-map";
import { UniversalBackLink } from "@/components/navigation/universal-back-link";
import { PlaceCommunityDiscussion } from "@/components/sections/place/place-community-discussion";
import { PlaceTravelStatus } from "@/components/sections/place/place-travel-status";
import { PlaceWeather } from "@/components/sections/place/place-weather";
import { SaveDestinationButton } from "@/components/ui/save-destination-button";
import { PlacePhoto } from "@/components/ui/place-photo";
import { OpenGoogleMapsButton } from "@/components/ui/open-google-maps-button";
import type { GooglePlaceDetail } from "@/lib/google-places";
import { supabase } from "@/lib/supabase";

type ExternalPlaceDetailsProps = {
  place: GooglePlaceDetail;
  backHref?: string;
  backLabel?: string;
};

export function ExternalPlaceDetails({ place, backHref = "/", backLabel = "Back to search" }: ExternalPlaceDetailsProps) {
  const { requireAuth } = useAuthModal();
  const router = useRouter();
  const [managedPlace, setManagedPlace] = useState<ManagedExternalPlace | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [featureMessage, setFeatureMessage] = useState("");
  const marker = {
    id: place.id,
    slug: `google-${place.id}`,
    name: place.name,
    locationLabel: place.address || "Google place",
    latitude: place.latitude,
    longitude: place.longitude,
    rating: place.rating ?? null,
  };

  const loadManagedPlace = useCallback(async () => {
    const { data } = await supabase.from("places").select("id,slug,canonical_place_id,is_published,is_external").eq("google_place_id", place.id).maybeSingle();
    if (data?.canonical_place_id) {
      const { data: canonical } = await supabase.from("places").select("slug").eq("id", data.canonical_place_id).maybeSingle();
      if (canonical?.slug) { router.replace(`/place/${canonical.slug}`); return; }
    }
    // Once an admin publishes this pending Google record, keep the external
    // Google URL stable but send it to the full TravelAdvisor detail page.
    if (data?.is_published && !data.is_external) {
      router.replace(`/place/${data.slug}`);
      return;
    }
    if (data) { setManagedPlace({ id: data.id, slug: data.slug }); return; }
    // A signed-in visitor gets an internal external record automatically. This
    // enables the existing save, travel-status, review, report, and discussion
    // components without exposing Google results in curated browse sections.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setManagedPlace(null); return; }
    setIsPreparing(true);
    try { setManagedPlace(await ensureExternalGooglePlace(place.id)); }
    catch (error) { setFeatureMessage(error instanceof Error ? error.message : "Live details are available, but TravelAdvisor features could not be prepared."); }
    finally { setIsPreparing(false); }
  }, [place.id, router]);

  useEffect(() => {
    void loadManagedPlace();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void loadManagedPlace(); });
    return () => listener.subscription.unsubscribe();
  }, [loadManagedPlace]);

  const enableFeatures = async (): Promise<ManagedExternalPlace | null> => {
    if (managedPlace) return managedPlace;
    if (isPreparing) return null;
    const prepare = async (): Promise<ManagedExternalPlace | null> => {
      setIsPreparing(true); setFeatureMessage("");
      try {
        const saved = await ensureExternalGooglePlace(place.id);
        setManagedPlace(saved);
        return saved;
      } catch (error) {
        setFeatureMessage(error instanceof Error ? error.message : "Unable to enable TravelAdvisor features for this place.");
        return null;
      } finally { setIsPreparing(false); }
    };
    const resume = async () => { await prepare(); };
    if (!await requireAuth(resume)) return null;
    return prepare();
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <PageContainer className="max-w-360 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,0.85fr)] lg:items-start">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4"><UniversalBackLink fallbackHref={backHref} fallbackLabel={backLabel} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground" />{managedPlace ? <SaveDestinationButton placeSlug={managedPlace.slug} /> : <button type="button" onClick={() => void enableFeatures()} disabled={isPreparing} className="rounded-md border border-input bg-background/80 px-3 py-2 text-sm font-medium transition hover:border-primary/50 disabled:opacity-60">{isPreparing ? "Preparing..." : "Save to collection"}</button>}</div>
            <div className="relative aspect-16/10 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <PlacePhoto src="/placeholder.jpg" alt={place.name} query={`${place.name} ${place.address}`} googlePhotoName={place.photo?.name} googlePhotoAuthor={place.photo?.authorName} sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
              <span className="absolute left-4 top-4 rounded-full border border-cyan-300/30 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur">Live Google place</span>
            </div>
            <section>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{place.name}</h1>
                {place.rating !== undefined && <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-sm font-medium text-amber-700 dark:text-amber-200"><Star className="h-4 w-4 fill-current" />{place.rating.toFixed(1)}{place.userRatingCount ? ` (${place.userRatingCount.toLocaleString()})` : ""}<span className="ml-1 text-xs font-normal text-muted-foreground">Google Maps rating</span></span>}
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/85 sm:text-base">A live place listing sourced from Google Maps. The rating above is an aggregate of Google Maps user ratings, not TravelAdvisor reviews. TravelAdvisor has not verified these details yet, so confirm opening hours and availability before you leave.</p>
            </section>
            {managedPlace ? <PlaceCommunityDiscussion placeSlug={managedPlace.slug} placeName={place.name} /> : <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><MessageCircle className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold">Community discussion</h2><p className="mt-1 text-sm text-slate-400">Be the first traveller to start a discussion about {place.name}.</p></div></div><button type="button" onClick={() => void enableFeatures()} disabled={isPreparing} className="mt-5 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-60">{isPreparing ? "Preparing discussion..." : "Sign in to write a review"}</button>{featureMessage && <p className="mt-4 text-sm text-amber-200">{featureMessage}</p>}</section>}
          </div>
          <aside className="space-y-5 lg:sticky lg:top-24">
            {managedPlace && <PlaceTravelStatus placeId={managedPlace.id} placeName={place.name} destinationName={place.address || "Google place"} googleMapsUrl={place.googleMapsUri} />}
            <PlaceWeather latitude={place.latitude} longitude={place.longitude} />
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-cyan-300">Place information</p>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span>{place.address || "Address is not available."}</span></div>
                {place.primaryType && <p className="rounded-lg bg-accent px-3 py-2 capitalize text-muted-foreground">{place.primaryType.replace(/_/g, " ")}</p>}
                {place.priceLevel && <p className="rounded-lg bg-accent px-3 py-2 text-muted-foreground">Price level: {place.priceLevel.replace(/_/g, " ").toLowerCase()}</p>}
                {place.phoneNumber && <a href={`tel:${place.phoneNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-100"><Phone className="h-4 w-4" />{place.phoneNumber}</a>}
                {place.websiteUri && <a href={place.websiteUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-100"><Globe2 className="h-4 w-4" />Official website</a>}
                {!managedPlace && place.googleMapsUri && <OpenGoogleMapsButton href={place.googleMapsUri} className="mt-1" />}
              </div>
            </section>
            <DetailMap markers={[marker]} title={place.name} mode="place" />
            {(place.currentOpeningHours ?? place.openingHours)?.length ? <section className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-medium text-cyan-300">Opening hours</p>{place.openNow !== undefined ? <p className={`mt-2 text-sm font-medium ${place.openNow ? "text-emerald-500" : "text-amber-600 dark:text-amber-300"}`}>{place.openNow ? "Open now" : "Closed now"}{place.nextCloseTime ? ` · closes ${place.nextCloseTime}` : place.nextOpenTime ? ` · opens ${place.nextOpenTime}` : ""}</p> : null}<ul className="mt-3 space-y-2 text-sm text-muted-foreground">{(place.currentOpeningHours ?? place.openingHours ?? []).map((hours) => <li key={hours}>{hours}</li>)}</ul></section> : null}
            <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5"><Navigation className="h-5 w-5 text-cyan-300" /><h2 className="mt-3 font-semibold">Ready to travel?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Use the route action under this map to set this place as point B and choose your own starting point.</p></section>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
