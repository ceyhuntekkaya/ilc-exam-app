import type { ChangeRequest, PolicySettingDto, PolicySettingHistoryDto } from "@/src/api/generated/models";
import type { list1 } from "@/src/api/generated/policy-settings/policy-settings";

/** Backend `PolicySettingKey` (kapalı küme). Üretilmiş istemcinin `key` birleşim tipi. */
export type PolicyKey = Parameters<typeof list1>[0];

export type ValueType = "INTEGER" | "DECIMAL" | "STRING";

export type KeyDef = {
  key: PolicyKey;
  group: string;
  label: string;
  description: string;
  type: ValueType;
  /** Boş (null) değer geçerli mi: null = "kapalı / tanımsız / sınırsız" anlamına gelen anahtarlar. */
  nullable: boolean;
  /** Veritabanında satır yokken sunucunun son savunma değeri (ham metin) ya da null. */
  fallback: string | null;
  unit?: string;
  /** Kapalı değer kümesi (metin anahtarlar için). */
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  /** Null değerin anlamı (nullable anahtarlar). */
  nullMeaning?: string;
  /** Ticari/hukuki karar bekleyen anahtar: tanımsızken uyarı gösterilir. */
  pendingDecision?: "ticari" | "hukuki";
};

export const GROUPS = ["Kayıt ve hesap", "Sipariş ve iade", "Tekrar sınav", "İtiraz", "Sınav yayını"] as const;

export const KEY_DEFS: KeyDef[] = [
  { key: "CANDIDATE_MAJORITY_AGE_YEARS", group: "Kayıt ve hesap", label: "Reşit olma yaşı", description: "Bu yaşın altındaki adaylar için veli onayı istenir.", type: "INTEGER", nullable: false, fallback: "18", unit: "yıl", min: 1, max: 120 },
  { key: "EMAIL_VERIFICATION_TOKEN_TTL_HOURS", group: "Kayıt ve hesap", label: "E-posta doğrulama bağlantısı süresi", description: "Doğrulama bağlantısının geçerli kaldığı süre.", type: "INTEGER", nullable: false, fallback: "24", unit: "saat", min: 1 },
  { key: "GUARDIAN_CONSENT_TIMEOUT_DAYS", group: "Kayıt ve hesap", label: "Veli onayı bekleme süresi", description: "Veli onayı gelmeyen kayıt kaç gün sonra temizlenir.", type: "INTEGER", nullable: true, fallback: null, unit: "gün", min: 1, nullMeaning: "Boş: bekleyen kayıtlar temizlenmez.", pendingDecision: "hukuki" },
  { key: "ORDER_UNCONDITIONAL_REFUND_WINDOW_DAYS", group: "Sipariş ve iade", label: "Koşulsuz iade penceresi", description: "Ödemeden sonra kaç gün içinde koşulsuz iade yapılır.", type: "INTEGER", nullable: true, fallback: null, unit: "gün", min: 0, nullMeaning: "Boş: koşulsuz iade yok.", pendingDecision: "ticari" },
  { key: "ORDER_REFUND_RATE_AFTER_WINDOW", group: "Sipariş ve iade", label: "Pencere sonrası iade oranı", description: "Koşulsuz iade penceresi dışında uygulanan iade oranı (0 ile 1 arası; 0,5 = yüzde 50).", type: "DECIMAL", nullable: true, fallback: null, min: 0, max: 1, nullMeaning: "Boş: oran belirlenmedi.", pendingDecision: "ticari" },
  { key: "ORDER_NO_SHOW_POLICY", group: "Sipariş ve iade", label: "Sınava girmeyen aday politikası", description: "Sınava girmeyen (no-show) adayın siparişine ne olacağı.", type: "STRING", nullable: true, fallback: null, nullMeaning: "Boş: politika belirlenmedi.", pendingDecision: "ticari" },
  { key: "APPOINTMENT_CANCELLATION_WINDOW_DAYS", group: "Sipariş ve iade", label: "Randevu iptal süresi", description: "Randevudan kaç gün öncesine kadar iptal edilebilir.", type: "INTEGER", nullable: true, fallback: null, unit: "gün", min: 0, nullMeaning: "Boş: süre belirlenmedi.", pendingDecision: "ticari" },
  { key: "ORDER_EXPIRY_DAYS", group: "Sipariş ve iade", label: "Ödenmemiş sipariş süresi", description: "Ödenmemiş sipariş kaç gün sonra süresi doldu sayılır. 0 ya da negatif: süresiz.", type: "INTEGER", nullable: true, fallback: "14", unit: "gün", nullMeaning: "Boş: süresiz." },
  { key: "RETAKE_WAITING_PERIOD_DAYS", group: "Tekrar sınav", label: "Tekrar sınav bekleme süresi", description: "Önceki sonucun yayınından sonra yeni deneme için beklenecek süre.", type: "INTEGER", nullable: false, fallback: "30", unit: "gün", min: 0 },
  { key: "RETAKE_MAX_ATTEMPTS", group: "Tekrar sınav", label: "Azami deneme sayısı", description: "Bir ürün için en çok kaç deneme yapılabilir.", type: "INTEGER", nullable: true, fallback: null, min: 1, nullMeaning: "Boş: sınırsız deneme." },
  {
    key: "RETAKE_SCORE_POLICY",
    group: "Tekrar sınav",
    label: "Geçerli puan politikası",
    description: "Birden çok denemede hangi sonuç geçerli sayılır.",
    type: "STRING",
    nullable: false,
    fallback: "LATEST",
    options: [
      { value: "LATEST", label: "En son deneme" },
      { value: "BEST", label: "En iyi deneme" },
    ],
  },
  {
    key: "PREVIOUS_CERTIFICATE_ACTION",
    group: "Tekrar sınav",
    label: "Önceki sertifikanın akıbeti",
    description: "Yeni başarılı sonuç çıkınca önceki sertifikaya ne olur.",
    type: "STRING",
    nullable: false,
    fallback: "SUPERSEDE",
    options: [
      { value: "SUPERSEDE", label: "Yenisi öncekinin yerine geçer" },
      { value: "KEEP_BOTH", label: "İkisi de geçerli kalır" },
      { value: "KEEP_HIGHEST", label: "En yüksek olan geçerli kalır" },
    ],
  },
  { key: "APPEAL_WINDOW_DAYS", group: "İtiraz", label: "İtiraz süresi", description: "Sonuç yayınından sonra itiraz/inceleme talebi için tanınan süre.", type: "INTEGER", nullable: false, fallback: "30", unit: "gün", min: 1 },
  { key: "MIN_PILOT_ITEMS_PER_EXAM", group: "Sınav yayını", label: "Sınav başına asgari pilot madde", description: "Sertifika/ölçme sınavının yayını için gereken en az pilot (PRETEST) madde sayısı.", type: "INTEGER", nullable: true, fallback: null, min: 0, nullMeaning: "Boş: zorlama yok, yalnız uyarı." },
  { key: "FORM_EXPOSURE_QUOTA_PER_PERIOD", group: "Sınav yayını", label: "Form maruziyet kotası (dönem başına)", description: "Bir formun takvim çeyreğinde en çok kaç denemede kullanılabileceği.", type: "INTEGER", nullable: true, fallback: null, min: 1, nullMeaning: "Boş: sınır yok." },
];

