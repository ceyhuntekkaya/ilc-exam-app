import type { RegisterRequest } from "@/src/api/generated/models";

/** Reşit olma yaşı sunucuda politika ayarıdır (CANDIDATE_MAJORITY_AGE_YEARS); istemci yalnız ipucu için 18 varsayar. */
export const DEFAULT_MAJORITY_AGE = 18;

/**
 * Kayıt yanıtı e-postanın daha önce kayıtlı/yeni/bekleyen olmasından BAĞIMSIZ aynıdır (numaralandırma koruması).
 * Ekran yalnız bu genel metni gösterir; yanıt gövdesindeki metne bakılmaz.
 */
export const REGISTER_NEUTRAL_MESSAGE =
  "E-postanızı kontrol edin. Bu adres için kayıt başlatılabildiyse, kaydı tamamlamanız için bir doğrulama bağlantısı gönderdik. Gelen kutunuzda görmezseniz gereksiz (spam) klasörüne de bakın.";

export type RegisterFormState = {
  email: string;
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD` (tarih alanı değeri). */
  birthDate: string;
  guardianEmail: string;
};

export const EMPTY_REGISTER_FORM: RegisterFormState = {
  email: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  guardianEmail: "",
};

export type RegisterField = keyof RegisterFormState;
export type RegisterIssues = Partial<Record<RegisterField, string>>;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailShaped(value: string): boolean {
  return EMAIL_SHAPE.test(value.trim());
}

/** `YYYY-MM-DD` → yıl/ay/gün; geçersiz ya da gerçek olmayan tarih (31 Şubat) için null. */
function parseDate(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** `today` verilen günü (yerel) `YYYY-MM-DD` yapar; testte sabit tarih verilebilsin diye parametre. */
export function isoDate(today: Date): string {
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${mm}-${dd}`;
}

/**
 * Doğum tarihine göre reşit olmayan mı? Tarih geçersizse `null` (bilinmiyor).
 * Yaş, doğum günü geçtiyse tam yıl sayılır.
 */
export function isMinorByBirthDate(
  birthDate: string,
  today: Date,
  majorityAge: number = DEFAULT_MAJORITY_AGE,
): boolean | null {
  const born = parseDate(birthDate);
  const now = parseDate(isoDate(today));
  if (!born || !now) return null;
  let age = now.y - born.y;
  if (now.m < born.m || (now.m === born.m && now.d < born.d)) age -= 1;
  return age < majorityAge;
}

/**
 * İstemci tarafı kontrol; sunucu yine de doğrular. `guardianRequired`: doğum tarihi reşit olmayanı gösteriyor ya da
 * sunucu daha önce veli e-postasını istedi.
 */
export function validateRegisterForm(
  form: RegisterFormState,
  today: Date,
  guardianRequired: boolean,
): RegisterIssues {
  const issues: RegisterIssues = {};
  if (!form.firstName.trim()) issues.firstName = "Adınızı yazın.";
  if (!form.lastName.trim()) issues.lastName = "Soyadınızı yazın.";
  if (!form.email.trim()) issues.email = "E-posta adresinizi yazın.";
  else if (!isEmailShaped(form.email)) issues.email = "Geçerli bir e-posta adresi yazın (ör. ad@ornek.com).";

  if (!form.birthDate) issues.birthDate = "Doğum tarihinizi seçin.";
  else {
    const minor = isMinorByBirthDate(form.birthDate, today);
    if (minor === null) issues.birthDate = "Geçerli bir doğum tarihi seçin.";
    else if (form.birthDate > isoDate(today)) issues.birthDate = "Doğum tarihi gelecekte olamaz.";
  }

  if (guardianRequired) {
    if (!form.guardianEmail.trim()) issues.guardianEmail = "18 yaşından küçükler için veli e-postası gerekir.";
    else if (!isEmailShaped(form.guardianEmail)) issues.guardianEmail = "Geçerli bir veli e-postası yazın.";
    else if (form.guardianEmail.trim().toLowerCase() === form.email.trim().toLowerCase()) {
      issues.guardianEmail = "Veli e-postası sizin e-postanızdan farklı olmalı.";
    }
  }
  return issues;
}

/** Form → istek gövdesi. Veli e-postası yalnız gerekliyse gönderilir; metinler kırpılır. */
export function toRegisterRequest(form: RegisterFormState, guardianRequired: boolean): RegisterRequest {
  const request: RegisterRequest = {
    email: form.email.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    birthDate: form.birthDate,
  };
  if (guardianRequired && form.guardianEmail.trim()) request.guardianEmail = form.guardianEmail.trim();
  return request;
}

export type RegisterFailure = {
  message: string;
  /** Sunucu veli e-postası istedi: alan açılır. */
  needsGuardian: boolean;
};

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

function messageOf(err: unknown): string | undefined {
  const text = err instanceof Error ? err.message.trim() : "";
  return text || undefined;
}

/** Kayıt hatası → kullanıcı metni. 429/5xx sabit metin; 400'de sunucunun açıklaması (doğrulama) gösterilir. */
export function registerFailure(err: unknown): RegisterFailure {
  const status = statusOf(err);
  const message = messageOf(err);
  if (status === 429) {
    return { message: "Çok fazla deneme yapıldı. Lütfen biraz bekleyip yeniden deneyin.", needsGuardian: false };
  }
  if (status === 400 && message) {
    return { message, needsGuardian: /veli/i.test(message) };
  }
  return { message: "Kaydınız şu an alınamadı. Lütfen biraz sonra yeniden deneyin.", needsGuardian: false };
}

/** E-posta doğrulama (parola belirleme) hatası. Geçersiz/süresi dolmuş bağlantı ile kısa parola ayrılır. */
export function verifyFailure(err: unknown): { message: string; invalidLink: boolean } {
  const status = statusOf(err);
  const message = messageOf(err);
  if (status === 429) {
    return { message: "Çok fazla deneme yapıldı. Lütfen biraz bekleyip yeniden deneyin.", invalidLink: false };
  }
  if (status === 400) {
    const passwordIssue = message !== undefined && /parola/i.test(message);
    if (passwordIssue) return { message: message!, invalidLink: false };
    return {
      message: "Bu bağlantı geçersiz ya da süresi dolmuş. Kaydınızı baştan başlatabilirsiniz.",
      invalidLink: true,
    };
  }
  return { message: "Kaydınız tamamlanamadı. Lütfen biraz sonra yeniden deneyin.", invalidLink: false };
}

/** Veli onayı hatası. */
export function consentFailure(err: unknown): { message: string; invalidLink: boolean } {
  const status = statusOf(err);
  if (status === 429) {
    return { message: "Çok fazla deneme yapıldı. Lütfen biraz bekleyip yeniden deneyin.", invalidLink: false };
  }
  if (status === 400) {
    return {
      message: "Bu onay bağlantısı geçersiz ya da süresi dolmuş. Çocuğunuzun yeni bir bağlantı için kaydı yeniden başlatması gerekebilir.",
      invalidLink: true,
    };
  }
  return { message: "Onayınız alınamadı. Lütfen biraz sonra yeniden deneyin.", invalidLink: false };
}

/** Doğrulama yanıtından kullanıcı adı (gövde şeması üretilen tipte yok: `Verify200 = {[k]: unknown}`). */
export function usernameFromVerify(data: unknown): string | null {
  if (data && typeof data === "object" && "username" in data) {
    const value = (data as { username?: unknown }).username;
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}
