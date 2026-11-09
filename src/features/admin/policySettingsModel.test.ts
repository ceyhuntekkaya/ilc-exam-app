import { describe, expect, it } from "vitest";
import {
  KEY_DEFS,
  currentSetting,
  defOf,
  displayValue,
  effectiveValue,
  historyChange,
  normalizeValue,
  policyFailureMessage,
  resolveEffectiveFrom,
  scheduledSettings,
  toChangeRequest,
  validateReason,
} from "@/src/features/admin/policySettingsModel";

const NOW = new Date("2026-11-09T12:00:00Z");
const def = (key: string) => defOf(key)!;

describe("anahtar tanımları", () => {
  it("15 anahtarın hepsi tanımlı; boş kalamayanların varsayılanı var", () => {
    expect(KEY_DEFS).toHaveLength(15);
    for (const d of KEY_DEFS.filter((x) => !x.nullable)) expect(d.fallback, d.key).not.toBeNull();
  });
  it("ticari/hukuki karar bekleyen anahtarlar varsayılansız ve işaretli", () => {
    expect(def("GUARDIAN_CONSENT_TIMEOUT_DAYS")).toMatchObject({ pendingDecision: "hukuki", fallback: null });
    expect(def("ORDER_UNCONDITIONAL_REFUND_WINDOW_DAYS")).toMatchObject({ pendingDecision: "ticari", fallback: null });
  });
});

describe("etkin değer", () => {
  const rows = [
    { id: "1", value: "30", effectiveFrom: "2026-01-01T00:00:00Z", status: "SUPERSEDED" },
    { id: "2", value: "45", effectiveFrom: "2026-10-01T00:00:00Z", status: "ACTIVE" },
    { id: "3", value: "60", effectiveFrom: "2027-01-01T00:00:00Z", status: "ACTIVE" },
  ];
  it("yürürlük tarihi geçmiş en yeni satır etkindir; gelecektekiler planlıdır", () => {
    expect(currentSetting(rows, NOW)?.id).toBe("2");
    expect(scheduledSettings(rows, NOW).map((r) => r.id)).toEqual(["3"]);
  });
  it("kayıt yoksa kod varsayılanı; varsayılan da yoksa 'Tanımsız' (+ karar bekliyor)", () => {
    expect(effectiveValue(def("RETAKE_WAITING_PERIOD_DAYS"), [], NOW)).toEqual({ text: "30 gün", source: "fallback", pending: false });
    expect(effectiveValue(def("ORDER_REFUND_RATE_AFTER_WINDOW"), [], NOW)).toEqual({ text: "Tanımsız", source: "undefined", pending: true });
    expect(effectiveValue(def("RETAKE_MAX_ATTEMPTS"), [], NOW)).toMatchObject({ text: "Tanımsız", pending: false });
  });
  it("kayıtlı null değer 'Tanımsız' görünür (kod varsayılanına düşmez)", () => {
    const v = effectiveValue(def("ORDER_EXPIRY_DAYS"), [{ id: "x", value: undefined, effectiveFrom: "2026-10-01T00:00:00Z" }], NOW);
    expect(v).toMatchObject({ text: "Tanımsız", source: "setting" });
  });
  it("etiketler: seçenek, oran, birim", () => {
    expect(displayValue(def("RETAKE_SCORE_POLICY"), "BEST")).toBe("En iyi deneme");
    expect(displayValue(def("PREVIOUS_CERTIFICATE_ACTION"), "KEEP_BOTH")).toBe("İkisi de geçerli kalır");
    expect(displayValue(def("ORDER_REFUND_RATE_AFTER_WINDOW"), "0.5")).toBe("0,5");
    expect(displayValue(def("APPEAL_WINDOW_DAYS"), "30")).toBe("30 gün");
    expect(displayValue(def("APPEAL_WINDOW_DAYS"), null)).toBe("Tanımsız");
  });
});

