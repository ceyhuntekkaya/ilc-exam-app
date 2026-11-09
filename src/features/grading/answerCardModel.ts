/**
 * R-30: cevap kartının saf yardımcıları. Önceden `GradingSection.tsx` içindeydi; bireysel havuz insan kuyruğu sayfası
 * (`/admin/grading/individual`) ve R-32 (inceleme talebi) aynı kartı kullandığı için buraya taşındı.
 */
import { getTemplate } from "@/src/features/authoring/templates/registry";

export type Lane = "audio" | "text" | "video" | "image";

export type MediaTranscript = {
  mediaId: string;
  transcript?: string | null;
  status?: string | null;
  error?: string | null;
};

/** Kartın okuduğu cevap görünümü (QueueItem'ın ekrandaki alt kümesi; insan kuyruğu satırı da buna çevrilir). */
export type ReviewCardItem = {
  answerId: string;
  applicationId: string;
  attemptNo?: number;
  studentName?: string | null;
  gradeId?: string | null;
  branchId?: string | null;
  interactionType: string;
  /** Yoksa (insan kuyruğu listesi cevap içeriğini taşımıyor) kart içerik yerine açıklama gösterir. */
  answer?: Record<string, unknown> | null;
  mediaIds?: string[] | null;
  transcripts?: MediaTranscript[] | null;
  feedback?: string | null;
  rationale?: string | null;
  finalScore?: number | null;
  examPoints?: number | null;
  percent?: number | null;
  scored: boolean;
  published?: boolean;
  questionVersionId?: string | null;
  jobStatus?: string | null;
  escapeReason?: string | null;
  scoreSource?: string | null;
  reviewedBy?: string | null;
  auditPending?: boolean | null;
  /** Kuyruk satırında sınav adı (kurumsal ekranda atama bağlamı zaten seçili). */
  examTitle?: string | null;
};

export const LANE_COPY: Record<Lane, { title: string; hint: string; empty: string }> = {
  audio: {
    title: "Sesler",
    hint: "Konuşma kaydı. Sesi Tanımla metne çevirir. AI puanı kuyruktan gelir; Onayla ya da Değiştir ile insan karar verir.",
    empty: "Ses kaydı yok",
  },
  text: {
    title: "Metinler",
    hint: "Yazılı cevap. AI puanı kuyruktan gelir; Onayla ya da Değiştir ile insan karar verir.",
    empty: "Metin cevap yok",
  },
  video: {
    title: "Videolar",
    hint: "Öğrencinin yüklediği video.",
    empty: "Video yok",
  },
  image: {
    title: "Görseller",
    hint: "Öğrencinin yüklediği görsel.",
    empty: "Görsel yok",
  },
};

export function laneOf(type: string): Lane {
  switch (type) {
    case "AUDIO_RESPONSE":
      return "audio";
    case "VIDEO_RESPONSE":
      return "video";
    case "IMAGE_RESPONSE":
      return "image";
    default:
      return "text";
  }
}

export function modeOf(lane: Lane): "ai" | "manual" {
  return lane === "audio" || lane === "text" ? "ai" : "manual";
}

export function interactionLabel(type: string) {
  return getTemplate(type)?.label ?? type;
}

export function answerText(answer: Record<string, unknown>): { text: string; raw: boolean } {
  const direct = answer?.text;
  if (typeof direct === "string" && direct.trim()) return { text: direct, raw: false };
  const texts = Object.values(answer ?? {}).filter((value): value is string => typeof value === "string" && value.trim() !== "");
  if (texts.length > 0) return { text: texts.join("\n\n"), raw: false };
  return { text: JSON.stringify(answer ?? {}, null, 2), raw: true };
}

export function mediaIdsOf(item: Pick<ReviewCardItem, "mediaIds" | "answer">): string[] {
  const ids = new Set<string>();
  for (const id of item.mediaIds ?? []) {
    if (id) ids.add(id);
  }
  const one = item.answer?.mediaId;
  if (typeof one === "string" && one) ids.add(one);
  const many = item.answer?.mediaIds;
  if (Array.isArray(many)) {
    for (const id of many) {
      if (typeof id === "string" && id) ids.add(id);
    }
  }
  return [...ids];
}

export function formatGradeScore(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

export function whole(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value));
}

/** 38 ve sınav puanı 10 → 4. */
export function awardFromPercent(percent: number, examPoints: number | null | undefined) {
  if (!Number.isFinite(percent)) return "";
  const bounded = Math.min(100, Math.max(0, Math.round(percent)));
  if (examPoints == null || !Number.isFinite(examPoints) || examPoints <= 0) return String(bounded);
  const points = Math.round((bounded * examPoints) / 100);
  return String(Math.min(examPoints, Math.max(0, points)));
}

export function percentFromAward(award: number, examPoints: number | null | undefined) {
  if (!Number.isFinite(award)) return "";
  if (examPoints == null || !Number.isFinite(examPoints) || examPoints <= 0) return whole(award);
  return String(Math.min(100, Math.max(0, Math.round((award / examPoints) * 100))));
}

export function mediaSrc(companyId: string, applicationId: string, mediaId: string) {
  return `/api/backend/companies/${companyId}/applications/${applicationId}/media/${mediaId}/content`;
}
