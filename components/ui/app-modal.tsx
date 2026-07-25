"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";

type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
};

export function AppModal({
  open,
  onOpenChange,
  children,
  ariaLabel,
  className,
  overlayClassName,
  closeOnOverlayClick = true,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cn("fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm", overlayClassName)}
    >
      <div role="dialog" aria-modal="true" aria-label={ariaLabel} className={cn("w-full max-w-md animate-fade-in rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl shadow-black/50", className)}>
        {children}
      </div>
    </div>
  );
}
