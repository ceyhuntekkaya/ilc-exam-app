import type {
  CutScoreView,
  ItemRating,
  PanelistView,
  ProposeCutScoreRequest,
  SheetItem,
  SheetView,
  StatsView,
  StudyView,
} from "@/src/api/generated/models";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

/** Kesme sürümünün yürürlüğe girmesi için gereken FARKLI onaylayan sayısı (F4-10, D12). */
export const REQUIRED_APPROVALS = 2;

export const METHOD_LABEL: Record<string, string> = { ANGOFF: "Angoff", BOOKMARK: "Bookmark" };

export function methodLabel(method?: string): string {
  return METHOD_LABEL[method ?? ""] ?? method ?? "—";
}

/** Angoff kesmesi ham puandır; Bookmark kesmesi theta (yetenek ölçeği). */
export function cutUnitLabel(method?: string): string {
  return method === "BOOKMARK" ? "theta" : "puan";
}

export const STUDY_STATUS_LABEL: Record<string, string> = { OPEN: "Açık", FINALIZED: "Sonlandırıldı" };
export const STUDY_STATUS_TONE: Record<string, Tone> = { OPEN: "info", FINALIZED: "success" };

export function studyStatusLabel(status?: string): string {
  return STUDY_STATUS_LABEL[status ?? ""] ?? status ?? "—";
}

export const CREDENTIAL_STATUS_LABEL: Record<string, string> = {
  PENDING: "Onay bekliyor",
  APPROVED: "Onaylı",
  REJECTED: "Reddedildi",
  SUSPENDED: "Askıda",
};
export const CREDENTIAL_STATUS_TONE: Record<string, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export function credentialStatusLabel(status?: string): string {
  return CREDENTIAL_STATUS_LABEL[status ?? ""] ?? status ?? "—";
}

/** Panelistin kimliği: ONAYLI ama süresi dolmuşsa "süresi doldu" (puan girişi backend'de reddedilir). */
export function panelistCredentialLabel(p: Pick<PanelistView, "credentialStatus" | "credentialValidNow">): { label: string; tone: Tone } {
  if (p.credentialStatus === "APPROVED" && p.credentialValidNow === false) return { label: "Kimlik süresi doldu", tone: "danger" };
  return {
    label: credentialStatusLabel(p.credentialStatus),
    tone: CREDENTIAL_STATUS_TONE[p.credentialStatus ?? ""] ?? "neutral",
  };
}

export function openRoundOf(study: Pick<StudyView, "rounds">) {
  return (study.rounds ?? []).find((round) => round.open);
}

export type StudyActions = { addPanelist: boolean; removePanelist: boolean; openRound: boolean; closeRound: boolean; finalize: boolean };

/**
 * Çalışma durumuna göre hangi eylem anlamlı. Yalnız arayüz ipucudur; son kural backend'dedir (409 mesajı gösterilir).
 * Panelist ekleme/çıkarma yalnız açık tur YOKKEN (backend `requireNoOpenRound`); puanı olan panelist çıkarılamaz (409 mesajı gösterilir).
 */
export function studyActions(study: Pick<StudyView, "status" | "rounds" | "panelists">): StudyActions {
  const open = study.status === "OPEN";
  const hasOpenRound = Boolean(openRoundOf(study));
  const roundCount = study.rounds?.length ?? 0;
  const panelistCount = study.panelists?.length ?? 0;
  return {
    addPanelist: open && !hasOpenRound,
    removePanelist: open && !hasOpenRound,
    openRound: open && !hasOpenRound && panelistCount > 0,
    closeRound: open && hasOpenRound,
    finalize: open && !hasOpenRound && roundCount > 0,
  };
}

export function latestRoundNo(study: Pick<StudyView, "rounds">): number | undefined {
  const nos = (study.rounds ?? []).map((r) => r.roundNo ?? 0);
  return nos.length ? Math.max(...nos) : undefined;
}

export function formatNumber(value?: number | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatProgress(done?: number, total?: number): string {
  return `${done ?? 0}/${total ?? 0}`;
}

export function progressPercent(done?: number, total?: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((done ?? 0) / total) * 100)));
}

