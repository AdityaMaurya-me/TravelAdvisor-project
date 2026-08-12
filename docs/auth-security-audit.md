# Authentication security audit — 12 August 2026

## Scope

Email/password sign-up, sign-in, password recovery, password reset, and the
Supabase Auth configuration used by TravelAdvisor.

## Findings fixed in application code

| Risk | Vulnerable implementation | Fix applied |
| --- | --- | --- |
| User enumeration | `if (result.error) setMessage(result.error.message)` exposed Supabase messages such as invalid credentials or duplicate-user outcomes in both `app/sign-in/page.tsx` and `components/auth/auth-modal-provider.tsx`. | Both interfaces now call `POST /api/auth/[action]`. It returns a generic response, with a fixed minimum 900 ms response duration, and never forwards provider error details. Sign-up and recovery both use: `If that email can receive messages, you will receive instructions shortly.` |
| Direct browser auth calls bypassed controls | `supabase.auth.signUp({ email, password })` and `supabase.auth.signInWithPassword({ email, password })` ran in the browser. | Replaced with a server-side auth boundary that applies validation, a generic response policy, attempt tracking, and CAPTCHA escalation before accessing Supabase Auth. |
| No application lockout | No failed-attempt tracking existed. | `lib/auth/rate-limit.ts` locks a client IP/action after five failed attempts in 15 minutes and requires CAPTCHA after three. This is an additional layer; hosted Supabase rate limits remain mandatory. |
| Weak new passwords | Password controls were only `minLength={6}`. | New and reset passwords require 12+ characters with lowercase, uppercase, digit, and symbol through `lib/auth/password-policy.ts`. Any sign-in attempt with a legacy weak password is redirected to recovery before a provider request or browser session is created, so the result does not reveal whether the email exists. |
| Missing recovery UI | No forgot-password/reset route existed. | Added `/forgot-password` and `/reset-password`. The reset screen verifies a Supabase recovery OTP and then uses `auth.updateUser`; it never creates, stores, logs, or exposes an app-owned reset token. |
| Recovery link secret in app URLs | There was no controlled recovery flow. | The local recovery template uses `{{ .Token }}` as a typed one-time code. `otp_expiry = 3600`; Supabase verifies the code as single-use. Do not use a template containing `{{ .ConfirmationURL }}` for recovery if the requirement is no token in URLs. |

## Auth provider guarantees

TravelAdvisor never handles password hashing. Supabase Auth hashes passwords
using **bcrypt** with a random salt; the application sends passwords only over
HTTPS to Supabase Auth and never writes them to its database or logs. There is
no MD5, SHA-256, plaintext password, custom reset-token table, or custom token
logging path in this repository.

## Local Supabase policy changed

`supabase/config.toml` now sets:

```toml
minimum_password_length = 12
password_requirements = "lower_upper_letters_digits_symbols"

[auth.captcha]
enabled = true
provider = "turnstile"

[auth.email]
enable_confirmations = true
secure_password_change = true
max_frequency = "60s"
otp_expiry = 3600
```

It also reduces sign-up/sign-in and OTP verification limits to 10 per five
minutes for local Supabase.

## Required hosted Supabase work

`supabase/config.toml` changes configure local Supabase only. In the hosted
Supabase dashboard, an owner must mirror these settings:

1. **Authentication → Providers → Email:** enable **Confirm email**.
2. **Authentication → Settings → Password security:** minimum 12 characters,
   all character classes, and secure password change / reauthentication.
3. **Authentication → Bot and Abuse Protection:** enable Cloudflare Turnstile,
   then enter its secret key.
4. **Authentication → Rate limits:** set sign-in/sign-up and OTP verification
   limits to 10 per 5 minutes or stricter; use an email resend cooldown of at
   least 60 seconds.
5. **Authentication → URL configuration:** allow only the production domain,
   `http://localhost:3000` for local development, and `/reset-password`.
6. **Authentication → Email templates → Recovery:** use the code-only template
   in `supabase/templates/recovery.html`. On new Free projects using Supabase's
   default SMTP, template editing may be unavailable; use custom SMTP if that
   restriction applies.
7. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in local and Vercel environments.
   Keep the Turnstile secret out of all `NEXT_PUBLIC_*` variables.

## Limits of app-level rate limiting

The app-level memory lockout is per running Next.js instance. It improves local
and single-instance protection but cannot be the only production control on a
serverless deployment. Hosted Supabase rate limits and Turnstile are the
cross-instance enforcement layer. For a global custom lockout, add a managed
rate-limit store such as Upstash Redis or Vercel KV.

When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is configured, the CAPTCHA is presented
from the first request because Supabase's CAPTCHA enforcement is global. When
it is not configured, the application keeps the CAPTCHA escalation state but
does not pretend it is enforcing a challenge; complete the hosted setup before
production.

## Verification

Run `npm.cmd run typecheck` and `npm.cmd run lint`. Then manually test: an
unknown email, an existing email with wrong password, duplicate sign-up, and
password recovery. Compare the wording, HTTP response shape, and minimum
response timing at `/api/auth/[action]`.
