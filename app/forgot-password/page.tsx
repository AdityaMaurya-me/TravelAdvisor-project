"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import Navbar from "@/components/layout/navbar";
import { CaptchaChallenge } from "@/components/auth/captcha-challenge";
import { sendAuthRequest } from "@/components/auth/auth-request";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? ""); const [message, setMessage] = useState(""); const [captchaRequired, setCaptchaRequired] = useState(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)); const [captchaToken, setCaptchaToken] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); const result = await sendAuthRequest("recover", { email, captchaToken }); setLoading(false); setMessage(result.message ?? "If that email can receive messages, you will receive instructions shortly."); setCaptchaRequired(Boolean(result.captchaRequired)); };
  return <main className="min-h-screen bg-background"><Navbar /><section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-16"><div className="w-full rounded-2xl border border-border bg-card p-6"><p className="text-sm font-medium text-cyan-300">Account recovery</p><h1 className="mt-2 text-3xl font-bold">Reset your password</h1><p className="mt-3 text-sm text-muted-foreground">Enter your email. If it can receive account messages, we’ll send recovery instructions.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3" /></label>{captchaRequired && <CaptchaChallenge onToken={setCaptchaToken} />}{message && <p className="rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}<button disabled={loading || (captchaRequired && !captchaToken)} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{loading ? "Please wait…" : "Send recovery instructions"}</button></form><Link href="/sign-in" className="mt-5 inline-block text-sm text-cyan-300 hover:underline">Back to sign in</Link></div></section></main>;
}
