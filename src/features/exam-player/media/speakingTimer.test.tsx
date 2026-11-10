import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { finishLockSeconds, secondsLeft } from "@/src/features/exam-player/media/speakingTimer";
import { ThinkCountdown } from "@/src/features/exam-player/media/ThinkCountdown";

describe("speakingTimer", () => {
  it("secondsLeft rounds up and stops at zero", () => {
    expect(secondsLeft(10, 0, 0)).toBe(10);
    expect(secondsLeft(10, 0, 200)).toBe(10);
    expect(secondsLeft(10, 0, 9_001)).toBe(1);
    expect(secondsLeft(10, 0, 10_000)).toBe(0);
    expect(secondsLeft(10, 0, 60_000)).toBe(0);
    expect(secondsLeft(0, 0, 0)).toBe(0);
  });

  it("finish is locked until the minimum speaking time has passed", () => {
    expect(finishLockSeconds(null, 0, 0)).toBe(0);
    expect(finishLockSeconds(0, 0, 0)).toBe(0);
    expect(finishLockSeconds(5, null, 99_000)).toBe(5);
    expect(finishLockSeconds(5, 1_000, 3_000)).toBe(3);
    expect(finishLockSeconds(5, 1_000, 6_000)).toBe(0);
  });
});

describe("ThinkCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down and calls onDone once when time is up", () => {
    const onDone = vi.fn();
    render(<ThinkCountdown seconds={3} onDone={onDone} />);
    expect(screen.getByTestId("think-seconds")).toHaveTextContent("3");

    act(() => vi.advanceTimersByTime(1_100));
    expect(screen.getByTestId("think-seconds")).toHaveTextContent("2");
    expect(onDone).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByTestId("think-seconds")).toHaveTextContent("0");
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(5_000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("I'm ready ends thinking early and the timer does not fire again", () => {
    const onDone = vi.fn();
    render(<ThinkCountdown seconds={10} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "I'm ready" }));
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(11_000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
