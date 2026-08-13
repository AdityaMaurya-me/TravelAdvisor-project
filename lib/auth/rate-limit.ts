import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const CAPTCHA_AFTER = 3;

type AttemptCheck = { allowed: boolean; captchaRequired: boolean; locked: boolean; retryAfterSeconds: number };
type AttemptFailure = { captchaRequired: boolean; locked: boolean };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function hashAttemptKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function checkAuthAttempt(keyHash: string): Promise<AttemptCheck> {
  const supabase = serviceClient();
  if (!supabase) return { allowed: true, captchaRequired: true, locked: false, retryAfterSeconds: 0 };
  const { data, error } = await supabase.rpc("auth_rate_limit_check", {
    p_key_hash: keyHash, p_window_seconds: WINDOW_SECONDS, p_captcha_after: CAPTCHA_AFTER,
  });
  if (error || !data?.[0]) return { allowed: false, captchaRequired: true, locked: false, retryAfterSeconds: 0 };
  const result = data[0] as { allowed: boolean; captcha_required: boolean; locked: boolean; retry_after_seconds: number };
  return { allowed: result.allowed, captchaRequired: result.captcha_required, locked: result.locked, retryAfterSeconds: result.retry_after_seconds };
}

export async function recordFailedAuthAttempt(keyHash: string): Promise<AttemptFailure> {
  const supabase = serviceClient();
  if (!supabase) return { captchaRequired: true, locked: false };
  const { data, error } = await supabase.rpc("auth_rate_limit_record_failure", {
    p_key_hash: keyHash, p_window_seconds: WINDOW_SECONDS, p_max_failures: MAX_ATTEMPTS,
    p_lockout_seconds: LOCKOUT_SECONDS, p_captcha_after: CAPTCHA_AFTER,
  });
  if (error || !data?.[0]) return { captchaRequired: true, locked: false };
  const result = data[0] as { captcha_required: boolean; locked: boolean };
  return { captchaRequired: result.captcha_required, locked: result.locked };
}

export async function clearFailedAuthAttempts(keyHash: string) {
  const supabase = serviceClient();
  if (!supabase) return;
  await supabase.rpc("auth_rate_limit_clear", { p_key_hash: keyHash });
}
