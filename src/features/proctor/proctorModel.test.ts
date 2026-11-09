import { describe, expect, it } from "vitest";
import {
  credentialActions,
  credentialStatusLabel,
  credentialStatusTone,
  dayToInstant,
  downgradeWarning,
  isCredentialValidNow,
  proctorFailureMessage,
  roleLabel,
  toAssignRequest,
  toCredentialRequest,
  validateAssign,
  validateCredentialRequest,
} from "@/src/features/proctor/proctorModel";

const UUID = "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b";
const NOW = new Date("2026-11-09T12:00:00Z");

describe("gözetmen rolleri", () => {
  it("Türkçe etiketler", () => {
    expect(roleLabel("ILC_PERSONNEL")).toBe("ILC personeli");
    expect(roleLabel("ACCREDITED_EXTERNAL")).toBe("Akredite harici gözetmen");
    expect(roleLabel("INSTITUTION_STAFF")).toBe("Kurum personeli");
    expect(roleLabel(undefined)).toBe("—");
  });
  it("atama formu: boş personel = kendisi; rol zorunlu; sınır tam sayı", () => {
    expect(validateAssign({ staffId: "", role: "INSTITUTION_STAFF", maxCandidates: "" })).toEqual({});
    expect(validateAssign({ staffId: "x", role: "", maxCandidates: "0" })).toEqual({
      staffId: expect.any(String),
      role: expect.any(String),
      maxCandidates: expect.any(String),
    });
    expect(toAssignRequest({ staffId: "", role: "ILC_PERSONNEL", maxCandidates: "" })).toEqual({ role: "ILC_PERSONNEL" });
    expect(toAssignRequest({ staffId: ` ${UUID} `, role: "ACCREDITED_EXTERNAL", maxCandidates: "12" })).toEqual({ staffId: UUID, role: "ACCREDITED_EXTERNAL", maxCandidates: 12 });
  });
  it("downgraded=true uyarı verir; değilse null", () => {
    expect(downgradeWarning({ downgraded: false, requestedRole: "ACCREDITED_EXTERNAL", effectiveRole: "ACCREDITED_EXTERNAL" })).toBeNull();
    const w = downgradeWarning({ downgraded: true, requestedRole: "ACCREDITED_EXTERNAL", effectiveRole: "INSTITUTION_STAFF" })!;
    expect(w).toContain("Akredite harici gözetmen");
    expect(w).toContain("Kurum personeli");
    expect(w).toMatch(/akreditasyon geçerli değil/);
  });
  it("hata: 409/403/400 sunucu mesajıyla aynen", () => {
    expect(proctorFailureMessage(Object.assign(new Error("Bu personel bu seansa zaten atanmış"), { status: 409 }))).toBe("Bu personel bu seansa zaten atanmış");
    expect(proctorFailureMessage(Object.assign(new Error("ILC personeli rolü yalnız merkez (ILC) kadrosundan atanabilir"), { status: 409 }))).toMatch(/yalnız merkez/);
    expect(proctorFailureMessage("?", "Gözetmen atanamadı")).toBe("Gözetmen atanamadı");
  });
});

describe("akreditasyon", () => {
  it("durum etiketleri ve tonlar", () => {
    expect(credentialStatusLabel("PENDING")).toBe("Onay bekliyor");
    expect(credentialStatusLabel("SUSPENDED")).toBe("Askıda");
    expect(credentialStatusTone("APPROVED")).toBe("success");
    expect(credentialStatusTone("REJECTED")).toBe("danger");
  });
  it("onaylı ama süresi dolmuş akreditasyon geçerli sayılmaz", () => {
    expect(isCredentialValidNow({ status: "APPROVED", validUntil: "2027-01-01T00:00:00Z" }, NOW)).toBe(true);
    expect(isCredentialValidNow({ status: "APPROVED", validUntil: "2026-01-01T00:00:00Z" }, NOW)).toBe(false);
    expect(isCredentialValidNow({ status: "PENDING", validUntil: "2027-01-01T00:00:00Z" }, NOW)).toBe(false);
  });
  it("onay/red/askı yalnız merkeze: kurum için eylem listesi BOŞ", () => {
    expect(credentialActions({ status: "PENDING" }, true)).toEqual(["approve", "reject"]);
    expect(credentialActions({ status: "APPROVED" }, true)).toEqual(["suspend"]);
    expect(credentialActions({ status: "REJECTED" }, true)).toEqual([]);
    expect(credentialActions({ status: "PENDING" }, false)).toEqual([]);
    expect(credentialActions({ status: "APPROVED" }, false)).toEqual([]);
  });
  it("talep formu: personel, eğitim tarihi, gelecekteki bitiş", () => {
    expect(validateCredentialRequest({ staffId: UUID, trainedAt: "2026-10-01", validUntil: "2027-10-01" }, NOW)).toEqual({});
    expect(validateCredentialRequest({ staffId: UUID, trainedAt: "2026-10-01", validUntil: "2026-10-02" }, NOW).validUntil).toMatch(/gelecekte/);
    expect(validateCredentialRequest({ staffId: UUID, trainedAt: "2026-10-01", validUntil: "2026-10-01" }, NOW).validUntil).toMatch(/sonra/);
    expect(Object.keys(validateCredentialRequest({ staffId: "", trainedAt: "", validUntil: "" }, NOW)).sort()).toEqual(["staffId", "trainedAt", "validUntil"]);
    expect(dayToInstant("bozuk")).toBeNull();
    expect(toCredentialRequest({ staffId: ` ${UUID}`, trainedAt: "2026-10-01", validUntil: "2027-10-01" }).staffId).toBe(UUID);
  });
});
