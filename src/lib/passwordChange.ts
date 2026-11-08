import { CHANGE_PASSWORD_PATH } from "@/src/lib/sessionGate";

export const PASSWORD_CHANGE_REQUIRED_CODE = "PASSWORD_CHANGE_REQUIRED";

/** Backend, zorunlu parola değişimi bekleyen oturumlara 403 + bu kodu döner. */
export function isPasswordChangeRequired(status: number, body: unknown): boolean {
  if (status !== 403 || !body || typeof body !== "object") return false;
  return (body as { code?: unknown }).code === PASSWORD_CHANGE_REQUIRED_CODE;
}

/** Tarayıcıda (SSR değil) ve zaten orada değilsek /change-password'e gider. */
export function redirectToChangePassword(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === CHANGE_PASSWORD_PATH) return;
  window.location.assign(CHANGE_PASSWORD_PATH);
}

export type PasswordFormIssue = "too-short" | "same-as-old" | "mismatch";
export const MIN_PASSWORD_LENGTH = 6;

/** İstemci tarafı kontrol; sunucu yine de doğrular. `oldPassword` verilmezse (sıfırlama) o kontrol atlanır. */
export function validateNewPassword(input: {
  newPassword: string;
  confirm: string;
  oldPassword?: string;
}): PasswordFormIssue | null {
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) return "too-short";
  if (input.oldPassword !== undefined && input.newPassword === input.oldPassword) return "same-as-old";
  if (input.newPassword !== input.confirm) return "mismatch";
  return null;
}
