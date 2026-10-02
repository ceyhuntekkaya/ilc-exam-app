export const ACCESS_TOKEN_COOKIE = "ilc_access_token";
export const USER_TYPE_COOKIE = "ilc_user_type";

export type SessionUserType = "SUPER_ADMIN" | "STAFF" | "STUDENT";

export function homePathForUserType(userType: SessionUserType | string): string {
  switch (userType) {
    case "SUPER_ADMIN":
      return "/admin";
    case "STAFF":
      return "/staff";
    case "STUDENT":
      return "/student";
    default:
      return "/login";
  }
}

export function loginPathForUserType(userType: SessionUserType | string): string {
  return userType === "STUDENT" ? "/login/student" : "/login";
}

/** Decode JWT payload without verifying signature (verify stays on the API). */
export function readJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json =
      typeof atob === "function"
        ? atob(part.replace(/-/g, "+").replace(/_/g, "/"))
        : Buffer.from(part, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function userTypeFromToken(token: string): SessionUserType | null {
  const payload = readJwtPayload(token);
  const typ = payload?.typ;
  if (typ === "SUPER_ADMIN" || typ === "STAFF" || typ === "STUDENT") {
    return typ;
  }
  return null;
}
