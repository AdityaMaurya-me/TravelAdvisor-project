"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function UniversalBackLink({ fallbackHref, fallbackLabel, className }: { fallbackHref: string; fallbackLabel: string; className?: string }) {
  const router = useRouter();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    // Browser history preserves the true sequence (e.g. Lonavala → Bhushi →
    // Kune), unlike a single stored "last route" which can only alternate.
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return <a href={fallbackHref} onClick={handleClick} className={className}><ArrowLeft aria-hidden="true" className="h-4 w-4" />{fallbackLabel}</a>;
}
