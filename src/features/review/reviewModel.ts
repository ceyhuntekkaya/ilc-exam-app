/**
 * R-32: inceleme talebi ekranlarının saf yardımcıları (R-31 backend'i).
 *
 * Çağrılar `customInstance` + üretilmiş tiplerle yapılır: OpenAPI'de operationId'ler (`list19`, `detail2`, `change1`) başka
 * uçlar eklendikçe kaydığı için üretilmiş fonksiyon adlarına bağlanılmaz. Kanıt paketi yanıtı üretilmiş
 * `EvidencePackageView` tipidir (R-31/6 şema adı çakışmasını giderdi; R-33/g: elle tanım kaldırıldı).
 */
import type { Detail, EvidencePackageView, ListItem, ListPageListItem, ResolutionResult } from "@/src/api/generated/models";
import { customInstance } from "@/src/api/mutator";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { formatGradeScore, type ReviewCardItem } from "@/src/features/grading/answerCardModel";

export type { Detail as ReviewDetail, ListItem as ReviewListItem };

export type ReviewStatus = "OPEN" | "RESOLVED";
export const REVIEW_PAGE_SIZE = 20;

export type ReviewScopeKind = "pool" | "own";
export type ReviewScope = { kind: ReviewScopeKind; label: string; companyId: string };

/**
 * Hangi kurum kapsamları listelenir. Bireysel havuz yalnız merkeze açıktır (backend 403): Süper Admin ve merkez personeli
 * havuzu görür; kurum personeli yalnız kendi kurumunu. Merkez personeli ayrıca kendi kurumunu da görebilir.
 */
export function reviewScopeKinds(role: "SUPER_ADMIN" | "STAFF", ownCompanyId: string | null | undefined): ReviewScopeKind[] {
  if (role === "SUPER_ADMIN") return ["pool"];
  const kinds: ReviewScopeKind[] = [];
  if (ownCompanyId === HQ_CONTENT_ORG_ID) kinds.push("pool");
  if (ownCompanyId) kinds.push("own");
  return kinds;
}

export const SCOPE_LABEL: Record<ReviewScopeKind, string> = { pool: "Bireysel havuz", own: "Kendi kurumum" };

export function reviewListPath(companyId: string, status: ReviewStatus, page: number, size = REVIEW_PAGE_SIZE) {
  return `/companies/${companyId}/review-requests?status=${status}&page=${page}&size=${size}`;
}
export const reviewDetailPath = (companyId: string, id: string) => `/companies/${companyId}/review-requests/${id}`;

export async function fetchReviewList(companyId: string, status: ReviewStatus, page: number, size = REVIEW_PAGE_SIZE) {
  return (await customInstance<{ data: ListPageListItem }>(reviewListPath(companyId, status, page, size))).data;
}

/** Menü rozeti: yalnız `total` okunur (size=1). */
export async function fetchOpenReviewTotal(companyId: string): Promise<number> {
  return (await fetchReviewList(companyId, "OPEN", 0, 1)).total ?? 0;
}

export async function fetchReviewDetail(companyId: string, id: string) {
  return (await customInstance<{ data: Detail }>(reviewDetailPath(companyId, id))).data;
}

