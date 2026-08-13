"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import Navbar from "@/components/layout/navbar";
import { getLastSignInEmail, rememberSignInEmail } from "@/lib/auth/last-email";
import { supabase } from "@/lib/supabase";
import { CaptchaChallenge } from "@/components/auth/captcha-challenge";
import { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE, sendAuthRequest } from "@/components/auth/auth-request";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(() => searchParams.get("mode") === "sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastEmail, setLastEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY));
  const [captchaToken, setCaptchaToken] = useState("");
  const next = searchParams.get("next");
  // A direct sign-in starts from the travel experience, not a private
  // collection. A valid in-app `next` still resumes the original task.
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  useEffect(() => setLastEmail(getLastSignInEmail()), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSignUp && !isStrongPassword(password)) { setMessage(PASSWORD_REQUIREMENTS_MESSAGE); return; }
    if (!isSignUp && !isStrongPassword(password)) {
      router.push(`/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      return;
    }
    setIsLoading(true);
    setMessage("");
    const result = await sendAuthRequest(isSignUp ? "signup" : "signin", { email, password, captchaToken });
    setIsLoading(false);
    setCaptchaRequired(Boolean(result.captchaRequired));
    if (result.passwordUpgradeRequired) {
      router.push(`/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      return;
    }
    if (!result.ok || (isSignUp && !result.session)) {
      setMessage(result.message ?? "We could not complete that request. Check your details and try again.");
      return;
    }
    if (!result.session) { setMessage("We could not complete that request. Check your details and try again."); return; }
    const { error: sessionError } = await supabase.auth.setSession(result.session);
    if (sessionError) { setMessage("We could not complete that request. Check your details and try again."); return; }

    rememberSignInEmail(email);
    // Use a document navigation after writing the browser auth cookies. This
    // makes the new session visible to server-rendered pages and the navbar
    // on the first destination, rather than leaving a stale anonymous tree.
    window.location.assign(nextPath);
  };

  const switchMode = (mode: boolean) => {
    setIsSignUp(mode);
    setMessage(""); setCaptchaRequired(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)); setCaptchaToken("");
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-7">
          <div className="text-center"><p className="text-sm font-medium text-cyan-300">TravelAdvisor account</p><h1 className="mt-2 text-4xl font-bold text-white">{isSignUp ? "Create your account" : "Welcome back"}</h1><p className="mt-2 text-gray-400">{isSignUp ? "Create an account to save places, routes, and community tips." : "Sign in to save places, routes, and share travel tips."}</p></div>
          <div className="grid grid-cols-2 rounded-lg border border-gray-800 bg-gray-950/40 p-1"><button type="button" onClick={() => switchMode(false)} aria-pressed={!isSignUp} className={`rounded-md px-3 py-2 text-sm font-medium ${!isSignUp ? "bg-cyan-400 text-slate-950" : "text-gray-300"}`}>Sign in</button><button type="button" onClick={() => switchMode(true)} aria-pressed={isSignUp} className={`rounded-md px-3 py-2 text-sm font-medium ${isSignUp ? "bg-cyan-400 text-slate-950" : "text-gray-300"}`}>Create account</button></div>
          <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-800 bg-gray-950/40 p-6">
            <label className="block text-sm font-medium text-gray-300">Email address<input required type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-cyan-400" /></label>
            {!isSignUp && lastEmail && email !== lastEmail && <button type="button" onClick={() => setEmail(lastEmail)} className="-mt-2 flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-left text-sm text-cyan-100"><span className="text-cyan-300">↗</span> Continue as <span className="font-medium">{lastEmail}</span></button>}
            <label className="block text-sm font-medium text-gray-300">Password<input required minLength={isSignUp ? 12 : 1} type="password" name="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-cyan-400" /></label>
            {isSignUp && <p className="-mt-3 text-xs text-gray-400">{PASSWORD_REQUIREMENTS_MESSAGE}</p>}
            {!isSignUp && <Link href="/forgot-password" className="inline-block text-sm text-cyan-300 hover:underline">Forgot password?</Link>}
            {captchaRequired && <CaptchaChallenge onToken={setCaptchaToken} />}
            {message && <p className="rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}
            <button disabled={isLoading || (captchaRequired && !captchaToken)} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{isLoading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}</button>
          </form>
          <Link href="/" className="block text-center text-sm text-gray-400 hover:text-gray-200">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
