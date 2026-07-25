"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { LAST_DETAIL_ROUTE_KEY } from "@/components/navigation/navigation-memory";

export function ResumeHomeLink({ className, children, onNavigate }: { className?: string; children: ReactNode; onNavigate?: () => void }) {
  const router = useRouter();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const lastDetail = sessionStorage.getItem(LAST_DETAIL_ROUTE_KEY);
    onNavigate?.();
    router.push(lastDetail || "/");
  }

  return <a href="/" onClick={handleClick} className={className}>{children}</a>;
}
