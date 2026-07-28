"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Plus, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { LocationDraftDeleteButton } from "@/components/sections/curation/location-draft-delete-button";
import { LocationPublishButton } from "@/components/sections/curation/location-publish-button";
import { LocationRejectButton } from "@/components/sections/curation/location-reject-button";
import { LocationRequestEditButton } from "@/components/sections/curation/location-request-edit-button";
import { supabase } from "@/lib/supabase";

type Destination = { id: string; name: string; slug: string };
type Candidate = {
  id: string; created_by: string; name: string; source: string; status: string; created_at: string;
  proposed_categories: string[]; destination_id: string | null; source_url: string | null; source_reference: string | null;
  latitude: number | null; longitude: number | null; description: string | null; image_url: string | null;
  image_attribution: string | null; review_notes: string | null; opening_hours: string | null; entry_fee: string | null;
  website_url: string | null; phone: string | null; has_parking: boolean | null; has_washroom: boolean | null;
  is_pet_friendly: boolean | null; has_ev_charging: boolean | null; typical_visit_minutes: number | null;
  destination: { name: string } | null;
};

const emptyForm = {
  name: "", destinationId: "", source: "openstreetmap", sourceUrl: "", sourceReference: "", latitude: "", longitude: "",
  categories: "", description: "", imageUrl: "", imageAttribution: "", openingHours: "", entryFee: "", websiteUrl: "", phone: "",
  hasParking: false, hasWashroom: false, hasEvCharging: false, isPetFriendly: false, typicalVisitMinutes: "",
};
const inputClass = "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-cyan-400";

