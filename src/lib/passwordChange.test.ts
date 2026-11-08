import { describe, expect, it } from "vitest";
import { isPasswordChangeRequired, validateNewPassword } from "./passwordChange";

describe("isPasswordChangeRequired", () => {
  it("matches only 403 with the PASSWORD_CHANGE_REQUIRED code", () => {
    expect(isPasswordChangeRequired(403, { error: "x", code: "PASSWORD_CHANGE_REQUIRED" })).toBe(true);
    expect(isPasswordChangeRequired(403, { error: "x" })).toBe(false);
    expect(isPasswordChangeRequired(401, { code: "PASSWORD_CHANGE_REQUIRED" })).toBe(false);
    expect(isPasswordChangeRequired(403, "text")).toBe(false);
    expect(isPasswordChangeRequired(403, null)).toBe(false);
  });
});

describe("validateNewPassword", () => {
  it("requires at least 6 characters", () => {
    expect(validateNewPassword({ newPassword: "abc12", confirm: "abc12" })).toBe("too-short");
    expect(validateNewPassword({ newPassword: "abc123", confirm: "abc123" })).toBeNull();
  });
  it("must differ from the old password when given", () => {
    expect(validateNewPassword({ oldPassword: "secret1", newPassword: "secret1", confirm: "secret1" })).toBe("same-as-old");
  });
  it("requires a matching confirmation", () => {
    expect(validateNewPassword({ oldPassword: "old123", newPassword: "new1234", confirm: "new1235" })).toBe("mismatch");
    expect(validateNewPassword({ oldPassword: "old123", newPassword: "new1234", confirm: "new1234" })).toBeNull();
  });
});
