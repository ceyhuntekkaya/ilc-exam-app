import type { SessionUserType } from "@/src/lib/auth-constants";

export const CHANGE_PASSWORD_PATH = "/change-password";

export type MeBody = { userType?: string; mustChangePassword?: boolean };

export function userTypeFromMe(body: MeBody | null): SessionUserType | null {
  const typ = body?.userType;
  if (typ === "SUPER_ADMIN" || typ === "STAFF" || typ === "STUDENT") return typ;
  return null;
}

/** /auth/me yanıtında zorunlu parola değişimi bayrağı (yalnız açık `true`). */
export function mustChangeFromMe(body: MeBody | null): boolean {
  return body?.mustChangePassword === true;
}

export type GateAction =
  | { kind: "next" }
  | { kind: "login" }
  | { kind: "change-password" }
  | { kind: "home"; userType: SessionUserType };

/**
 * Kabuk, imzasız türle açılmaz. Tür, /auth/me yanıtındadır.
 * Parolasını değiştirmesi gereken kullanıcı hiçbir kabuk rotasını göremez.
 */
export function gateForProtected(
  required: SessionUserType,
  me: SessionUserType | null,
  mustChangePassword = false,
): GateAction {
  if (!me) return { kind: "login" };
  if (mustChangePassword) return { kind: "change-password" };
  if (me !== required) return { kind: "home", userType: me };
  return { kind: "next" };
}

/** /change-password oturum ister; kendisi asla yönlendirmez (döngü yok). */
export function gateForChangePassword(me: SessionUserType | null): GateAction {
  return me ? { kind: "next" } : { kind: "login" };
}

/** /, /login, /login/student: oturumlu kullanıcı kendi başlangıcına (ya da parola değişimine) gider. */
export function gateForEntry(me: SessionUserType | null, mustChangePassword = false): GateAction {
  if (!me) return { kind: "next" };
  if (mustChangePassword) return { kind: "change-password" };
  return { kind: "home", userType: me };
}
