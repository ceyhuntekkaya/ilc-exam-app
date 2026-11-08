import { describe, expect, it, vi } from "vitest";
import { writeSessionCookies } from "./session-cookies";

function store() {
  return { set: vi.fn(), delete: vi.fn() };
}

describe("writeSessionCookies", () => {
  it("writes access, refresh and user type for a normal login", () => {
    const s = store();
    writeSessionCookies(s, { accessToken: "a", refreshToken: "r", userType: "STUDENT" });
    expect(s.set.mock.calls.map((c) => c[0])).toEqual(["ilc_access_token", "ilc_refresh_token", "ilc_user_type"]);
    expect(s.delete).not.toHaveBeenCalled();
  });

  it("never writes an empty refresh cookie when none is given", () => {
    const s = store();
    writeSessionCookies(s, { accessToken: "a", refreshToken: undefined, userType: "STUDENT" });
    expect(s.set.mock.calls.map((c) => c[0])).toEqual(["ilc_access_token", "ilc_user_type"]);
  });

  it("a must-change session keeps only the access cookie and drops a stale refresh cookie", () => {
    const s = store();
    writeSessionCookies(s, { accessToken: "a", refreshToken: "leak", userType: "STUDENT", mustChangePassword: true });
    expect(s.set.mock.calls.map((c) => c[0])).not.toContain("ilc_refresh_token");
    expect(s.delete).toHaveBeenCalledWith("ilc_refresh_token");
  });
});
