"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FolderPlus, Heart, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";

import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { supabase } from "@/lib/supabase";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { AppModal } from "@/components/ui/app-modal";
import { ShareTripButton } from "@/components/sections/collections/share-trip-button";
import { getGuestSavedPlaceSlugs } from "@/lib/saved-places/guest";
import {
  addPlaceToCollection,
  addRouteToCollection,
  addTripPlanToRouteCollection,
  createCollection,
  createRouteCollection,
  deleteCollection,
  deleteRouteCollection,
  deleteSavedRoute,
  deleteSavedTripPlan,
  removePlaceFromCollection,
  removeRouteFromRouteCollection,
  removeTripPlanFromRouteCollection,
  renameCollection,
  renameRouteCollection,
  unsavePlace,
} from "@/app/actions/collections";

type Collection = { id: string; title: string; count: number };
type RouteCollection = { id: string; title: string; count: number };
type SavedPlace = {
  placeId: string;
  slug: string;
  title: string;
  location: string;
  image: string;
  collectionIds: string[];
};
type SavedTrip = {
  id: string;
  bufferKm: number;
  origin: string;
  destination: string;
  originSlug?: string;
  destinationSlug?: string;
  usesDeviceLocation?: boolean;
  stopCount: number;
  kind: "plan" | "route";
  collectionIds: string[];
  href: string;
};
type Editor = { mode: "create" } | { mode: "rename"; collection: Collection } | { mode: "rename-route"; collection: RouteCollection };
type PlaceAction = { mode: "add" | "remove"; place: SavedPlace };
type RouteAction = { mode: "add" | "remove"; trip: SavedTrip };
type CollectionRemovalTarget = { place: SavedPlace; collection: Collection };

