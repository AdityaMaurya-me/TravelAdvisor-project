"use client";

import { useEffect, useState } from "react";
import { Check, FolderPlus, Star, X } from "lucide-react";

import { addTripPlanToRouteCollection, createRouteCollection } from "@/app/actions/collections";
import { getSavedTripPlan, saveTripPlan } from "@/app/actions/trip-plans";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { AppModal } from "@/components/ui/app-modal";
import { supabase } from "@/lib/supabase";

type Point = { id: string; slug: string; name: string; locationLabel: string; latitude: number; longitude: number } | null;
type Stop = { id: string; slug: string; title: string };
type Collection = { id: string; title: string };

export function SaveRouteButton({ origin, destination, stops }: { origin: Point; destination: Point; stops: Stop[] }) {
  const { requireAuth } = useAuthModal();
  const [tripPlanId, setTripPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [message, setMessage] = useState("");

  const hasRouteEndpoints = Boolean(origin && destination && origin.id !== destination.id);
  const isVerifiedPair = Boolean(origin && destination && !origin.id.startsWith("current-") && !origin.id.startsWith("google-"));

  const loadCollections = async () => {
    const { data, error } = await (supabase as any).from("route_collections").select("id, title").order("created_at");
    if (error) throw error;
    setCollections(data ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    setTripPlanId(null);
    setMessage("");
    if (!isVerifiedPair || !origin || !destination) return;
    void getSavedTripPlan(origin.id, destination.id)
      .then((id) => { if (!cancelled) setTripPlanId(id); })
      .catch(() => { if (!cancelled) setTripPlanId(null); });
    return () => { cancelled = true; };
  }, [destination?.id, isVerifiedPair, origin?.id]);

  const openCollectionModal = async () => {
    try {
      await loadCollections();
      setMessage("");
      setCollectionModalOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load route collections.");
    }
  };

  const completeSave = async () => {
    if (!origin || !destination || saving || !hasRouteEndpoints) return;
    setSaving(true);
    setMessage("");
    try {
      const id = tripPlanId ?? await saveTripPlan({
        origin,
        destination,
        bufferKm: 5,
        stops: stops.map((stop) => ({ id: stop.id, slug: stop.slug, name: stop.title })),
      });
      setTripPlanId(id);
      await openCollectionModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this route.");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!hasRouteEndpoints) return;
    if (!await requireAuth(completeSave)) return;
    await completeSave();
  };

  const addToCollection = async () => {
    if (!tripPlanId || !selectedCollectionId) return;
    setSaving(true);
    try {
      await addTripPlanToRouteCollection(selectedCollectionId, tripPlanId);
      setMessage("Route added to the selected collection.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add this route to the collection.");
    } finally {
      setSaving(false);
    }
  };

  const createAndAdd = async () => {
    if (!tripPlanId || !newCollectionTitle.trim()) return;
    setSaving(true);
    try {
      const collection = await createRouteCollection(newCollectionTitle.trim());
      await addTripPlanToRouteCollection(collection.id, tripPlanId);
      setCollections((items) => [...items, collection]);
      setSelectedCollectionId(collection.id);
      setNewCollectionTitle("");
      setMessage(`Created ${collection.title} and added this route.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create this collection.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <button type="button" onClick={() => void save()} disabled={!hasRouteEndpoints || saving} title={!hasRouteEndpoints ? "Choose two different points to save this route." : undefined} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium transition hover:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50">
      {tripPlanId ? <Check className="h-4 w-4 text-cyan-300" /> : <Star className="h-4 w-4" />}
      {saving ? "Saving..." : tripPlanId ? "Route saved" : "Save route"}
    </button>
    {message && !collectionModalOpen && <p role="status" className="absolute right-0 top-full mt-2 max-w-xs text-xs text-amber-200">{message}</p>}
    <AppModal open={collectionModalOpen} onOpenChange={setCollectionModalOpen} ariaLabel="Save route to a collection">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-cyan-300">Route saved</p><h2 className="mt-1 text-xl font-semibold">Add it to a route collection</h2><p className="mt-2 text-sm text-slate-400">Keep this A-to-B journey in an existing collection or create a new one.</p></div><button type="button" onClick={() => setCollectionModalOpen(false)} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button></div>
      <div className="mt-6 flex gap-2"><select value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"><option value="">Choose an existing collection</option>{collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.title}</option>)}</select><button type="button" onClick={() => void addToCollection()} disabled={!selectedCollectionId || saving} className="rounded-lg border border-cyan-400/50 px-3 py-2 text-sm text-cyan-100 disabled:opacity-50">Add</button></div>
      <div className="mt-3 flex gap-2"><input value={newCollectionTitle} onChange={(event) => setNewCollectionTitle(event.target.value)} placeholder="New route collection name" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" /><button type="button" onClick={() => void createAndAdd()} disabled={!newCollectionTitle.trim() || saving} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"><FolderPlus className="h-4 w-4" />Create</button></div>
      {message && <p role="status" className="mt-4 rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}
    </AppModal>
  </>;
}
