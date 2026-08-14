"use client";

import { Compass } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MIN_VISIBLE_MS = 520;
const SAFETY_TIMEOUT_MS = 12_000;
const ROUTE_LOADING_EVENT = "traveladvisor:route-loading";

export function startRouteLoading() {
  window.dispatchEvent(new CustomEvent(ROUTE_LOADING_EVENT));
}

/**
 * App-shell transition state for internal navigation. The compass animation is
 * adapted from Nawsome's MIT-licensed Uiverse loader and intentionally stays
 * visible briefly so a destination renders as one composed page.
 */
export function PageTransitionLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(true);
  const startedAt = useRef(Date.now());
  const navigating = useRef(true);
  const initialRoute = useRef(true);
  const safetyTimer = useRef<number | null>(null);

  const clearSafetyTimer = () => {
    if (safetyTimer.current !== null) window.clearTimeout(safetyTimer.current);
    safetyTimer.current = null;
  };

  const finish = () => {
    clearSafetyTimer();
    const delay = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    window.setTimeout(() => {
      navigating.current = false;
      setVisible(false);
    }, delay);
  };

  const start = () => {
    clearSafetyTimer();
    navigating.current = true;
    startedAt.current = Date.now();
    setVisible(true);
    safetyTimer.current = window.setTimeout(() => {
      navigating.current = false;
      setVisible(false);
    }, SAFETY_TIMEOUT_MS);
  };

  useEffect(() => {
    const finishInitial = window.setTimeout(finish, MIN_VISIBLE_MS);
    const onRouteLoading = () => start();
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin || `${next.pathname}${next.search}` === `${window.location.pathname}${window.location.search}`) return;
      start();
    };
    const onPopState = () => start();
    window.addEventListener(ROUTE_LOADING_EVENT, onRouteLoading);
    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.clearTimeout(finishInitial);
      clearSafetyTimer();
      window.removeEventListener(ROUTE_LOADING_EVENT, onRouteLoading);
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (initialRoute.current) {
      initialRoute.current = false;
      return;
    }
    if (navigating.current) finish();
  }, [routeKey]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/95 px-6 text-center backdrop-blur-md" role="status" aria-live="polite" aria-label="Loading page">
      <div className="flex max-w-xs flex-col items-center gap-5">
        <span aria-hidden="true" className="travel-page-loader">
          <span className="travel-page-loader__ring" />
          <span className="travel-page-loader__needle" />
          <span className="travel-page-loader__compass"><Compass className="h-7 w-7" /></span>
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">TravelAdvisor</p>
          <p className="mt-1 text-sm text-muted-foreground">Preparing your next stop…</p>
        </div>
      </div>
    </div>
  );
}
