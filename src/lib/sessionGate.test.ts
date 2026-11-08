import { describe, expect, it } from "vitest";
import {
  gateForChangePassword,
  gateForEntry,
  gateForProtected,
  mustChangeFromMe,
  userTypeFromMe,
} from "./sessionGate";

describe("page gate", () => {
  it("sends an unsigned or rejected session to login", () => {
    expect(gateForProtected("SUPER_ADMIN", null)).toEqual({ kind: "login" });
    expect(userTypeFromMe(null)).toBeNull();
    expect(userTypeFromMe({})).toBeNull();
  });

  it("uses the type returned by the session summary", () => {
    expect(userTypeFromMe({ userType: "STAFF" })).toBe("STAFF");
    expect(gateForProtected("SUPER_ADMIN", "STAFF")).toEqual({ kind: "home", userType: "STAFF" });
    expect(gateForProtected("SUPER_ADMIN", "SUPER_ADMIN")).toEqual({ kind: "next" });
  });
});

describe("must-change-password gate", () => {
  it("reads the flag strictly from the session summary", () => {
    expect(mustChangeFromMe({ userType: "STUDENT", mustChangePassword: true })).toBe(true);
    expect(mustChangeFromMe({ userType: "STUDENT", mustChangePassword: false })).toBe(false);
    expect(mustChangeFromMe({ userType: "STUDENT" })).toBe(false);
    expect(mustChangeFromMe(null)).toBe(false);
  });

  it("redirects a must-change user away from every protected shell", () => {
    expect(gateForProtected("STUDENT", "STUDENT", true)).toEqual({ kind: "change-password" });
    expect(gateForProtected("STAFF", "STUDENT", true)).toEqual({ kind: "change-password" });
    expect(gateForProtected("SUPER_ADMIN", "STAFF", true)).toEqual({ kind: "change-password" });
  });

  it("leaves a normal user unaffected", () => {
    expect(gateForProtected("STUDENT", "STUDENT", false)).toEqual({ kind: "next" });
    expect(gateForProtected("STUDENT", "STUDENT")).toEqual({ kind: "next" });
    expect(gateForProtected("STAFF", "STUDENT", false)).toEqual({ kind: "home", userType: "STUDENT" });
  });

  it("still sends an unsigned request to login even if the flag were set", () => {
    expect(gateForProtected("STUDENT", null, true)).toEqual({ kind: "login" });
  });

  it("never redirects /change-password for a signed-in user (no loop)", () => {
    expect(gateForChangePassword("STUDENT")).toEqual({ kind: "next" });
    expect(gateForChangePassword("STAFF")).toEqual({ kind: "next" });
    expect(gateForChangePassword(null)).toEqual({ kind: "login" });
  });

  it("routes signed-in visitors of the entry pages by the flag", () => {
    expect(gateForEntry(null)).toEqual({ kind: "next" });
    expect(gateForEntry("STUDENT", true)).toEqual({ kind: "change-password" });
    expect(gateForEntry("STUDENT", false)).toEqual({ kind: "home", userType: "STUDENT" });
  });
});
