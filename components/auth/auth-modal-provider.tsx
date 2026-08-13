"use client";

import { type FormEvent, createContext, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { getLastSignInEmail, rememberSignInEmail } from "@/lib/auth/last-email";
import { supabase } from "@/lib/supabase";
import { AppModal } from "@/components/ui/app-modal";
import { CaptchaChallenge } from "@/components/auth/captcha-challenge";
import { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE, sendAuthRequest } from "@/components/auth/auth-request";
import { syncGuestSavedPlaces } from "@/app/actions/collections";
import { clearGuestSavedPlaces, getGuestSavedPlaceSlugs } from "@/lib/saved-places/guest";

type ResumeAction = () => void | Promise<void>;
type AuthModalContextValue = { requireAuth: (resumeAction?: ResumeAction) => Promise<boolean> };

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) throw new Error("useAuthModal must be used inside AuthModalProvider.");
  return context;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pendingAction = useRef<ResumeAction | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastEmail, setLastEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY));
  const [captchaToken, setCaptchaToken] = useState("");
  // Keep a session signal in the root provider. The provider stays mounted
  // while users move between pages, so protected buttons do not briefly treat
  // a just-signed-in user as anonymous during a client-side transition.
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => setLastEmail(getLastSignInEmail()), []);

  const syncGuestSaves = async () => {
    const slugs = getGuestSavedPlaceSlugs();
    if (!slugs.length) return;
    try {
      await syncGuestSavedPlaces(slugs);
      clearGuestSavedPlaces();
      window.dispatchEvent(new Event("traveladvisor:saved-places-updated"));
    } catch {
      // Keep local saves untouched and retry on the next successful session.
    }
  };

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticatedUserId(session?.user.id ?? null);
      setAuthChecked(true);
      if (session?.user) await syncGuestSaves();
    })();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthenticatedUserId(session?.user.id ?? null);
      setAuthChecked(true);
      if (event === "SIGNED_IN" && session?.user) void syncGuestSaves();
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const close = () => {
    setIsOpen(false);
    setMessage("");
    pendingAction.current = undefined;
  };

  const requireAuth = async (resumeAction?: ResumeAction) => {
    if (authenticatedUserId) return true;
    // `getSession` reads the browser's persisted Supabase session first. UI
    // actions must not reopen the login modal just because a network-backed
    // `getUser()` validation races with client-side navigation. Server actions
    // still validate the JWT independently before performing any write.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setAuthenticatedUserId(session.user.id);
      return true;
    }

    // Let the initial session restoration finish before considering the user
    // anonymous. This avoids a false sign-in prompt immediately after a page
    // switch or the first click following a hard redirect from sign-in.
    if (!authChecked) {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      const { data: { session: restoredSession } } = await supabase.auth.getSession();
      if (restoredSession?.user) {
        setAuthenticatedUserId(restoredSession.user.id);
        return true;
      }
      setAuthChecked(true);
    }
    pendingAction.current = resumeAction;
    setMessage("");
    setIsOpen(true);
    return false;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSignUp && !isStrongPassword(password)) { setMessage(PASSWORD_REQUIREMENTS_MESSAGE); return; }
    if (!isSignUp && !isStrongPassword(password)) {
      window.location.assign(`/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    const result = await sendAuthRequest(isSignUp ? "signup" : "signin", { email, password, captchaToken });
    setIsSubmitting(false);
    setCaptchaRequired(Boolean(result.captchaRequired));
    if (result.passwordUpgradeRequired) {
      window.location.assign(`/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      return;
    }
    if (!result.ok || (isSignUp && !result.session)) {
      setMessage(result.message ?? "We could not complete that request. Check your details and try again.");
      if (isSignUp && result.ok) setIsSignUp(false);
      return;
    }
    if (!result.session) { setMessage("We could not complete that request. Check your details and try again."); return; }
    const { error: sessionError } = await supabase.auth.setSession(result.session);
    if (sessionError) { setMessage("We could not complete that request. Check your details and try again."); return; }

    const { data: { session: establishedSession } } = await supabase.auth.getSession();
    setAuthenticatedUserId(establishedSession?.user.id ?? null);
    setAuthChecked(true);
    rememberSignInEmail(email);
    setLastEmail(email.trim().toLowerCase());
    await syncGuestSaves();
    const action = pendingAction.current;
    setIsOpen(false);
    pendingAction.current = undefined;
    // Make the client-set Supabase session observable by server components
    // before restoring the action that opened this modal.
    router.refresh();
    await action?.();
  };

  return (
    <AuthModalContext.Provider value={{ requireAuth }}>
      {children}
      {isOpen && (
        <AppModal open={isOpen} onOpenChange={(open) => { if (!open) close(); }} ariaLabel="Sign in or create an account">
            <div className="flex items-start justify-between gap-5">
              <div><p className="text-sm font-medium text-cyan-300">TravelAdvisor account</p><h2 className="mt-1 text-2xl font-bold text-white">{isSignUp ? "Create your account" : "Sign in to continue"}</h2><p className="mt-2 text-sm text-slate-400">Your place and current task will stay right here.</p></div>
              <button type="button" aria-label="Close" onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 grid grid-cols-2 rounded-lg border border-slate-700 bg-slate-900 p-1"><button type="button" onClick={() => { setIsSignUp(false); setMessage(""); setCaptchaRequired(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)); setCaptchaToken(""); }} className={`rounded-md px-3 py-2 text-sm font-medium ${!isSignUp ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}>Sign in</button><button type="button" onClick={() => { setIsSignUp(true); setMessage(""); setCaptchaRequired(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)); setCaptchaToken(""); }} className={`rounded-md px-3 py-2 text-sm font-medium ${isSignUp ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}>Create account</button></div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-300">Email address<input required type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-400" /></label>
              {!isSignUp && lastEmail && email !== lastEmail && <button type="button" onClick={() => setEmail(lastEmail)} className="-mt-2 flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-left text-sm text-cyan-100"><span className="text-cyan-300">↗</span> Continue as <span className="font-medium">{lastEmail}</span></button>}
              <label className="block text-sm font-medium text-slate-300">Password<input required minLength={isSignUp ? 12 : 1} type="password" name="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-400" /></label>
              {isSignUp && <p className="-mt-2 text-xs text-slate-400">{PASSWORD_REQUIREMENTS_MESSAGE}</p>}
              {!isSignUp && <a href="/forgot-password" className="inline-block text-sm text-cyan-300 hover:underline">Forgot password?</a>}
              {captchaRequired && <CaptchaChallenge onToken={setCaptchaToken} />}
              {message && <p className="rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}
              <button disabled={isSubmitting || (captchaRequired && !captchaToken)} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in and continue"}</button>
            </form>
        </AppModal>
      )}
    </AuthModalContext.Provider>
  );
}
