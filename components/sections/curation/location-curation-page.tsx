"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
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
type GoogleMatch = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  primaryType: string | null;
};
type ImageStatus = "not_provided" | "pending" | "approved" | "rejected";
type Candidate = {
  id: string;
  created_by: string;
  name: string;
  source: string;
  status: string;
  created_at: string;
  proposed_categories: string[];
  destination_id: string | null;
  source_url: string | null;
  source_reference: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  image_url: string | null;
  image_attribution: string | null;
  review_notes: string | null;
  opening_hours: string | null;
  entry_fee: string | null;
  website_url: string | null;
  phone: string | null;
  has_parking: boolean | null;
  has_washroom: boolean | null;
  is_pet_friendly: boolean | null;
  has_ev_charging: boolean | null;
  typical_visit_minutes: number | null;
  canonical_google_place_id: string | null;
  canonical_google_name: string | null;
  canonical_google_address: string | null;
  image_verification_status: ImageStatus;
  image_verification_notes: string | null;
  destination: { name: string } | null;
};

const emptyForm = {
  name: "",
  destinationId: "",
  source: "openstreetmap",
  sourceUrl: "",
  sourceReference: "",
  latitude: "",
  longitude: "",
  categories: "",
  description: "",
  imageUrl: "",
  imageAttribution: "",
  googlePlaceId: "",
  googlePlaceName: "",
  googlePlaceAddress: "",
  openingHours: "",
  entryFee: "",
  websiteUrl: "",
  phone: "",
  hasParking: false,
  hasWashroom: false,
  hasEvCharging: false,
  isPetFriendly: false,
  typicalVisitMinutes: "",
};
const inputClass =
  "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-cyan-400";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [googleQuery, setGoogleQuery] = useState("");
  const [googleMatches, setGoogleMatches] = useState<GoogleMatch[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [
      { data: userResult },
      { data: cities },
      { data: role },
      { data: drafts, error },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("places")
        .select("id,name,slug")
        .eq("level", "city")
        .eq("is_published", true)
        .order("name"),
      (supabase as any).from("curator_roles").select("role").maybeSingle(),
      (supabase as any)
        .from("location_candidates")
        .select(
          "id,created_by,name,source,status,created_at,proposed_categories,destination_id,source_url,source_reference,latitude,longitude,description,image_url,image_attribution,review_notes,opening_hours,entry_fee,website_url,phone,has_parking,has_washroom,is_pet_friendly,has_ev_charging,typical_visit_minutes,canonical_google_place_id,canonical_google_name,canonical_google_address,image_verification_status,image_verification_notes,destination:places!location_candidates_destination_id_fkey(name)",
        )
        .order("created_at", { ascending: false }),
    ]);
    setUserId(userResult.user?.id ?? null);
    setIsCurator(Boolean(role?.role));
    setIsAdmin(role?.role === "admin");
    setDestinations((cities ?? []) as Destination[]);
    if (error) setMessage(error.message);
    else setCandidates((drafts ?? []) as Candidate[]);
  };

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const requestId = searchParams.get("request");
    if (
      requestId &&
      candidates.some((candidate) => candidate.id === requestId)
    ) {
      window.setTimeout(
        () =>
          document
            .getElementById(`candidate-${requestId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        0,
      );
    }
  }, [candidates, searchParams]);

  const searchGoogleMatch = async () => {
    const query = googleQuery.trim() || form.name.trim();
    if (query.length < 3) {
      setMessage(
        "Enter at least three characters to find the Google Maps place.",
      );
      return;
    }
    setIsSearchingGoogle(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/places/verify?q=${encodeURIComponent(query)}`,
      );
      const result = (await response.json()) as {
        places?: GoogleMatch[];
        error?: string;
        unavailable?: boolean;
      };
      if (!response.ok)
        throw new Error(
          result.error ?? "Could not search Google Maps right now.",
        );
      setGoogleMatches(result.places ?? []);
      if (result.unavailable)
        setMessage(
          "Google verification is currently unavailable. You can still submit evidence for manual review.",
        );
      else if (!(result.places ?? []).length)
        setMessage(
          "No matching Google Maps place found. Check the spelling or submit this for manual review.",
        );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not search Google Maps right now.",
      );
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  const selectGoogleMatch = (match: GoogleMatch) => {
    setForm((current) => ({
      ...current,
      name: match.name,
      latitude: String(match.latitude),
      longitude: String(match.longitude),
      googlePlaceId: match.id,
      googlePlaceName: match.name,
      googlePlaceAddress: match.address,
    }));
    setGoogleQuery("");
    setGoogleMatches([]);
    setMessage(
      "Google Maps match attached. Name and coordinates were filled from the selected location.",
    );
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    if (!form.googlePlaceId) {
      setMessage(
        "Match the exact Google Maps place before uploading a photo. This prevents attaching an image to the wrong location.",
      );
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("Use a JPG, PNG, or WebP image under 5 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width;
      const height = bitmap.height;
      const pixels = width * height;
      bitmap.close();
      if (width < 600 || height < 400 || pixels > 24_000_000) {
        setMessage(
          "Use a clear image at least 600 × 400 pixels and below 24 megapixels.",
        );
        return;
      }
    } catch {
      setMessage(
        "This image could not be inspected. Choose another JPG, PNG, or WebP file.",
      );
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setIsUploadingImage(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in before uploading an image.");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await supabase.storage
        .from("place-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("place-images").getPublicUrl(path);
      setForm((current) => ({ ...current, imageUrl: data.publicUrl }));
      URL.revokeObjectURL(localPreview);
      setImagePreview("");
      setMessage(
        "Photo uploaded as pending review. It cannot become a public cover until a reviewer approves it.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not upload that photo.",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(await requireAuth(() => void submit(event)))) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setIsSaving(true);
    setMessage("");
    const { error } = await (supabase as any)
      .from("location_candidates")
      .insert({
        created_by: user.id,
        destination_id: form.destinationId || null,
        name: form.name.trim(),
        source: form.source,
        source_url: form.sourceUrl.trim() || null,
        source_reference: form.sourceReference.trim() || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        proposed_categories: form.categories
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
        description: form.description.trim(),
        image_url: form.imageUrl || null,
        image_attribution: form.imageAttribution.trim() || null,
        canonical_google_place_id: form.googlePlaceId || null,
        canonical_google_name: form.googlePlaceName || null,
        canonical_google_address: form.googlePlaceAddress || null,
        opening_hours: form.openingHours.trim() || null,
        entry_fee: form.entryFee.trim() || null,
        website_url: form.websiteUrl.trim() || null,
        phone: form.phone.trim() || null,
        has_parking: form.hasParking,
        has_washroom: form.hasWashroom,
        is_pet_friendly: form.isPetFriendly,
        has_ev_charging: form.hasEvCharging,
        typical_visit_minutes: form.typicalVisitMinutes
          ? Number(form.typicalVisitMinutes)
          : null,
      });
    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setForm(emptyForm);
    setImagePreview("");
    setMessage(
      isCurator
        ? "Candidate saved to the curator queue."
        : "Thanks — your location request is waiting for review.",
    );
    await load();
  };

  const queueTitle = isCurator ? "Review queue" : "Your requests";
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-cyan-300">
          {isCurator ? "Curator workspace" : "Community contribution"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-bold">Suggest a location</h1>
          {isCurator && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Curator access
            </span>
          )}
        </div>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Google Maps can anchor a request to an exact real-world place.
          Uploaded photos are held for factual review before they can appear
          publicly.
        </p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-semibold">
                {isCurator
                  ? "Add a location candidate"
                  : "Submit a location request"}
              </h2>
            </div>
            <div className="mt-5 rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-4">
              <div className="flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-cyan-300" />
                <p className="text-sm font-semibold">
                  Google Maps factual match
                </p>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Required before photo upload. It supplies the exact name,
                address, and map point for review.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={googleQuery}
                  onChange={(event) => setGoogleQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchGoogleMatch();
                    }
                  }}
                  placeholder={
                    form.name ? `Search ${form.name}` : "Search a place name"
                  }
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => void searchGoogleMatch()}
                  disabled={isSearchingGoogle}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-200 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  {isSearchingGoogle ? "Searching…" : "Match"}
                </button>
              </div>
              {form.googlePlaceId && (
                <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                  Matched: {form.googlePlaceName}{" "}
                  <span className="text-emerald-200/70">
                    · {form.googlePlaceAddress}
                  </span>
                </p>
              )}
              {googleMatches.length > 0 && (
                <div className="mt-3 max-h-52 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-1">
                  {googleMatches.map((match) => (
                    <button
                      type="button"
                      key={match.id}
                      onClick={() => selectGoogleMatch(match)}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="block font-medium">{match.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {match.address ||
                          match.primaryType ||
                          "Google Maps location"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Place name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Destination
                <select
                  value={form.destinationId}
                  onChange={(e) =>
                    setForm({ ...form, destinationId: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Choose later</option>
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Source
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className={inputClass}
                >
                  <option value="openstreetmap">OpenStreetMap</option>
                  <option value="wikidata">Wikidata</option>
                  <option value="field_research">Field research</option>
                  <option value="manual">Manual research</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Categories
                <input
                  required
                  value={form.categories}
                  onChange={(e) =>
                    setForm({ ...form, categories: e.target.value })
                  }
                  placeholder="waterfalls, viewpoints"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Latitude
                <input
                  required
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Longitude
                <input
                  required
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Source URL
                <input
                  type="url"
                  value={form.sourceUrl}
                  onChange={(e) =>
                    setForm({ ...form, sourceUrl: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Source reference
                <input
                  required={!form.sourceUrl.trim()}
                  value={form.sourceReference}
                  onChange={(e) =>
                    setForm({ ...form, sourceReference: e.target.value })
                  }
                  placeholder="OSM node ID, field note, or citation"
                  className={inputClass}
                />
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium">
              Description / verification notes
              <textarea
                required
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={`${inputClass} min-h-24`}
              />
            </label>
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ImagePlus className="h-4 w-4 text-cyan-300" />
                Upload a place photo{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, or WebP · under 5 MB · matching Google place required
                · held for review.
              </p>
              <input
                ref={photoInputRef}
                id="location-photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  void uploadImage(e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
                className="sr-only"
              />
              <label
                htmlFor="location-photo-upload"
                className="mt-3 inline-flex cursor-pointer rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/10"
              >
                {isUploadingImage ? "Uploading…" : "Choose photo"}
              </label>
              {(imagePreview || form.imageUrl) && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/70 bg-background p-2">
                  <img
                    src={imagePreview || form.imageUrl}
                    alt="Selected location preview"
                    className="h-20 w-28 rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {isUploadingImage ? "Uploading selected photo…" : "Photo ready for factual review."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview("");
                        setForm((current) => ({ ...current, imageUrl: "" }));
                        if (photoInputRef.current) photoInputRef.current.value = "";
                      }}
                      className="mt-1 text-xs text-red-300 hover:text-red-200"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              )}
              <input
                value={form.imageAttribution}
                onChange={(e) =>
                  setForm({ ...form, imageAttribution: e.target.value })
                }
                placeholder="Creator and licence"
                className={inputClass}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Opening hours
                <input
                  value={form.openingHours}
                  onChange={(e) =>
                    setForm({ ...form, openingHours: e.target.value })
                  }
                  placeholder="Daily, 8 AM – 6 PM"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Entry fee
                <input
                  value={form.entryFee}
                  onChange={(e) =>
                    setForm({ ...form, entryFee: e.target.value })
                  }
                  placeholder="Free or ₹50 per person"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Website
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) =>
                    setForm({ ...form, websiteUrl: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Typical visit time (minutes)
                <input
                  type="number"
                  min="5"
                  max="1440"
                  inputMode="numeric"
                  value={form.typicalVisitMinutes}
                  onChange={(e) =>
                    setForm({ ...form, typicalVisitMinutes: e.target.value })
                  }
                  placeholder="45"
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label>
                <input
                  type="checkbox"
                  checked={form.hasParking}
                  onChange={(e) =>
                    setForm({ ...form, hasParking: e.target.checked })
                  }
                />{" "}
                Parking
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.hasWashroom}
                  onChange={(e) =>
                    setForm({ ...form, hasWashroom: e.target.checked })
                  }
                />{" "}
                Washroom
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.hasEvCharging}
                  onChange={(e) =>
                    setForm({ ...form, hasEvCharging: e.target.checked })
                  }
                />{" "}
                EV charging
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.isPetFriendly}
                  onChange={(e) =>
                    setForm({ ...form, isPetFriendly: e.target.checked })
                  }
                />{" "}
                Pet friendly
              </label>
            </div>
            {message && (
              <p className="mt-4 rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">
                {message}
              </p>
            )}
            <button
              disabled={isSaving}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSaving
                ? "Submitting…"
                : isCurator
                  ? "Save to review queue"
                  : "Submit for review"}
            </button>
          </form>
          <aside className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{queueTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isCurator
                    ? "Review requests and factual evidence before publication."
                    : "Only you and the review team can see these requests."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                aria-label="Refresh requests"
                className="rounded-lg p-2 text-cyan-300 hover:bg-cyan-400/10"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {candidates.map((candidate) => (
                <article
                  id={`candidate-${candidate.id}`}
                  key={candidate.id}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{candidate.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {candidate.destination?.name ??
                          "Unassigned destination"}{" "}
                        · {candidate.source}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-200">
                      {candidate.status}
                    </span>
                  </div>
                  {candidate.canonical_google_place_id && (
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-300">
                      <MapPinned className="h-3.5 w-3.5" />
                      Google Maps match: {candidate.canonical_google_name}
                    </p>
                  )}
                  {candidate.image_url && (
                    <div className="mt-3 flex gap-3 rounded-lg border border-border/70 p-2">
                      <img
                        src={candidate.image_url}
                        alt={`Submitted for ${candidate.name}`}
                        className="h-16 w-20 rounded-md object-cover"
                      />
                      <p className="text-xs leading-5 text-muted-foreground">
                        Photo:{" "}
                        <span
                          className={
                            candidate.image_verification_status === "approved"
                              ? "text-emerald-300"
                              : candidate.image_verification_status ===
                                  "rejected"
                                ? "text-red-300"
                                : "text-amber-200"
                          }
                        >
                          {candidate.image_verification_status.replace(
                            "_",
                            " ",
                          )}
                        </span>
                        {candidate.image_verification_notes
                          ? ` · ${candidate.image_verification_notes}`
                          : ""}
                      </p>
                    </div>
                  )}
                  {isCurator && candidate.created_by !== userId && (
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400">
                      <UserRound className="h-3.5 w-3.5" />
                      Community request
                    </p>
                  )}
                  {candidate.proposed_categories.length > 0 && (
                    <p className="mt-3 text-xs text-cyan-200">
                      {candidate.proposed_categories.join(" · ")}
                    </p>
                  )}
                  {candidate.status === "rejected" &&
                    candidate.review_notes && (
                      <p className="mt-3 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-100">
                        <span className="font-medium">Reviewer reason: </span>
                        {candidate.review_notes}
                      </p>
                    )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {isCurator && (
                      <LocationPublishButton
                        candidateId={candidate.id}
                        candidateName={candidate.name}
                        status={candidate.status}
                        onPublished={load}
                      />
                    )}
                    {isCurator && (
                      <LocationRejectButton
                        candidateId={candidate.id}
                        candidateName={candidate.name}
                        status={candidate.status}
                        onRejected={load}
                      />
                    )}
                    {(candidate.created_by === userId || isAdmin) && (
                      <LocationDraftDeleteButton
                        candidateId={candidate.id}
                        candidateName={candidate.name}
                        status={candidate.status}
                        onDeleted={load}
                      />
                    )}
                    {candidate.created_by === userId && (
                      <LocationRequestEditButton
                        candidate={candidate}
                        destinations={destinations}
                        onResubmitted={load}
                      />
                    )}
                  </div>
                </article>
              ))}
              {candidates.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  No requests yet. Add one after checking its source and
                  licence.
                </p>
              )}
            </div>
            <Link
              href="https://overpass-turbo.eu/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100"
            >
              Find candidates in Overpass Turbo{" "}
              <ExternalLink className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  );
}
