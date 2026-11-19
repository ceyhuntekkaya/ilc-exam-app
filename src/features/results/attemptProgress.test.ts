import { describe, expect, it } from "vitest";
import {
  attendanceLabel,
  canOpenPaper,
  canPrintReportCard,
  canPublish,
  evaluationLabel,
  progressCounts,
} from "./attemptProgress";

describe("attemptProgress", () => {
  it("hiç açmayan, açıp başlamayan ve cevap vermeyen öğrencinin üçü de 'Girmedi'dir; alt neden ayrılır", () => {
    expect(attendanceLabel({ attendance: "NOT_STARTED" })).toMatchObject({ label: "Girmedi", detail: "Sınavı hiç açmadı" });
    expect(attendanceLabel({ attendance: "ABSENT", absentReason: "NOT_STARTED" })).toMatchObject({ label: "Girmedi", detail: "Sınavı açtı, başlamadı" });
    expect(attendanceLabel({ attendance: "ABSENT", absentReason: "NO_ANSWER" })).toMatchObject({ label: "Girmedi", detail: "Sorulara geldi, hiç cevap vermedi" });
    expect(evaluationLabel({ attendance: "ABSENT" }).label).toBe("Değerlendirme dışı");
  });

  it("teslim nedenini gösterir", () => {
    expect(attendanceLabel({ attendance: "TAKEN", finishedReason: "STUDENT_FINISHED" }).label).toBe("Teslim etti");
    expect(attendanceLabel({ attendance: "TAKEN", finishedReason: "EXAM_TIME_UP" }).label).toBe("Süre doldu");
    expect(attendanceLabel({ attendance: "TAKEN", finishedReason: "WINDOW_CLOSED" }).label).toBe("Sınav kapandı");
  });

  it("değerlendirme: otomatik tamam, elle eksik sayısı; tamam; yayınlandı", () => {
    expect(evaluationLabel({ attendance: "TAKEN", gradingState: "AWAITING_MANUAL", manualTotal: 4, manualPending: 3 }))
      .toMatchObject({ label: "Tamamlanmadı", detail: "Otomatik tamam · elle değerlendirme 3 eksik (1/4)" });
    expect(evaluationLabel({ attendance: "TAKEN", gradingState: "READY", manualTotal: 2 }).label).toBe("Değerlendirme tamam");
    expect(evaluationLabel({ attendance: "TAKEN", gradingState: "PUBLISHED" }).label).toBe("Yayınlandı");
  });

  it("girmeyen öğrencinin kâğıdı açılamaz; teslim eden ve sınavı sürenin açılır", () => {
    expect(canOpenPaper({ attendance: "ABSENT", applicationId: "a" })).toBe(false);
    expect(canOpenPaper({ attendance: "NOT_STARTED" })).toBe(false);
    expect(canOpenPaper({ attendance: "IN_EXAM", status: "CHECKING", applicationId: "a" })).toBe(false);
    expect(canOpenPaper({ attendance: "IN_EXAM", status: "IN_PROGRESS", applicationId: "a" })).toBe(true);
    expect(canOpenPaper({ attendance: "TAKEN", applicationId: "a" })).toBe(true);
  });

  it("yayınla ve karne yalnız değerlendirme tamamsa çıkar", () => {
    const pending = { attendance: "TAKEN" as const, gradingState: "AWAITING_MANUAL" as const, evaluationComplete: false, resultId: undefined };
    const ready = { attendance: "TAKEN" as const, gradingState: "READY" as const, evaluationComplete: true, resultId: "r", published: false };
    const done = { ...ready, gradingState: "PUBLISHED" as const, published: true };
    expect(canPublish(pending)).toBe(false);
    expect(canPrintReportCard(pending)).toBe(false);
    expect(canPublish(ready)).toBe(true);
    expect(canPrintReportCard(ready)).toBe(true);
    expect(canPublish(done)).toBe(false);
    expect(canPrintReportCard(done)).toBe(true);
  });

  it("sayaçlar", () => {
    expect(progressCounts([
      { attendance: "NOT_STARTED" },
      { attendance: "ABSENT" },
      { attendance: "IN_EXAM" },
      { attendance: "TAKEN", evaluationComplete: false },
      { attendance: "TAKEN", evaluationComplete: true },
      { attendance: "TAKEN", evaluationComplete: true, published: true },
      { attendance: "INVALIDATED" },
    ])).toEqual({ total: 7, notTaken: 2, inExam: 1, taken: 3, pending: 1, complete: 1, published: 1 });
  });
});
