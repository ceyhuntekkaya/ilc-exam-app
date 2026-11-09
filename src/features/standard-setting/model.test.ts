import { describe, expect, it } from "vitest";
import {
  angoffFilledCount,
  angoffInvalidIds,
  angoffPayload,
  bookmarkPositionLabel,
  bookmarkPositions,
  canApproveCut,
  consensusState,
  credentialStatusLabel,
  cutApprovalState,
  draftFromSheet,
  isDraftDirty,
  isValidBookmark,
  panelistCredentialLabel,
  parseProbability,
  progressPercent,
  studyActions,
  toProposeRequest,
  validateCutForm,
} from "@/src/features/standard-setting/model";
import { hasMedia, sheetContent } from "@/src/features/standard-setting/sheetContent";

describe("parseProbability", () => {
  it("0..1 aralığını ve virgüllü girişi kabul eder", () => {
    expect(parseProbability("0.65")).toBe(0.65);
    expect(parseProbability("0,65")).toBe(0.65);
    expect(parseProbability("0")).toBe(0);
    expect(parseProbability("1")).toBe(1);
  });
  it("aralık dışı, boş ve sayı olmayanı reddeder", () => {
    for (const bad of ["1.01", "-0.1", "", "  ", "abc", "65%"]) expect(parseProbability(bad)).toBeNull();
  });
});

describe("Angoff taslağı", () => {
  const items = [{ questionVersionId: "a", myValue: 0.4 }, { questionVersionId: "b" }, { questionVersionId: "c", myValue: 0 }];
  it("kâğıttaki kayıtlı değerlerden taslak kurar (0 geçerli değerdir)", () => {
    expect(draftFromSheet(items)).toEqual({ a: "0.4", c: "0" });
  });
  it("yalnız geçerli girişleri gönderir, geçersizleri ayrıca bildirir", () => {
    const draft = { a: "0,5", b: "2", c: "" };
    expect(angoffPayload(draft)).toEqual([{ questionVersionId: "a", value: 0.5 }]);
    expect(angoffInvalidIds(draft)).toEqual(["b"]);
    expect(angoffFilledCount(items, draft)).toBe(1);
  });
  it("değişiklik yoksa kirli değildir", () => {
    expect(isDraftDirty(items, draftFromSheet(items))).toBe(false);
    expect(isDraftDirty(items, { ...draftFromSheet(items), b: "0.3" })).toBe(true);
    expect(isDraftDirty(items, { a: "0,4", c: "0" })).toBe(false);
  });
});

describe("Bookmark", () => {
  it("konumlar 1..n+1", () => {
    expect(bookmarkPositions(3)).toEqual([1, 2, 3, 4]);
    expect(isValidBookmark(4, 3)).toBe(true);
    expect(isValidBookmark(5, 3)).toBe(false);
    expect(isValidBookmark(0, 3)).toBe(false);
    expect(isValidBookmark(null, 3)).toBe(false);
  });
  it("son konum 'hiçbir madde' olarak etiketlenir", () => {
    expect(bookmarkPositionLabel(2, 3)).toBe("2. madde");
    expect(bookmarkPositionLabel(4, 3)).toMatch(/Hiçbir madde/);
  });
});

describe("çalışma eylemleri", () => {
  const panelists = [{ panelistId: "p" }];
  it("panelist yokken tur açılamaz; açık turda kapatılır, sonlandırılamaz", () => {
    expect(studyActions({ status: "OPEN", panelists: [], rounds: [] }).openRound).toBe(false);
    const open = studyActions({ status: "OPEN", panelists, rounds: [{ roundNo: 1, open: true }] });
    expect(open).toMatchObject({ openRound: false, closeRound: true, finalize: false, addPanelist: false, removePanelist: false });
  });
  it("tur kapanınca yeni tur açılabilir ve sonlandırılabilir", () => {
    const a = studyActions({ status: "OPEN", panelists, rounds: [{ roundNo: 1, open: false }] });
    expect(a).toMatchObject({ openRound: true, closeRound: false, finalize: true });
  });
  it("sonlandırılmış çalışmada hiçbir yazma eylemi yok", () => {
    const a = studyActions({ status: "FINALIZED", panelists, rounds: [{ roundNo: 1, open: false }] });
    expect(Object.values(a).every((v) => v === false)).toBe(true);
  });
});

describe("tur istatistiği ve kimlik", () => {
  it("uzlaşma durumları", () => {
    expect(consensusState({ completeCount: 0 }).label).toBe("Hesaplanamadı");
    expect(consensusState({ completeCount: 3, consensusReached: true, consensusThreshold: 0.1, standardError: 0.05 }).tone).toBe("success");
    expect(consensusState({ completeCount: 3, consensusReached: false, consensusThreshold: 0.1, standardError: 0.2 }).tone).toBe("warning");
  });
  it("süresi dolmuş onaylı kimlik ayrı gösterilir", () => {
    expect(panelistCredentialLabel({ credentialStatus: "APPROVED", credentialValidNow: false }).label).toBe("Kimlik süresi doldu");
    expect(panelistCredentialLabel({ credentialStatus: "APPROVED", credentialValidNow: true }).tone).toBe("success");
    expect(credentialStatusLabel("SUSPENDED")).toBe("Askıda");
  });
  it("ilerleme yüzdesi sınırlanır", () => {
    expect(progressPercent(5, 10)).toBe(50);
    expect(progressPercent(5, 0)).toBe(0);
    expect(progressPercent(15, 10)).toBe(100);
  });
});

