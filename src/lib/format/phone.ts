// Türkiye telefon numarası. Backend `phone` alanını serbest metin (max 20) olarak alır; tutarlılık için
// her zaman E.164 biçiminde gönderilir: +90XXXXXXXXXX (13 karakter). Ekranda "0 (5xx) xxx xx xx" gösterilir.

/** Girilen metinden ulusal 10 haneyi çıkarır: boşluk/parantez atılır, baştaki +90 / 90 / 0 kaldırılır. */
export function phoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Yazarken gösterilecek biçim: "0 (532) 123 45 67". Eksik numarada yalnızca girilen kısım biçimlenir. */
export function formatPhoneInput(value: string): string {
  const d = phoneDigits(value);
  if (!d) return /\d/.test(value) ? "0 (" : "";
  let out = `0 (${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += ` ${d.slice(6, 8)}`;
  if (d.length > 8) out += ` ${d.slice(8, 10)}`;
  return out;
}

/** 10 haneli, 2-5 ile başlayan (sabit hat ve cep) ulusal numara. */
export function isTrPhone(value: string): boolean {
  return /^[2-5]\d{9}$/.test(phoneDigits(value));
}

/** Backend'e gidecek biçim: "+905321234567". Geçersizse null. */
export function normalizePhone(value: string): string | null {
  return isTrPhone(value) ? `+90${phoneDigits(value)}` : null;
}