export function CollectionsPage() {
  const { requireAuth } = useAuthModal();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [routeCollections, setRouteCollections] = useState<RouteCollection[]>([]);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | "all">("all");
  const [activeRouteCollectionId, setActiveRouteCollectionId] = useState<string | "all">("all");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [placeAction, setPlaceAction] = useState<PlaceAction | null>(null);
  const [routeAction, setRouteAction] = useState<RouteAction | null>(null);
  const [routeDeleteTarget, setRouteDeleteTarget] = useState<SavedTrip | null>(null);
  const [removalTarget, setRemovalTarget] = useState<SavedPlace | null>(null);
  const [collectionRemovalTarget, setCollectionRemovalTarget] = useState<CollectionRemovalTarget | null>(null);
  const [collectionDeleteTarget, setCollectionDeleteTarget] = useState<Collection | null>(null);
  const [routeCollectionDeleteTarget, setRouteCollectionDeleteTarget] = useState<RouteCollection | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [collectionKind, setCollectionKind] = useState<"places" | "routes">("places");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCollections([]);
      setRouteCollections([]);
      const guestSlugs = getGuestSavedPlaceSlugs();
      const { data: guestPlaces, error: guestPlacesError } = guestSlugs.length
        ? await supabase.from("places").select("id, slug, name, city, state, cover_image").in("slug", guestSlugs)
        : { data: [], error: null };
      if (guestPlacesError) setMessage(guestPlacesError.message);
      setPlaces((guestPlaces ?? []).map((place) => ({
        placeId: place.id,
        slug: place.slug,
        title: place.name,
        location: [place.city, place.state].filter(Boolean).join(", "),
        image: place.cover_image || "/placeholder.jpg",
        collectionIds: [],
      })));
      setTrips([]);
      if (!guestPlacesError) setMessage(guestSlugs.length ? "Places saved on this device. Sign in to sync them to your account and organize them into collections." : "Sign in to create collections and save places.");
      setIsLoading(false);
      return;
    }

    setMessage("");
    const [{ data: items, error }, { data: routeCollectionRows, error: routeCollectionsError }] = await Promise.all([supabase
      .from("collections")
      .select("id, title, is_system, collection_items(place_id, places(id, slug, name, city, state, cover_image))")
      .eq("user_id", user.id)
      .order("created_at"), (supabase as any).from("route_collections").select("id, title, route_collection_items(route_id), route_collection_trip_plans(trip_plan_id)").eq("user_id", user.id).order("created_at")]);
    if (error) setMessage(error.message);
    if (routeCollectionsError) setMessage(routeCollectionsError.message);
    const [{ data: tripRows, error: tripsError }, { data: savedRouteRows, error: savedRoutesError }] = await Promise.all([
      (supabase as any).from("trip_plans").select("id, buffer_km, stops, origin_snapshot, destination_snapshot, origin:origin_place_id(name, slug), destination:destination_place_id(name, slug)").eq("user_id", user.id).order("created_at", { ascending: false }),
      (supabase as any).from("saved_routes").select("route_id").eq("user_id", user.id),
    ]);
    if (tripsError) setMessage(tripsError.message);
    if (savedRoutesError) setMessage(savedRoutesError.message);
    const routeIds = (savedRouteRows ?? []).map((row: any) => row.route_id).filter(Boolean);
    const { data: routeRows, error: routesError } = routeIds.length
      ? await (supabase as any).from("routes").select("id, slug, distance_km, start:places!routes_start_place_id_fkey(name), destination:places!routes_end_place_id_fkey(name), route_stops(place_id)").in("id", routeIds)
      : { data: [], error: null };
    if (routesError) setMessage(routesError.message);
    const tripCollectionIds = new Map<string, string[]>();
    const routeCollectionIds = new Map<string, string[]>();
    (routeCollectionRows ?? []).forEach((collection: any) => {
      (collection.route_collection_trip_plans ?? []).forEach((item: any) => tripCollectionIds.set(item.trip_plan_id, [...(tripCollectionIds.get(item.trip_plan_id) ?? []), collection.id]));
      (collection.route_collection_items ?? []).forEach((item: any) => routeCollectionIds.set(item.route_id, [...(routeCollectionIds.get(item.route_id) ?? []), collection.id]));
    });
    const plannedTrips = (tripRows ?? []).map((trip: any): SavedTrip => {
      const originSlug = trip.origin?.slug as string | undefined;
      const destinationSlug = trip.destination?.slug as string | undefined;
      const routeQuery = new URLSearchParams({ from: "/collections", fromLabel: "Back to Collections" });
      if (originSlug) routeQuery.set("origin", originSlug);
      if (destinationSlug) routeQuery.set("destination", destinationSlug);
      const origin = trip.origin?.name ?? trip.origin_snapshot?.name ?? "Start";
      const destination = trip.destination?.name ?? trip.destination_snapshot?.name ?? "Destination";
      const usesDeviceLocation = trip.origin_snapshot?.source === "device" || trip.destination_snapshot?.source === "device";
      if (destinationSlug) routeQuery.set("destination", destinationSlug);
      return { id: trip.id, bufferKm: trip.buffer_km, origin, destination, originSlug, destinationSlug, usesDeviceLocation, stopCount: Array.isArray(trip.stops) ? trip.stops.length : 0, kind: "plan", collectionIds: tripCollectionIds.get(trip.id) ?? [], href: destinationSlug ? `/route/mumbai-to-lonavala?${routeQuery.toString()}` : "/planner" };
    });
    const savedRoutes = (routeRows ?? []).map((route: any): SavedTrip => ({ id: route.id, bufferKm: 0, origin: route.start?.name ?? "Start", destination: route.destination?.name ?? "Destination", stopCount: route.route_stops?.length ?? 0, kind: "route", collectionIds: routeCollectionIds.get(route.id) ?? [], href: `/route/${route.slug}` }));
    setTrips([...plannedTrips, ...savedRoutes]);

    const userCollections = (items ?? []).filter((collection) => !collection.is_system);
    setCollections(userCollections.map((collection: any) => ({
      id: collection.id,
      title: collection.title,
      count: collection.collection_items?.length ?? 0,
    })));
    setRouteCollections((routeCollectionRows ?? []).map((collection: any) => ({ id: collection.id, title: collection.title, count: (collection.route_collection_items?.length ?? 0) + (collection.route_collection_trip_plans?.length ?? 0) })));

    const savedByPlace = new Map<string, SavedPlace>();
    (items ?? []).forEach((collection: any) => {
      (collection.collection_items ?? []).forEach((item: any) => {
        const place = item.places;
        if (!place) return;
        const existing = savedByPlace.get(place.id);
        if (existing) {
          existing.collectionIds.push(collection.id);
          return;
        }
        savedByPlace.set(place.id, {
          placeId: place.id,
          slug: place.slug,
          title: place.name,
          location: [place.city, place.state].filter(Boolean).join(", "),
          image: place.cover_image || "/placeholder.jpg",
          collectionIds: [collection.id],
        });
      });
    });
    setPlaces(Array.from(savedByPlace.values()));
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!openMenu) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-collection-menu]")) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [openMenu]);

  const visiblePlaces = useMemo(
    () => activeCollectionId === "all" ? places : places.filter((place) => place.collectionIds.includes(activeCollectionId)),
    [activeCollectionId, places],
  );
  const visibleTrips = useMemo(
    () => activeRouteCollectionId === "all" ? trips : trips.filter((trip) => trip.collectionIds.includes(activeRouteCollectionId)),
    [activeRouteCollectionId, trips],
  );

  const openCreateEditor = () => {
    setTitle("");
    setCollectionKind("places");
    setEditor({ mode: "create" });
  };

  const startCreate = async () => {
    if (!await requireAuth(openCreateEditor)) return;
    openCreateEditor();
  };

  const saveEditor = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle || !editor) return;
    try {
      if (editor.mode === "create") await (collectionKind === "routes" ? createRouteCollection(cleanTitle) : createCollection(cleanTitle));
      else if (editor.mode === "rename") await renameCollection(editor.collection.id, cleanTitle);
      else await renameRouteCollection(editor.collection.id, cleanTitle);
      setEditor(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this collection.");
    }
  };

  const updatePlaceCollection = async (collection: Collection) => {
    if (!placeAction) return;
    try {
      if (placeAction.mode === "add") await addPlaceToCollection(collection.id, placeAction.place.placeId);
      else await removePlaceFromCollection(collection.id, placeAction.place.placeId);
      setPlaceAction(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update this collection.");
    }
  };

  const updateRouteCollection = async (collection: RouteCollection) => {
    if (!routeAction) return;
    try {
      if (routeAction.trip.kind === "plan") {
        if (routeAction.mode === "add") await addTripPlanToRouteCollection(collection.id, routeAction.trip.id);
        else await removeTripPlanFromRouteCollection(collection.id, routeAction.trip.id);
      } else if (routeAction.mode === "add") await addRouteToCollection(collection.id, routeAction.trip.id);
      else await removeRouteFromRouteCollection(collection.id, routeAction.trip.id);
      setRouteAction(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update this route collection.");
    }
  };

  const removeFromActiveRouteCollection = async (trip: SavedTrip) => {
    if (activeRouteCollectionId === "all") return;
    try {
      if (trip.kind === "plan") await removeTripPlanFromRouteCollection(activeRouteCollectionId, trip.id);
      else await removeRouteFromRouteCollection(activeRouteCollectionId, trip.id);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove this route from the collection.");
    }
  };

  const executeRouteDeletion = async () => {
    if (!routeDeleteTarget) return;
    try {
      if (routeDeleteTarget.kind === "plan") await deleteSavedTripPlan(routeDeleteTarget.id);
      else await deleteSavedRoute(routeDeleteTarget.id);
      setRouteDeleteTarget(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete this saved route.");
    }
  };

  const executeCollectionDeletion = async () => {
    if (!collectionDeleteTarget) return;
    try {
      await deleteCollection(collectionDeleteTarget.id);
      if (activeCollectionId === collectionDeleteTarget.id) setActiveCollectionId("all");
      setCollectionDeleteTarget(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete this collection.");
    }
  };

  const executeRouteCollectionDeletion = async () => {
    if (!routeCollectionDeleteTarget) return;
    try {
      await deleteRouteCollection(routeCollectionDeleteTarget.id);
      if (activeRouteCollectionId === routeCollectionDeleteTarget.id) setActiveRouteCollectionId("all");
      setRouteCollectionDeleteTarget(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete this route collection.");
    }
  };

  const executePlaceRemoval = async () => {
    if (!removalTarget) return;
    try {
      await unsavePlace(removalTarget.slug);
      setRemovalTarget(null);
      setOpenMenu(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove this saved place.");
    }
  };

  const executeCollectionPlaceRemoval = async () => {
    if (!collectionRemovalTarget) return;
    try {
      await removePlaceFromCollection(collectionRemovalTarget.collection.id, collectionRemovalTarget.place.placeId);
      setCollectionRemovalTarget(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove this place from the collection.");
    }
  };

  const availableCollections = placeAction?.mode === "remove"
    ? collections.filter((collection) => placeAction.place.collectionIds.includes(collection.id))
    : collections;
  const availableRouteCollections = routeAction?.mode === "remove"
    ? routeCollections.filter((collection) => routeAction.trip.collectionIds.includes(collection.id))
    : routeCollections;

  return (
    <main className="min-h-screen bg-[#07111e] text-white">
      <Navbar />
      <section className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-sm font-medium text-cyan-300">Your travel space</p><h1 className="mt-1 text-4xl font-bold tracking-tight">My Collections</h1><p className="mt-2 text-slate-400">Keep every idea, stop, and future trip in one place.</p></div>
          <button type="button" onClick={() => void startCreate()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium transition hover:border-cyan-400/60"><Plus className="h-4 w-4" />Create new</button>
        </div>
        {message && <p className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">{message} {!isLoading && <button type="button" onClick={() => void requireAuth()} className="ml-1 underline">Sign in</button>}</p>}
        <section className="mt-8">
          <h2 className="text-2xl font-bold">Saved Places</h2>
          <p className="mt-1 text-sm text-slate-400">Collections for places you want to visit or remember.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <article className={`relative overflow-hidden rounded-xl border bg-slate-900 text-left transition ${activeCollectionId === "all" ? "border-cyan-400" : "border-slate-800 hover:border-cyan-400/60"}`}>
            <button type="button" onClick={() => setActiveCollectionId("all")} aria-pressed={activeCollectionId === "all"} className="block w-full overflow-hidden rounded-xl text-left">
              <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.32),transparent_50%),linear-gradient(135deg,#10243a,#0b1626)]"><div className="absolute inset-0 grid place-items-center"><Heart className="h-9 w-9 text-cyan-200" /></div></div>
              <div className="p-3"><h2 className="line-clamp-1 text-sm font-semibold">All Places</h2><p className="mt-1 text-xs text-slate-400">{places.length} saved places</p></div>
            </button>
          </article>
          {collections.map((collection) => (
            <article key={collection.id} className={`relative overflow-visible rounded-xl border bg-slate-900 text-left transition ${activeCollectionId === collection.id ? "border-cyan-400" : "border-slate-800 hover:border-cyan-400/60"}`}>
              <button type="button" onClick={() => setActiveCollectionId(collection.id)} aria-pressed={activeCollectionId === collection.id} className="block w-full overflow-hidden rounded-xl text-left">
                <div className="relative aspect-[4/3]"><Image src="/travel-hero.png" alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover opacity-70" /></div>
                <div className="p-3 pr-10"><h2 className="line-clamp-1 text-sm font-semibold">{collection.title}</h2><p className="mt-1 text-xs text-slate-400">{collection.count} places</p></div>
              </button>
              <button type="button" data-collection-menu aria-label={`Manage ${collection.title}`} onClick={() => setOpenMenu(openMenu === `collection-${collection.id}` ? null : `collection-${collection.id}`)} className="absolute bottom-2 right-2 rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
              {openMenu === `collection-${collection.id}` && <div data-collection-menu className="absolute right-2 top-full z-20 mt-1 w-40 rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl"><button type="button" onClick={() => { setTitle(collection.title); setEditor({ mode: "rename", collection }); setOpenMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" />Rename</button><button type="button" onClick={() => { setCollectionDeleteTarget(collection); setOpenMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>}
            </article>
          ))}
          {collections.length === 0 && !isLoading && !message && <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">Create your first collection to start planning a trip.</p>}
        </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between"><div><h2 className="text-2xl font-bold">Saved places</h2><p className="mt-1 text-sm text-slate-400">{activeCollectionId === "all" ? "Every saved place, including ones in your collections." : "Places in the selected collection."}</p></div><div className="flex items-center gap-4">{activeCollectionId !== "all" && <button type="button" onClick={() => setActiveCollectionId("all")} className="text-sm text-slate-400 hover:text-cyan-200">Show all</button>}<Link href="/categories" className="text-sm text-cyan-300 hover:text-cyan-200">Explore more</Link></div></div>
          <div className="relative z-0 mt-5 overflow-visible rounded-2xl border border-slate-800 bg-slate-900/80">
            {visiblePlaces.map((place) => (
              <div key={place.placeId} className={`relative flex items-center gap-4 border-b border-slate-800 p-3 last:border-0 ${openMenu === `place-${place.placeId}` ? "z-20" : "z-0"}`}>
                <Link href={`/place/${place.slug}?from=/collections&fromLabel=Back%20to%20Collections`} className="group flex min-w-0 flex-1 items-center gap-4"><div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg"><Image src={place.image} alt="" fill sizes="64px" className="object-cover" /></div><div className="min-w-0"><h3 className="font-medium group-hover:text-cyan-200">{place.title}</h3><p className="mt-1 text-xs text-slate-400">{place.location}</p></div></Link>
                <button type="button" onClick={() => {
                  if (activeCollectionId === "all") setRemovalTarget(place);
                  else {
                    const collection = collections.find((item) => item.id === activeCollectionId);
                    if (collection) setCollectionRemovalTarget({ place, collection });
                  }
                }} aria-label={activeCollectionId === "all" ? `Remove ${place.title} from all saved places and collections` : `Choose how to remove ${place.title}`} className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"><Heart className="h-4 w-4 fill-current" /></button>
                <button type="button" data-collection-menu aria-label={`Manage ${place.title}`} onClick={() => setOpenMenu(openMenu === `place-${place.placeId}` ? null : `place-${place.placeId}`)} className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"><MoreHorizontal className="h-5 w-5" /></button>
                {openMenu === `place-${place.placeId}` && <div data-collection-menu className="absolute right-3 top-12 z-30 w-48 rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl"><button type="button" onClick={() => { setPlaceAction({ mode: "add", place }); setOpenMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-800"><FolderPlus className="h-4 w-4" />Add to collection</button><button type="button" onClick={() => { setPlaceAction({ mode: "remove", place }); setOpenMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Remove from collection</button></div>}
              </div>
            ))}
            {!isLoading && visiblePlaces.length === 0 && <p className="p-6 text-sm text-slate-400">No saved places here yet.</p>}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Routes</h2>
          <p className="mt-1 text-sm text-slate-400">Saved A-to-B routes and journeys you have planned.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button type="button" onClick={() => setActiveRouteCollectionId("all")} className={`rounded-2xl border bg-slate-900/80 p-5 text-left transition ${activeRouteCollectionId === "all" ? "border-cyan-400" : "border-slate-800 hover:border-cyan-400/60"}`}><p className="text-sm font-medium text-cyan-300">All Routes</p><p className="mt-2 text-2xl font-bold">{trips.length}</p><p className="mt-1 text-sm text-slate-400">saved routes and journeys</p></button>
            {routeCollections.map((collection) => <article key={collection.id} className={`relative rounded-2xl border bg-slate-900/80 p-5 text-left transition ${activeRouteCollectionId === collection.id ? "border-cyan-400" : "border-slate-800 hover:border-cyan-400/60"}`}><button type="button" onClick={() => setActiveRouteCollectionId(collection.id)} className="block w-full pr-8 text-left"><p className="text-sm font-medium text-cyan-300">Route collection</p><h3 className="mt-2 line-clamp-1 text-lg font-semibold">{collection.title}</h3><p className="mt-1 text-sm text-slate-400">{collection.count} {collection.count === 1 ? "route" : "routes"}</p></button><button type="button" data-collection-menu aria-label={`Manage ${collection.title}`} onClick={() => setOpenMenu(openMenu === `route-collection-${collection.id}` ? null : `route-collection-${collection.id}`)} className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"><MoreHorizontal className="h-5 w-5" /></button>{openMenu === `route-collection-${collection.id}` && <div data-collection-menu className="absolute right-3 top-12 z-20 w-40 rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl"><button type="button" onClick={() => { setTitle(collection.title); setEditor({ mode: "rename-route", collection }); setOpenMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" />Rename</button><button type="button" onClick={() => { setRouteCollectionDeleteTarget(collection); setOpenMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>}</article>)}
          </div>
          {trips.length > 0 && <div className="mt-8"><div className="flex items-end justify-between gap-4"><div><h3 className="text-xl font-bold">{activeRouteCollectionId === "all" ? "All Routes" : routeCollections.find((collection) => collection.id === activeRouteCollectionId)?.title ?? "Route collection"}</h3><p className="mt-1 text-sm text-slate-400">{activeRouteCollectionId === "all" ? "Your planning corridors and saved routes." : "Routes saved in this collection."}</p></div><div className="flex gap-4">{activeRouteCollectionId !== "all" && <button type="button" onClick={() => setActiveRouteCollectionId("all")} className="text-sm text-slate-400 hover:text-cyan-200">Show all</button>}<Link href="/planner" className="text-sm text-cyan-300 hover:text-cyan-200">Plan another</Link></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{visibleTrips.map((trip) => <article key={`${trip.kind}-${trip.id}`} className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-cyan-400/60"><Link href={trip.href} className="block pr-10"><p className="text-sm font-medium text-cyan-300">{trip.kind === "plan" ? "Planned journey" : "Saved route"}</p><h3 className="mt-2 text-lg font-semibold">{trip.origin} <span className="text-cyan-300">→</span> {trip.destination}</h3><p className="mt-2 text-sm text-slate-400">{trip.stopCount} suggested stops{trip.kind === "plan" ? ` · ${trip.bufferKm} km buffer` : ""}</p></Link><button type="button" data-collection-menu aria-label={`Manage ${trip.origin} to ${trip.destination}`} onClick={() => setOpenMenu(openMenu === `route-${trip.kind}-${trip.id}` ? null : `route-${trip.kind}-${trip.id}`)} className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"><MoreHorizontal className="h-5 w-5" /></button>{openMenu === `route-${trip.kind}-${trip.id}` && <div data-collection-menu className="absolute right-3 top-12 z-30 w-48 rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl"><button type="button" onClick={() => { setRouteAction({ mode: "add", trip }); setOpenMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-800"><FolderPlus className="h-4 w-4" />Add to collection</button>{activeRouteCollectionId !== "all" && <button type="button" onClick={() => { setOpenMenu(null); void removeFromActiveRouteCollection(trip); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-amber-200 hover:bg-amber-400/10"><Trash2 className="h-4 w-4" />Remove from collection</button>}<button type="button" onClick={() => { setRouteDeleteTarget(trip); setOpenMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Delete route</button></div>}{trip.kind === "plan" && !trip.usesDeviceLocation && <ShareTripButton tripId={trip.id} title={`${trip.origin} to ${trip.destination}`} />}</article>)}{visibleTrips.length === 0 && <p className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">No routes have been added to this collection yet.</p>}</div></div>}
        </section>
      </section>

      {editor && <AppModal open={Boolean(editor)} onOpenChange={(open) => { if (!open) setEditor(null); }} ariaLabel={editor.mode === "create" ? "Create collection" : "Rename collection"}><form onSubmit={(event) => { event.preventDefault(); void saveEditor(); }}><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{editor.mode === "create" ? "Create collection" : "Rename collection"}</h2><button type="button" aria-label="Close" onClick={() => setEditor(null)}><X className="h-5 w-5 text-slate-400" /></button></div>{editor.mode === "create" && <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setCollectionKind("places")} className={`rounded-lg border px-3 py-2 text-sm ${collectionKind === "places" ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-slate-700"}`}>Places</button><button type="button" onClick={() => setCollectionKind("routes")} className={`rounded-lg border px-3 py-2 text-sm ${collectionKind === "routes" ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-slate-700"}`}>Routes</button></div>}<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={editor.mode === "rename-route" || collectionKind === "routes" ? "e.g. Weekend drives" : "e.g. Monsoon road trip"} className="mt-6 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-400" /><button className="mt-5 w-full rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">{editor.mode === "create" ? `Create ${collectionKind} collection` : "Save name"}</button></form></AppModal>}
      {placeAction && <AppModal open={Boolean(placeAction)} onOpenChange={(open) => { if (!open) setPlaceAction(null); }} ariaLabel={placeAction.mode === "add" ? "Add to collection" : "Remove from collection"}><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{placeAction.mode === "add" ? "Add to collection" : "Remove from collection"}</h2><p className="mt-1 text-sm text-slate-400">{placeAction.place.title}</p></div><button type="button" aria-label="Close" onClick={() => setPlaceAction(null)}><X className="h-5 w-5 text-slate-400" /></button></div><div className="mt-5 space-y-2">{availableCollections.map((collection) => <button key={collection.id} type="button" onClick={() => void updatePlaceCollection(collection)} className="flex w-full items-center justify-between rounded-xl border border-slate-700 px-4 py-3 text-left transition hover:border-cyan-400"><span>{collection.title}</span>{placeAction.mode === "add" && placeAction.place.collectionIds.includes(collection.id) && <span className="text-xs text-cyan-300">Already added</span>}</button>)}{availableCollections.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">{placeAction.mode === "add" ? "Create a collection first, then add this place to it." : "This place is not in any separate collection."}</p>}</div></AppModal>}
      {routeAction && <AppModal open={Boolean(routeAction)} onOpenChange={(open) => { if (!open) setRouteAction(null); }} ariaLabel={routeAction.mode === "add" ? "Add route to collection" : "Remove route from collection"}><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{routeAction.mode === "add" ? "Add to route collection" : "Remove from route collection"}</h2><p className="mt-1 text-sm text-slate-400">{routeAction.trip.origin} → {routeAction.trip.destination}</p></div><button type="button" aria-label="Close" onClick={() => setRouteAction(null)}><X className="h-5 w-5 text-slate-400" /></button></div><div className="mt-5 space-y-2">{availableRouteCollections.map((collection) => <button key={collection.id} type="button" onClick={() => void updateRouteCollection(collection)} className="flex w-full items-center justify-between rounded-xl border border-slate-700 px-4 py-3 text-left transition hover:border-cyan-400"><span>{collection.title}</span>{routeAction.mode === "add" && routeAction.trip.collectionIds.includes(collection.id) && <span className="text-xs text-cyan-300">Already added</span>}</button>)}{availableRouteCollections.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">{routeAction.mode === "add" ? "Create a route collection first, then add this route to it." : "This route is not in a separate route collection."}</p>}</div></AppModal>}
      {routeDeleteTarget && <AppModal open={Boolean(routeDeleteTarget)} onOpenChange={(open) => { if (!open) setRouteDeleteTarget(null); }} ariaLabel="Delete saved route" className="border-red-500/30"><h2 className="text-xl font-semibold text-red-200">Delete saved route?</h2><p className="mt-3 text-sm leading-6 text-slate-300">Delete <span className="font-medium text-white">{routeDeleteTarget.origin} → {routeDeleteTarget.destination}</span> from All Routes and every route collection? This cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setRouteDeleteTarget(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void executeRouteDeletion()} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white">Delete everywhere</button></div></AppModal>}
      {removalTarget && <AppModal open={Boolean(removalTarget)} onOpenChange={(open) => { if (!open) setRemovalTarget(null); }} ariaLabel="Remove saved place"><h2 className="text-xl font-semibold">Remove saved place?</h2><p className="mt-3 text-sm leading-6 text-slate-300">Remove <span className="font-medium text-white">{removalTarget.title}</span> from Saved places and every collection? You can add it again later.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setRemovalTarget(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900">Cancel</button><button type="button" onClick={() => void executePlaceRemoval()} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400">Remove everywhere</button></div></AppModal>}
      {collectionRemovalTarget && <AppModal open={Boolean(collectionRemovalTarget)} onOpenChange={(open) => { if (!open) setCollectionRemovalTarget(null); }} ariaLabel="Choose place removal"><h2 className="text-xl font-semibold">Remove {collectionRemovalTarget.place.title}?</h2><p className="mt-3 text-sm leading-6 text-slate-300">Choose whether to remove it only from <span className="font-medium text-white">{collectionRemovalTarget.collection.title}</span>, or from Saved places and every collection.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setCollectionRemovalTarget(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900">Cancel</button><button type="button" onClick={() => void executeCollectionPlaceRemoval()} className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-400/20">Remove from this collection</button><button type="button" onClick={() => { const place = collectionRemovalTarget.place; setCollectionRemovalTarget(null); setRemovalTarget(place); }} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400">Remove everywhere</button></div></AppModal>}
      {collectionDeleteTarget && <AppModal open={Boolean(collectionDeleteTarget)} onOpenChange={(open) => { if (!open) setCollectionDeleteTarget(null); }} ariaLabel="Delete collection" className="border-red-500/30"><h2 className="text-xl font-semibold text-red-200">Delete collection?</h2><p className="mt-3 text-sm leading-6 text-slate-300">Delete <span className="font-medium text-white">{collectionDeleteTarget.title}</span>? Its saved places will remain in Saved places and any other collections.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setCollectionDeleteTarget(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void executeCollectionDeletion()} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white">Delete collection</button></div></AppModal>}
      {routeCollectionDeleteTarget && <AppModal open={Boolean(routeCollectionDeleteTarget)} onOpenChange={(open) => { if (!open) setRouteCollectionDeleteTarget(null); }} ariaLabel="Delete route collection" className="border-red-500/30"><h2 className="text-xl font-semibold text-red-200">Delete route collection?</h2><p className="mt-3 text-sm leading-6 text-slate-300">Delete <span className="font-medium text-white">{routeCollectionDeleteTarget.title}</span>? Its saved routes and journeys will remain in All Routes and any other route collections.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setRouteCollectionDeleteTarget(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void executeRouteCollectionDeletion()} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white">Delete collection</button></div></AppModal>}
      <Footer />
    </main>
  );
}
