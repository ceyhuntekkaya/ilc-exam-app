import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExamClock } from "@/src/features/exam-flow/ExamFlowProvider";
import type { ExamState } from "@/src/features/exam-flow/schema";

/**
 * F3-00 referans testi 3: sahte zamanlayıcıyla süre dolunca geri sayım sıfıra iner (ve sıfırın
 * altına İNMEZ — `Math.max(0, ...)`, satır 510). `useExamClock` 03-INDEX.md'nin bulgu #2'si
 * ("zamanlayıcı zaten monoton, performance.now() ile") — gerçek, EXPORT EDİLMİŞ hook, ama
 * bugün hiçbir bileşen tarafından çağrılmıyor (K-05'teki putPosition bulgusuyla AYNI örüntü:
 * kütüphane hazır, çağıran yok). Gerçek oto-teslim bugün sunucu tarafında (AutoSubmitJob.sweep,
 * F0-08) — bu test istemci tarafının saymayı DOĞRU yaptığını doğruluyor, oto-teslime bağlamıyor
 * (bağlayacak bir üretim kodu yok).
 */
function ClockProbe({ clock, held }: { clock: ExamState["clock"] | null; held: boolean }) {
  const left = useExamClock(held, clock);
  return <div data-testid="left">{left == null ? "null" : Math.round(left)}</div>;
}

describe("useExamClock — monoton geri sayım", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down to exactly zero and does not go negative", () => {
    const clock: ExamState["clock"] = {
      examRemainingMs: 1000,
      sectionRemainingMs: null,
      running: true,
      serverNow: new Date().toISOString(),
      timeWarningSeconds: null,
    };
    renderWithProviders(<ClockProbe clock={clock} held={false} />);

    expect(screen.getByTestId("left")).toHaveTextContent("1000");

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(Number(screen.getByTestId("left").textContent)).toBeLessThanOrEqual(1000);
    expect(Number(screen.getByTestId("left").textContent)).toBeGreaterThan(0);

    // Süre çok aşılır — negatife İNMEMELİ (Math.max(0, ...)).
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("left")).toHaveTextContent("0");
  });

  it("freezes the countdown while held (e.g. focus lost) instead of continuing to tick", () => {
    const clock: ExamState["clock"] = {
      examRemainingMs: 1000,
      sectionRemainingMs: null,
      running: true,
      serverNow: new Date().toISOString(),
      timeWarningSeconds: null,
    };
    renderWithProviders(<ClockProbe clock={clock} held={true} />);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByTestId("left")).toHaveTextContent("1000");
  });
});
