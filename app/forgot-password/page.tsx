"use client";

import { Suspense, type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import Navbar from "@/components/layout/navbar";
import { CaptchaChallenge } from "@/components/auth/captcha-challenge";
import { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE, sendAuthRequest } from "@/components/auth/auth-request";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-background" />}><ForgotPasswordContent /></Suspense>;
}

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY));
  const [captchaToken, setCaptchaToken] = useState("");
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const result = await sendAuthRequest("recover", { email, captchaToken });
    setSending(false);
    setCaptchaRequired(Boolean(result.captchaRequired));
    setEmailSent(result.ok);
    setMessage(result.message ?? "If that email can receive account messages, you will receive instructions shortly.");
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!isStrongPassword(password)) {
      setMessage(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    setResetting(true);
    setMessage("");
    const { error: verificationError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "recovery",
    });
    if (verificationError) {
      setResetting(false);
      setMessage("That recovery code is invalid or has expired. Send a new code and try again.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setResetting(false);
      setMessage("We could not reset the password. Send a new code and try again.");
      return;
    }

    // OTP verification creates a temporary recovery session. End it before
    // returning to sign-in so the new password must be entered explicitly.
    await supabase.auth.signOut({ scope: "local" });
    setResetting(false);
    router.replace(`/sign-in?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-16">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/10">
          <p className="text-sm font-medium text-cyan-300">Account recovery</p>
          <h1 className="mt-2 text-3xl font-bold">Reset your password</h1>
          <p className="mt-3 text-sm text-muted-foreground">Request a one-time code, then set a password that meets TravelAdvisor&apos;s security requirements.</p>

          <form onSubmit={requestCode} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Email address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3" />
            </label>
            {captchaRequired && <CaptchaChallenge onToken={setCaptchaToken} />}
            <button type="submit" disabled={sending || (captchaRequired && !captchaToken)} className="w-full rounded-lg border border-cyan-400 bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
              {sending ? "Sending code…" : emailSent ? "Send a new code" : "Send recovery email"}
            </button>
          </form>

          <div className="my-6 border-t border-border" />

          <form onSubmit={resetPassword} className="space-y-4">
            <label className="block text-sm font-medium">
              Recovery code
              <input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter the code from your email" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3" />
            </label>
            <label className="block text-sm font-medium">
              New password
              <input required type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3" />
            </label>
            <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
            <button type="submit" disabled={resetting || !code || !password} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
              {resetting ? "Resetting password…" : "Reset password"}
            </button>
          </form>

          {message && <p className="mt-4 rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}
          <Link href="/sign-in" className="mt-5 inline-block text-sm text-cyan-300 hover:underline">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
