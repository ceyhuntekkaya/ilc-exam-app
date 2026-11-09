import type { ItemFitView } from "@/src/api/generated/models";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

/**
 * R-26: madde uyum istatistiği (infit/outfit MNSQ) gösterim modeli. Bu ekran uyumun iyi/kötü olduğuna HÜKÜM VERMEZ:
 * kabul aralığı akademik karardır (K-A10) ve sertifika kapısının işidir. "Bilinmiyor" ≠ "uyumlu" — değeri olmayan madde
 * hiçbir zaman uyumlu gösterilmez.
 */

export const IRT_MODELS = [
  { value: "RASCH", label: "Rasch (1PL)" },
  { value: "TWO_PL", label: "2PL" },
  { value: "EQUAL_WEIGHT", label: "Eşit ağırlık (IRT yok)" },
] as const;

export type IrtModelValue = (typeof IRT_MODELS)[number]["value"];

export function modelLabel(model?: string | null): string {
  return IRT_MODELS.find((m) => m.value === model)?.label ?? (model || "—");
}

export type FitKind = "available" | "suppressed" | "unknown";

export type FitStatusView = { kind: FitKind; label: string; tone: Tone; hint: string };

/** MNSQ iki ondalıkla (Türkçe virgül); bozuk/yok için null. */
export function formatMnsq(value?: number | null): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Durum rozeti. AVAILABLE ama infit/outfit değeri yoksa (veri tutarsız) "bilinmiyor" sayılır — sahte "değer var" gösterilmez.
 * SUPPRESSED_SMALL_SAMPLE değer ASLA gösterilmez (kişi tanımlanabilirliği ve güvenilmezlik).
 */
export function fitStatusView(row: Pick<ItemFitView, "status" | "infitMnsq" | "outfitMnsq">): FitStatusView {
  if (row.status === "SUPPRESSED_SMALL_SAMPLE") {
    return { kind: "suppressed", label: "Örneklem küçük — gizlendi", tone: "warning", hint: "Yanıt sayısı en az eşiğin altında; değer güvenilmez olduğu için gösterilmez." };
  }
  if (row.status === "AVAILABLE" && formatMnsq(row.infitMnsq) !== null && formatMnsq(row.outfitMnsq) !== null) {
    return { kind: "available", label: "Hesaplandı", tone: "info", hint: "Değer var; uyumlu/uyumsuz hükmü bu ekranda verilmez." };
  }
  return { kind: "unknown", label: "Hesaplanmadı (bilinmiyor)", tone: "neutral", hint: "Uyum hesaplanmadı; bilinmiyor, uyumlu anlamına gelmez." };
}

/** Hücre metni: yalnız AVAILABLE iken sayı; diğer durumlar durumu açıklayan tire. */
export function fitCell(row: Pick<ItemFitView, "status" | "infitMnsq" | "outfitMnsq">, field: "infitMnsq" | "outfitMnsq"): string {
  const status = fitStatusView(row);
  if (status.kind !== "available") return "—";
  return formatMnsq(row[field]) ?? "—";
}

export function sampleText(row: Pick<ItemFitView, "fitSampleSize" | "calibrationSampleSize">): { fit: string; calibration: string } {
  const n = (v?: number | null) => (v === null || v === undefined ? "—" : v.toLocaleString("tr-TR"));
  return { fit: n(row.fitSampleSize), calibration: n(row.calibrationSampleSize) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateQuestionVersionId(value: string): string | null {
  const text = value.trim();
  if (!text) return "Madde sürümü kimliğini (UUID) girin";
  return UUID.test(text) ? null : "Geçerli bir UUID girin";
}

export const ITEM_FIT_PAGE_SIZE = 50;

export function pageSummary(page: number, size: number, total: number): string {
  if (total <= 0) return "0 madde";
  const from = page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return `${from}–${to} / ${total}`;
}

export function itemFitFailureMessage(err: unknown): string {
  const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
  if (status === 403) return "Madde uyumu yalnız merkez ve psikometri yönetimi yetkisiyle görülür.";
  const text = err instanceof Error ? err.message.trim() : "";
  return text || "Madde uyumu alınamadı.";
}
