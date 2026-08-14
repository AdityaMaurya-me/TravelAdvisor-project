"use client";

import { LocateFixed } from "lucide-react";

import { AppModal } from "@/components/ui/app-modal";
import { setLocationEnabled } from "@/lib/location-preference";

type LocationAccessPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnable: () => void;
};

export function LocationAccessPrompt({ open, onOpenChange, onEnable }: LocationAccessPromptProps) {
  const enable = () => {
    setLocationEnabled(true);
    onOpenChange(false);
    onEnable();
  };

  return <AppModal open={open} onOpenChange={onOpenChange} ariaLabel="Enable location services"><span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><LocateFixed className="h-5 w-5" /></span><h2 className="mt-4 text-xl font-semibold">Enable location services?</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">TravelAdvisor needs your location only to show nearby places or set your route starting point. It is not requested until you enable it.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2">Not now</button><button type="button" onClick={enable} className="rounded-lg bg-cyan-400 px-4 py-2 font-medium text-slate-950">Enable location</button></div></AppModal>;
}
