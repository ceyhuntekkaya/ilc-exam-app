import { describe, expect, it } from "vitest";
import {
  EMPTY_BASICS,
  EMPTY_MODE,
  EMPTY_RULE,
  candidateCounts,
  canViewResult,
  hasIncludeRule,
  isNotStartedError,
  omittedRows,
  openOutcome,
  quotaState,
  toCreateRequest,
  toModeRequest,
  toRuleRequest,
  toUpdateRequest,
  validateBasics,
  validateMode,
  validateRule,
} from "./distributionModel";

const ID = "11111111-2222-3333-4444-555555555555";
const BASICS = { name: "  Kasım Denemesi ", packageId: "pkg-1", skuId: "sku-1", examId: ID };

describe("kip zorunluluğu (K-U07)", () => {
  it("kip seçilmeden doğrulama geçmez ve istek üretilemez", () => {
    expect(validateMode(EMPTY_MODE)).toMatch(/kip seçilmeden devam edilemez/);
    expect(() => toModeRequest(EMPTY_MODE)).toThrow();
  });

  it("açık pencere iki tarih ister ve kapanış açılıştan sonra olmalı", () => {
    const open = { ...EMPTY_MODE, kind: "OPEN_WINDOW" as const };
    expect(validateMode(open)).toMatch(/zorunlu/);
    expect(validateMode({ ...open, opensAt: "2026-11-10T10:00", closesAt: "2026-11-10T09:00" })).toMatch(/sonra/);
    expect(validateMode({ ...open, opensAt: "2026-11-10T10:00", closesAt: "2026-11-11T10:00" })).toBeNull();
  });

  it("takvimli oturum merkez oturumu ister", () => {
    const sched = { ...EMPTY_MODE, kind: "SCHEDULED_SESSION" as const };
    expect(validateMode(sched)).toMatch(/oturum/);
    expect(validateMode({ ...sched, centerSessionId: "abc" })).toMatch(/UUID/);
    expect(validateMode({ ...sched, centerSessionId: ID })).toBeNull();
  });
});

describe("form -> istek", () => {
  it("açık pencere: İstanbul saatini UTC'ye çevirir, oturum göndermez", () => {
    const mode = toModeRequest({ kind: "OPEN_WINDOW", opensAt: "2026-11-10T10:00", closesAt: "2026-11-11T12:30", centerSessionId: ID });
    expect(mode).toEqual({
      mode: "OPEN_WINDOW",
      windowOpensAt: "2026-11-10T07:00:00.000Z",
      windowClosesAt: "2026-11-11T09:30:00.000Z",
    });
    expect(mode.centerSessionId).toBeUndefined();
  });

  it("takvimli oturum: pencere göndermez", () => {
    const mode = toModeRequest({ kind: "SCHEDULED_SESSION", opensAt: "2026-11-10T10:00", closesAt: "2026-11-11T12:30", centerSessionId: ` ${ID} ` });
    expect(mode).toEqual({ mode: "SCHEDULED_SESSION", centerSessionId: ID });
  });

  it("oluşturma isteği adı kırpar ve tüm alanları taşır", () => {
    const req = toCreateRequest(BASICS, { ...EMPTY_MODE, kind: "SCHEDULED_SESSION", centerSessionId: ID });
    expect(req).toEqual({
      name: "Kasım Denemesi",
      skuId: "sku-1",
      packageId: "pkg-1",
      examId: ID,
      mode: { mode: "SCHEDULED_SESSION", centerSessionId: ID },
    });
  });

  it("güncellemede sınav seçilmediyse examId gönderilmez", () => {
    const req = toUpdateRequest({ ...BASICS, examId: "" }, { ...EMPTY_MODE, kind: "SCHEDULED_SESSION", centerSessionId: ID });
    expect(req.examId).toBeUndefined();
    expect(req.name).toBe("Kasım Denemesi");
  });

  it("temel bilgi doğrulaması", () => {
    expect(validateBasics(EMPTY_BASICS)).toMatch(/ad/);
    expect(validateBasics({ ...BASICS, packageId: "" })).toMatch(/paketi/);
    expect(validateBasics({ ...BASICS, examId: "" })).toMatch(/sınav/);
    expect(validateBasics({ ...BASICS, examId: "" }, { draftExists: true })).toBeNull();
    expect(validateBasics(BASICS)).toBeNull();
  });
});