export function LocationCurationPage() {
  const { requireAuth } = useAuthModal();
  const searchParams = useSearchParams();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCurator, setIsCurator] = useState(false);

  const load = async () => {
    const [{ data: userResult }, { data: cities }, { data: role }, { data: drafts, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("places").select("id, name, slug").eq("level", "city").eq("is_published", true).order("name"),
      (supabase as any).from("curator_roles").select("role").maybeSingle(),
      (supabase as any).from("location_candidates").select("id, created_by, name, source, status, created_at, proposed_categories, destination_id, source_url, source_reference, latitude, longitude, description, image_url, image_attribution, review_notes, opening_hours, entry_fee, website_url, phone, has_parking, has_washroom, is_pet_friendly, has_ev_charging, typical_visit_minutes, destination:places!location_candidates_destination_id_fkey(name)").order("created_at", { ascending: false }),
    ]);
    setUserId(userResult.user?.id ?? null);
    setIsCurator(Boolean(role?.role));
    setDestinations((cities ?? []) as Destination[]);
    if (error) setMessage(error.message); else setCandidates((drafts ?? []) as Candidate[]);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const requestId = searchParams.get("request");
    if (!requestId || !candidates.some((candidate) => candidate.id === requestId)) return;
    window.setTimeout(() => document.getElementById(`candidate-${requestId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }, [candidates, searchParams]);

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Please sign in before uploading an image."); return; }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("place-images").upload(path, file);
    if (error) { setMessage(error.message); return; }
    const { data } = supabase.storage.from("place-images").getPublicUrl(path);
    setForm((value) => ({ ...value, imageUrl: data.publicUrl }));
    setMessage("Photo uploaded. It will be reviewed with this request.");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!await requireAuth(() => submit(event))) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setIsSaving(true); setMessage("");
    const { error } = await (supabase as any).from("location_candidates").insert({
      created_by: user.id, destination_id: form.destinationId || null, name: form.name.trim(), source: form.source,
      source_url: form.sourceUrl.trim() || null, source_reference: form.sourceReference.trim() || null,
      latitude: Number(form.latitude), longitude: Number(form.longitude), proposed_categories: form.categories.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
      description: form.description.trim(), image_url: form.imageUrl || null, image_attribution: form.imageAttribution.trim() || null,
      opening_hours: form.openingHours.trim() || null, entry_fee: form.entryFee.trim() || null, website_url: form.websiteUrl.trim() || null, phone: form.phone.trim() || null,
      has_parking: form.hasParking, has_washroom: form.hasWashroom, is_pet_friendly: form.isPetFriendly,
      has_ev_charging: form.hasEvCharging, typical_visit_minutes: form.typicalVisitMinutes ? Number(form.typicalVisitMinutes) : null,
    });
    setIsSaving(false);
    if (error) { setMessage(error.message); return; }
    setForm(emptyForm); setMessage(isCurator ? "Candidate saved to the curator queue." : "Thanks — your location request is waiting for review.");
    await load();
  };

  const queueTitle = isCurator ? "Review queue" : "Your requests";
  const queueDescription = isCurator ? "Community and personal location requests awaiting your review." : "Only you and the review team can see these requests.";
  return <main className="min-h-screen bg-background"><Navbar /><section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8"><p className="text-sm font-medium text-cyan-300">{isCurator ? "Curator workspace" : "Community contribution"}</p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-4xl font-bold">Suggest a location</h1>{isCurator && <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200"><ShieldCheck className="h-3.5 w-3.5" />Curator access</span>}</div><p className="mt-3 max-w-3xl text-muted-foreground">Suggest a place with enough evidence for a reviewer to verify it. Requests remain private until an assigned curator approves and publishes them.</p><div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-2"><Plus className="h-5 w-5 text-cyan-300" /><h2 className="text-xl font-semibold">{isCurator ? "Add a location candidate" : "Submit a location request"}</h2></div><p className="mt-2 text-sm text-muted-foreground">Planning details are optional, but only enter facts you can verify.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Place name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Destination<select value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })} className={inputClass}><option value="">Choose later</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></label><label className="text-sm font-medium">Source<select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={inputClass}><option value="openstreetmap">OpenStreetMap</option><option value="wikidata">Wikidata</option><option value="field_research">Field research</option><option value="manual">Manual research</option></select></label><label className="text-sm font-medium">Categories<input required value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} placeholder="waterfalls, viewpoints" className={inputClass} /></label><label className="text-sm font-medium">Latitude<input required inputMode="decimal" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Longitude<input required inputMode="decimal" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className={inputClass} /></label></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Source URL<input type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://www.openstreetmap.org/..." className={inputClass} /></label><label className="text-sm font-medium">Source reference<input required={!form.sourceUrl.trim()} value={form.sourceReference} onChange={(e) => setForm({ ...form, sourceReference: e.target.value })} placeholder="OSM node ID, field note, or citation" className={inputClass} /></label></div><label className="mt-4 block text-sm font-medium">Description / verification notes<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} min-h-24`} /></label><div className="mt-4"><p className="text-sm font-medium">Upload a photo <span className="font-normal text-muted-foreground">(optional)</span></p><input id="location-photo-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void uploadImage(e.target.files?.[0])} className="sr-only" /><label htmlFor="location-photo-upload" className="mt-2 inline-flex cursor-pointer rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/10">Choose photo</label>{form.imageUrl && <p className="mt-2 text-xs text-emerald-300">Photo ready for review.</p>}<input value={form.imageAttribution} onChange={(e) => setForm({ ...form, imageAttribution: e.target.value })} placeholder="Creator and licence" className={inputClass} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Opening hours<input value={form.openingHours} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} placeholder="Daily, 8 AM – 6 PM" className={inputClass} /></label><label className="text-sm font-medium">Entry fee<input value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} placeholder="Free or ₹50 per person" className={inputClass} /></label><label className="text-sm font-medium">Website<input type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Typical visit time (minutes)<input type="number" min="5" max="1440" inputMode="numeric" value={form.typicalVisitMinutes} onChange={(e) => setForm({ ...form, typicalVisitMinutes: e.target.value })} placeholder="45" className={inputClass} /></label></div><div className="mt-4 flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={form.hasParking} onChange={(e) => setForm({ ...form, hasParking: e.target.checked })} /> Parking</label><label><input type="checkbox" checked={form.hasWashroom} onChange={(e) => setForm({ ...form, hasWashroom: e.target.checked })} /> Washroom</label><label><input type="checkbox" checked={form.hasEvCharging} onChange={(e) => setForm({ ...form, hasEvCharging: e.target.checked })} /> EV charging</label><label><input type="checkbox" checked={form.isPetFriendly} onChange={(e) => setForm({ ...form, isPetFriendly: e.target.checked })} /> Pet friendly</label></div>{message && <p className="mt-4 rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}<button disabled={isSaving} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />{isSaving ? "Submitting…" : isCurator ? "Save to review queue" : "Submit for review"}</button></form><aside className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">{queueTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{queueDescription}</p></div><button type="button" onClick={() => void load()} aria-label="Refresh requests" className="rounded-lg p-2 text-cyan-300 hover:bg-cyan-400/10"><RefreshCw className="h-4 w-4" /></button></div><div className="mt-5 space-y-3">{candidates.map((candidate) => <article id={`candidate-${candidate.id}`} key={candidate.id} className="rounded-xl border border-border/70 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{candidate.name}</h3><p className="mt-1 text-sm text-muted-foreground">{candidate.destination?.name ?? "Unassigned destination"} · {candidate.source}</p></div><span className="rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-200">{candidate.status}</span></div>{isCurator && candidate.created_by !== userId && <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400"><UserRound className="h-3.5 w-3.5" />Community request</p>}{candidate.proposed_categories.length > 0 && <p className="mt-3 text-xs text-cyan-200">{candidate.proposed_categories.join(" · ")}</p>}{candidate.status === "rejected" && candidate.review_notes && <p className="mt-3 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-100"><span className="font-medium">Reviewer reason: </span>{candidate.review_notes}</p>}<div className="mt-1 flex flex-wrap items-center gap-2">{isCurator && <LocationPublishButton candidateId={candidate.id} candidateName={candidate.name} status={candidate.status} onPublished={load} />}{isCurator && <LocationRejectButton candidateId={candidate.id} candidateName={candidate.name} status={candidate.status} onRejected={load} />}{candidate.created_by === userId && <LocationDraftDeleteButton candidateId={candidate.id} candidateName={candidate.name} status={candidate.status} onDeleted={load} />}{candidate.created_by === userId && <LocationRequestEditButton candidate={candidate} destinations={destinations} onResubmitted={load} />}</div></article>)}{candidates.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No requests yet. Add one after checking its source and licence.</p>}</div><Link href="https://overpass-turbo.eu/" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100">Find candidates in Overpass Turbo <ExternalLink className="h-4 w-4" /></Link></aside></div></section><Footer /></main>;
}
