import { describe, expect, it } from "vitest";
import {
  DATA_KINDS,
  activeHolds,
  appStatusView,
  blockerText,
  canActOnRequest,
  canExecuteRequest,
  canWaive,
  daysText,
  dryRunBody,
  executeBody,
  executionStatusView,
  holdFailureMessage,
  isDryRunReport,
  policyRows,
  realRunGate,
  requestStatusView,
  runItems,
  runTotals,
  stateView,
  summarizeExecution,
  toExecuteBody,
  toSetPolicyRequest,
  toSubmitBody,
  validateDays,
  validateHold,
  validateOptionalCompany,
  validatePolicyReason,
  validateWaiver,
} from "./retentionModel";

describe("veri türleri ve politika satırları", () => {
  it("6 veri türü; YANIT için psikometri uyarısı var, hiçbirinde süre değeri yok", () => {
    expect(DATA_KINDS.map((d) => d.code)).toEqual(["SES", "FOTOGRAF", "DOKUM", "YANIT", "OLAY_GUNLUGU", "KAYIT_PII"]);
    expect(DATA_KINDS.find((d) => d.code === "YANIT")?.warning).toMatch(/Psikometri istatistik çıkarımı bu veriyi okuyor/);
    expect(DATA_KINDS.filter((d) => d.warning)).toHaveLength(1);
    expect(JSON.stringify(DATA_KINDS)).not.toMatch(/\b\d+ gün\b/);
  });
  it("eksik türler de satır olarak çizilir (view=null)", () => {
    const rows = policyRows([{ dataKind: "SES", state: "ACTIVE", retentionDays: 10 }]);
    expect(rows).toHaveLength(6);
    expect(rows[0].view?.dataKind).toBe("SES");
    expect(rows[1].view).toBeNull();
  });
  it("karar bekliyor ≠ etkin; bilinmeyen durum da 'çalışmaz' sayılır; süresiz metni", () => {
    expect(stateView("WAITING_FOR_DECISION")).toMatchObject({ label: "Karar bekliyor — silme çalışmaz", waiting: true });
    expect(stateView("ACTIVE").waiting).toBe(false);
    expect(stateView(undefined).waiting).toBe(true);
    expect(daysText(null)).toBe("Süresiz");
    expect(daysText(undefined)).toBe("Süresiz");
    expect(daysText(90)).toBe("90 gün");
  });
});

describe("politika girişi", () => {
  it("boş süre = süresiz (null) ve varsayılan yoktur; sayı doğrulanır", () => {
    expect(validateDays("")).toEqual({ value: null, error: null });
    expect(validateDays(" 30 ")).toEqual({ value: 30, error: null });
    expect(validateDays("0").error).toMatch(/1 ile/);
    expect(validateDays("36501").error).toMatch(/1 ile/);
    expect(validateDays("3.5").error).toMatch(/Tam sayı/);
  });
  it("gerekçe zorunlu (500 sınır); süresiz null açıkça gönderilir", () => {
    expect(validatePolicyReason("  ")).toMatch(/zorunlu/);
    expect(validatePolicyReason("x".repeat(501))).toMatch(/500/);
    expect(validatePolicyReason("Hukuk 2026/1")).toBeNull();
    expect(toSetPolicyRequest("SES", null, " Hukuk ")).toEqual({ dataKind: "SES", retentionDays: null, reason: "Hukuk" });
    expect(toSetPolicyRequest("YANIT", 45, "k")).toMatchObject({ retentionDays: 45 });
  });
});

describe("kuru koşum / gerçek silme düğme kuralları", () => {
  it("kuru koşum gövdesi dryRun:true'yu açıkça taşır; gerçek koşum dryRun:false", () => {
    expect(dryRunBody("")).toEqual({ dryRun: true });
    expect(dryRunBody(" c-1 ")).toEqual({ companyId: "c-1", dryRun: true });
    expect(executeBody("")).toEqual({ dryRun: false });
  });
  it("silme bayrağı kapalı/bilinmiyorsa gerçek silme devre dışı; açıkken de önce aynı kapsamda kuru koşum gerekir", () => {
    expect(realRunGate({ executeEnabled: false, dryRunScope: "", scope: "" })).toMatchObject({ allowed: false });
    expect(realRunGate({ executeEnabled: false, dryRunScope: "", scope: "" }).reason).toMatch(/Silme KAPALI/);
    expect(realRunGate({ executeEnabled: undefined, dryRunScope: "", scope: "" }).allowed).toBe(false);
    expect(realRunGate({ executeEnabled: true, dryRunScope: null, scope: "" }).reason).toMatch(/kuru koşum/);
    expect(realRunGate({ executeEnabled: true, dryRunScope: "", scope: "c-1" }).allowed).toBe(false);
    expect(realRunGate({ executeEnabled: true, dryRunScope: "c-1", scope: " c-1 " })).toEqual({ allowed: true, reason: null });
  });
  it("kurum kimliği isteğe bağlı UUID", () => {
    expect(validateOptionalCompany("")).toBeNull();
    expect(validateOptionalCompany("abc")).toMatch(/UUID/);
    expect(validateOptionalCompany("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b")).toBeNull();
  });
  it("koşum raporu: tip çakışmasına karşı savunmalı okuma ve toplamlar", () => {
    const report = { mode: "DRY_RUN", items: [{ dataKind: "SES", eligible: 3, blocked: 1, erased: 0, failed: 0, skippedNoPolicy: false }, { dataKind: "YANIT", skippedNoPolicy: true }] } as never;
    const items = runItems(report);
    expect(runTotals(items)).toEqual({ eligible: 3, blocked: 1, erased: 0, failed: 0, skipped: 1 });
    expect(runItems(undefined)).toEqual([]);
    expect(runItems({ items: "x" } as never)).toEqual([]);
    expect(isDryRunReport({ mode: "DRY_RUN" })).toBe(true);
    expect(isDryRunReport({ mode: "EXECUTE" })).toBe(false);
  });
});

