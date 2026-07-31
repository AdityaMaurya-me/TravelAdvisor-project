"use client";

import { LogOut, Moon, Settings, Sun, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { NotificationsMenu } from "@/components/navigation/notifications-menu";
import { useTheme } from "@/components/theme/theme-provider";

export function UserMenu() {
  const router = useRouter();
  const { requireAuth } = useAuthModal();
  const { theme, toggleTheme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("Traveller");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (!user) return setName("Traveller");
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      setName(profile?.display_name || user.email?.split("@")[0] || "Traveller");
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const closeMenus = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setIsAccountOpen(false); setIsNotificationsOpen(false); } };
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);
  const signOut = async () => { await supabase.auth.signOut(); setIsAccountOpen(false); router.push("/"); router.refresh(); };

  return <div ref={rootRef} className="relative flex items-center gap-2"><button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-cyan-300">{theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button><NotificationsMenu open={isNotificationsOpen} onOpenChange={(open) => { setIsNotificationsOpen(open); if (open) setIsAccountOpen(false); }} />{email ? <><button type="button" aria-label="Open profile menu" onClick={() => { setIsAccountOpen((open) => !open); setIsNotificationsOpen(false); }} className="rounded-full transition-transform hover:scale-105"><UserCircle2 className="h-9 w-9 text-cyan-300" /></button>{isAccountOpen && <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-card p-2 text-sm shadow-xl"><p className="px-3 py-2 font-semibold text-foreground">{name}</p><Link href="/profile" onClick={() => setIsAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent"><UserCircle2 className="h-4 w-4" />My profile</Link><Link href="/profile#settings" onClick={() => setIsAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent"><Settings className="h-4 w-4" />Settings</Link><button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10"><LogOut className="h-4 w-4" />Sign out</button></div>}</> : <button type="button" onClick={() => void requireAuth()} aria-label="Sign in" className="rounded-full transition-transform hover:scale-105"><UserCircle2 className="h-9 w-9 text-muted-foreground" /></button>}</div>;
}