describe("hedefleme kuralları", () => {
  it("alt ağaç varsayılan kapalı", () => {
    expect(EMPTY_RULE.includeSubtree).toBe(false);
    expect(toRuleRequest({ ...EMPTY_RULE, refId: ID })).toEqual({ type: "UNIT", exclude: false, refId: ID, includeSubtree: false });
  });

  it("rol kuralı yalnız rol taşır; liste kuralı alt ağaç taşımaz", () => {
    expect(toRuleRequest({ ...EMPTY_RULE, type: "MEMBERSHIP_ROLE", role: "TEACHER", refId: ID, includeSubtree: true })).toEqual({
      type: "MEMBERSHIP_ROLE",
      exclude: false,
      role: "TEACHER",
    });
    expect(toRuleRequest({ ...EMPTY_RULE, type: "STATIC_LIST", refId: ID, exclude: true, includeSubtree: true })).toEqual({
      type: "STATIC_LIST",
      exclude: true,
      refId: ID,
    });
  });

  it("UUID doğrulaması", () => {
    expect(validateRule({ ...EMPTY_RULE, refId: "x" })).toMatch(/UUID/);
    expect(validateRule({ ...EMPTY_RULE, refId: ID })).toBeNull();
    expect(validateRule({ ...EMPTY_RULE, type: "MEMBERSHIP_ROLE" })).toBeNull();
  });

  it("yalnız hariç tutma kuralı hedef sayılmaz", () => {
    expect(hasIncludeRule([])).toBe(false);
    expect(hasIncludeRule([{ exclude: true }])).toBe(false);
    expect(hasIncludeRule([{ exclude: true }, { exclude: false }])).toBe(true);
  });
});

describe("kota uyarısı", () => {
  it("hak yetmiyorsa 'N kişi hedefleniyor, kalan hak M' uyarısı ve atlanacak sayı verir", () => {
    const q = quotaState({ quotaRequired: 120, quotaAvailable: 80 });
    expect(q).toMatchObject({ warn: true, required: 120, available: 80, skipped: 40 });
    if (q.warn) expect(q.message).toBe("120 kişi hedefleniyor, kalan hak 80.");
  });

  it("negatif bakiye 0 sayılır", () => {
    const q = quotaState({ quotaRequired: 10, quotaAvailable: -3 });
    expect(q).toMatchObject({ warn: true, available: 0, skipped: 10 });
  });

  it("uyarı alanları yoksa ya da hak yetiyorsa uyarı yok", () => {
    expect(quotaState({}).warn).toBe(false);
    expect(quotaState(null).warn).toBe(false);
    expect(quotaState({ quotaRequired: 5, quotaAvailable: 5 }).warn).toBe(false);
  });
});

describe("önizleme ve açma sonucu", () => {
  it("sıfır olan eleme nedenleri listelenmez", () => {
    expect(omittedRows({ omittedByReason: { NO_ACTIVE_MEMBERSHIP: 2, AGE_BAND_MISMATCH: 0 } })).toEqual([
      { reason: "NO_ACTIVE_MEMBERSHIP", count: 2 },
    ]);
  });

  it("açma sonucu üç sayıyı da gösterir; atlanan/çakışan varsa uyarı tonu", () => {
    const o = openOutcome({ allocatedCount: 70, skippedForQuotaCount: 5, conflictCount: 2 });
    expect(o.tone).toBe("warning");
    expect(o.lines).toHaveLength(3);
    expect(openOutcome({ allocatedCount: 3, skippedForQuotaCount: 0, conflictCount: 0 })).toMatchObject({ tone: "success" });
  });
});

describe("aday izleme (K-U06)", () => {
  it("durum sayıları", () => {
    expect(candidateCounts([{ status: "ALLOCATED" }, { status: "STARTED" }, { status: "STARTED" }, { status: "CANCELLED" }])).toEqual({
      total: 4,
      notStarted: 1,
      started: 2,
      cancelled: 1,
    });
  });

  it("sonuç yalnız denemesi olan adaya açılır", () => {
    expect(canViewResult({ ilcIdentityId: "i", latestApplicationId: "a" })).toBe(true);
    expect(canViewResult({ ilcIdentityId: "i" })).toBe(false);
  });

  it("backend 'başlamadı' hatasını tanır", () => {
    expect(isNotStartedError(new Error("Aday bu dağıtımda henüz sınava başlamadı: x"))).toBe(true);
    expect(isNotStartedError(new Error("başka"))).toBe(false);
  });
});
