import type { ComputeResult, DimensionView, GroupView } from "@/src/api/generated/models";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

/** Backend `DifView.dimensions[].key` (R-15). Etiket yanıttan gelir; bu harita yalnız etiket gelmezse yedektir. */
const DIMENSION_FALLBACK: Record<string, string> = {
  AGE_BAND: "Yaş bandı",
  AGE_BAND_CLIENT_PROCTORED: "Yaş bandı (kurum gözetimli)",
  NATIVE_LANGUAGE: "Ana dil",
  INSTITUTION_TYPE: "Kurum türü",
};

export function dimensionTitle(dimension: DimensionView): string {
  return dimension.label || DIMENSION_FALLBACK[dimension.key ?? ""] || dimension.key || "Boyut";
}

/** Backend `DifService.SUPPRESSED_GROUP`: eşik altı tüm gruplar tek satırda toplanır, etiket yazılmaz. */
export const SUPPRESSED_GROUP_LABEL = "DİĞER (bastırıldı)";

export function isSuppressedGroup(group: Pick<GroupView, "group">): boolean {
  return group.group === SUPPRESSED_GROUP_LABEL;
}

export type GroupVerdictKind = "suppressed" | "insufficient" | "no-bias" | "moderate" | "large" | "unknown";

export type Verdict<K extends string> = { kind: K; label: string; tone: Tone };

/**
 * Tek grup satırının sonucu. Eşik altındaki n ya da backend'in `sufficientData=false` işareti "yetersiz veri"dir:
 * bu durumda ki-kare/olasılık oranı/ETS düzeyi YORUMLANMAZ (az örneklemde "yanlılık yok" demek yanıltıcı olur).
 */
export function groupVerdict(group: GroupView, threshold?: number): Verdict<GroupVerdictKind> {
  // Bastırılmış toplu satır: küçük grupların hiçbir istatistiği yorumlanmaz (kişi tanımlanabilirliği).
  if (isSuppressedGroup(group)) return { kind: "suppressed", label: "Bastırıldı", tone: "neutral" };
  const n = group.n ?? 0;
  const belowThreshold = threshold !== undefined && threshold > 0 && n < threshold;
  if (group.sufficientData === false || belowThreshold) {
    return { kind: "insufficient", label: "Yetersiz veri", tone: "neutral" };
  }
  switch (group.etsLevel) {
    case "A":
      return { kind: "no-bias", label: "Yanlılık yok (A)", tone: "success" };
    case "B":
      return { kind: "moderate", label: "Orta düzey (B)", tone: "warning" };
    case "C":
      return { kind: "large", label: "Belirgin yanlılık (C)", tone: "danger" };
    default:
      return { kind: "unknown", label: "Sınıflanmadı", tone: "neutral" };
  }
}

export type DimensionVerdictKind = "no-data" | "not-computed" | "insufficient" | "no-bias" | "moderate" | "large" | "unknown";

/**
 * Boyutun tek bakışlık durumu. Üç ayrı "boş" durum karıştırılmaz:
 *  - VERİ YOK: bu boyutta hiç gözlem yok;
 *  - HESAPLANMADI: veri olabilir ama hesap çalıştırılmadı ("Hesapla" ile üretilir);
 *  - YANLILIK YOK: hesaplandı ve yeterli veriyle ETS A çıktı.
 */
export function dimensionVerdict(dimension: DimensionView, threshold?: number): Verdict<DimensionVerdictKind> {
  if (dimension.status === "NOT_COMPUTED") return { kind: "not-computed", label: "Hesaplanmadı", tone: "info" };
  const groups = dimension.groups ?? [];
  if (dimension.status === "NO_DATA" || groups.length === 0) return { kind: "no-data", label: "Veri yok", tone: "neutral" };
  const verdicts = groups.map((g) => groupVerdict(g, threshold));
  const usable = verdicts.filter((v) => v.kind !== "insufficient" && v.kind !== "suppressed");
  if (usable.length === 0) return { kind: "insufficient", label: "Yetersiz veri", tone: "neutral" };
  if (usable.some((v) => v.kind === "large")) return { kind: "large", label: "Belirgin yanlılık (C)", tone: "danger" };
  if (usable.some((v) => v.kind === "moderate")) return { kind: "moderate", label: "Orta düzey (B)", tone: "warning" };
  if (usable.every((v) => v.kind === "no-bias")) return { kind: "no-bias", label: "Yanlılık yok (A)", tone: "success" };
  return { kind: "unknown", label: "Sınıflanmadı", tone: "neutral" };
}

export function formatStat(value?: number | null, digits = 3): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

/** "Hesapla" sonrası kısa özet: hangi kaynaktan kaç gözlem kullanıldı, neden dışlananlar. */
export function computeSummaryLines(result?: ComputeResult | null): string[] {
  const summary = result?.summary;
  if (!summary) return [];
  const lines = [
    `Merkez uygulamalardan ${summary.usedCentral ?? 0} gözlem kullanıldı.`,
    `Kurum gözetimli uygulamalardan ${summary.usedClientProctored ?? 0} gözlem kullanıldı.`,
  ];
  const excluded = Object.entries(summary.excluded ?? {}).filter(([, count]) => count > 0);
  for (const [reason, count] of excluded) lines.push(`Dışlanan (${reason}): ${count}`);
  return lines;
}

/** ISO zamanı tr-TR yerel biçimine çevirir; geçersizse null. */
function whenText(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * "Hesapla" hatası. 429 + `code=DIF_TOO_SOON`: son hesaplamadan beri asgari süre dolmadı; `retryAfter` (ISO) gösterilir.
 * Diğer hatalarda sunucu mesajı (varsa) ya da yedek metin.
 */
export function computeFailureMessage(err: unknown, fallback = "DIF hesaplanamadı"): string {
  const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
  const data = typeof err === "object" && err !== null && "data" in err ? (err as { data?: unknown }).data : undefined;
  const body = data && typeof data === "object" ? (data as { code?: unknown; retryAfter?: unknown }) : undefined;
  if (status === 429 || body?.code === "DIF_TOO_SOON") {
    const when = whenText(body?.retryAfter);
    return when
      ? `Bu madde için DIF yakın zamanda hesaplandı. ${when} tarihinden sonra yeniden deneyin.`
      : "Bu madde için DIF yakın zamanda hesaplandı. Biraz sonra yeniden deneyin.";
  }
  const text = err instanceof Error ? err.message.trim() : "";
  return text || fallback;
}
