"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, ImagePlus, MapPinned, Star, Trash2 } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { supabase } from "@/lib/supabase";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const times = Array.from(
  { length: 48 },
  (_, i) =>
    `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);
type Hours = Record<string, { closed: boolean; open: string; close: string }>;
type GalleryImage = { id: string; url: string; alt_text: string | null; sort_order: number | null };
const MAX_GALLERY_IMAGES = 12;
const emptyHours = (): Hours =>
  Object.fromEntries(
    days.map((day) => [day, { closed: false, open: "09:00", close: "18:00" }]),
  );

export function LocationEditor() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<Hours>(emptyHours());
  const [feeMode, setFeeMode] = useState<"free" | "range">("free");
  const [feeFrom, setFeeFrom] = useState("");
  const [feeTo, setFeeTo] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverImageFailed, setCoverImageFailed] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  useEffect(() => {
    void (async () => {
      const { data: role } = await supabase
        .from("curator_roles")
        .select("role")
        .maybeSingle();
      const ok = role?.role === "admin";
      setAllowed(ok);
      if (!ok) return;
      const { data, error } = await supabase
        .from("places")
        .select(
          "id,name,description,cover_image,opening_hours,entry_fee,website_url,phone,source_url,source_reference,parent_id,google_place_id,has_parking,has_washroom,has_ev_charging,is_pet_friendly,typical_visit_minutes",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) {
        setMessage(error?.message ?? "Location not found.");
        return;
      }
      setForm(
        Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            String(value ?? ""),
          ]),
        ),
      );
      setCoverImageFailed(false);
      const parsed = (() => {
        try {
          return JSON.parse(data.opening_hours ?? "");
        } catch {
          return null;
        }
      })();
      if (parsed && typeof parsed === "object")
        setHours({ ...emptyHours(), ...parsed });
      const [{ data: ds }, { data: cs }, { data: mappings }, { data: galleryImages, error: galleryError }] =
        await Promise.all([
          supabase
            .from("places")
            .select("id,name")
            .eq("level", "city")
            .eq("is_published", true),
          supabase.from("categories").select("id,name"),
          supabase
            .from("place_categories")
            .select("category_id")
            .eq("place_id", data.id),
          supabase
            .from("place_images")
            .select("id,url,alt_text,sort_order")
            .eq("place_id", data.id)
            .order("sort_order"),
        ]);
      setDestinations(ds ?? []);
      setCategories(cs ?? []);
      setSelectedCategories((mappings ?? []).map((m: any) => m.category_id));
      if (galleryError) setMessage(galleryError.message);
      else setGallery((galleryImages ?? []) as GalleryImage[]);
      if (data.entry_fee && data.entry_fee.toLowerCase() !== "free") {
        const values = data.entry_fee.match(/\d+/g) ?? [];
        setFeeMode("range");
        setFeeFrom(values[0] ?? "");
        setFeeTo(values[1] ?? values[0] ?? "");
      }
    })();
  }, [slug]);
  const upload = async (files?: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    if (!form.id || !form.name) { setMessage("Wait for the location details to load before uploading images."); return; }
    const availableSlots = MAX_GALLERY_IMAGES - gallery.length;
    if (availableSlots <= 0) { setMessage(`A location can have up to ${MAX_GALLERY_IMAGES} gallery photos. Remove one before uploading another.`); return; }
    if (selected.length > availableSlots) { setMessage(`You can add ${availableSlots} more photo${availableSlots === 1 ? "" : "s"} to this location gallery.`); return; }
    const invalid = selected.find((file) => !file.type.match(/^image\/(png|jpeg|webp)$/) || file.size > 5 * 1024 * 1024);
    if (invalid) { setMessage("Every image must be PNG, JPEG, or WebP and under 5 MB."); return; }

    const preview = URL.createObjectURL(selected[0]);
    setCoverPreview(preview);
    setCoverImageFailed(false);
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in before uploading an image.");
      const uploads: GalleryImage[] = [];
      for (const [index, file] of selected.entries()) {
        const path = `${user.id}/admin-${Date.now()}-${index}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("place-images").upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("place-images").getPublicUrl(path);
        const { data: galleryRow, error: galleryError } = await supabase
          .from("place_images")
          .insert({ place_id: form.id, url: data.publicUrl, alt_text: form.name, sort_order: gallery.length + index })
          .select("id,url,alt_text,sort_order")
          .single();
        if (galleryError || !galleryRow) throw galleryError ?? new Error("The uploaded photo could not be added to the gallery.");
        uploads.push(galleryRow as GalleryImage);
      }
      setGallery((current) => [...current, ...uploads]);
      if (!form.cover_image) {
        setForm((current) => ({ ...current, cover_image: uploads[0].url }));
        setMessage(`${uploads.length} gallery photo${uploads.length === 1 ? "" : "s"} added. The first is now the cover—choose a different one below if needed, then save.`);
      } else {
        setMessage(`${uploads.length} gallery photo${uploads.length === 1 ? "" : "s"} added. Choose one as the fixed card and banner cover, then save.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not upload those photos.");
    } finally {
      URL.revokeObjectURL(preview);
      setCoverPreview("");
      setUploading(false);
    }
  };

  const setCover = (url: string) => {
    setCoverImageFailed(false);
    setForm((current) => ({ ...current, cover_image: url }));
    setMessage("Cover selected. Save changes to use it across cards and destination banners.");
  };

  const removeGalleryImage = async (image: GalleryImage) => {
    if (image.url === form.cover_image) { setMessage("Choose another cover before removing this image from the gallery."); return; }
    const { error } = await supabase.from("place_images").delete().eq("id", image.id);
    if (error) { setMessage(error.message); return; }
    setGallery((current) => current.filter((entry) => entry.id !== image.id));
    setMessage("Image removed from this location gallery.");
  };
  const save = async () => {
    const payload = {
      ...form,
      parent_id: form.parent_id || null,
      has_parking: form.has_parking === "true",
      has_washroom: form.has_washroom === "true",
      has_ev_charging: form.has_ev_charging === "true",
      is_pet_friendly: form.is_pet_friendly === "true",
      typical_visit_minutes: Number(form.typical_visit_minutes) || null,
      opening_hours: JSON.stringify(hours),
      entry_fee:
        feeMode === "free"
          ? "Free"
          : `₹${feeFrom || "0"} – ₹${feeTo || feeFrom || "0"}`,
    };
    const { error } = await supabase
      .from("places")
      .update(payload)
      .eq("slug", slug);
    if (error) setMessage(error.message);
    else {
      await supabase.from("place_categories").delete().eq("place_id", form.id);
      if (selectedCategories.length)
        await supabase
          .from("place_categories")
          .insert(
            selectedCategories.map((category_id) => ({
              place_id: form.id,
              category_id,
            })),
          );
      setMessage("Location details updated.");
      router.refresh();
    }
  };
  if (allowed === false)
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <p className="p-20 text-center">Admin access required.</p>
        <Footer />
      </main>
    );
  const input = "mt-2 w-full rounded-lg border border-border bg-card p-3";
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-10">
        <button
          onClick={() => router.push("/admin/locations")}
          className="text-sm text-cyan-400"
        >
          ← Location management
        </button>
        <h1 className="mt-4 text-3xl font-bold">Edit location</h1>
        <div className="mt-7 grid gap-6 rounded-2xl border border-border bg-card p-6">
          <label className="text-sm font-medium">
            Name
            <input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={input}
            />
          </label>
          <label className="text-sm font-medium">
            Description
            <textarea
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className={`${input} min-h-28`}
            />
          </label>
          <section className="rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><MapPinned className="h-4 w-4 text-cyan-300" /><h2 className="font-semibold">Google Maps connection</h2></div>
                <p className="mt-1 text-sm text-muted-foreground">This exact Google place powers the live Google Maps link, rating, factual data, and automatic Google photo fallback for this location.</p>
              </div>
              <button type="button" onClick={() => router.push(`/admin/google-matches?place=${encodeURIComponent(slug)}`)} className="rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10">{form.google_place_id ? "Review Google match" : "Match with Google Maps"}</button>
            </div>
            {form.google_place_id ? <a href={`https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(form.google_place_id)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:text-cyan-200"><ExternalLink className="h-4 w-4" />Open exact Google Maps location</a> : <p className="mt-3 text-sm text-amber-700 dark:text-amber-200">No exact Google Maps match yet. Add one before relying on live Google facts or photos.</p>}
          </section>
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Fixed cover image</p>
                <p className="mt-1 text-xs text-muted-foreground">This fixed image is used on location cards and destination banners. Gallery photos remain visible inside the location page.</p>
              </div>
              {form.cover_image && <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-300">Current cover</span>}
            </div>
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Selected cover preview"
                className="mt-3 aspect-video w-full rounded-xl object-cover"
              />
            ) : form.cover_image && !coverImageFailed ? (
              <img
                src={form.cover_image}
                alt="Current cover"
                className="mt-3 aspect-video w-full rounded-xl object-cover"
                onError={() => {
                  setCoverImageFailed(true);
                  setMessage("The saved cover image could not be loaded. Choose another image and save the record again.");
                }}
              />
            ) : (
              <div className="mt-3 grid aspect-video w-full place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                {form.cover_image ? "This cover image is unavailable" : "No cover image selected"}
              </div>
            )}
            <input
              id="admin-gallery"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => {
                void upload(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <label
              htmlFor="admin-gallery"
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/40 px-3 py-2 text-sm text-cyan-400"
            >
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Uploading…" : "Add gallery photos"}
            </label>
            <p className="mt-2 text-xs text-muted-foreground">Select multiple PNG, JPEG, or WebP files at once (up to 5 MB each; {MAX_GALLERY_IMAGES} photos per location). Select a gallery photo below as the single fixed cover.</p>
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Location gallery</p><p className="mt-1 text-xs text-muted-foreground">Visitors can switch between these photos on the location page.</p></div><span className="text-xs text-muted-foreground">{gallery.length} / {MAX_GALLERY_IMAGES}</span></div>
              {gallery.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((image) => {
                  const isCover = image.url === form.cover_image;
                  return <article key={image.id} className={`overflow-hidden rounded-xl border bg-background ${isCover ? "border-cyan-400 ring-1 ring-cyan-400/40" : "border-border"}`}>
                    <img src={image.url} alt={image.alt_text || `${form.name || "Location"} display photo`} className="aspect-square w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 p-2">
                      <button type="button" onClick={() => setCover(image.url)} disabled={isCover} className="inline-flex min-w-0 items-center gap-1 truncate text-xs font-medium text-cyan-300 disabled:text-muted-foreground"><Star className="h-3.5 w-3.5" />{isCover ? "Fixed cover" : "Make cover"}</button>
                      <button type="button" onClick={() => void removeGalleryImage(image)} disabled={isCover} aria-label="Remove gallery photo" title={isCover ? "Choose another cover before removing this photo" : "Remove photo"} className="text-red-300 disabled:cursor-not-allowed disabled:text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </article>;
                })}
              </div> : <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No gallery photos yet. Add one or more photos, then select the single card/banner cover.</p>}
            </div>
          </div>
          <section className="grid gap-4 sm:grid-cols-2">
            <label>
              Destination
              <select
                value={form.parent_id ?? ""}
                onChange={(e) =>
                  setForm({ ...form, parent_id: e.target.value })
                }
                className={input}
              >
                <option value="">No destination</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Visit duration (minutes)
              <input
                type="number"
                value={form.typical_visit_minutes ?? ""}
                onChange={(e) =>
                  setForm({ ...form, typical_visit_minutes: e.target.value })
                }
                className={input}
              />
            </label>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium">Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategories(
                        selectedCategories.includes(c.id)
                          ? selectedCategories.filter((id) => id !== c.id)
                          : [...selectedCategories, c.id],
                      )
                    }
                    className={`rounded-full px-3 py-2 text-sm ${selectedCategories.includes(c.id) ? "bg-cyan-400 text-slate-950" : "border border-border"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
              {[
                ["has_parking", "Parking"],
                ["has_washroom", "Washroom"],
                ["has_ev_charging", "EV charging"],
                ["is_pet_friendly", "Pet friendly"],
              ].map(([k, label]) => (
                <label key={k}>
                  <input
                    type="checkbox"
                    checked={form[k] === "true"}
                    onChange={(e) =>
                      setForm({ ...form, [k]: String(e.target.checked) })
                    }
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Opening hours</h2>
            <div className="mt-3 space-y-2">
              {days.map((day) => (
                <div
                  key={day}
                  className="grid grid-cols-[7rem_1fr_1fr_auto] items-center gap-2"
                >
                  <span className="text-sm">{day}</span>
                  <select
                    disabled={hours[day].closed}
                    value={hours[day].open}
                    onChange={(e) =>
                      setHours({
                        ...hours,
                        [day]: { ...hours[day], open: e.target.value },
                      })
                    }
                    className="rounded-lg border border-border bg-background p-2"
                  >
                    {times.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    disabled={hours[day].closed}
                    value={hours[day].close}
                    onChange={(e) =>
                      setHours({
                        ...hours,
                        [day]: { ...hours[day], close: e.target.value },
                      })
                    }
                    className="rounded-lg border border-border bg-background p-2"
                  >
                    {times.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setHours({
                        ...hours,
                        [day]: { ...hours[day], closed: !hours[day].closed },
                      })
                    }
                    className={`rounded-lg px-3 py-2 text-sm ${hours[day].closed ? "bg-red-500 text-white" : "border border-border"}`}
                  >
                    {hours[day].closed ? "Closed" : "Open"}
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Entry fee</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setFeeMode("free")}
                className={`rounded-lg px-3 py-2 ${feeMode === "free" ? "bg-cyan-400 text-slate-950" : "border border-border"}`}
              >
                Free
              </button>
              <button
                onClick={() => setFeeMode("range")}
                className={`rounded-lg px-3 py-2 ${feeMode === "range" ? "bg-cyan-400 text-slate-950" : "border border-border"}`}
              >
                Paid range
              </button>
              {feeMode === "range" && (
                <>
                  <span>₹</span>
                  <input
                    inputMode="numeric"
                    value={feeFrom}
                    onChange={(e) => setFeeFrom(e.target.value)}
                    placeholder="From"
                    className="w-24 rounded-lg border border-border bg-background p-2"
                  />
                  <span>to ₹</span>
                  <input
                    inputMode="numeric"
                    value={feeTo}
                    onChange={(e) => setFeeTo(e.target.value)}
                    placeholder="To"
                    className="w-24 rounded-lg border border-border bg-background p-2"
                  />
                </>
              )}
            </div>
          </section>
          {["website_url", "phone", "source_url", "source_reference"].map(
            (key) => (
              <label key={key} className="text-sm font-medium">
                {key.replaceAll("_", " ")}
                <input
                  value={form[key] ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={input}
                />
              </label>
            ),
          )}
        </div>
        {message && <p className="mt-4 text-sm text-cyan-400">{message}</p>}
        <button
          onClick={() => void save()}
          className="mt-6 rounded-lg bg-cyan-400 px-5 py-3 font-medium text-slate-950"
        >
          Save changes
        </button>
      </section>
      <Footer />
    </main>
  );
}
