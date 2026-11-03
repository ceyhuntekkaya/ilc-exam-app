import { describe, expect, it, vi } from "vitest";
import { checkMediaQuota, classifyRecordingError, timeIsUp } from "./recordingGuard";

describe("timeIsUp", () => {
  it("is false when there is no time limit (untimed exam or preview)", () => {
    expect(timeIsUp(null)).toBe(false);
    expect(timeIsUp(undefined)).toBe(false);
  });

  it("is false while time remains", () => {
    expect(timeIsUp(1)).toBe(false);
    expect(timeIsUp(60_000)).toBe(false);
  });

  it("is true once the clock reaches or passes zero", () => {
    expect(timeIsUp(0)).toBe(true);
    expect(timeIsUp(-5)).toBe(true);
  });
});

describe("classifyRecordingError", () => {
  it("flags a real permission denial and asks for the right device", () => {
    const denied = new DOMException("no", "NotAllowedError");
    expect(classifyRecordingError(denied, false).denied).toBe(true);
    expect(classifyRecordingError(denied, false).message).toContain("microphone");
    expect(classifyRecordingError(denied, true).message).toContain("camera and microphone");
  });

  it("does not flag a missing-device error as a permission denial", () => {
    const notFound = new DOMException("no", "NotFoundError");
    const result = classifyRecordingError(notFound, false);
    expect(result.denied).toBe(false);
    expect(result.message).toContain("cannot find");
  });

  it("does not flag a device-busy error as a permission denial", () => {
    const busy = new DOMException("no", "NotReadableError");
    expect(classifyRecordingError(busy, false).denied).toBe(false);
  });

  it("falls back to a generic permission message for an unrecognized error", () => {
    const result = classifyRecordingError(new Error("boom"), false);
    expect(result.denied).toBe(false);
    expect(result.message).toContain("microphone");
  });
});

describe("checkMediaQuota", () => {
  it("warns when projected usage crosses the threshold", async () => {
    const estimate = vi.fn().mockResolvedValue({ usage: 85, quota: 100 });
    vi.stubGlobal("navigator", { storage: { estimate } });

    const result = await checkMediaQuota(10);

    expect(result.lowSpace).toBe(true);
    expect(result.message).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("does not warn when there is plenty of room", async () => {
    const estimate = vi.fn().mockResolvedValue({ usage: 10, quota: 100 });
    vi.stubGlobal("navigator", { storage: { estimate } });

    const result = await checkMediaQuota(5);

    expect(result.lowSpace).toBe(false);
    expect(result.message).toBeNull();
    vi.unstubAllGlobals();
  });

  it("never blocks when the Storage API is unavailable (advisory only)", async () => {
    vi.stubGlobal("navigator", {});

    const result = await checkMediaQuota(999_999_999);

    expect(result.lowSpace).toBe(false);
    vi.unstubAllGlobals();
  });
});