/** `finalScore` SINAV ölçeğinde gönderilir; yanıttaki puan banka ölçeğindedir ve ekranda gösterilmez. */
export async function correctAnswer(
  companyId: string,
  id: string,
  answerId: string,
  body: { finalScore: number; rationale: string; feedback?: string },
) {
  return customInstance(`${reviewDetailPath(companyId, id)}/answers/${answerId}/evaluation`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function resolveRequest(companyId: string, id: string, action: "uphold" | "change", note: string) {
  return (
    await customInstance<{ data: ResolutionResult }>(`${reviewDetailPath(companyId, id)}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    })
  ).data;
}

export type EvidenceRow = Record<string, unknown>;
export type EvidenceView = EvidencePackageView;

export async function fetchEvidence(companyId: string, appealId: string) {
  return (await customInstance<{ data: EvidenceView }>(`/companies/${companyId}/appeals/${appealId}/evidence`)).data;
}

export const EVIDENCE_SECTIONS: { key: Exclude<keyof EvidenceView, "collectedAt">; title: string }[] = [
  { key: "events", title: "Olaylar" },
  { key: "answers", title: "Cevaplar" },
  { key: "evaluations", title: "Değerlendirmeler" },
  { key: "readings", title: "Okumalar" },
  { key: "rubricRefs", title: "Rubrik sürümleri" },
  { key: "audioRefs", title: "Ses kayıtları" },
];

/** Kanıt satırı hücresi: düz değer olduğu gibi, iç içe nesne/dizi JSON olarak. */
export function evidenceCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value === "" ? "—" : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Satırların anahtar birleşimi, ilk görülme sırasıyla. */
export function evidenceColumns(rows: EvidenceRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen];
}

export const NOTE_REQUIRED = "Not zorunlu: adayın göreceği açıklamayı yazın.";
export const RATIONALE_REQUIRED = "Gerekçe zorunlu.";

/** Not ve gerekçe: boşluktan ibaret değil. */
export const hasText = (value: string | null | undefined) => (value ?? "").trim().length > 0;

export const CHANGE_CONFIRM_TEXT = "Sonuç yeniden yayınlanır, aday yeni sonucu görür; varsa sertifika iptal edilir.";

/** "Düzeltmeleri yayınla" yalnız açık talepte ve en az bir düzeltme varken etkindir. */
export function canPublishCorrections(detail: Pick<Detail, "status" | "corrections"> | null | undefined): boolean {
  return detail?.status === "OPEN" && (detail.corrections?.length ?? 0) > 0;
}
/** "Puan değişmedi" yalnız açık talepte ve düzeltme YOKKEN (backend: düzeltme varken 409). */
export function canUphold(detail: Pick<Detail, "status" | "corrections"> | null | undefined): boolean {
  return detail?.status === "OPEN" && (detail.corrections?.length ?? 0) === 0;
}

export function statusBadge(item: Pick<ListItem, "status" | "outcome">): { label: string; tone: "warning" | "success" | "info" } {
  if (item.status !== "RESOLVED") return { label: "Açık", tone: "warning" };
  if (item.outcome === "CHANGED") return { label: "Puan güncellendi", tone: "info" };
  return { label: "Puan değişmedi", tone: "success" };
}

export const SOURCE_LABEL: Record<string, string> = { AUTO: "Otomatik", AI_ACCEPTED: "AI", HUMAN: "İnsan" };
export const MODEL_SOURCE_LABEL: Record<string, string> = { CENTRAL: "Merkez modeli", COMPANY: "Kurum modeli" };

/** Ayrıntıdaki cevap satırı → ortak cevap kartı. `finalScore` ve `examPoints` sınav ölçeğindedir. */
export function answerLineToCard(line: NonNullable<Detail["answers"]>[number], detail: Detail): ReviewCardItem {
  const answer = (line.answer ?? null) as Record<string, unknown> | null;
  const hasContent = answer != null && Object.keys(answer).length > 0;
  return {
    answerId: line.answerId ?? "",
    applicationId: detail.applicationId ?? "",
    studentName: detail.candidateName,
    examTitle: detail.examTitle,
    interactionType: line.interactionType ?? "",
    // Ses cevabında içerik answer içinde değil `mediaId`dedir; kart ikisini de okur.
    answer: hasContent ? answer : line.mediaId ? { mediaId: line.mediaId } : null,
    mediaIds: line.mediaId ? [line.mediaId] : [],
    feedback: line.feedback,
    rationale: line.rationale,
    finalScore: line.finalScore ?? null,
    examPoints: line.examPoints ?? null,
    scored: line.finalScore != null,
    scoreSource: line.scoreSource,
    reviewedBy: line.reviewedBy,
  };
}

export function formatScore(value: number | null | undefined) {
  return value == null ? "—" : formatGradeScore(value);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

/** Satır başına tek bir kurum etiketi; kaynağı belirten kısa metin. */
export function scoreSourceText(line: Pick<NonNullable<Detail["answers"]>[number], "scoreSource" | "modelSource">): string {
  const base = line.scoreSource ? (SOURCE_LABEL[line.scoreSource] ?? line.scoreSource) : "—";
  if (line.scoreSource === "AI_ACCEPTED" && line.modelSource) return `${base} · ${MODEL_SOURCE_LABEL[line.modelSource] ?? line.modelSource}`;
  return base;
}
