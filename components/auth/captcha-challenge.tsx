"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void; theme?: "light" | "dark" }) => string; remove: (widgetId: string) => void };
  }
}

/** Shown only after repeated failures. Configure the site key to activate it. */
export function CaptchaChallenge({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !container.current) return;
    const render = () => {
      if (!container.current || widget.current || !window.turnstile) return;
      widget.current = window.turnstile.render(container.current, { sitekey: siteKey, theme: "dark", callback: onToken, "error-callback": () => onToken("") });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');
    if (existing) { existing.addEventListener("load", render); render(); }
    else { const script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.addEventListener("load", render); document.head.appendChild(script); }
    return () => { if (widget.current && window.turnstile) window.turnstile.remove(widget.current); widget.current = null; };
  }, [onToken, siteKey]);

  if (!siteKey) return <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-700 dark:text-amber-200">Additional verification is required. CAPTCHA is not configured yet; please wait and try again later.</p>;
  return <div className="overflow-hidden rounded-lg"><div ref={container} /></div>;
}