export function defOf(key: string | undefined): KeyDef | undefined {
  return KEY_DEFS.find((d) => d.key === key);
}

/** Şu an yürürlükteki GLOBAL satır: yürürlük tarihi geçmiş olanların en yenisi (sunucunun çözüm kuralı; `status`a bakılmaz). */
export function currentSetting(rows: readonly PolicySettingDto[], now: Date = new Date()): PolicySettingDto | undefined {
  return rows
    .filter((r) => r.effectiveFrom && new Date(r.effectiveFrom).getTime() <= now.getTime())
    .sort((a, b) => new Date(b.effectiveFrom!).getTime() - new Date(a.effectiveFrom!).getTime())[0];
}

/** Henüz yürürlüğe girmemiş planlı değişiklikler (yürürlük tarihi gelecekte), en yakın olan önce. */
export function scheduledSettings(rows: readonly PolicySettingDto[], now: Date = new Date()): PolicySettingDto[] {
  return rows
    .filter((r) => r.effectiveFrom && new Date(r.effectiveFrom).getTime() > now.getTime())
    .sort((a, b) => new Date(a.effectiveFrom!).getTime() - new Date(b.effectiveFrom!).getTime());
}

export type ValueView = { text: string; source: "setting" | "fallback" | "undefined"; pending: boolean };

