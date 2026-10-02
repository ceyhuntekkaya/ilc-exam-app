"use client";

import { Badge } from "@/src/ui";

const TONES: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  DRAFT: "neutral",
  IN_REVIEW: "warning",
  APPROVED: "success",
  PUBLISHED: "success",
  RETIRED: "danger",
  ARCHIVED: "danger",
  PENDING: "warning",
  IN_PROGRESS: "info",
  RETURNED: "danger",
  READY: "success",
  PENDING_UPLOAD: "warning",
  PROCESSING: "info",
  FAILED: "danger",
  CALIBRATED: "success",
  PILOT: "info",
  NONE: "neutral",
};

const LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  IN_REVIEW: "İncelemede",
  APPROVED: "Onaylı",
  PUBLISHED: "Yayında",
  RETIRED: "Emekli",
  ARCHIVED: "Arşiv",
  PENDING: "Bekliyor",
  IN_PROGRESS: "İnceleniyor",
  RETURNED: "İade",
  READY: "Hazır",
  PENDING_UPLOAD: "Yükleme bekliyor",
  PROCESSING: "İşleniyor",
  FAILED: "Başarısız",
  CALIBRATED: "Kalibre",
  PILOT: "Pilot",
  NONE: "Kalibrasyonsuz",
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  return <Badge tone={TONES[status] ?? "neutral"}>{LABELS[status] ?? status}</Badge>;
}
