import { describe, expect, it } from "vitest";
import {
  EMPTY_REGISTER_FORM,
  consentFailure,
  isMinorByBirthDate,
  registerFailure,
  toRegisterRequest,
  usernameFromVerify,
  validateRegisterForm,
  verifyFailure,
  type RegisterFormState,
} from "./registrationModel";

const TODAY = new Date(2026, 10, 9); // 9 Kasım 2026

const ADULT: RegisterFormState = {
  email: " Ada@Ornek.com ",
  firstName: " Ada ",
  lastName: " Yılmaz ",
  birthDate: "2000-01-15",
  guardianEmail: "",
};

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

describe("isMinorByBirthDate", () => {
  it("doğum günü geçmediyse bir yaş eksik sayar", () => {
    expect(isMinorByBirthDate("2008-11-10", TODAY)).toBe(true); // 17 yaş, yarın 18
    expect(isMinorByBirthDate("2008-11-09", TODAY)).toBe(false); // bugün 18
  });
  it("geçersiz tarihte bilinmiyor döner", () => {
    expect(isMinorByBirthDate("", TODAY)).toBeNull();
    expect(isMinorByBirthDate("2010-02-31", TODAY)).toBeNull();
  });
});

describe("validateRegisterForm", () => {
  it("yetişkin için geçerli formda sorun yok", () => {
    expect(validateRegisterForm(ADULT, TODAY, false)).toEqual({});
  });
  it("boş formda tüm zorunlu alanları işaretler", () => {
    const issues = validateRegisterForm(EMPTY_REGISTER_FORM, TODAY, false);
    expect(Object.keys(issues).sort()).toEqual(["birthDate", "email", "firstName", "lastName"]);
  });
  it("gelecekteki doğum tarihini reddeder", () => {
    expect(validateRegisterForm({ ...ADULT, birthDate: "2027-01-01" }, TODAY, false).birthDate).toMatch(/gelecekte/);
  });
  it("veli gerekiyorsa veli e-postasını ister ve adayın kendi adresini kabul etmez", () => {
    expect(validateRegisterForm({ ...ADULT, birthDate: "2012-05-05" }, TODAY, true).guardianEmail).toMatch(/gerekir/);
    expect(
      validateRegisterForm({ ...ADULT, birthDate: "2012-05-05", guardianEmail: "ada@ornek.com" }, TODAY, true).guardianEmail,
    ).toMatch(/farklı/);
    expect(
      validateRegisterForm({ ...ADULT, birthDate: "2012-05-05", guardianEmail: "veli@ornek.com" }, TODAY, true),
    ).toEqual({});
  });
});

describe("toRegisterRequest", () => {
  it("metinleri kırpar; veli gerekmiyorsa veli e-postasını göndermez", () => {
    expect(toRegisterRequest({ ...ADULT, guardianEmail: "eski@ornek.com" }, false)).toEqual({
      email: "Ada@Ornek.com",
      firstName: "Ada",
      lastName: "Yılmaz",
      birthDate: "2000-01-15",
    });
  });
  it("veli gerekiyorsa veli e-postasını ekler", () => {
    expect(toRegisterRequest({ ...ADULT, birthDate: "2012-05-05", guardianEmail: " veli@ornek.com " }, true)).toMatchObject({
      guardianEmail: "veli@ornek.com",
    });
  });
});

describe("hata mesajı eşlemeleri", () => {
  it("kayıt: 429 sabit metin, 400 sunucu açıklaması, veli isteği alanı açar", () => {
    expect(registerFailure(httpError(429, "rate limit exceeded")).message).toMatch(/Çok fazla deneme/);
    const guardian = registerFailure(httpError(400, "Reşit olmayan aday için veli e-postası zorunlu"));
    expect(guardian.message).toBe("Reşit olmayan aday için veli e-postası zorunlu");
    expect(guardian.needsGuardian).toBe(true);
    expect(registerFailure(httpError(400, "geçersiz email")).needsGuardian).toBe(false);
    expect(registerFailure(httpError(500, "boom")).message).toMatch(/yeniden deneyin/);
  });
  it("doğrulama: kısa parola ile geçersiz bağlantı ayrılır", () => {
    expect(verifyFailure(httpError(400, "Parola en az 6 karakter olmalı"))).toEqual({
      message: "Parola en az 6 karakter olmalı",
      invalidLink: false,
    });
    expect(verifyFailure(httpError(400, "Geçersiz veya süresi dolmuş doğrulama bağlantısı")).invalidLink).toBe(true);
    expect(verifyFailure(httpError(500, "x")).invalidLink).toBe(false);
  });
  it("veli onayı: 400 geçersiz bağlantı", () => {
    expect(consentFailure(httpError(400, "Geçersiz veya süresi dolmuş veli onay bağlantısı")).invalidLink).toBe(true);
    expect(consentFailure(httpError(429, "x")).invalidLink).toBe(false);
  });
});

describe("usernameFromVerify", () => {
  it("yanıttan kullanıcı adını okur", () => {
    expect(usernameFromVerify({ userId: "u", username: "ilc100001" })).toBe("ilc100001");
    expect(usernameFromVerify({})).toBeNull();
    expect(usernameFromVerify(undefined)).toBeNull();
  });
});
