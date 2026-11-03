import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamState } from "@/src/features/exam-flow/schema";

const sectionContentMock = vi.fn();
const loadPackagedSectionContentMock = vi.fn();
vi.mock("@/src/features/exam-flow/api", () => ({ sectionContent: sectionContentMock }));
vi.mock("@/src/features/exam-player/offline/packageStore", () => ({
  loadPackagedSectionContent: loadPackagedSectionContentMock,
}));

const { loadSectionContent, useExamClock } = await import("@/src/features/exam-flow/ExamFlowProvider");

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

/**
 * F3-05/Adım 4: bölüm içeriği önce ağdan istenir; ağ hata verirse (uçak modu) önceden
 * indirilmiş pakete düşülür. Paket de yoksa orijinal ağ hatası çağırana geçer (sessizce
 * yutulmaz — `page.tsx` hâlâ bir hata gösterebilsin).
 */
describe("loadSectionContent — çevrimdışı düşme yolu", () => {
  beforeEach(() => {
    sectionContentMock.mockReset();
    loadPackagedSectionContentMock.mockReset();
  });

  it("returns the network response when the network succeeds", async () => {
    sectionContentMock.mockResolvedValue([{ examQuestionId: "q1" }]);

    const result = await loadSectionContent("app-1", "token", "sec-1");

    expect(result).toEqual([{ examQuestionId: "q1" }]);
    expect(loadPackagedSectionContentMock).not.toHaveBeenCalled();
  });

  it("falls back to the downloaded package when the network fails", async () => {
    sectionContentMock.mockRejectedValue(new Error("network down"));
    loadPackagedSectionContentMock.mockResolvedValue([{ examQuestionId: "q1" }]);

    const result = await loadSectionContent("app-1", "token", "sec-1");

    expect(result).toEqual([{ examQuestionId: "q1" }]);
    expect(loadPackagedSectionContentMock).toHaveBeenCalledWith("app-1", "sec-1");
  });

  it("rethrows the original network error when there is no package either", async () => {
    const networkError = new Error("network down");
    sectionContentMock.mockRejectedValue(networkError);
    loadPackagedSectionContentMock.mockResolvedValue(null);

    await expect(loadSectionContent("app-1", "token", "sec-1")).rejects.toBe(networkError);
  });
});