/** Anahtarın etkin değeri: kayıt varsa o; yoksa kod varsayılanı; ikisi de yoksa "tanımsız" (+ ticari/hukuki karar uyarısı). */
export function effectiveValue(def: KeyDef, rows: readonly PolicySettingDto[], now: Date = new Date()): ValueView {
  const current = currentSetting(rows, now);
  if (current) {
    const isNull = current.value === undefined || current.value === null;
    return { text: isNull ? "Tanımsız" : displayValue(def, current.value), source: "setting", pending: isNull && def.pendingDecision !== undefined };
  }
  if (def.fallback !== null) return { text: displayValue(def, def.fallback), source: "fallback", pending: false };
  return { text: "Tanımsız", source: "undefined", pending: def.pendingDecision !== undefined };
}

export function displayValue(def: KeyDef, raw?: string | null): string {
  if (raw === undefined || raw === null || raw === "") return "Tanımsız";
  const option = def.options?.find((o) => o.value === raw);
  if (option) return option.label;
  const text = def.type === "DECIMAL" ? Number(raw).toLocaleString("tr-TR", { maximumFractionDigits: 6 }) : raw;
  return def.unit ? `${text} ${def.unit}` : text;
}

/** Boş metin: nullable anahtarda null ("tanımsız"), değilse hata. Geçerli değer ham metin (ondalıkta nokta). */
export function normalizeValue(def: KeyDef, input: string): { value: string | null; error: string | null } {
  const text = input.trim();
  if (text === "") {
    return def.nullable ? { value: null, error: null } : { value: null, error: "Bu ayar boş bırakılamaz" };
  }
  if (def.options) {
    return def.options.some((o) => o.value === text) ? { value: text, error: null } : { value: null, error: "Listeden bir değer seçin" };
  }
  if (def.type === "STRING") return { value: text, error: null };
  const normalized = text.replace(",", ".");
  if (def.type === "INTEGER") {
    if (!/^-?\d+$/.test(normalized)) return { value: null, error: "Tam sayı girin" };
  } else if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { value: null, error: "Sayı girin (ör. 0,5)" };
  }
  const n = Number(normalized);
  if (def.min !== undefined && n < def.min) return { value: null, error: `En az ${def.min} olmalı` };
  if (def.max !== undefined && n > def.max) return { value: null, error: `En çok ${def.max} olmalı` };
  return { value: normalized, error: null };
}

export type EffectiveMode = "soon" | "scheduled";
/** "Hemen" seçeneği, sunucu saat kayması yüzünden geçmişte kalmasın diye birkaç dakika ilerisine konur (sunucu geçmiş tarihi reddeder). */
export const SOON_MINUTES = 5;

export function resolveEffectiveFrom(mode: EffectiveMode, localValue: string, now: Date = new Date()): { iso: string | null; error: string | null } {
  if (mode === "soon") return { iso: new Date(now.getTime() + SOON_MINUTES * 60_000).toISOString(), error: null };
  if (!localValue) return { iso: null, error: "Yürürlük tarihi zorunlu" };
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return { iso: null, error: "Geçerli bir tarih girin" };
  if (date.getTime() <= now.getTime()) return { iso: null, error: "Yürürlük tarihi gelecekte olmalı (geçmişe dönük değişiklik yapılamaz)" };
  return { iso: date.toISOString(), error: null };
}

export function validateReason(reason: string): string | null {
  return reason.trim() ? null : "Değişiklik gerekçesi zorunlu";
}

/** `value` null ise alan HİÇ gönderilmez (sunucu null yazar). Kapsam GLOBAL: kurum/SKU düzeyi R-27'de. */
export function toChangeRequest(value: string | null, effectiveFromIso: string, reason: string): ChangeRequest {
  return { scope: "GLOBAL", ...(value !== null ? { value } : {}), effectiveFrom: effectiveFromIso, reason: reason.trim() };
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

/** 403 (merkez yetkisi), 400 (geçersiz değer / geçmiş tarih / gerekçe) sunucu mesajıyla aynen. */
export function policyFailureMessage(err: unknown, fallback = "Ayar kaydedilemedi"): string {
  const status = statusOf(err);
  const text = err instanceof Error ? err.message.trim() : "";
  if ((status === 400 || status === 403 || status === 409) && text) return text;
  return text || fallback;
}

export function historyChange(h: Pick<PolicySettingHistoryDto, "oldValue" | "newValue">, def?: KeyDef): string {
  const show = (v?: string | null) => (def ? displayValue(def, v) : v ?? "Tanımsız");
  return `${show(h.oldValue)} → ${show(h.newValue)}`;
}

export function groupedDefs(): { group: string; defs: KeyDef[] }[] {
  return GROUPS.map((group) => ({ group, defs: KEY_DEFS.filter((d) => d.group === group) }));
}
