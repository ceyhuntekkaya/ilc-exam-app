import { describe, expect, it } from "vitest";
import {
  LEVEL_REPORT_MAX_POLLS,
  LEVEL_REPORT_POLL_MS,
  canRequeue,
  canRequeueAll,
  jobKindLabel,
  jobStatusView,
  levelReportDownloadFailure,
  levelReportRefetchInterval,
  myLevelReportPath,
  safeShareUrl,
  staffLevelReportPath,
  toLevelReportView,
} from "./levelReportModel";

describe("toLevelReportView", () => {
  it("levelReportReady=false → hazırlanıyor; true → indirilebilir; alan yoksa bilinmiyor", () => {
    expect(toLevelReportView({ levelReportReady: false }, "ar-1")).toEqual({ kind: "preparing" });
    expect(toLevelReportView({ available: false }, "ar-1")).toEqual({ kind: "unknown" });
    expect(toLevelReportView(undefined, "ar-1")).toEqual({ kind: "unknown" });
    expect(
      toLevelReportView({ levelReportReady: true, levelReportUrl: "/report/me/results/ar-1/level-report", levelReportVerificationUrl: "https://app.example/verify/ABC" }, "ar-1"),
    ).toEqual({ kind: "ready", downloadPath: "/api/backend/report/me/results/ar-1/level-report", verificationUrl: "https://app.example/verify/ABC" });
  });

  it("hazırken doğrulama bağlantısı yoksa null; yabancı/eski karne PDF yolu kabul edilmez", () => {
    const view = toLevelReportView({ levelReportReady: true, levelReportUrl: "/report/me/results/ar-1/pdf" }, "ar-1");
    expect(view).toEqual({ kind: "ready", downloadPath: "/api/backend/report/me/results/ar-1/level-report", verificationUrl: null });
    expect(myLevelReportPath("ar-1", "https://evil.example/x")).toBe("/api/backend/report/me/results/ar-1/level-report");
  });

  it("personel yolu kuruma ve sonuca bağlıdır", () => {
    expect(staffLevelReportPath("c-1", "ar-9")).toBe("/api/backend/report/companies/c-1/results/ar-9/level-report");
  });
});

describe("levelReportRefetchInterval", () => {
  it("yalnız hazır değilken ve üst sınıra kadar yeniden sorgular", () => {
    expect(levelReportRefetchInterval(false, 0)).toBe(LEVEL_REPORT_POLL_MS);
    expect(levelReportRefetchInterval(false, LEVEL_REPORT_MAX_POLLS)).toBe(false);
    expect(levelReportRefetchInterval(true, 0)).toBe(false);
    expect(levelReportRefetchInterval(undefined, 0)).toBe(false);
  });
});

describe("hatalar ve paylaşım", () => {
  it("404 tek mesaj; http dışı bağlantı paylaşılmaz", () => {
    expect(levelReportDownloadFailure(Object.assign(new Error("x"), { status: 404 }))).toMatch(/henüz hazır değil/);
    expect(safeShareUrl("javascript:alert(1)")).toBeNull();
    expect(safeShareUrl("https://app.example/verify/A")).toBe("https://app.example/verify/A");
    expect(safeShareUrl(null)).toBeNull();
  });
});

describe("ölü mektup", () => {
  it("durum/tür etiketleri ve yeniden kuyruklama kuralları", () => {
    expect(jobStatusView("DEAD")).toEqual({ label: "Ölü mektup", tone: "danger" });
    expect(jobStatusView("???").label).toBe("???");
    expect(jobKindLabel("BACKFILL")).toBe("Geriye dönük");
    expect(canRequeue({ status: "DEAD" })).toBe(true);
    expect(canRequeue({ status: "PENDING" })).toBe(false);
    expect(canRequeueAll("DEAD", [{ status: "DEAD" }])).toBe(true);
    expect(canRequeueAll("DEAD", [])).toBe(false);
    expect(canRequeueAll("PENDING", [{ status: "DEAD" }])).toBe(false);
  });
});
