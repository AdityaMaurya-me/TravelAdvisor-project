"use client";

import { LogOut, Moon, Settings, ShieldAlert, Sun, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { clearCachedProfile, readCachedProfile, writeCachedProfile } from "@/lib/auth/profile-cache";
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
  const [avatar, setAvatar] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const cached = readCachedProfile();
    if (cached) {
      setEmail(cached.email);
      setName(cached.name);
      setAvatar(cached.avatar);
      setIsAdmin(cached.isAdmin);
    }
    const load = async () => {
      // Keep the navbar based on the browser session, not a network request.
      // This prevents a transient auth refresh during navigation from briefly
      // treating a signed-in user as anonymous.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      setEmail(user?.email ?? null);
      if (!user) { clearCachedProfile(); setName("Traveller"); setAvatar(""); setIsAdmin(false); return; }
      const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle();
      const { data: role } = await supabase.from("curator_roles").select("role").eq("user_id", user.id).maybeSingle();
      const cachedForUser = readCachedProfile();
      const sameUserCache = cachedForUser?.userId === user.id ? cachedForUser : null;
      // A profile request can briefly fail during a route transition. Keep the
      // already-persisted avatar instead of replacing it with an empty circle.
      const persistedAvatar = profileError ? sameUserCache?.avatar ?? "" : profile?.avatar_url || "";
      const nextProfile = {
        userId: user.id,
        email: user.email ?? "",
        name: profile?.display_name || user.email?.split("@")[0] || "Traveller",
        avatar: persistedAvatar,
        isAdmin: role?.role === "admin" || sameUserCache?.isAdmin === true,
      };
      setIsAdmin(nextProfile.isAdmin);
      setName(nextProfile.name);
      setAvatar(nextProfile.avatar);
      writeCachedProfile(nextProfile);
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); });
    const syncProfile = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; avatar?: string }>).detail;
      if (detail) {
        if (typeof detail.name === "string") setName(detail.name || "Traveller");
        if (typeof detail.avatar === "string") setAvatar(detail.avatar);
        const cached = readCachedProfile();
        if (cached && !detail.avatar?.startsWith("blob:")) writeCachedProfile({
          ...cached,
          name: typeof detail.name === "string" ? detail.name || "Traveller" : cached.name,
          avatar: typeof detail.avatar === "string" ? detail.avatar : cached.avatar,
        });
      }
      // A persisted remote URL has just been broadcast by the profile page.
      // Reload it from Supabase only in that case; doing so for a temporary
      // local preview caused the navbar to race and display a different photo.
      if (!detail?.avatar?.startsWith("blob:")) void load();
    };
    window.addEventListener("traveladvisor:profile-updated", syncProfile);
    return () => { subscription.unsubscribe(); window.removeEventListener("traveladvisor:profile-updated", syncProfile); };
  }, []);
  useEffect(() => {
    const closeMenus = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setIsAccountOpen(false); setIsNotificationsOpen(false); } };
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);
  const signOut = async () => { await supabase.auth.signOut(); clearCachedProfile(); setIsAccountOpen(false); router.push("/"); router.refresh(); };

  return <div ref={rootRef} className="relative flex items-center gap-2"><button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-cyan-300">{theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button><NotificationsMenu open={isNotificationsOpen} onOpenChange={(open) => { setIsNotificationsOpen(open); if (open) setIsAccountOpen(false); }} />{email ? <><button type="button" aria-label="Open profile menu" onClick={() => { setIsAccountOpen((open) => !open); setIsNotificationsOpen(false); }} className="grid h-9 w-9 overflow-hidden rounded-full border border-cyan-400/50 bg-accent transition-transform hover:scale-105">{avatar ? <img src={avatar} alt="Profile photo" className="h-full w-full object-cover" onError={() => setAvatar("")} /> : <UserCircle2 className="h-9 w-9 text-cyan-300" />}</button>{isAccountOpen && <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-card p-2 text-sm shadow-xl"><p className="px-3 py-2 font-semibold text-foreground">{name}</p><Link href="/profile" onClick={() => setIsAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent"><UserCircle2 className="h-4 w-4" />My profile</Link>{isAdmin && <Link href="/moderation" onClick={() => setIsAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-cyan-400 hover:bg-accent"><ShieldAlert className="h-4 w-4" />Moderation</Link>}<Link href="/settings" onClick={() => setIsAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent"><Settings className="h-4 w-4" />Settings</Link><button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10"><LogOut className="h-4 w-4" />Sign out</button></div>}</> : <button type="button" onClick={() => void requireAuth()} aria-label="Sign in" className="rounded-full transition-transform hover:scale-105"><UserCircle2 className="h-9 w-9 text-muted-foreground" /></button>}</div>;
}
