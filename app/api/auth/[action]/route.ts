import { NextResponse, type NextRequest } from "next/server";

import { clearFailedAuthAttempts, checkAuthAttempt, recordFailedAuthAttempt } from "@/lib/auth/rate-limit";
import { isStrongPassword } from "@/lib/auth/password-policy";

const GENERIC_AUTH_ERROR = "We could not complete that request. Check your details and try again.";
const GENERIC_EMAIL_MESSAGE = "If that email can receive messages, you will receive instructions shortly.";
const MIN_RESPONSE_MS = 900;

function getClientAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function respondAfter(startedAt: number, body: Record<string, unknown>, status = 200) {
  const remaining = MIN_RESPONSE_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function authHeaders() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Auth is not configured.");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function supabaseAuth(path: string, payload: Record<string, unknown>) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("Auth is not configured.");
  return fetch(`${base}/auth/v1/${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload), cache: "no-store" });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const startedAt = Date.now();
  const { action } = await params;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const captchaToken = typeof input.captchaToken === "string" && input.captchaToken ? input.captchaToken : undefined;
  const attemptKey = `${getClientAddress(request)}:${action}`;
  const attempt = checkAuthAttempt(attemptKey);

  // Use the same status, response shape, and minimum response time for all
  // unknown/known-email outcomes. Do not pass provider error text to clients.
  if (!attempt.allowed) return respondAfter(startedAt, { ok: false, message: GENERIC_AUTH_ERROR, captchaRequired: true, locked: true }, 429);
  if (attempt.captchaRequired && !captchaToken) return respondAfter(startedAt, { ok: false, message: GENERIC_AUTH_ERROR, captchaRequired: true, locked: false }, 429);
  if (!validEmail(email)) return respondAfter(startedAt, { ok: false, message: action === "recover" ? GENERIC_EMAIL_MESSAGE : GENERIC_AUTH_ERROR, captchaRequired: attempt.captchaRequired });

  try {
    if (action === "signup") {
      if (!isStrongPassword(password)) return respondAfter(startedAt, { ok: false, message: "Choose a stronger password.", passwordPolicy: true, captchaRequired: attempt.captchaRequired });
      const response = await supabaseAuth("signup", { email, password, captcha_token: captchaToken, data: {} });
      // A duplicate email with email confirmations enabled intentionally has
      // an indistinguishable successful response. Do not expose session/error.
      if (!response.ok) recordFailedAuthAttempt(attemptKey); else clearFailedAuthAttempts(attemptKey);
      return respondAfter(startedAt, { ok: true, message: GENERIC_EMAIL_MESSAGE, captchaRequired: false });
    }

    if (action === "signin") {
      // Do this before contacting the provider. It keeps the result identical
      // for known and unknown email addresses while reliably moving every
      // legacy password into the recovery flow.
      if (!isStrongPassword(password)) {
        return respondAfter(startedAt, {
          ok: false,
          message: "For your security, reset your password before signing in.",
          passwordUpgradeRequired: true,
          captchaRequired: false,
        });
      }

      const response = await supabaseAuth("token?grant_type=password", { email, password, captcha_token: captchaToken });
      const result = response.ok ? await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; user?: { email_confirmed_at?: string | null } } | null : null;
      if (!response.ok || !result?.access_token || !result.refresh_token || !result.user?.email_confirmed_at) {
        const failure = recordFailedAuthAttempt(attemptKey);
        return respondAfter(startedAt, { ok: false, message: GENERIC_AUTH_ERROR, captchaRequired: failure.captchaRequired, locked: failure.locked }, failure.locked ? 429 : 200);
      }

      clearFailedAuthAttempts(attemptKey);
      return respondAfter(startedAt, { ok: true, session: { access_token: result.access_token, refresh_token: result.refresh_token }, captchaRequired: false });
    }

    if (action === "recover") {
      // This response deliberately says the same thing for registered and
      // unregistered emails. The one-time recovery secret stays in Supabase.
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
      const response = await supabaseAuth("recover", { email, captcha_token: captchaToken, redirect_to: `${appUrl}/reset-password` });
      if (!response.ok) {
        // Keep the public response generic to prevent account enumeration,
        // but retain a safe operational signal in server logs. Never log the
        // email address, recovery token, or provider response body.
        console.error("Supabase password-recovery request failed", { status: response.status });
        recordFailedAuthAttempt(attemptKey);
      } else {
        clearFailedAuthAttempts(attemptKey);
      }
      return respondAfter(startedAt, { ok: true, message: GENERIC_EMAIL_MESSAGE, captchaRequired: false });
    }
  } catch {
    recordFailedAuthAttempt(attemptKey);
  }

  return respondAfter(startedAt, { ok: false, message: GENERIC_AUTH_ERROR, captchaRequired: true });
}
