import type { SessionUserType } from "@/src/lib/auth-constants";

export type MeBody = { userType?: string };

export function userTypeFromMe(body: MeBody | null): SessionUserType | null {
  const typ = body?.userType;
  if (typ === "SUPER_ADMIN" || typ === "STAFF" || typ === "STUDENT") return typ;
  return null;
}

export type GateAction =
  | { kind: "next" }
  | { kind: "login" }
  | { kind: "home"; userType: SessionUserType };

/** Kabuk, imzasız türle açılmaz. Tür, /auth/me yanıtındadır. */
export function gateForProtected(required: SessionUserType, me: SessionUserType | null): GateAction {
  if (!me) return { kind: "login" };
  if (me !== required) return { kind: "home", userType: me };
  return { kind: "next" };
}