describe("kesme sürümü", () => {
  it("onay sayısı ve yürürlük durumu", () => {
    expect(cutApprovalState({ approvals: [] }).label).toBe("Onay bekliyor (0/2)");
    expect(cutApprovalState({ approvals: [{ approvedBy: "u1" }] }).label).toBe("Onay bekliyor (1/2)");
    expect(cutApprovalState({ approvals: [{}, {}], approved: true, inEffect: false }).label).toMatch(/yürürlük tarihi bekleniyor/);
    expect(cutApprovalState({ approvals: [{}, {}], approved: true, inEffect: true }).label).toBe("Yürürlükte");
  });
  it("aynı kişi iki kez onaylayamaz; iki onaydan sonra onay düğmesi kapanır", () => {
    expect(canApproveCut({ approvals: [{ approvedBy: "u1" }] }, "u1")).toBe(false);
    expect(canApproveCut({ approvals: [{ approvedBy: "u1" }] }, "u2")).toBe(true);
    expect(canApproveCut({ approvals: [{ approvedBy: "u1" }, { approvedBy: "u2" }], approved: true }, "u3")).toBe(false);
  });
  it("öneri formu doğrulanır ve isteğe çevrilir", () => {
    const empty = validateCutForm({ scaleVersionId: "x", band: "", boundaryKind: "", cut: "", sem: "-1", effectiveFrom: "" });
    expect(Object.keys(empty).sort()).toEqual(["band", "boundaryKind", "cut", "effectiveFrom", "scaleVersionId", "sem"]);
    const form = {
      scaleVersionId: "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b",
      band: "B1",
      boundaryKind: "LEVEL",
      cut: "12,5",
      sem: "",
      effectiveFrom: "2027-01-01T09:00",
    };
    expect(validateCutForm(form)).toEqual({});
    const req = toProposeRequest(form, "study-1");
    expect(req).toMatchObject({ band: "B1", boundaryKind: "LEVEL", cut: 12.5, studyId: "study-1" });
    expect(req).not.toHaveProperty("sem");
    expect(req.effectiveFrom).toMatch(/Z$/);
  });
});

describe("sheetContent", () => {
  const item = {
    body: { instruction: "<p>Oku</p>", stimulus: [{ type: "TEXT", text: { html: "<p>Metin</p>" } }, { type: "IMAGE", mediaId: "m" }] },
    parts: [
      {
        id: "p1",
        interactionType: "MCQ",
        content: {
          stem: [{ type: "TEXT", text: "Soru kökü" }],
          interaction: { options: [{ id: "o1", text: "A" }, { id: "o2", text: { html: "B" } }], answerKey: { correct: "o1" } },
          answerKey: { correct: "o1" },
        },
      },
    ],
  };
  it("yönerge, metin, kök ve seçenekleri çıkarır; anahtarı okumaz", () => {
    const c = sheetContent(item);
    expect(c.instructionHtml).toBe("<p>Oku</p>");
    expect(c.stimulusHtml).toEqual(["<p>Metin</p>"]);
    expect(c.parts[0].stemHtml).toEqual(["Soru kökü"]);
    expect(c.parts[0].options.map((o) => o.text)).toEqual(["A", "B"]);
    expect(JSON.stringify(c)).not.toContain("correct");
  });
  it("medya içeren maddeyi bildirir, bozuk gövdede çökmez", () => {
    expect(hasMedia(item)).toBe(true);
    expect(sheetContent({ body: null, parts: undefined })).toEqual({ instructionHtml: "", stimulusHtml: [], parts: [] });
  });
});

import { credentialActions, dayToInstant, eligiblePanelists, validateCredentialForm } from "@/src/features/standard-setting/model";

describe("panelist kimliği", () => {
  it("duruma göre eylemler", () => {
    expect(credentialActions("PENDING")).toEqual(["approve", "reject"]);
    expect(credentialActions("APPROVED")).toEqual(["suspend"]);
    expect(credentialActions("REJECTED")).toEqual([]);
    expect(credentialActions("SUSPENDED")).toEqual([]);
  });
  it("talep formu: tarih sırası ve personel zorunlu", () => {
    const uuid = "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b";
    expect(validateCredentialForm({ staffUserId: uuid, trainedAt: "2026-01-10", validUntil: "2027-01-10" })).toEqual({});
    expect(validateCredentialForm({ staffUserId: uuid, trainedAt: "2026-01-10", validUntil: "2026-01-10" }).validUntil).toMatch(/sonra/);
    expect(Object.keys(validateCredentialForm({ staffUserId: "", trainedAt: "", validUntil: "" })).length).toBe(3);
    expect(dayToInstant("bozuk")).toBeNull();
  });
  it("panele yalnız onaylı, geçerli, üye olmayan kimlikler eklenebilir", () => {
    const creds = [
      { staffId: "a", status: "APPROVED", validNow: true },
      { staffId: "b", status: "APPROVED", validNow: false },
      { staffId: "c", status: "PENDING", validNow: true },
      { staffId: "d", status: "APPROVED", validNow: true },
      { staffId: "a", status: "APPROVED", validNow: true },
    ];
    expect(eligiblePanelists(creds, ["d"]).map((c) => c.staffId)).toEqual(["a"]);
  });
});
