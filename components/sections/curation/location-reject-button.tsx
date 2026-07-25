"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";

import { AppModal } from "@/components/ui/app-modal";
import { supabase } from "@/lib/supabase";

type LocationRejectButtonProps = { candidateId: string; candidateName: string; status: string; onRejected: () => Promise<void> | void };

export function LocationRejectButton({ candidateId, candidateName, status, onRejected }: LocationRejectButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  if (status === "published" || status === "rejected") return null;
  const reject = async () => {
    setIsSaving(true); setErrorMessage("");
    const { error } = await (supabase as any).from("location_candidates").update({ status: "rejected", review_notes: reason.trim() }).eq("id", candidateId);
    setIsSaving(false);
    if (error) { setErrorMessage(error.message); return; }
    setOpen(false); await onRejected();
  };
  return <><button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-400/10"><XCircle className="h-4 w-4" />Reject with reason</button><AppModal open={open} onOpenChange={setOpen} ariaLabel={`Reject ${candidateName}`} className="border-amber-400/30"><h2 className="text-xl font-semibold text-amber-100">Request changes for {candidateName}</h2><p className="mt-3 text-sm text-slate-300">Explain what needs to be corrected. The requester will receive this reason and can edit and resubmit their draft.</p><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the issue clearly…" className="mt-5 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900 p-3" /><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2">Cancel</button><button type="button" disabled={!reason.trim() || isSaving} onClick={() => void reject()} className="rounded-lg bg-amber-400 px-4 py-2 font-medium text-slate-950 disabled:opacity-50">{isSaving ? "Sending…" : "Send reason"}</button></div>{errorMessage && <p className="mt-4 text-sm text-red-200">{errorMessage}</p>}</AppModal></>;
}