/** Tur istatistiği: uzlaşma durumu (yayılım eşiğin altında mı). Hiç tamamlayan yoksa "hesaplanamadı". */
export function consensusState(stats: Pick<StatsView, "completeCount" | "consensusReached" | "consensusThreshold" | "standardError">): {
  label: string;
  tone: Tone;
  hint: string;
} {
  if (!stats.completeCount) {
    return { label: "Hesaplanamadı", tone: "neutral", hint: "Henüz puanlamayı tamamlayan panelist yok." };
  }
  if (stats.consensusReached) {
    return { label: "Uzlaşma sağlandı", tone: "success", hint: `Standart hata ${formatNumber(stats.standardError, 3)} ≤ eşik ${formatNumber(stats.consensusThreshold, 3)}.` };
  }
  return { label: "Uzlaşma yok", tone: "warning", hint: `Standart hata ${formatNumber(stats.standardError, 3)} > eşik ${formatNumber(stats.consensusThreshold, 3)}; yeni tur gerekebilir.` };
}

// ───────────── kesme sürümü ─────────────

/** Onay durumu: kaç onay var, yürürlükte mi, yürürlük tarihi bekleniyor mu. */
export function cutApprovalState(cut: Pick<CutScoreView, "approvals" | "approved" | "inEffect">): { label: string; tone: Tone; count: number } {
  const count = cut.approvals?.length ?? 0;
  if (cut.inEffect) return { label: "Yürürlükte", tone: "success", count };
  if (cut.approved) return { label: "Onaylandı — yürürlük tarihi bekleniyor", tone: "info", count };
  return { label: `Onay bekliyor (${count}/${REQUIRED_APPROVALS})`, tone: "warning", count };
}

/**
 * Kullanıcı bu sürümü onaylayabilir mi: sürüm henüz iki onaya ulaşmadı ve kullanıcı daha önce onaylamadı
 * (iki onay FARKLI kişiden olmalı). Son karar backend'dedir.
 */