describe("yasal tutma", () => {
  it("UUID ve gerekçe doğrulanır; yalnız serbest bırakılmamış tutmalar listelenir", () => {
    expect(validateHold("x", "")).toEqual({ scopeId: "Geçerli bir kapsam kimliği (UUID) girin", reason: "Gerekçe zorunlu" });
    expect(validateHold("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b", "Mahkeme")).toEqual({});
    expect(activeHolds([{ id: "1" }, { id: "2", releasedAt: "2026-01-01T00:00:00Z" }])).toHaveLength(1);
  });
  it("açık itirazlı denemede 409 sunucu mesajı aynen gösterilir", () => {
    const err = Object.assign(new Error("Bu denemenin AÇIK itiraz dosyası var; önce itiraz dosyası kapatılmalı"), { status: 409 });
    expect(holdFailureMessage(err)).toBe("Bu denemenin AÇIK itiraz dosyası var; önce itiraz dosyası kapatılmalı");
  });
});

describe("talep üzerine silme", () => {
  it("talep durumları ve yalnız açık talepte işlem", () => {
    expect(requestStatusView("DEFERRED").label).toMatch(/Ertelendi/);
    expect(canActOnRequest({ status: "RECEIVED" })).toBe(true);
    expect(canActOnRequest({ status: "DEFERRED" })).toBe(true);
    expect(canActOnRequest({ status: "COMPLETED" })).toBe(false);
    expect(canActOnRequest({ status: "REJECTED" })).toBe(false);
  });
  it("gerçek yürütme yalnız aynı talep için kuru koşum görülmüşse; varsayılan gövde dryRun", () => {
    const req = { id: "r1", status: "RECEIVED" };
    expect(canExecuteRequest({ request: req, previewedRequestId: null, previewDryRun: true })).toBe(false);
    expect(canExecuteRequest({ request: req, previewedRequestId: "r2", previewDryRun: true })).toBe(false);
    expect(canExecuteRequest({ request: req, previewedRequestId: "r1", previewDryRun: false })).toBe(false);
    expect(canExecuteRequest({ request: req, previewedRequestId: "r1", previewDryRun: true })).toBe(true);
    expect(canExecuteRequest({ request: { id: "r1", status: "COMPLETED" }, previewedRequestId: "r1", previewDryRun: true })).toBe(false);
    expect(toExecuteBody({ dryRun: true })).toEqual({ dryRun: true });
    expect(toExecuteBody({ dryRun: false })).toEqual({ dryRun: false });
  });
  it("Execution durumları açıklamalı: DEFERRED/COMPLETED/WOULD_*", () => {
    expect(executionStatusView("DEFERRED").description).toMatch(/kimlik anonimleştirilmedi/);
    expect(executionStatusView("COMPLETED").description).toMatch(/anonimleştirildi/);
    expect(executionStatusView("WOULD_DEFER").label).toMatch(/Kuru koşum/);
    expect(executionStatusView("WOULD_COMPLETE").description).toMatch(/Hiçbir şey silinmedi/);
  });
  it("deneme sonuçları ve engel metinleri", () => {
    expect(appStatusView("BLOCKED").label).toMatch(/silinmedi/);
    expect(blockerText("LEGAL_HOLD")).toBe("Yasal tutma var");
    expect(blockerText("OPEN_APPEAL")).toBe("Açık itiraz dosyası var");
    expect(blockerText("NONE")).toBeNull();
    expect(blockerText(null)).toBeNull();
    expect(blockerText("YENI_KOD")).toBe("YENI_KOD");
    const s = summarizeExecution({ failed: 0, applications: [{ status: "ERASED" }, { status: "BLOCKED", blocker: "LEGAL_HOLD" }, { status: "NOTHING_TO_DO" }] });
    expect(s).toEqual({ applications: 3, erased: 1, blocked: 1, failed: 0 });
  });
  it("yerleşmemiş deneme kararı yalnız NOT_SETTLED'da önerilir (tutma/itiraz asla); gerekçe zorunlu; seçim yoksa alan gönderilmez", () => {
    expect(canWaive({ blocker: "NOT_SETTLED" })).toBe(true);
    expect(canWaive({ blocker: "LEGAL_HOLD" })).toBe(false);
    expect(canWaive({ blocker: "OPEN_APPEAL" })).toBe(false);
    expect(validateWaiver([], "")).toBeNull();
    expect(validateWaiver(["a1"], " ")).toMatch(/gerekçe zorunlu/);
    expect(validateWaiver(["a1"], "x".repeat(501))).toMatch(/500/);
    expect(toExecuteBody({ dryRun: false, waive: ["a1"], waiverReason: " Terk " })).toEqual({ dryRun: false, waiveUnsettled: ["a1"], waiverReason: "Terk" });
  });
  it("aday talebi gövdesi: gerekçe isteğe bağlı", () => {
    expect(toSubmitBody({ reason: "  " })).toEqual({});
    expect(toSubmitBody({ reason: " Silin " })).toEqual({ reason: "Silin" });
    expect(toSubmitBody({ subjectUserId: "u1", reason: "" })).toEqual({ subjectUserId: "u1" });
  });
});
