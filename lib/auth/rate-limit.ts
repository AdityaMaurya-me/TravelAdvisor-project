type Attempt = { timestamps: number[]; lockedUntil: number };

const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Lightweight application-instance throttle. Supabase Auth's own project
 * rate limits remain the authoritative cross-instance protection. This stops
 * rapid retries before a request reaches the identity provider.
 */
export function checkAuthAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key) ?? { timestamps: [], lockedUntil: 0 };
  current.timestamps = current.timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
  if (current.lockedUntil > now) {
    attempts.set(key, current);
    return { allowed: false, retryAfterSeconds: Math.ceil((current.lockedUntil - now) / 1000), captchaRequired: true };
  }
  return { allowed: true, retryAfterSeconds: 0, captchaRequired: current.timestamps.length >= 3 };
}

export function recordFailedAuthAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key) ?? { timestamps: [], lockedUntil: 0 };
  current.timestamps = current.timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
  current.timestamps.push(now);
  if (current.timestamps.length >= MAX_ATTEMPTS) current.lockedUntil = now + LOCKOUT_MS;
  attempts.set(key, current);
  return { locked: current.lockedUntil > now, captchaRequired: current.timestamps.length >= 3 };
}

export function clearFailedAuthAttempts(key: string) {
  attempts.delete(key);
}
