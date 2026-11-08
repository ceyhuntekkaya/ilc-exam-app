import type {
  CandidateRow,
  CreateRequest,
  ModeRequest,
  OpenRow,
  PreviewRow,
  RuleRequest,
  RuleRow,
} from "@/src/api/generated/models";
import { istanbulInstant } from "@/src/features/assignments/istanbulTime";

/** R-10: dağıtım sihirbazının saf mantığı (form -> istek, kip zorunluluğu, kota uyarısı, etiketler). */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

// ── Etiketler ────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  OPEN: "Açık",
  CLOSED: "Kapalı",
  CANCELLED: "İptal edildi",
};

export const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  OPEN: "success",
  CLOSED: "warning",
  CANCELLED: "danger",
};

export const MODE_LABEL: Record<string, string> = {
  OPEN_WINDOW: "Açık pencere",
  SCHEDULED_SESSION: "Takvimli oturum",
};

export function statusLabel(status?: string | null): string {
  return STATUS_LABEL[status ?? ""] ?? status ?? "—";
}

export function modeLabel(mode?: string | null): string {
  return MODE_LABEL[mode ?? ""] ?? mode ?? "—";
}

/** Aday durumu: ALLOCATED=başlamadı (hak rezerve), STARTED=başladı, CANCELLED=iptal. */
export function candidateStatusLabel(status?: string | null): string {
  switch (status) {
    case "ALLOCATED":
      return "Başlamadı";
    case "STARTED":
      return "Başladı";
    case "CANCELLED":
      return "İptal edildi";
    default:
      return status ?? "—";
  }
}

