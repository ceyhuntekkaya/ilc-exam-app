import type { BundleDto, SkuDto, SkuRequest } from "@/src/api/generated/models";
import { bundleAllowsCertificate, purposeLabel, shortId } from "@/src/features/admin/policyBundleModel";

/** R-08: SKU ekranının saf mantığı (form durumu, çıktı-türü koruması, etiketler). */

export const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const OUTPUT_TYPES = [
  { value: "LEVEL_REPORT", label: "Seviye raporu" },
  { value: "CERTIFICATE", label: "Sertifika" },
] as const;

export function outputLabel(output?: string | null): string {
  return OUTPUT_TYPES.find((o) => o.value === output)?.label ?? output ?? "—";
}

export function levelLabel(level?: string | null): string {
  return level ? level.replace("_", "-") : "";
}

export function levelRange(sku: Pick<SkuDto, "minLevel" | "maxLevel">): string {
  const min = levelLabel(sku.minLevel);
  const max = levelLabel(sku.maxLevel);
  if (min && max) return min === max ? min : `${min} – ${max}`;
  return min || max || "—";
}

export function statusLabel(status?: string | null): string {
  switch (status) {
    case "DRAFT":
      return "Taslak";
    case "ACTIVE":
      return "Aktif";
    case "RETIRED":
      return "Emekli";
    default:
      return status ?? "—";
  }
}

export function statusTone(status?: string | null): "neutral" | "success" | "warning" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "RETIRED":
      return "warning";
    default:
      return "neutral";
  }
}

export type SkuFormState = {
  code: string;
  name: string;
  examPurpose: string;
  ageBandOptionId: string;
  minLevel: string;
  maxLevel: string;
  outputType: string;
  includesModule: boolean;
  policyBundleId: string;
  validityDays: string;
};

export const EMPTY_SKU_FORM: SkuFormState = {
  code: "",
  name: "",
  examPurpose: "PLACEMENT",
  ageBandOptionId: "",
  minLevel: "",
  maxLevel: "",
  outputType: "LEVEL_REPORT",
  includesModule: false,
  policyBundleId: "",
  validityDays: "",
};

export function skuToForm(sku: SkuDto): SkuFormState {
  return {
    code: sku.code ?? "",
    name: sku.name ?? "",
    examPurpose: sku.examPurpose ?? "PLACEMENT",
    ageBandOptionId: sku.ageBandOptionId ?? "",
    minLevel: sku.minLevel ?? "",
    maxLevel: sku.maxLevel ?? "",
    outputType: sku.outputType ?? "LEVEL_REPORT",
    includesModule: sku.includesModule ?? false,
    policyBundleId: sku.policyBundleId ?? "",
    validityDays: sku.validityDays == null ? "" : String(sku.validityDays),
  };
}

/** Boş seçenekler gövdeye hiç yazılmaz (backend'de null kalır); `validityDays` pozitif tam sayıya çevrilir. */
export function toSkuRequest(form: SkuFormState): SkuRequest {
  const days = form.validityDays.trim() === "" ? undefined : Number(form.validityDays);
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    examPurpose: form.examPurpose as SkuRequest["examPurpose"],
    ageBandOptionId: form.ageBandOptionId || undefined,
    minLevel: (form.minLevel || undefined) as SkuRequest["minLevel"],
    maxLevel: (form.maxLevel || undefined) as SkuRequest["maxLevel"],
    outputType: form.outputType as SkuRequest["outputType"],
    includesModule: form.includesModule,
    policyBundleId: form.policyBundleId,
    validityDays: days,
  };
}

function levelIndex(level: string): number {
  return (CEFR_LEVELS as readonly string[]).indexOf(level);
}

/** Zorunlu alan ve tutarlılık kontrolü; ilk hatayı Türkçe döner. Sunucu doğrulaması yerine geçmez. */
export function validateSkuForm(form: SkuFormState): string | null {
  if (!form.code.trim()) return "Kod boş olamaz.";
  if (!form.name.trim()) return "Ad boş olamaz.";
  if (!form.policyBundleId) return "Politika demeti seçilmeli.";
  if (form.minLevel && form.maxLevel && levelIndex(form.minLevel) > levelIndex(form.maxLevel)) {
    return "En düşük seviye, en yüksek seviyeden büyük olamaz.";
  }
  if (form.validityDays.trim() !== "") {
    const days = Number(form.validityDays);
    if (!Number.isInteger(days) || days <= 0) return "Geçerlilik süresi pozitif bir tam sayı (gün) olmalı.";
  }
  return null;
}

/**
 * Sertifika çıktısı yalnız sertifika kapısı açık (CERTIFICATE_ENABLED=true) bir demetle seçilebilir.
 * Demet henüz seçilmediyse ya da bilinmiyorsa seçenek kapalı sayılır; sunucu (409) yine de son sözü söyler.
 */
export function isCertificateOutputAllowed(bundle?: BundleDto | null): boolean {
  return bundleAllowsCertificate(bundle);
}

/** Demet değişince seçili çıktı artık geçersizse güvenli değere döner. */
export function normalizeOutput(outputType: string, bundle?: BundleDto | null): string {
  return outputType === "CERTIFICATE" && !isCertificateOutputAllowed(bundle) ? "LEVEL_REPORT" : outputType;
}

export function bundleOptionLabel(bundle: BundleDto): string {
  return `${purposeLabel(bundle.examPurpose)} · ${shortId(bundle.id)}${bundleAllowsCertificate(bundle) ? " · sertifika açık" : ""}`;
}
