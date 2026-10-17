import { describe, expect, it } from "vitest";
import { gateForProtected, userTypeFromMe } from "./sessionGate";

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
