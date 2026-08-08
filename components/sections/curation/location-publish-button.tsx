"use client";

import { useState } from "react";
import { CheckCircle2, ImageOff, ShieldCheck } from "lucide-react";

import { AppModal } from "@/components/ui/app-modal";
import { supabase } from "@/lib/supabase";

const toSlug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
type ImageStatus = "pending" | "approved" | "rejected" | "not_provided";

export function LocationPublishButton({ candidateId, candidateName, status, onPublished }: { candidateId: string; candidateName: string; status: string; onPublished: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(() => toSlug(candidateName));
  const [level, setLevel] = useState("attraction");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<ImageStatus>("not_provided");
  const [imageNote, setImageNote] = useState("");
  if (status === "published") return null;

  const openReview = async () => {
    setOpen(true); setErrorMessage("");
    const { data } = await (supabase as any).from("location_candidates").select("image_url,image_verification_status,image_verification_notes").eq("id", candidateId).maybeSingle();
    setImageUrl(data?.image_url ?? null);
    setImageStatus(data?.image_verification_status ?? "not_provided");
    setImageNote(data?.image_verification_notes ?? "");
  };
  const reviewImage = async (nextStatus: "approved" | "rejected") => {
    setIsSaving(true); setErrorMessage("");
    const { error } = await (supabase as any).from("location_candidates").update({ image_verification_status: nextStatus, image_verification_notes: imageNote.trim() || (nextStatus === "approved" ? "Image approved by a curator." : "Image does not provide sufficient evidence for this place.") }).eq("id", candidateId);
    setIsSaving(false);
    if (error) { setErrorMessage(error.message); return; }
    setImageStatus(nextStatus);
  };
  const publish = async () => {
    setIsSaving(true); setErrorMessage("");
    if (status === "rejected") {
      const { error: reviewError } = await (supabase as any).from("location_candidates").update({ status: "approved" }).eq("id", candidateId);
      if (reviewError) { setIsSaving(false); setErrorMessage(reviewError.message); return; }
    }
    const { error } = await (supabase as any).rpc("publish_location_candidate", { p_candidate_id: candidateId, p_slug: slug, p_level: level });
    setIsSaving(false);
    if (error) { setErrorMessage(error.message); return; }
    setOpen(false); await onPublished();
  };

  return <><button type="button" onClick={() => void openReview()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/10"><CheckCircle2 className="h-4 w-4" />Review & publish</button><AppModal open={open} onOpenChange={setOpen} ariaLabel={`Publish ${candidateName}`}><h2 className="text-xl font-semibold">Review {candidateName}</h2><p className="mt-2 text-sm text-slate-400">Only an approved place image is used as the public cover. Rejecting or leaving it pending publishes the location without that upload.</p>{imageUrl && <section className="mt-5 rounded-xl border border-slate-700 p-3"><div className="flex items-center justify-between"><p className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200"><ShieldCheck className="h-4 w-4" />Image verification</p><span className="rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-200">{imageStatus}</span></div><img src={imageUrl} alt={`Submitted for ${candidateName}`} className="mt-3 max-h-52 w-full rounded-lg object-contain" /><textarea value={imageNote} onChange={(event) => setImageNote(event.target.value)} placeholder="Why this image is accurate or why it should be rejected" className="mt-3 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isSaving} onClick={() => void reviewImage("rejected")} className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-200"><ImageOff className="h-4 w-4" />Reject photo</button><button type="button" disabled={isSaving} onClick={() => void reviewImage("approved")} className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 px-3 py-2 text-sm text-cyan-200"><CheckCircle2 className="h-4 w-4" />Approve photo</button></div></section>}<label className="mt-5 block text-sm font-medium">Public URL slug<input value={slug} onChange={(event) => setSlug(toSlug(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-3" /></label><label className="mt-4 block text-sm font-medium">Place level<select value={level} onChange={(event) => setLevel(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-3"><option value="attraction">Attraction</option><option value="village">Village</option></select></label>{errorMessage && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{errorMessage}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2">Cancel</button><button type="button" disabled={!slug || isSaving} onClick={() => void publish()} className="rounded-lg bg-cyan-400 px-4 py-2 font-medium text-slate-950 disabled:opacity-50">{isSaving ? "Publishing…" : "Publish place"}</button></div></AppModal></>;
}
