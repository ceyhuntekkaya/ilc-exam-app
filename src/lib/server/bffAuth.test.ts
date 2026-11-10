import { describe, expect, it } from "vitest";
import { isInvalidTokenResponse, isPublicAuthPath } from "@/src/lib/server/bffAuth";

describe("isPublicAuthPath", () => {
  it("login, student login, refresh and password recovery never carry the session token", () => {
    for (const path of ["auth/login", "auth/student-login", "auth/refresh", "auth/forgot-password", "auth/reset-password"]) {
      expect(isPublicAuthPath(path, "POST")).toBe(true);
      expect(isPublicAuthPath(`/${path}/`, "post")).toBe(true);
    }
  });

  it("authenticated auth endpoints and look-alikes keep the token", () => {
    expect(isPublicAuthPath("auth/me", "GET")).toBe(false);
    expect(isPublicAuthPath("auth/logout", "POST")).toBe(false);
    expect(isPublicAuthPath("auth/change-password", "POST")).toBe(false);
    expect(isPublicAuthPath("auth/login", "GET")).toBe(false);
    expect(isPublicAuthPath("auth/login/extra", "POST")).toBe(false);
    expect(isPublicAuthPath("authoring/questions", "POST")).toBe(false);
  });
});

describe("isInvalidTokenResponse", () => {
  it("drops the session only on 401 with the RFC 6750 invalid_token signal", () => {
    expect(isInvalidTokenResponse(401, 'Bearer error="invalid_token"')).toBe(true);
    expect(isInvalidTokenResponse(401, "Bearer realm=\"ilc\", error=invalid_token")).toBe(true);
    expect(isInvalidTokenResponse(401, null)).toBe(false);
    expect(isInvalidTokenResponse(401, "Bearer")).toBe(false);
    expect(isInvalidTokenResponse(403, 'Bearer error="invalid_token"')).toBe(false);
    expect(isInvalidTokenResponse(200, null)).toBe(false);
  });
});
