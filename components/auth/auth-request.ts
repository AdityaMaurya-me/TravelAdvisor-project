import { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password-policy";

export type AuthAction = "signup" | "signin" | "recover";
export type AuthResponse = { ok: boolean; message?: string; session?: { access_token: string; refresh_token: string }; captchaRequired?: boolean; locked?: boolean; passwordPolicy?: boolean; passwordUpgradeRequired?: boolean };

export { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE };

export async function sendAuthRequest(action: AuthAction, input: { email: string; password?: string; captchaToken?: string }) {
  const response = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store" });
  return response.json().catch(() => ({ ok: false, message: "We could not complete that request. Check your details and try again." })) as Promise<AuthResponse>;
}
