"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { savePlace, unsavePlace } from "@/app/actions/collections";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { isGuestPlaceSaved, SAVED_PLACES_EVENT, toggleGuestSavedPlace } from "@/lib/saved-places/guest";

interface SaveDestinationButtonProps {
  className?: string;
  defaultSaved?: boolean;
  /** Use "sm" when reusing this button inside compact contexts like cards. */
  size?: "default" | "sm";
  placeSlug?: string;
}

const SPARK_RADIUS: Record<NonNullable<SaveDestinationButtonProps["size"]>, string> = {
  default: "1.1rem",
  sm: "0.85rem",
};

export function SaveDestinationButton({
  className,
  defaultSaved = false,
  size = "default",
  placeSlug,
}: SaveDestinationButtonProps) {
  const { requireAuth } = useAuthModal();
  const [isSaved, setIsSaved] = useState(defaultSaved);
  const [isPopping, setIsPopping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingSavedState, setIsCheckingSavedState] = useState(Boolean(placeSlug));
  const [isGuestSave, setIsGuestSave] = useState(false);

  const loadSavedState = useCallback(async () => {
    if (!placeSlug) {
      setIsCheckingSavedState(false);
      return;
    }

    setIsCheckingSavedState(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const savedOnDevice = isGuestPlaceSaved(placeSlug);
      setIsSaved(savedOnDevice);
      setIsGuestSave(savedOnDevice);
      setIsCheckingSavedState(false);
      return;
    }

    const [{ data: place }, { data: savedPlacesCollection }] = await Promise.all([
      supabase.from("places").select("id").eq("slug", placeSlug).maybeSingle(),
      supabase.from("collections").select("id").eq("user_id", user.id).eq("is_system", true).maybeSingle(),
    ]);

    if (!place || !savedPlacesCollection) {
      setIsSaved(false);
      setIsCheckingSavedState(false);
      return;
    }

    const { data: savedItem } = await supabase
      .from("collection_items")
      .select("place_id")
      .eq("collection_id", savedPlacesCollection.id)
      .eq("place_id", place.id)
      .maybeSingle();
    setIsSaved(Boolean(savedItem));
    setIsGuestSave(false);
    setIsCheckingSavedState(false);
  }, [placeSlug]);

  useEffect(() => {
    void loadSavedState();
    window.addEventListener(SAVED_PLACES_EVENT, loadSavedState);
    return () => window.removeEventListener(SAVED_PLACES_EVENT, loadSavedState);
  }, [loadSavedState]);

  const completeSave = async () => {
    if (!placeSlug || isSaving) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        await unsavePlace(placeSlug);
        setIsSaved(false);
      } else {
        await savePlace(placeSlug);
        setIsSaved(true);
        setIsPopping(true);
      }
      window.dispatchEvent(new Event("traveladvisor:saved-places-updated"));
    } catch {
      // The button remains usable; the signed-in user can retry safely.
    }
    setIsSaving(false);
  };

  const handleClick = async () => {
    if (!placeSlug || isSaving) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toggleGuestSavedPlace(placeSlug);
      const savedOnDevice = isGuestPlaceSaved(placeSlug);
      setIsSaved(savedOnDevice);
      setIsGuestSave(savedOnDevice);
      if (savedOnDevice) setIsPopping(true);
      return;
    }
    if (!await requireAuth(completeSave)) return;
    await completeSave();
  };

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-busy={isCheckingSavedState || isSaving}
      onClick={handleClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background/80 px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        className="save-heart"
        data-popping={isPopping || undefined}
        style={{ "--spark-r": SPARK_RADIUS[size] } as React.CSSProperties}
        onAnimationEnd={() => setIsPopping(false)}
      >
        <Heart
          aria-hidden="true"
          className={cn(
            "relative z-10 h-4 w-4 transition-[color,fill,transform] duration-300 ease-out",
            isSaved && "fill-red-500 text-red-500",
            isPopping && "animate-heart-pop",
          )}
        />
      </span>
      {isSaving ? "Saving..." : isCheckingSavedState ? "Checking saved places..." : isSaved ? isGuestSave ? "Saved on this device" : "Saved to collection" : "Save to collection"}
    </button>
  );
}
