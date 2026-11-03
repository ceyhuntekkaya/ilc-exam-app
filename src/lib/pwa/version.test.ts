import { afterEach, describe, expect, it, vi } from "vitest";
import { checkStorageQuota, isExamInProgress } from "@/src/lib/pwa/version";

describe("isExamInProgress", () => {
  it("is true while the student is in a section or running the exam", () => {
    expect(isExamInProgress("/student/exams/abc-123/run")).toBe(true);
    expect(isExamInProgress("/student/exams/abc-123/sections")).toBe(true);
    expect(isExamInProgress("/student/exams/abc-123/sections/section-1")).toBe(true);
  });

  it("is false outside the running exam (checks, finished, or unrelated routes)", () => {
    expect(isExamInProgress("/student/exams/abc-123/checks")).toBe(false);
    expect(isExamInProgress("/student/exams/abc-123/finished")).toBe(false);
    expect(isExamInProgress("/staff")).toBe(false);
    expect(isExamInProgress("/")).toBe(false);
  });
});

describe("checkStorageQuota", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports unsupported when the browser has no navigator.storage.estimate", async () => {
    vi.stubGlobal("navigator", {});

    const status = await checkStorageQuota();

    expect(status).toEqual({ supported: false, availableBytes: null, belowThreshold: false });
  });

  it("flags below-threshold when the free quota is smaller than the requested threshold", async () => {
    vi.stubGlobal("navigator", {
      storage: { estimate: async () => ({ usage: 90, quota: 100 }) },
    });

    const status = await checkStorageQuota(50);

    expect(status).toEqual({ supported: true, availableBytes: 10, belowThreshold: true });
  });

  it("does not flag below-threshold when there is plenty of free quota", async () => {
    vi.stubGlobal("navigator", {
      storage: { estimate: async () => ({ usage: 10, quota: 1000 }) },
    });

    const status = await checkStorageQuota(50);

    expect(status).toEqual({ supported: true, availableBytes: 990, belowThreshold: false });
  });
});
