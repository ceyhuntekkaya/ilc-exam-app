import type { PackageDto, PackageRequest, PurchaseRequest, SkuDto } from "@/src/api/generated/models";

/** R-09: merkez paket ekranının saf mantığı (form -> istek, FLEX/HARD_STOP kuralı, bakiye gösterimi, etiketler). */

export const SCOPES = [
  { value: "COMPANY", label: "Kurum geneli" },
  { value: "ORG_UNIT", label: "Birim" },
] as const;

export const OVERAGE_POLICIES = [
  { value: "HARD_STOP", label: "Sert durdurma" },
  { value: "FLEX", label: "Esnek aşım" },
] as const;

export function scopeLabel(scope?: string | null): string {
  if (scope === "INDIVIDUAL") return "Bireysel";
  return SCOPES.find((s) => s.value === scope)?.label ?? scope ?? "—";
}

export function overageLabel(policy?: string | null): string {
  return OVERAGE_POLICIES.find((o) => o.value === policy)?.label ?? policy ?? "—";
}

export function packageStatusLabel(status?: string | null): string {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "EXPIRED":
      return "Süresi dolmuş";
    case "CANCELLED":
      return "İptal edildi";
    default:
      return status ?? "—";
  }
}

export function packageStatusTone(status?: string | null): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "EXPIRED":
      return "warning";
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

/** `LocalDate` ("2026-01-01") — saat dilimi kaymasın diye UTC'de biçimlenir. */
export function dateOnly(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR", { timeZone: "UTC" });
}

export function validityRange(pkg: Pick<PackageDto, "validFrom" | "validUntil">): string {
  return `${dateOnly(pkg.validFrom)} – ${dateOnly(pkg.validUntil)}`;
}

export type BalanceState = {
  /** ok: kullanılabilir bakiye var; exhausted: aktif ama kalan 0; inactive: süresi dolmuş ya da iptal. */
  kind: "ok" | "exhausted" | "inactive";
  /** "40 / 100 kalan" */
  text: string;
  warning: boolean;
};

/**
 * Bakiye gösterimi. `total` toplam satın alınan, `available` kullanılabilir bakiyedir (sunucu 0'ın altına düşürmez).
 * Kalan 0 ya da paket EXPIRED/CANCELLED ise uyarı stili.
 */
export function balanceState(pkg: Pick<PackageDto, "total" | "available" | "status">): BalanceState {
  const available = Math.max(0, pkg.available ?? 0);
  const text = `${available} / ${pkg.total ?? 0} kalan`;
  if (pkg.status && pkg.status !== "ACTIVE") return { kind: "inactive", text, warning: true };
  if (available === 0) return { kind: "exhausted", text, warning: true };
  return { kind: "ok", text, warning: false };
}

export function balanceHint(state: BalanceState): string | null {
  if (state.kind === "inactive") return "Paket aktif değil";
  if (state.kind === "exhausted") return "Bakiye tükendi";
  return null;
}

export function skuOptionLabel(sku: Pick<SkuDto, "code" | "name">): string {
  return sku.name ? `${sku.code} · ${sku.name}` : (sku.code ?? "—");
}

/** Paket tanımlama yalnız ACTIVE SKU'larla yapılır. */
export function activeSkus(skus: SkuDto[]): SkuDto[] {
  return skus.filter((s) => s.status === "ACTIVE");
}