export function canApproveCut(cut: Pick<CutScoreView, "approvals" | "approved">, userId?: string): boolean {
  if (cut.approved) return false;
  if ((cut.approvals?.length ?? 0) >= REQUIRED_APPROVALS) return false;
  return !(cut.approvals ?? []).some((a) => a.approvedBy === userId);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export type CutFormState = {
  scaleVersionId: string;
  band: string;
  boundaryKind: string;
  cut: string;
  sem: string;
  /** `datetime-local` değeri (yerel saat). */
  effectiveFrom: string;
};
export type CutFormErrors = Partial<Record<keyof CutFormState, string>>;

export function toNumber(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function validateCutForm(form: CutFormState): CutFormErrors {
  const errors: CutFormErrors = {};
  if (!isUuid(form.scaleVersionId)) errors.scaleVersionId = "Geçerli bir ölçek sürümü kimliği (UUID) girin";
  if (!form.band) errors.band = "Bant seçin";
  if (!form.boundaryKind) errors.boundaryKind = "Sınır türü seçin";
  if (toNumber(form.cut) === null) errors.cut = "Kesme değeri sayı olmalı";
  const sem = toNumber(form.sem);
  if (form.sem.trim() !== "" && (sem === null || sem < 0)) errors.sem = "SEM negatif olamaz";
  if (!form.effectiveFrom || Number.isNaN(new Date(form.effectiveFrom).getTime())) errors.effectiveFrom = "Yürürlük tarihi zorunlu";
  return errors;
}

export function toProposeRequest(form: CutFormState, studyId?: string): ProposeCutScoreRequest {
  const sem = toNumber(form.sem);
  return {
    scaleVersionId: form.scaleVersionId.trim(),
    band: form.band as ProposeCutScoreRequest["band"],
    boundaryKind: form.boundaryKind as ProposeCutScoreRequest["boundaryKind"],
    cut: toNumber(form.cut) ?? 0,
    ...(sem !== null ? { sem } : {}),
    effectiveFrom: new Date(form.effectiveFrom).toISOString(),
    ...(studyId ? { studyId } : {}),
  };
}

export const BOUNDARY_LABEL: Record<string, string> = { LEVEL: "Seviye sınırı", MERIT: "Pekiyi sınırı", DISTINCTION: "Üstün başarı sınırı" };

// ───────────── panelist: Angoff ─────────────

/** "0,65" ve "0.65" kabul edilir; yalnız 0..1 (dahil). Geçersizse null. */
export function parseProbability(text: string): number | null {
  const value = toNumber(text);
  if (value === null || value < 0 || value > 1) return null;
  return value;
}

export type AngoffDraft = Record<string, string>;

export function draftFromSheet(items: readonly SheetItem[]): AngoffDraft {
  const draft: AngoffDraft = {};
  for (const item of items) {
    if (item.questionVersionId && item.myValue !== undefined && item.myValue !== null) draft[item.questionVersionId] = String(item.myValue);
  }
  return draft;
}

/** Yalnız geçerli (0..1) girişler gönderilir; boş bırakılan madde puanlanmamış sayılır. */
export function angoffPayload(draft: AngoffDraft): ItemRating[] {
  const out: ItemRating[] = [];
  for (const [questionVersionId, text] of Object.entries(draft)) {
    const value = parseProbability(text);
    if (value !== null) out.push({ questionVersionId, value });
  }
  return out;
}

export function angoffInvalidIds(draft: AngoffDraft): string[] {
  return Object.entries(draft)
    .filter(([, text]) => text.trim() !== "" && parseProbability(text) === null)
    .map(([id]) => id);
}

export function angoffFilledCount(items: readonly SheetItem[], draft: AngoffDraft): number {
  return items.filter((item) => item.questionVersionId && parseProbability(draft[item.questionVersionId] ?? "") !== null).length;
}

/** Kâğıttaki değişmemiş taslağı yeniden göndermemek için. */
export function isDraftDirty(items: readonly SheetItem[], draft: AngoffDraft): boolean {
  const saved = draftFromSheet(items);
  const keys = new Set([...Object.keys(saved), ...Object.keys(draft)]);
  for (const key of keys) {
    const a = parseProbability(saved[key] ?? "");
    const b = parseProbability(draft[key] ?? "");
    if (a !== b) return true;
  }
  return false;
}

// ───────────── panelist: Bookmark ─────────────

/** Konum 1..n+1; n+1 = "sınırdaki aday HER maddeyi yapar". Madde sırası zorluk sırasıdır, zorluk değeri gösterilmez. */
export function bookmarkPositions(itemCount: number): number[] {
  return Array.from({ length: itemCount + 1 }, (_, i) => i + 1);
}

export function bookmarkPositionLabel(position: number, itemCount: number): string {
  if (position === itemCount + 1) return "Hiçbir madde (sınırdaki aday tüm maddeleri yapar)";
  return `${position}. madde`;
}

export function isValidBookmark(position: number | null | undefined, itemCount: number): position is number {
  return typeof position === "number" && Number.isInteger(position) && position >= 1 && position <= itemCount + 1;
}

/** Bookmark kâğıdında zorluk sızıntısı olmaması için görünür alanlar: yalnız backend'in verdiği alanlar, zorluk yok. */
export function sheetProgress(sheet: Pick<SheetView, "ratedCount" | "totalCount">): { text: string; percent: number } {
  return { text: formatProgress(sheet.ratedCount, sheet.totalCount), percent: progressPercent(sheet.ratedCount, sheet.totalCount) };
}

// ───────────── panelist kimliği ─────────────

export type CredentialFormState = { staffUserId: string; trainedAt: string; validUntil: string };

/** `YYYY-MM-DD` günü → o günün yerel gece yarısı (ISO anı). */
export function dayToInstant(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function validateCredentialForm(form: CredentialFormState): Partial<Record<keyof CredentialFormState, string>> {
  const errors: Partial<Record<keyof CredentialFormState, string>> = {};
  if (!isUuid(form.staffUserId)) errors.staffUserId = "Personel seçin";
  const trained = dayToInstant(form.trainedAt);
  const until = dayToInstant(form.validUntil);
  if (!trained) errors.trainedAt = "Eğitim tarihi zorunlu";
  if (!until) errors.validUntil = "Geçerlilik bitişi zorunlu";
  if (trained && until && new Date(until) <= new Date(trained)) errors.validUntil = "Geçerlilik bitişi eğitim tarihinden sonra olmalı";
  return errors;
}

export type CredentialAction = "approve" | "reject" | "suspend";

/** Duruma göre uygulanabilir eylemler: bekleyen onaylanır/reddedilir, onaylı askıya alınır. */
export function credentialActions(status?: string): CredentialAction[] {
  if (status === "PENDING") return ["approve", "reject"];
  if (status === "APPROVED") return ["suspend"];
  return [];
}

/** Panele eklenebilir kimlik: onaylı, şu an geçerli ve henüz üye değil. */
export function eligiblePanelists(
  credentials: ReadonlyArray<{ staffId?: string; status?: string; validNow?: boolean; displayName?: string }>,
  memberIds: readonly string[],
) {
  const seen = new Set<string>();
  return credentials.filter((c) => {
    if (!c.staffId || c.status !== "APPROVED" || c.validNow !== true) return false;
    if (memberIds.includes(c.staffId) || seen.has(c.staffId)) return false;
    seen.add(c.staffId);
    return true;
  });
}
