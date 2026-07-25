"use client";

import { type FormEvent, createContext, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { getLastSignInEmail, rememberSignInEmail } from "@/lib/auth/last-email";
import { supabase } from "@/lib/supabase";
import { AppModal } from "@/components/ui/app-modal";

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

  useEffect(() => setLastEmail(getLastSignInEmail()), []);

  const close = () => {
    setIsOpen(false);
    setMessage("");
    pendingAction.current = undefined;
  };

  const requireAuth = async (resumeAction?: ResumeAction) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return true;
    pendingAction.current = resumeAction;
    setMessage("");
    setIsOpen(true);
    return false;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (isSignUp && !result.data.session) {
      setMessage("Your account was created. Confirm your email, then sign in here to continue.");
      setIsSignUp(false);
      return;
    }

    rememberSignInEmail(email);
    setLastEmail(email.trim().toLowerCase());
    const action = pendingAction.current;
    setIsOpen(false);
    pendingAction.current = undefined;
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
            <div className="mt-6 grid grid-cols-2 rounded-lg border border-slate-700 bg-slate-900 p-1"><button type="button" onClick={() => { setIsSignUp(false); setMessage(""); }} className={`rounded-md px-3 py-2 text-sm font-medium ${!isSignUp ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}>Sign in</button><button type="button" onClick={() => { setIsSignUp(true); setMessage(""); }} className={`rounded-md px-3 py-2 text-sm font-medium ${isSignUp ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}>Create account</button></div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-300">Email address<input required type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-400" /></label>
              {!isSignUp && lastEmail && email !== lastEmail && <button type="button" onClick={() => setEmail(lastEmail)} className="-mt-2 flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-left text-sm text-cyan-100"><span className="text-cyan-300">↗</span> Continue as <span className="font-medium">{lastEmail}</span></button>}
              <label className="block text-sm font-medium text-slate-300">Password<input required minLength={6} type="password" name="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-400" /></label>
              {message && <p className="rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}
              <button disabled={isSubmitting} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in and continue"}</button>
            </form>
        </AppModal>
      )}
    </AuthModalContext.Provider>
  );
}
