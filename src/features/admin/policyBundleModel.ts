import type { BundleDto } from "@/src/api/generated/models";

/**
 * R-08: politika demeti (PolicyBundle) ekranının saf mantığı — React/ağ yok, birim test edilebilir.
 * Alan listesi backend `PolicyBundle.Field` ile aynı sırada; geçerli değer kümeleri `PolicyBundleValues`'tan.
 * Sunucu her zaman son söz sahibidir; buradaki kısıtlar yalnız yanlış tıklamayı önler.
 */

export type FieldKind = "boolean" | "enum" | "text";

export type FieldOption = { value: string; label: string };

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: FieldOption[];
  hint?: string;
};

export const FIELD_DEFS: FieldDef[] = [
  {
    key: "SCORING_MODE",
    label: "Puanlama modu",
    kind: "enum",
    options: [
      { value: "ALL_OR_NOTHING", label: "Hep ya da hiç" },
      { value: "PARTIAL_PROPORTIONAL", label: "Orantılı kısmi puan" },
    ],
  },
  { key: "PENALTY", label: "Ceza puanlaması", kind: "boolean", hint: "Yanlış cevap puan düşürür." },
  {
    key: "OPEN_RESPONSE_GRADING_PATH",
    label: "Açık uçlu puanlama yolu",
    kind: "enum",
    options: [
      { value: "AI_ONLY", label: "Yalnız yapay zekâ" },
      { value: "HUMAN_ONLY", label: "Yalnız insan" },
      { value: "AI_WITH_HUMAN_REVIEW", label: "Yapay zekâ + insan incelemesi" },
    ],
  },
  { key: "CERTIFICATE_ENABLED", label: "Sertifika kapısı açık", kind: "boolean" },
  { key: "ATTEMPT_CONSUMPTION", label: "Deneme hakkı tüketir", kind: "boolean" },
  { key: "CUT_SCORE_SOURCE", label: "Geçme notu kaynağı", kind: "text", hint: "Örn. EXAM_DEFAULT" },
  { key: "CALIBRATION_INCLUSION", label: "Kalibrasyona dahil", kind: "boolean" },
  { key: "COMPANY_POOL_ACCESS", label: "Kurum havuzuna erişim", kind: "boolean" },
  { key: "ANCHOR_ACCESS", label: "Çapa maddelere erişim", kind: "boolean" },
  {
    key: "MIN_INTEGRITY_LEVEL",
    label: "En düşük gözetim seviyesi",
    kind: "enum",
    options: [
      { value: "NONE", label: "Kısıt yok" },
      { value: "UNPROCTORED", label: "Gözetimsiz" },
      { value: "CLIENT_PROCTORED", label: "Kurum gözetimli" },
      { value: "PARTNER_PROCTORED", label: "Partner gözetimli" },
      { value: "ILC_PROCTORED", label: "ILC gözetimli" },
    ],
  },
  { key: "RESULT_VISIBILITY", label: "Sonuç görünürlüğü", kind: "text", hint: "Örn. AFTER_GRADING" },
  { key: "ANSWER_KEY_VISIBILITY", label: "Cevap anahtarı görünürlüğü", kind: "text", hint: "Örn. NEVER" },
  { key: "RETAKE_POLICY", label: "Tekrar sınav politikası", kind: "text", hint: "Örn. UNRESTRICTED" },
  { key: "FEEDBACK_DEPTH", label: "Geri bildirim derinliği", kind: "text", hint: "Örn. SUMMARY" },
  {
    key: "SUPPORTED_BROWSER_CLASS",
    label: "Desteklenen tarayıcı sınıfı",
    kind: "enum",
    options: [
      { value: "TAM", label: "Tam (Chromium)" },
      { value: "ALISTIRMA", label: "Alıştırma (Safari/iOS dahil)" },
      { value: "ENGELLI", label: "Erişilebilirlik" },
    ],
  },
];

export const FIELD_KEYS: string[] = FIELD_DEFS.map((f) => f.key);

export const PURPOSE_ORDER = [
  "PLACEMENT",
  "DIAGNOSTIC",
  "PRACTICE",
  "ACHIEVEMENT",
  "CERTIFICATION",
  "MOCK",
  "PROGRESS",
] as const;

