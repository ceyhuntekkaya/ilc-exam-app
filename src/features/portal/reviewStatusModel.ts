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
      title: "Under review",
      body: dto.message?.trim() || "Your review request was received and is being assessed",
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
      title: "Your score was updated",
      body: dto.message?.trim() || "Reviewed — your score was updated",
      note,
      requestedAt,
      resolvedAt,
    };
  }
  return {
    kind: "upheld",
    title: "Resolved: score unchanged",
    body: dto.message?.trim() || "Reviewed — your score did not change",
    note,
    requestedAt,
    resolvedAt,
  };
}
