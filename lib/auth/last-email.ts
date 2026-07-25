const LAST_EMAIL_KEY = "traveladvisor:last-sign-in-email";

export function getLastSignInEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LAST_EMAIL_KEY) ?? "";
}

export function rememberSignInEmail(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
}