export function candidateStatusTone(status?: string | null): Tone {
  switch (status) {
    case "ALLOCATED":
      return "info";
    case "STARTED":
      return "success";
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

export const OMIT_REASON_LABEL: Record<string, string> = {
  NO_ACTIVE_MEMBERSHIP: "Kurumda aktif üyeliği yok",
  EXCLUDED_BY_RULE: "Hariç tutma kuralıyla çıkarıldı",
  AGE_BAND_MISMATCH: "Yaş bandı ürünle uyuşmuyor",
  ALREADY_IN_DISTRIBUTION: "Bu dağıtımda zaten var",
  QUOTA_INSUFFICIENT: "Hak yetmiyor",
};

export function omitReasonLabel(reason: string): string {
  return OMIT_REASON_LABEL[reason] ?? reason;
}

export const RULE_TYPES = [
  { value: "UNIT", label: "Birim", hint: "Seçilen birimdeki kişiler. Alt birimler varsayılan olarak dahil değildir." },
  { value: "MEMBERSHIP_ROLE", label: "Rol", hint: "Kurumdaki belirli roldeki herkes." },
  { value: "STATIC_LIST", label: "Kimlik listesi", hint: "Tek tek seçilen kimlik (ilcIdentityId)." },
  { value: "UPLOADED_LIST", label: "Yüklenen liste", hint: "Toplu yükleme (batch) kimliği ile gelen liste." },
] as const;

export const ROLES = [
  { value: "STUDENT", label: "Öğrenci" },
  { value: "TEACHER", label: "Öğretmen" },
  { value: "UNIT_ADMIN", label: "Birim yöneticisi" },
  { value: "COMPANY_ADMIN", label: "Kurum yöneticisi" },
  { value: "COMPANY_PROCTOR", label: "Gözetmen" },
] as const;

export function ruleTypeLabel(type?: string | null): string {
  return RULE_TYPES.find((t) => t.value === type)?.label ?? type ?? "—";
}

export function roleLabel(role?: string | null): string {
  return ROLES.find((r) => r.value === role)?.label ?? role ?? "—";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value.trim());
}

/** Kural satırı için okunur açıklama. */
export function describeRule(rule: RuleRow): string {
  switch (rule.type) {
    case "UNIT":
      return `Birim ${shortId(rule.refId)}${rule.includeSubtree ? " ve alt birimleri" : " (alt birimler hariç)"}`;
    case "MEMBERSHIP_ROLE":
      return `Rol: ${roleLabel(rule.role)}`;
    case "STATIC_LIST":
      return `Kimlik ${shortId(rule.refId)}`;
    case "UPLOADED_LIST":
      return `Yükleme ${shortId(rule.refId)}`;
    default:
      return rule.type ?? "—";
  }
}

export function shortId(value?: string | null): string {
  if (!value) return "—";
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

// ── Temel bilgiler (ad, paket, sınav) ────────────────────────────────────────

export type BasicsForm = {
  name: string;
  packageId: string;
  /** Yalnız paket seçilince paketten türetilir; elle girilmez. */
  skuId: string;
  examId: string;
};

export const EMPTY_BASICS: BasicsForm = { name: "", packageId: "", skuId: "", examId: "" };

/** `draft`: taslak varsa sınav seçimi zorunlu değil (mevcut sürüm korunur). */
export function validateBasics(form: BasicsForm, opts: { draftExists?: boolean } = {}): string | null {
  if (!form.name.trim()) return "Dağıtıma bir ad verin.";
  if (!form.packageId || !form.skuId) return "Bir hak paketi (SKU) seçin.";
  if (!opts.draftExists && !form.examId.trim()) return "Bir sınav seçin.";
  if (form.examId.trim() && !isUuid(form.examId)) return "Sınav kimliği geçerli bir UUID olmalı.";
  return null;
}

// ── Kip (K-U07: zorunlu) ────────────────────────────────────────────────────

export type ModeKind = "" | "OPEN_WINDOW" | "SCHEDULED_SESSION";

export type ModeForm = {
  /** Boş = henüz seçilmedi; seçilmeden devam edilemez (K-U07). */
  kind: ModeKind;
  /** `datetime-local` duvar saati (İstanbul). */
  opensAt: string;
  closesAt: string;
  centerSessionId: string;
};

export const EMPTY_MODE: ModeForm = { kind: "", opensAt: "", closesAt: "", centerSessionId: "" };

export function validateMode(form: ModeForm): string | null {
  if (form.kind === "") return "Dağıtım kipini seçin; kip seçilmeden devam edilemez.";
  if (form.kind === "OPEN_WINDOW") {
    if (!form.opensAt || !form.closesAt) return "Açık pencere için açılış ve kapanış zamanı zorunlu.";
    const opens = istanbulInstant(form.opensAt);
    const closes = istanbulInstant(form.closesAt);
    if (!opens || !closes) return "Tarih biçimi geçersiz.";
    if (closes <= opens) return "Kapanış zamanı açılıştan sonra olmalı.";
    return null;
  }
  if (!form.centerSessionId.trim()) return "Takvimli oturum için bir merkez oturumu seçin.";
  if (!isUuid(form.centerSessionId)) return "Oturum kimliği geçerli bir UUID olmalı.";
  return null;
}

const WALL = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Istanbul",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Anı `datetime-local` değerine (İstanbul duvar saati) çevirir; taslağı yeniden açarken form dolar. */
export function toWallTime(instant?: string | null): string {
  if (!instant) return "";
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  return WALL.format(date).replace(" ", "T");
}

/** Taslaktan kip formu (sunucudaki değerlerle). */
export function modeFormFromDraft(draft?: {
  mode?: string;
  windowOpensAt?: string;
  windowClosesAt?: string;
  centerSessionId?: string;
} | null): ModeForm {
  if (!draft || (draft.mode !== "OPEN_WINDOW" && draft.mode !== "SCHEDULED_SESSION")) return EMPTY_MODE;
  return {
    kind: draft.mode,
    opensAt: toWallTime(draft.windowOpensAt),
    closesAt: toWallTime(draft.windowClosesAt),
    centerSessionId: draft.centerSessionId ?? "",
  };
}

/**
 * Kip alanları birbirini dışlar (backend: açık pencerede oturum, takvimli oturumda pencere verilmez) —
 * seçilmeyen kipe ait alanlar isteğe HİÇ girmez.
 */
export function toModeRequest(form: ModeForm): ModeRequest {
  if (form.kind === "OPEN_WINDOW") {
    return {
      mode: "OPEN_WINDOW",
      windowOpensAt: istanbulInstant(form.opensAt),
      windowClosesAt: istanbulInstant(form.closesAt),
    };
  }
  if (form.kind === "SCHEDULED_SESSION") {
    return { mode: "SCHEDULED_SESSION", centerSessionId: form.centerSessionId.trim() };
  }
  throw new Error("Dağıtım kipi seçilmeden istek oluşturulamaz");
}

export function toCreateRequest(basics: BasicsForm, mode: ModeForm): CreateRequest {
  return {
    name: basics.name.trim(),
    skuId: basics.skuId,
    packageId: basics.packageId,
    examId: basics.examId.trim(),
    mode: toModeRequest(mode),
  };
}

/** Taslak güncellemesi: yalnız verilenler güncellenir; sınav seçilmediyse `examId` gönderilmez. */
export function toUpdateRequest(basics: BasicsForm, mode: ModeForm) {
  return {
    name: basics.name.trim(),
    examId: basics.examId.trim() === "" ? undefined : basics.examId.trim(),
    mode: toModeRequest(mode),
  };
}

// ── Hedefleme kuralları ──────────────────────────────────────────────────────

export type RuleForm = {
  type: "UNIT" | "MEMBERSHIP_ROLE" | "STATIC_LIST" | "UPLOADED_LIST";
  refId: string;
  role: string;
  /** Alt ağaç varsayılan KAPALI. */
  includeSubtree: boolean;
  exclude: boolean;
};

export const EMPTY_RULE: RuleForm = {
  type: "UNIT",
  refId: "",
  role: "STUDENT",
  includeSubtree: false,
  exclude: false,
};

export function validateRule(form: RuleForm): string | null {
  if (form.type === "MEMBERSHIP_ROLE") return form.role ? null : "Bir rol seçin.";
  if (!isUuid(form.refId)) {
    const what =
      form.type === "UNIT" ? "Birim kimliği" : form.type === "STATIC_LIST" ? "Kimlik" : "Yükleme kimliği";
    return `${what} geçerli bir UUID olmalı.`;
  }
  return null;
}

/** Tipe ait olmayan alanlar isteğe girmez (rol yalnız ROLE, alt ağaç yalnız UNIT). */
export function toRuleRequest(form: RuleForm): RuleRequest {
  const base = { type: form.type, exclude: form.exclude };
  switch (form.type) {
    case "UNIT":
      return { ...base, refId: form.refId.trim(), includeSubtree: form.includeSubtree };
    case "MEMBERSHIP_ROLE":
      return { ...base, role: form.role as RuleRequest["role"] };
    default:
      return { ...base, refId: form.refId.trim() };
  }
}

/** Önizleme/açma için en az bir DAHİL ETME kuralı gerekir (yalnız hariç tutma kimseyi hedeflemez). */
export function hasIncludeRule(rules: readonly Pick<RuleRow, "exclude">[]): boolean {
  return rules.some((r) => !r.exclude);
}

// ── Önizleme ve kota ─────────────────────────────────────────────────────────

export type QuotaState =
  | { warn: false }
  | { warn: true; required: number; available: number; skipped: number; message: string };

/**
 * Backend `quotaRequired/quotaAvailable`'ı yalnız yetmeyen durumda doldurur. Kimse ELENMEZ: hakkı
 * yetmeyenler açılışta atlanır ve `skippedForQuotaCount` olarak döner.
 */
export function quotaState(preview?: Pick<PreviewRow, "quotaRequired" | "quotaAvailable"> | null): QuotaState {
  const required = preview?.quotaRequired;
  const available = preview?.quotaAvailable;
  if (required == null || available == null || required <= available) return { warn: false };
  const remaining = Math.max(available, 0);
  const skipped = required - remaining;
  return {
    warn: true,
    required,
    available: remaining,
    skipped,
    message: `${required} kişi hedefleniyor, kalan hak ${remaining}.`,
  };
}

export function omittedRows(preview?: Pick<PreviewRow, "omittedByReason"> | null): { reason: string; count: number }[] {
  return Object.entries(preview?.omittedByReason ?? {})
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => ({ reason, count }));
}

/** Açma sonucu özeti — üç sayı da gösterilir; atlanan/çakışan varsa uyarı tonu. */
export function openOutcome(result: OpenRow): { tone: Tone; lines: string[] } {
  const allocated = result.allocatedCount ?? 0;
  const skipped = result.skippedForQuotaCount ?? 0;
  const conflict = result.conflictCount ?? 0;
  const lines = [`${allocated} kişiye hak ayrıldı.`];
  if (skipped > 0) lines.push(`${skipped} kişi hak yetmediği için atlandı.`);
  if (conflict > 0) lines.push(`${conflict} kişi başka bir etkin dağıtımda olduğu için çakıştı.`);
  return { tone: skipped > 0 || conflict > 0 ? "warning" : "success", lines };
}

// ── Aday izleme ──────────────────────────────────────────────────────────────

export function candidateCounts(rows: readonly Pick<CandidateRow, "status">[]) {
  const counts = { total: rows.length, notStarted: 0, started: 0, cancelled: 0 };
  for (const row of rows) {
    if (row.status === "ALLOCATED") counts.notStarted += 1;
    else if (row.status === "STARTED") counts.started += 1;
    else if (row.status === "CANCELLED") counts.cancelled += 1;
  }
  return counts;
}

/** K-U06: sonuç, adayın son denemesinden backend'de çözülür; deneme yoksa sonuç görüntülenemez. */
export function canViewResult(row: Pick<CandidateRow, "ilcIdentityId" | "latestApplicationId">): boolean {
  return Boolean(row.ilcIdentityId && row.latestApplicationId);
}

export const NOT_STARTED_MESSAGE = "Aday henüz sınava başlamadı";

/** Backend 400 metni ("Aday bu dağıtımda henüz sınava başlamadı: …") için. */
export function isNotStartedError(err: unknown): boolean {
  return err instanceof Error && /henüz sınava başlamadı/i.test(err.message);
}