export type PackageFormState = {
  skuId: string;
  scope: string;
  orgUnitId: string;
  quota: string;
  validFrom: string;
  validUntil: string;
  overagePolicy: string;
  flexAllowance: string;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Yeni paket formu: bugünden başlayıp bir yıl geçerli, kurum geneli, sert durdurma. */
export function emptyPackageForm(today: Date = new Date()): PackageFormState {
  const until = new Date(today);
  until.setUTCFullYear(until.getUTCFullYear() + 1);
  return {
    skuId: "",
    scope: "COMPANY",
    orgUnitId: "",
    quota: "",
    validFrom: isoDate(today),
    validUntil: isoDate(until),
    overagePolicy: "HARD_STOP",
    flexAllowance: "",
  };
}

export function packageToForm(pkg: PackageDto): PackageFormState {
  return {
    skuId: pkg.skuId ?? "",
    scope: pkg.scope ?? "COMPANY",
    orgUnitId: pkg.orgUnitId ?? "",
    quota: pkg.quota == null ? "" : String(pkg.quota),
    validFrom: pkg.validFrom ?? "",
    validUntil: pkg.validUntil ?? "",
    overagePolicy: pkg.overagePolicy ?? "HARD_STOP",
    flexAllowance: pkg.flexAllowance == null ? "" : String(pkg.flexAllowance),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPositiveInt(text: string): boolean {
  const n = Number(text);
  return text.trim() !== "" && Number.isInteger(n) && n > 0;
}

/** İlk hatayı Türkçe döner; sunucu doğrulaması yerine geçmez (400/409 metni ayrıca gösterilir). */
export function validatePackageForm(form: PackageFormState): string | null {
  if (!form.skuId) return "Ürün (SKU) seçilmeli.";
  if (form.scope === "ORG_UNIT" && !UUID.test(form.orgUnitId.trim())) return "Birim kimliği (UUID) geçerli olmalı.";
  if (!isPositiveInt(form.quota)) return "Kota pozitif bir tam sayı olmalı.";
  if (!form.validFrom || !form.validUntil) return "Geçerlilik başlangıç ve bitiş tarihi zorunlu.";
  if (form.validUntil < form.validFrom) return "Bitiş tarihi başlangıç tarihinden önce olamaz.";
  if (form.overagePolicy === "FLEX") {
    const n = Number(form.flexAllowance);
    if (form.flexAllowance.trim() === "" || !Number.isInteger(n) || n < 0) {
      return "Esnek aşım için negatif olmayan bir tam sayı (aşım payı) girilmeli.";
    }
  }
  return null;
}

/**
 * Form -> istek. FLEX için `flexAllowance` sayı olarak gider; HARD_STOP'ta alan hiç gönderilmez (backend null bekler).
 * Birim yalnız ORG_UNIT kapsamında gönderilir.
 */
export function toPackageRequest(form: PackageFormState): PackageRequest {
  const flex = form.overagePolicy === "FLEX";
  return {
    skuId: form.skuId,
    scope: form.scope as PackageRequest["scope"],
    orgUnitId: form.scope === "ORG_UNIT" ? form.orgUnitId.trim() : undefined,
    quota: Number(form.quota),
    validFrom: form.validFrom,
    validUntil: form.validUntil,
    overagePolicy: form.overagePolicy as PackageRequest["overagePolicy"],
    flexAllowance: flex ? Number(form.flexAllowance) : undefined,
  };
}

export type PurchaseFormState = { amount: string; reference: string };

export const EMPTY_PURCHASE_FORM: PurchaseFormState = { amount: "", reference: "" };

export function validatePurchaseForm(form: PurchaseFormState): string | null {
  return isPositiveInt(form.amount) ? null : "Miktar pozitif bir tam sayı olmalı.";
}

/** Her diyalog açılışı kendi `idempotencyKey`'ini üretir: çift tıklama hakkı iki kez eklemez. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function toPurchaseRequest(form: PurchaseFormState, idempotencyKey: string): PurchaseRequest {
  const reference = form.reference.trim();
  return {
    amount: Number(form.amount),
    reference: reference === "" ? undefined : reference,
    idempotencyKey,
  };
}

/** Hak yalnız ACTIVE pakete eklenebilir; düzenleme ve iptal de yalnız aktif pakette anlamlıdır. */
export function isActivePackage(pkg: Pick<PackageDto, "status">): boolean {
  return pkg.status === "ACTIVE";
}
