"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { AppModal } from "@/components/ui/app-modal";
import { supabase } from "@/lib/supabase";

const toSlug = (name: string) => name
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

type LocationPublishButtonProps = {
  candidateId: string;
  candidateName: string;
  status: string;
  onPublished: () => Promise<void> | void;
};

export function LocationPublishButton({ candidateId, candidateName, status, onPublished }: LocationPublishButtonProps) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(() => toSlug(candidateName));
  const [level, setLevel] = useState("attraction");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  if (status === "published") return null;

  const publish = async () => {
    setIsPublishing(true);
    setErrorMessage("");
    if (status === "rejected") {
      const { error: reviewError } = await (supabase as any).from("location_candidates").update({ status: "approved" }).eq("id", candidateId);
      if (reviewError) { setIsPublishing(false); setErrorMessage(reviewError.message); return; }
    }
    const { error } = await (supabase as any).rpc("publish_location_candidate", {
      p_candidate_id: candidateId,
      p_slug: slug,
      p_level: level,
    });
    setIsPublishing(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setOpen(false);
    await onPublished();
  };

  return <><button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/10"><CheckCircle2 className="h-4 w-4" />Review & publish</button><AppModal open={open} onOpenChange={setOpen} ariaLabel={`Publish ${candidateName}`}><h2 className="text-xl font-semibold">Publish {candidateName}?</h2><p className="mt-2 text-sm text-slate-400">This makes the verified place public. Publication only works for assigned curators when source evidence, coordinates, a description, and a valid category are present.</p><label className="mt-5 block text-sm font-medium">Public URL slug<input value={slug} onChange={(event) => setSlug(toSlug(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-3" /></label><label className="mt-4 block text-sm font-medium">Place level<select value={level} onChange={(event) => setLevel(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-3"><option value="attraction">Attraction</option><option value="village">Village</option></select></label>{errorMessage && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{errorMessage}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2">Cancel</button><button type="button" disabled={!slug || isPublishing} onClick={() => void publish()} className="rounded-lg bg-cyan-400 px-4 py-2 font-medium text-slate-950 disabled:opacity-50">{isPublishing ? "Publishing…" : "Publish place"}</button></div></AppModal></>;
}
