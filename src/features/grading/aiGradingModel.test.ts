import { describe, expect, it } from "vitest";
import {
  ESCAPE_REASON_TEXT,
  aggregateRuns,
  answerBadges,
  escapeReasonText,
  isUnreviewedAi,
  runFinished,
  runProgressText,
  runSummaryText,
} from "./aiGradingModel";

const labels = (item: Parameters<typeof answerBadges>[0]) => answerBadges(item).map((b) => b.label);

describe("R-30 rozet eşlemesi", () => {
  it.each([
    ["PROMPT_MISSING", "Bu sorunun AI metni yok"],
    ["MODEL_NOT_CONFIGURED", "Dil modeli ayarlanmamış"],
    ["STT_NOT_CONFIGURED", "Ses tanıma ayarlanmamış"],
    ["POLICY_HUMAN", "Bu sınav insan puanlaması istiyor"],
    ["MODEL_ERROR", "AI değerlendiremedi"],
    ["SUSPICIOUS", "Olası talimat içeriği"],
  ])("escapeReason %s okunur Türkçe metinle gösterilir", (reason, text) => {
    expect(escapeReasonText(reason)).toBe(text);
    expect(labels({ escapeReason: reason, scored: false })).toContain(text);
  });

  it("EMPTY / TOO_SHORT / NONSENSE için de metin var; tanımsız neden ham gösterilir", () => {
    for (const r of ["EMPTY", "TOO_SHORT", "NONSENSE"]) expect(ESCAPE_REASON_TEXT[r as keyof typeof ESCAPE_REASON_TEXT]).toBeTruthy();
    expect(escapeReasonText("YENI_NEDEN")).toBe("YENI_NEDEN");
    expect(escapeReasonText(null)).toBeNull();
  });

  it("PENDING → Sırada, RUNNING → AI değerlendiriyor", () => {
    expect(labels({ jobStatus: "PENDING" })).toEqual(["Sırada"]);
    expect(labels({ jobStatus: "RUNNING" })).toEqual(["AI değerlendiriyor"]);
  });

  it("AI_ACCEPTED + reviewedBy boş → 'AI puanı — gözden geçirilmedi'; örneklemdeyse 'Denetim bekliyor' da", () => {
    expect(labels({ scoreSource: "AI_ACCEPTED", reviewedBy: null, scored: true })).toEqual(["AI puanı — gözden geçirilmedi"]);
    expect(labels({ scoreSource: "AI_ACCEPTED", scored: true, auditPending: true })).toEqual([
      "AI puanı — gözden geçirilmedi",
      "Denetim bekliyor",
    ]);
  });

  it("insan onaylamış AI puanında ve insan puanında 'gözden geçirilmedi' çıkmaz", () => {
    expect(isUnreviewedAi({ scoreSource: "AI_ACCEPTED", reviewedBy: "u1" })).toBe(false);
    expect(isUnreviewedAi({ scoreSource: "HUMAN", reviewedBy: null })).toBe(false);
    expect(labels({ scoreSource: "HUMAN", reviewedBy: "u1", scored: true })).toEqual([]);
  });

  it("puanlanmış cevapta eski insana düşme nedeni gösterilmez", () => {
    expect(labels({ escapeReason: "MODEL_ERROR", scored: true })).toEqual([]);
  });
});

describe("R-30 koşum ilerlemesi", () => {
  const running = { status: "RUNNING", total: 10, done: 3, failed: 1, awaitingReview: 2, pending: 3, running: 1 };
  const finished = { status: "COMPLETED", total: 4, done: 2, failed: 0, awaitingReview: 2, pending: 0, running: 0 };

  it("bitti = sırada ve çalışan iş kalmadı", () => {
    expect(runFinished(running)).toBe(false);
    expect(runFinished(finished)).toBe(true);
    expect(runFinished(undefined)).toBe(false);
  });

  it("x / y bitti, z insan bekliyor", () => {
    const p = aggregateRuns([running, finished]);
    expect(p).toMatchObject({ total: 14, finished: 10, awaitingReview: 4, failed: 1, done: false });
    expect(runProgressText(p)).toBe("10 / 14 bitti, 4 insan bekliyor");
    expect(aggregateRuns([finished]).done).toBe(true);
    expect(aggregateRuns([finished, undefined]).done).toBe(false);
  });

  it("sıraya alınan / atlanan özeti", () => {
    expect(runSummaryText({ queued: 5, skippedScored: 2, skippedActive: 1 })).toBe(
      "5 cevap sıraya alındı, 3 atlandı (2 zaten puanlı, 1 zaten sırada)",
    );
    expect(runSummaryText({ queued: 1 })).toBe("1 cevap sıraya alındı");
  });
});
