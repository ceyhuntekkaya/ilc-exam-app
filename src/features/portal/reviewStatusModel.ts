import type { ReviewStatusDto } from "@/src/api/generated/models";

export type ReviewStatusView =
  | { kind: "none" }
  | { kind: "open"; title: string; body: string; note: null; requestedAt: string | null; resolvedAt: null }
  | { kind: "upheld" | "changed"; title: string; body: string; note: string | null; requestedAt: string | null; resolvedAt: string | null };

/**
 * R-32 adım 3: adayın inceleme talebi durumu (R-31 `GET /report/me/results/{id}/review-request`).
 * Üç durum: "İnceleniyor", "Sonuçlandı: puan değişmedi", "Puanınız güncellendi" (+ personel notu).
 * `message` backend'in hazır Türkçe metnidir; yoksa aşağıdaki varsayılan kullanılır. Hiç talep yoksa `none`:
 * talep açma formu (R-19) gösterilir.
 */
export function toReviewStatusView(dto: ReviewStatusDto | undefined | null): ReviewStatusView {
  if (!dto || dto.requested !== true) return { kind: "none" };
  const requestedAt = dto.requestedAt ?? null;
  if (dto.status !== "RESOLVED") {
    return {
      kind: "open",
      title: "İnceleniyor",
      body: dto.message?.trim() || "İnceleme talebiniz alındı, değerlendiriliyor",
      note: null,
      requestedAt,
      resolvedAt: null,
    };
  }
  const note = dto.resolutionNote?.trim() || null;
  const resolvedAt = dto.resolvedAt ?? null;
  if (dto.outcome === "CHANGED") {
    return {
      kind: "changed",
      title: "Puanınız güncellendi",
      body: dto.message?.trim() || "İncelendi, puanınız güncellendi",
      note,
      requestedAt,
      resolvedAt,
    };
  }
  return {
    kind: "upheld",
    title: "Sonuçlandı: puan değişmedi",
    body: dto.message?.trim() || "İncelendi, puanınız değişmedi",
    note,
    requestedAt,
    resolvedAt,
  };
}