describe("değer doğrulaması", () => {
  it("boş değer yalnız nullable anahtarda null olur", () => {
    expect(normalizeValue(def("RETAKE_MAX_ATTEMPTS"), "  ")).toEqual({ value: null, error: null });
    expect(normalizeValue(def("APPEAL_WINDOW_DAYS"), "").error).toMatch(/boş/);
  });
  it("tam sayı, aralık ve ondalık (virgül kabul)", () => {
    expect(normalizeValue(def("APPEAL_WINDOW_DAYS"), "45")).toEqual({ value: "45", error: null });
    expect(normalizeValue(def("APPEAL_WINDOW_DAYS"), "4,5").error).toMatch(/Tam sayı/);
    expect(normalizeValue(def("APPEAL_WINDOW_DAYS"), "0").error).toMatch(/En az 1/);
    expect(normalizeValue(def("ORDER_REFUND_RATE_AFTER_WINDOW"), "0,5")).toEqual({ value: "0.5", error: null });
    expect(normalizeValue(def("ORDER_REFUND_RATE_AFTER_WINDOW"), "1.5").error).toMatch(/En çok 1/);
    expect(normalizeValue(def("ORDER_REFUND_RATE_AFTER_WINDOW"), "abc").error).toMatch(/Sayı/);
    expect(normalizeValue(def("ORDER_EXPIRY_DAYS"), "-1")).toEqual({ value: "-1", error: null });
  });
  it("kapalı değer kümesi: listede olmayan reddedilir", () => {
    expect(normalizeValue(def("RETAKE_SCORE_POLICY"), "BEST")).toEqual({ value: "BEST", error: null });
    expect(normalizeValue(def("RETAKE_SCORE_POLICY"), "WORST").error).toMatch(/Listeden/);
  });
  it("gerekçe zorunlu", () => {
    expect(validateReason("  ")).toMatch(/zorunlu/);
    expect(validateReason("Hukuk görüşü")).toBeNull();
  });
});

describe("yürürlük tarihi ve istek", () => {
  it("'hemen' birkaç dakika ilerisine konur (sunucu geçmiş tarihi reddeder)", () => {
    const r = resolveEffectiveFrom("soon", "", NOW);
    expect(r.error).toBeNull();
    expect(new Date(r.iso!).getTime()).toBeGreaterThan(NOW.getTime());
  });
  it("ileri tarih: boş, bozuk ve geçmiş reddedilir", () => {
    expect(resolveEffectiveFrom("scheduled", "", NOW).error).toMatch(/zorunlu/);
    expect(resolveEffectiveFrom("scheduled", "bozuk", NOW).error).toMatch(/Geçerli/);
    expect(resolveEffectiveFrom("scheduled", "2026-11-01T09:00", NOW).error).toMatch(/gelecekte/);
    expect(resolveEffectiveFrom("scheduled", "2027-01-01T09:00", NOW).error).toBeNull();
  });
  it("istek GLOBAL kapsamlı; null değerde 'value' gönderilmez", () => {
    expect(toChangeRequest("45", "2026-11-09T12:05:00.000Z", " Hukuk görüşü ")).toEqual({ scope: "GLOBAL", value: "45", effectiveFrom: "2026-11-09T12:05:00.000Z", reason: "Hukuk görüşü" });
    expect(toChangeRequest(null, "2026-11-09T12:05:00.000Z", "x")).not.toHaveProperty("value");
  });
  it("hata mesajları sunucu metniyle; geçmiş değişikliği okunur", () => {
    expect(policyFailureMessage(Object.assign(new Error("effectiveFrom geçmişte olamaz"), { status: 400 }))).toMatch(/geçmişte/);
    expect(policyFailureMessage(Object.assign(new Error("Yetki yok: center:manage"), { status: 403 }))).toMatch(/Yetki yok/);
    expect(policyFailureMessage("?")).toBe("Ayar kaydedilemedi");
    expect(historyChange({ oldValue: "30", newValue: "45" }, def("APPEAL_WINDOW_DAYS"))).toBe("30 gün → 45 gün");
    expect(historyChange({ oldValue: undefined, newValue: "BEST" }, def("RETAKE_SCORE_POLICY"))).toBe("Tanımsız → En iyi deneme");
  });
});
