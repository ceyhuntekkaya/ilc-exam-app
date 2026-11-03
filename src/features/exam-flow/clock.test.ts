import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anchorClock, interpolateRemaining, markSleepStart, resolveWakeDrift } from "@/src/features/exam-flow/clock";

/**
 * F3-07/Adım 5: üç saatin ayrıştırılması. `anchorClock`/`interpolateRemaining` zaten
 * `ExamFlowProvider.test.tsx`'teki `useExamClock` testleriyle bileşen seviyesinde dolaylı
 * doğrulanıyor — burada doğrudan, biri de cihaz uykusu (performance.now() durur, Date.now()
 * ilerler) senaryosu.
 */
describe("clock — üç saat ayrıştırması", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("interpolateRemaining ticks down while running, freezes when not running", () => {
    const running = anchorClock(1000, true);
    vi.advanceTimersByTime(400);
    expect(interpolateRemaining(running)).toBe(600);

    const frozen = anchorClock(1000, false);
    vi.advanceTimersByTime(400);
    expect(interpolateRemaining(frozen)).toBe(1000);
  });

  it("interpolateRemaining never goes below zero", () => {
    const running = anchorClock(1000, true);
    vi.advanceTimersByTime(5000);
    expect(interpolateRemaining(running)).toBe(0);
  });

  it("returns null remaining as null (no server clock yet)", () => {
    expect(interpolateRemaining(anchorClock(null, true))).toBeNull();
  });

  it("resolveWakeDrift reports no drift when both clocks agree", () => {
    const mark = markSleepStart();
    vi.advanceTimersByTime(3000);

    const result = resolveWakeDrift(mark);

    expect(result.driftMs).toBeNull();
    expect(result.elapsedMs).toBe(3000);
  });

  it("resolveWakeDrift picks the conservative (larger) elapsed time when the device slept", () => {
    const mark = markSleepStart();
    // Cihaz uykuda: performance.now() 1s ilerler görünür, ama gerçekte (Date.now()) 60s geçti.
    vi.setSystemTime(Date.now() + 60_000);
    vi.spyOn(performance, "now").mockReturnValue(mark.perf + 1000);

    const result = resolveWakeDrift(mark);

    expect(result.driftMs).toBeGreaterThan(0);
    expect(result.elapsedMs).toBe(60_000);
  });

  it("resolveWakeDrift ignores drift within tolerance", () => {
    const mark = markSleepStart();
    vi.setSystemTime(Date.now() + 2500);
    vi.spyOn(performance, "now").mockReturnValue(mark.perf + 2000);

    const result = resolveWakeDrift(mark, 2000);

    expect(result.driftMs).toBeNull();
  });
});