/** Backend yalnız bu beş tipte demet kabul eder (`requireCanonicalType`); "Yeni demet" bunlarla sınırlı. */
export const CREATABLE_PURPOSES = ["PLACEMENT", "DIAGNOSTIC", "PRACTICE", "ACHIEVEMENT", "CERTIFICATION"] as const;

const PURPOSE_LABELS: Record<string, string> = {
  PLACEMENT: "Seviye tespit",
  DIAGNOSTIC: "Tanılama",
  PRACTICE: "Alıştırma",
  ACHIEVEMENT: "Başarı",
  CERTIFICATION: "Sertifikasyon",
  MOCK: "Deneme",
  PROGRESS: "Gelişim",
};

export function purposeLabel(purpose?: string | null): string {
  if (!purpose) return "—";
  return PURPOSE_LABELS[purpose] ?? purpose;
}

/** CERTIFICATION demetinde bu iki alan değişmez: sertifika kapısı açık, ceza kapalı. */
export const CERTIFICATION_LOCKED_KEYS = ["CERTIFICATE_ENABLED", "PENALTY"] as const;

export function isCertification(purpose?: string | null): boolean {
  return purpose === "CERTIFICATION";
}

export function isFieldLocked(purpose: string | null | undefined, key: string): boolean {
  return isCertification(purpose) && (CERTIFICATION_LOCKED_KEYS as readonly string[]).includes(key);
}

export function shortId(id?: string | null): string {
  return id ? id.slice(0, 8) : "—";
}

export function purposeRank(purpose?: string | null): number {
  const index = PURPOSE_ORDER.indexOf(purpose as (typeof PURPOSE_ORDER)[number]);
  return index === -1 ? PURPOSE_ORDER.length : index;
}

/** Tipe göre sabit sıra; aynı tipte (kurum varsayılanı dışı ek demetler) oluşturma tarihine göre. */
export function sortBundles(bundles: BundleDto[]): BundleDto[] {
  return [...bundles].sort(
    (a, b) =>
      purposeRank(a.examPurpose) - purposeRank(b.examPurpose) ||
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
      (a.id ?? "").localeCompare(b.id ?? ""),
  );
}

export function bundleAllowsCertificate(bundle?: Pick<BundleDto, "values"> | null): boolean {
  return bundle?.values?.CERTIFICATE_ENABLED === "true";
}

// ---- Form durumu ----------------------------------------------------------------------------------------------

export type BundleFormState = {
  /** Tüm alanlar string — backend `Map<String,String>` bekler (boolean'lar "true"/"false"). */
  values: Record<string, string>;
  editable: string[];
};

export function toFormState(bundle: BundleDto): BundleFormState {
  return {
    values: { ...(bundle.values ?? {}) },
    editable: [...(bundle.companyEditableFields ?? [])],
  };
}

export function setValue(state: BundleFormState, key: string, value: string): BundleFormState {
  return { ...state, values: { ...state.values, [key]: value } };
}

export function setBooleanValue(state: BundleFormState, key: string, checked: boolean): BundleFormState {
  return setValue(state, key, checked ? "true" : "false");
}

export function toggleEditable(state: BundleFormState, key: string, on: boolean): BundleFormState {
  const rest = state.editable.filter((k) => k !== key);
  return { ...state, editable: on ? [...rest, key] : rest };
}

/** PUT gövdesi: değerler kırpılır, kurum-düzenlenebilir alanlar alan sırasına dizilir (kararlı çıktı). */
export function toUpdateBody(state: BundleFormState): { values: Record<string, string>; companyEditableFields: string[] } {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(state.values)) values[key] = value.trim();
  const rank = (key: string) => {
    const i = FIELD_KEYS.indexOf(key);
    return i === -1 ? FIELD_KEYS.length : i;
  };
  const companyEditableFields = [...new Set(state.editable)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return { values, companyEditableFields };
}

export function isDirty(state: BundleFormState, bundle: BundleDto): boolean {
  return JSON.stringify(toUpdateBody(state)) !== JSON.stringify(toUpdateBody(toFormState(bundle)));
}

/** İstemci tarafı ön kontrol: boş alan backend'de zaten reddedilir ("Demet alanı boş olamaz"). */
export function emptyFieldLabels(state: BundleFormState): string[] {
  return FIELD_DEFS.filter((def) => !(state.values[def.key] ?? "").trim()).map((def) => def.label);
}
