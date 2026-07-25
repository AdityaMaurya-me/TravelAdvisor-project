"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { AppModal } from "@/components/ui/app-modal";
import { supabase } from "@/lib/supabase";

type LocationDraftDeleteButtonProps = {
  candidateId: string;
  candidateName: string;
  status: string;
  onDeleted: () => Promise<void> | void;
};

export function LocationDraftDeleteButton({ candidateId, candidateName, status, onDeleted }: LocationDraftDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (status === "published") return null;

  const remove = async () => {
    setIsDeleting(true);
    setErrorMessage("");
    const { error } = await (supabase as any).from("location_candidates").delete().eq("id", candidateId);
    setIsDeleting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setOpen(false);
    await onDeleted();
  };

  return <><button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Delete draft</button><AppModal open={open} onOpenChange={setOpen} ariaLabel={`Delete ${candidateName}`} className="border-red-500/30"><h2 className="text-xl font-semibold text-red-200">Delete this draft?</h2><p className="mt-3 text-sm text-slate-300">This permanently deletes the private candidate for {candidateName}. It cannot be undone.</p>{errorMessage && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{errorMessage}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2">Cancel</button><button type="button" disabled={isDeleting} onClick={() => void remove()} className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white disabled:opacity-50">{isDeleting ? "Deleting…" : "Delete draft"}</button></div></AppModal></>;
}
