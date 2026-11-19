import { describe, expect, it } from "vitest";
import {
  cancelDescription,
  cancelOutcome,
  manageActions,
  reconcileOutcome,
  toWindowRequest,
  validateReschedule,
} from "./distributionModel";

// Mevcut pencere: 20 Kasım 2026 10:00–14:00 İstanbul (UTC+3) = 07:00–11:00Z
const CURRENT = { windowOpensAt: "2026-11-20T07:00:00Z", windowClosesAt: "2026-11-20T11:00:00Z" };
const BEFORE_WINDOW = new Date("2026-11-19T09:00:00Z");
const DURING_WINDOW = new Date("2026-11-20T08:00:00Z");

describe("manageActions", () => {
  it("taslakta ad, iptal ve silme var; tarih değiştirme yok", () => {
    expect(manageActions({ status: "DRAFT", mode: "OPEN_WINDOW" })).toEqual({
      rename: true,
      reschedule: false,
      close: false,
      cancel: true,
      remove: true,
    });
  });

  it("açık pencere kipinde açılmış dağıtımda tarih değişir, silinemez", () => {
    expect(manageActions({ status: "OPEN", mode: "OPEN_WINDOW" })).toEqual({
      rename: true,
      reschedule: true,
      close: true,
      cancel: true,
      remove: false,
    });
  });

  it("takvimli oturumda tarih değiştirme yok (tarih oturumdan gelir)", () => {
    expect(manageActions({ status: "OPEN", mode: "SCHEDULED_SESSION" }).reschedule).toBe(false);
  });

  it("iptal edilmiş veya kapanmış dağıtımda hiçbir eylem yok", () => {
    for (const status of ["CANCELLED", "CLOSED"] as const) {
      expect(Object.values(manageActions({ status, mode: "OPEN_WINDOW" }))).toEqual([false, false, false, false, false]);
    }
  });
});

describe("validateReschedule", () => {
  it("pencere başlamadan açılış ve kapanış değişebilir", () => {
    expect(validateReschedule(CURRENT, "2026-11-20T11:00", "2026-11-21T14:00", BEFORE_WINDOW)).toBeNull();
  });

  it("kapanış yalnız ileri alınır", () => {
    expect(validateReschedule(CURRENT, "2026-11-20T10:00", "2026-11-20T13:00", BEFORE_WINDOW)).toMatch(/ileri/);
  });

  it("pencere başladıysa açılış değişmez, yalnız kapanış uzar", () => {
    expect(validateReschedule(CURRENT, "2026-11-20T09:00", "2026-11-21T14:00", DURING_WINDOW)).toMatch(/başladı/);
    expect(validateReschedule(CURRENT, "2026-11-20T10:00", "2026-11-21T14:00", DURING_WINDOW)).toBeNull();
  });

  it("kapanış açılıştan sonra ve gelecekte olmalı, iki tarih de zorunlu", () => {
    expect(validateReschedule(CURRENT, "", "2026-11-21T14:00", BEFORE_WINDOW)).toMatch(/zorunlu/);
    expect(validateReschedule(CURRENT, "2026-11-22T10:00", "2026-11-21T14:00", BEFORE_WINDOW)).toMatch(/sonra/);
    const afterWindow = new Date("2026-11-30T00:00:00Z");
    expect(validateReschedule(CURRENT, "2026-11-20T10:00", "2026-11-20T14:00", afterWindow)).toMatch(/gelecekte/);
  });
});

describe("istek ve metinler", () => {
  it("duvar saatini İstanbul anına çevirir", () => {
    expect(toWindowRequest("2026-11-20T10:00", "2026-11-20T14:00")).toEqual({
      windowOpensAt: "2026-11-20T07:00:00.000Z",
      windowClosesAt: "2026-11-20T11:00:00.000Z",
    });
  });

  it("iptal metni taslak ve açık dağıtım için farklıdır; başlamış adayın korunduğunu söyler", () => {
    expect(cancelDescription("DRAFT")).toMatch(/kota etkilenmez/);
    expect(cancelDescription("OPEN")).toMatch(/başlamış veya teslim etmiş adayların hakkı ve sonucu korunur/);
  });

  it("iptal sonucu iade edilen ve korunan aday sayısını yazar", () => {
    expect(cancelOutcome({ releasedCount: 3, keptStartedCount: 2 })).toBe(
      "Dağıtım iptal edildi. 3 adayın hakkı iade edildi. 2 aday sınava başladığı için korundu.",
    );
    expect(cancelOutcome({ releasedCount: 0, keptStartedCount: 0 })).toBe("Dağıtım iptal edildi.");
  });
});

describe("reconcileOutcome", () => {
  it("hak ayrılan ve iade edilen kişi sayısını yazar", () => {
    expect(reconcileOutcome({ addedCount: 3, cancelledCount: 1, skippedForQuotaCount: 0 })).toEqual({
      tone: "success",
      message: "Kural kaydedildi. 3 kişiye hak ayrıldı. 1 kişi hedeften çıktı, hakkı iade edildi.",
    });
  });

  it("hak yetmediği için eklenemeyenleri uyarı tonuyla bildirir", () => {
    const outcome = reconcileOutcome({ addedCount: 2, cancelledCount: 0, skippedForQuotaCount: 5 });
    expect(outcome.tone).toBe("warning");
    expect(outcome.message).toMatch(/5 kişi hak yetmediği için eklenemedi/);
  });

  it("değişiklik yoksa bunu söyler", () => {
    expect(reconcileOutcome({ addedCount: 0, cancelledCount: 0, skippedForQuotaCount: 0 }).message).toMatch(/değişmedi/);
  });
});
