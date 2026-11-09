import type { AnchorSetView } from "@/src/api/generated/models";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

/** Backend `CefrLevel` sırası (artan). Bant çifti `bandFrom < bandTo` olmalı. */
export const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrBand = (typeof CEFR_ORDER)[number];

export function cefrLabel(level?: string | null): string {
  if (!level) return "—";
  return level === "PRE_A1" ? "Pre-A1" : level;
}

export function bandPairLabel(set: Pick<AnchorSetView, "bandFrom" | "bandTo">): string {
  return `${cefrLabel(set.bandFrom)} → ${cefrLabel(set.bandTo)}`;
}

export const ANCHOR_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  IN_REVIEW: "İncelemede",
  APPROVED: "Onaylı (yürürlükte)",
  RETIRED: "Yayından kaldırıldı",
};

export const ANCHOR_STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  IN_REVIEW: "warning",
  APPROVED: "success",
  RETIRED: "danger",
};

export function anchorStatusLabel(status?: string): string {
  return ANCHOR_STATUS_LABEL[status ?? ""] ?? status ?? "—";
}

export type AnchorAction = "submit-review" | "approve" | "return-to-draft" | "retire" | "republish";

export type AnchorActionSpec = { action: AnchorAction; label: string; tone: "primary" | "danger"; confirm: string };

const SPECS: Record<AnchorAction, AnchorActionSpec> = {
  "submit-review": {
    action: "submit-review",
    label: "İncelemeye gönder",
    tone: "primary",
    confirm: "Set incelemeye gönderilir; incelemede madde eklenip çıkarılamaz.",
  },
  approve: {
    action: "approve",
    label: "Onayla",
    tone: "primary",
    confirm:
      "Set yürürlüğe girer: bu bant çifti ve dönem için kalibrasyon bağlayıcı maddeleri bu set belirler. Aynı bant çifti ve dönemde başka aktif set varsa onay reddedilir.",
  },
  "return-to-draft": {
    action: "return-to-draft",
    label: "Taslağa döndür",
    tone: "primary",
    confirm: "Set taslağa döner ve yeniden düzenlenebilir; onaylıysa yürürlükten çıkar.",
  },
  retire: {
    action: "retire",
    label: "Yayından kaldır",
    tone: "danger",
    confirm: "Set yürürlükten çıkar; sonradan yeniden yayınlanabilir.",
  },
  republish: {
    action: "republish",
    label: "Yeniden yayınla",
    tone: "primary",
    confirm: "Set yeniden yürürlüğe girer (maddeler yeniden doğrulanır).",
  },
};

/** İnceleme akışı: DRAFT→IN_REVIEW→APPROVED→RETIRED(→APPROVED); backend `VersionStatus.canTransitionTo` ile aynı. */
export function anchorActions(status?: string): AnchorActionSpec[] {
  switch (status) {
    case "DRAFT":
      return [SPECS["submit-review"]];
    case "IN_REVIEW":
      return [SPECS.approve, SPECS["return-to-draft"]];
    case "APPROVED":
      return [SPECS.retire, SPECS["return-to-draft"]];
    case "RETIRED":
      return [SPECS.republish];
    default:
      return [];
  }
}

/** Madde ekleme/çıkarma yalnız taslakta (backend `assertDraft`). */
export function anchorItemsEditable(status?: string): boolean {
  return status === "DRAFT";
}

/**
 * Dört göz: yazar kendi setini onaylayamaz (Süper Admin hariç). Düğme kapatılmaz, yalnız uyarı çıkar;
 * son karar backend'indir (403).
 */
export function selfApprovalWarning(set: AnchorSetView, userId?: string, isSuperAdmin = false): string | null {
  if (set.status !== "IN_REVIEW" || isSuperAdmin) return null;
  if (userId && set.createdBy === userId) return "Bu seti siz oluşturdunuz; dört göz ilkesi gereği onayı başka bir yetkili vermelidir.";
  return null;
}

export type AnchorFormState = { bandFrom: string; bandTo: string; period: string };
export type AnchorFormErrors = Partial<Record<keyof AnchorFormState, string>>;

export function validateAnchorForm(form: AnchorFormState): AnchorFormErrors {
  const errors: AnchorFormErrors = {};
  const from = CEFR_ORDER.indexOf(form.bandFrom as CefrBand);
  const to = CEFR_ORDER.indexOf(form.bandTo as CefrBand);
  if (from < 0) errors.bandFrom = "Başlangıç bandı seçin";
  if (to < 0) errors.bandTo = "Bitiş bandı seçin";
  if (from >= 0 && to >= 0 && from >= to) errors.bandTo = "Bitiş bandı başlangıçtan yüksek olmalı";
  if (!form.period.trim()) errors.period = "Dönem zorunlu";
  return errors;
}

export function shortId(id?: string): string {
  return id ? `${id.slice(0, 8)}…` : "—";
}
