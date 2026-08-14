"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Accessibility, Bell, ChevronRight, Eye, LocateFixed, Moon, Palette, ShieldCheck, Sun, Trash2 } from "lucide-react";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { useTheme } from "@/components/theme/theme-provider";
import { AppModal } from "@/components/ui/app-modal";
import { isLocationEnabled, setLocationEnabled } from "@/lib/location-preference";
import { supabase } from "@/lib/supabase";

type LocalPreferences = { reduceMotion: boolean };
const preferencesKey = "traveladvisor:settings";

function readPreferences(): LocalPreferences {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(preferencesKey) ?? "{}") as Partial<LocalPreferences>;
    return { reduceMotion: parsed.reduceMotion === true };
  } catch {
    return { reduceMotion: false };
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { requireAuth } = useAuthModal();
  const { theme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [locationEnabled, setLocationEnabledState] = useState(true);
  const [locationStatus, setLocationStatus] = useState("Location is used only when you explicitly choose nearby places or a route start.");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        requireAuth();
        return;
      }
      const preferences = readPreferences();
      setReduceMotion(preferences.reduceMotion);
      setLocationEnabledState(isLocationEnabled());
      document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion);
      setReady(true);
    })();
  }, [requireAuth]);

  const updateReducedMotion = (enabled: boolean) => {
    setReduceMotion(enabled);
    document.documentElement.dataset.reduceMotion = String(enabled);
    window.localStorage.setItem(preferencesKey, JSON.stringify({ reduceMotion: enabled }));
    setMessage(enabled ? "Reduced motion is now on for this device." : "Motion effects are enabled for this device.");
  };

  const requestLocation = () => {
    if (!locationEnabled) {
      setLocationStatus("TravelAdvisor location services are disabled. Enable them below before requesting browser access.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus("This browser does not support location access.");
      return;
    }
    setLocationStatus("Requesting your browser location permission…");
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus("Location access is allowed. TravelAdvisor only uses it when you request nearby results or directions."),
      () => setLocationStatus("Location access was not granted. You can enable it later in your browser site settings."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const updateLocationService = (enabled: boolean) => {
    setLocationEnabled(enabled);
    setLocationEnabledState(enabled);
    setLocationStatus(enabled ? "TravelAdvisor location services are enabled. You can now check browser access." : "TravelAdvisor location services are disabled. This app will not request or use GPS until you enable them again.");
  };

  const clearPlanningDrafts = () => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("traveladvisor:route-draft:") || key === "traveladvisor:journey-planner-draft")
      .forEach((key) => window.localStorage.removeItem(key));
    setMessage("Local route and journey drafts were cleared. Saved collections were not changed.");
  };

  const deleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      setDeleteError(error.message || "We could not remove your account. Please try again.");
      setIsDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  return <main className="min-h-screen bg-background text-foreground"><Navbar />
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-sm font-medium text-cyan-300">TravelAdvisor preferences</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Settings</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Control how TravelAdvisor looks and behaves on this device. Your account identity is managed separately in your profile.</p>

      {!ready ? <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading your settings…</div> : <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Palette className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Choose the colour experience you prefer.</p></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{([ ["dark", "Dark", Moon], ["light", "Light", Sun] ] as const).map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)} className={`flex items-center gap-3 rounded-xl border p-4 text-left ${theme === value ? "border-cyan-400 bg-cyan-400/10" : "border-border hover:border-cyan-400/50"}`}><Icon className="h-5 w-5 text-cyan-300" /><span><span className="block font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{value === "dark" ? "Low-light travel planning" : "Bright, high-contrast browsing"}</span></span></button>)}</div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Accessibility className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">Accessibility</h2><p className="mt-1 text-sm text-muted-foreground">Make animations more comfortable to view.</p></div></div>
          <div className="mt-5 flex items-center justify-between gap-5 rounded-xl border border-border p-4"><div><p className="font-medium">Reduce motion</p><p className="mt-1 text-sm text-muted-foreground">Turns off interface animations and movement effects.</p></div><button type="button" role="switch" aria-checked={reduceMotion} onClick={() => updateReducedMotion(!reduceMotion)} className={`relative h-7 w-12 rounded-full transition ${reduceMotion ? "bg-cyan-400" : "bg-muted"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${reduceMotion ? "left-6" : "left-1"}`} /></button></div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><LocateFixed className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">Location and privacy</h2><p className="mt-1 text-sm text-muted-foreground">Your device location is never collected automatically.</p></div></div>
          <div className="mt-5 rounded-xl border border-border p-4"><p className="font-medium">Location service</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{locationStatus}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={requestLocation} disabled={!locationEnabled} className="rounded-lg border border-cyan-400/40 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50">Check location access</button><button type="button" onClick={() => updateLocationService(!locationEnabled)} className={`rounded-lg border px-4 py-2 text-sm font-medium ${locationEnabled ? "border-red-400/40 text-red-200 hover:bg-red-500/10" : "border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10"}`}>{locationEnabled ? "Disable location service" : "Enable location service"}</button></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Disabling stops TravelAdvisor from requesting GPS. To revoke an already-granted device permission, use your browser&apos;s site settings.</p></div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Bell className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">Notifications</h2><p className="mt-1 text-sm text-muted-foreground">Curation and community updates appear in the notification bell in the header.</p></div></div>
          <p className="mt-5 rounded-xl bg-muted p-4 text-sm text-muted-foreground">There are no marketing notifications enabled in this project. You will only see activity related to your account, curation requests, and community interactions.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Eye className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">Local data</h2><p className="mt-1 text-sm text-muted-foreground">Manage planning data stored only in this browser.</p></div></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4"><div><p className="font-medium">Clear route and journey drafts</p><p className="mt-1 text-sm text-muted-foreground">Saved routes and collections in your account will remain untouched.</p></div><button type="button" onClick={clearPlanningDrafts} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"><Trash2 className="h-4 w-4" />Clear drafts</button></div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">Account and security</h2><p className="mt-1 text-sm text-muted-foreground">Keep your access secure and manage your account safely.</p></div></div>
          <div className="mt-5"><Link href="/forgot-password" className="flex items-center justify-between rounded-xl border border-border p-4 transition hover:border-cyan-400/50"><span><span className="block font-medium">Reset password</span><span className="mt-1 block text-sm text-muted-foreground">Send a one-time recovery code.</span></span><ChevronRight className="h-5 w-5 text-cyan-300" /></Link></div>
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4"><p className="font-medium text-red-200">Remove account</p><p className="mt-1 text-sm text-muted-foreground">Permanently delete your account and its saved data from TravelAdvisor.</p><button type="button" onClick={() => { setDeleteError(""); setDeleteConfirmation(""); setConfirmDelete(true); }} className="mt-4 inline-flex rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/10">Remove account</button></div>
        </section>
        {message && <p role="status" className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">{message}</p>}
      </div>}
    </section>
    {confirmDelete && <AppModal open={confirmDelete} onOpenChange={(open) => { if (!isDeleting) setConfirmDelete(open); }} ariaLabel="Permanently remove account" className="border-red-500/30"><h2 className="text-xl font-semibold text-red-200">Permanently remove account?</h2><p className="mt-3 text-sm text-muted-foreground">This cannot be undone. Type <strong className="text-foreground">delete-my-account</strong> to confirm.</p><label className="mt-5 block text-sm font-medium">Confirmation<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" placeholder="delete-my-account" className="mt-2 w-full rounded-lg border border-border p-3" /></label>{deleteError && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{deleteError}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmDelete(false)} disabled={isDeleting} className="rounded-lg border border-border px-4 py-2 disabled:opacity-60">Cancel</button><button type="button" onClick={() => void deleteAccount()} disabled={isDeleting || deleteConfirmation !== "delete-my-account"} className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{isDeleting ? "Deleting…" : "Delete account"}</button></div></AppModal>}
    <Footer />
  </main>;
}
