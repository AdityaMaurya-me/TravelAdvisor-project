import { notFound } from "next/navigation";

import { DestinationDetails } from "@/components/sections/destination/destination-details";
import { countLiveDestinationCategories, getGoogleDestinationPlaces, getGooglePlaceById, type GooglePlaceDetail } from "@/lib/google-places";
import type { DestinationDetail } from "@/lib/mock-data/destinations";

export default async function DiscoverDestinationPage({ params, searchParams }: { params: Promise<{ placeId: string }>; searchParams: Promise<{ from?: string; fromLabel?: string; name?: string; address?: string; lat?: string; lng?: string }> }) {
  const [{ placeId }, query] = await Promise.all([params, searchParams]);
  const googleDestination = await getGooglePlaceById(placeId);
  const latitude = Number(query.lat);
  const longitude = Number(query.lng);
  const snapshotName = query.name?.trim().slice(0, 200);
  const destination: GooglePlaceDetail | null = googleDestination ?? (snapshotName && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? { id: placeId, name: snapshotName, address: query.address?.trim().slice(0, 500) ?? "Google destination", latitude, longitude } : null);
  if (!destination) notFound();
  const places = await getGoogleDestinationPlaces(destination.name, 12);
  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  const destinationHref = `/discover-destination/${encodeURIComponent(destination.id)}`;
  const livePlaces = places.filter((place) => place.id !== destination.id);
  const categoryNames = ["Attractions", "Cafés", "Local food", "Nature"];
  const categoryQueries = ["attractions", "cafes", "local food", "nature spots"];
  const icons = ["landmark", "cafe", "food", "gem"] as const;
  const liveCategories = countLiveDestinationCategories(livePlaces);
  const detail: DestinationDetail = {
    slug: `google-${destination.id}`,
    title: destination.name,
    location: destination.address || "Google location",
    description: "Explore current Google listings for this destination. Open any place card for its full details, images, route planning, collections, and community discussion.",
    image: "/placeholder.jpg",
    googlePhotoName: destination.photo?.name,
    googlePhotoAuthor: destination.photo?.authorName,
    googlePlaceId: destination.id,
    isLive: true,
    rating: destination.rating ?? null,
    reviewCount: destination.userRatingCount ?? null,
    facts: [
      { label: "Route", value: "Plan your route", detail: "From your location", icon: "route" },
      { label: "Discovery", value: `${livePlaces.length} live places`, detail: "Current Google listings", icon: "calendar" },
      { label: "Data source", value: "Live", detail: "Verify details before travel", icon: "wallet" },
    ],
    categories: liveCategories.map((category, index) => ({ id: category.id, title: category.title, placeCount: category.count, icon: icons[index], href: `/search/${encodeURIComponent(`${category.query} in ${destination.name}`)}` })),
    routePlaces: [],
    communityFavorites: livePlaces.map((place) => ({ id: place.id, title: place.name, location: place.address || destination.name, image: "/placeholder.jpg", googlePhotoName: place.photo?.name, googlePhotoAuthor: place.photo?.authorName, href: `/discover/${encodeURIComponent(place.id)}?from=${encodeURIComponent(destinationHref)}&fromLabel=${encodeURIComponent(`Back to ${destination.name}`)}` })),
    mapPlaces: livePlaces.map((place) => ({ id: place.id, slug: place.id, name: place.name, locationLabel: place.address || destination.name, latitude: place.latitude, longitude: place.longitude, rating: null })),
    browseCategoriesHref: `/search/${encodeURIComponent(`places to visit in ${destination.name}`)}`,
    livePlacesHref: `/search/${encodeURIComponent(`places to visit in ${destination.name}`)}`,
  };
  return <DestinationDetails destination={detail} backHref={backHref} backLabel={query.fromLabel} />;
}
