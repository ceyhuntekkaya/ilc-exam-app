import type { RegisterRequest } from "@/src/api/generated/models";

/** Reşit olma yaşı sunucuda politika ayarıdır (CANDIDATE_MAJORITY_AGE_YEARS); istemci yalnız ipucu için 18 varsayar. */
export const DEFAULT_MAJORITY_AGE = 18;

/**
 * Kayıt yanıtı e-postanın daha önce kayıtlı/yeni/bekleyen olmasından BAĞIMSIZ aynıdır (numaralandırma koruması).
 * Ekran yalnız bu genel metni gösterir; yanıt gövdesindeki metne bakılmaz.
 */
export const REGISTER_NEUTRAL_MESSAGE =
  "Check your email. If sign-up could be started for this address, we have sent you a verification link to complete it. If you do not see it in your inbox, check your spam folder too.";

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
  if (!form.firstName.trim()) issues.firstName = "Enter your first name.";
  if (!form.lastName.trim()) issues.lastName = "Enter your last name.";
  if (!form.email.trim()) issues.email = "Enter your email address.";
  else if (!isEmailShaped(form.email)) issues.email = "Enter a valid email address (e.g. name@example.com).";

  if (!form.birthDate) issues.birthDate = "Select your date of birth.";
  else {
    const minor = isMinorByBirthDate(form.birthDate, today);
    if (minor === null) issues.birthDate = "Select a valid date of birth.";
    else if (form.birthDate > isoDate(today)) issues.birthDate = "Date of birth cannot be in the future.";
  }

  if (guardianRequired) {
    if (!form.guardianEmail.trim()) issues.guardianEmail = "A guardian email is required for candidates under 18.";
    else if (!isEmailShaped(form.guardianEmail)) issues.guardianEmail = "Enter a valid guardian email.";
    else if (form.guardianEmail.trim().toLowerCase() === form.email.trim().toLowerCase()) {
      issues.guardianEmail = "The guardian email must be different from your own.";
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
    return { message: "Too many attempts. Please wait a moment and try again.", needsGuardian: false };
  }
  if (status === 400 && message) {
    return { message, needsGuardian: /veli|guardian/i.test(message) };
  }
  return { message: "We could not receive your sign-up right now. Please try again later.", needsGuardian: false };
}

/** E-posta doğrulama (parola belirleme) hatası. Geçersiz/süresi dolmuş bağlantı ile kısa parola ayrılır. */
export function verifyFailure(err: unknown): { message: string; invalidLink: boolean } {
  const status = statusOf(err);
  const message = messageOf(err);
  if (status === 429) {
    return { message: "Too many attempts. Please wait a moment and try again.", invalidLink: false };
  }
  if (status === 400) {
    const passwordIssue = message !== undefined && /parola|password/i.test(message);
    if (passwordIssue) return { message: message!, invalidLink: false };
    return {
      message: "This link is invalid or has expired. You can start your sign-up again.",
      invalidLink: true,
    };
  }
  return { message: "We could not complete your sign-up. Please try again later.", invalidLink: false };
}

/** Veli onayı hatası. */
export function consentFailure(err: unknown): { message: string; invalidLink: boolean } {
  const status = statusOf(err);
  if (status === 429) {
    return { message: "Too many attempts. Please wait a moment and try again.", invalidLink: false };
  }
  if (status === 400) {
    return {
      message: "This consent link is invalid or has expired. Your child may need to start sign-up again to get a new link.",
      invalidLink: true,
    };
  }
  return { message: "We could not record your consent. Please try again later.", invalidLink: false };
}

/** Doğrulama yanıtından kullanıcı adı (gövde şeması üretilen tipte yok: `Verify200 = {[k]: unknown}`). */
export function usernameFromVerify(data: unknown): string | null {
  if (data && typeof data === "object" && "username" in data) {
    const value = (data as { username?: unknown }).username;
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}
