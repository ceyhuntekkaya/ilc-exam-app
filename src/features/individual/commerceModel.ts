import type { CatalogItemDto, MyOrderDto, PaymentInstructions } from "@/src/api/generated/models";
import { levelLabel, outputLabel } from "@/src/features/admin/skuModel";
import { purposeLabel } from "@/src/features/admin/policyBundleModel";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

/** Tutar: tr-TR gösterimi; para birimi bilinmiyorsa yalnız sayı. */
export function formatMoney(amount?: number | null, currency?: string | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  const value = Number(amount);
  if (!currency) return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
}

/** Tarih-saat (tr-TR); geçersiz/boş için "—". */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

// ---- Sipariş durumu (CREATED | APPROVED | CANCELLED | REFUNDED | EXPIRED) ----

export function orderStatusLabel(status?: string | null): string {
  switch (status) {
    case "CREATED":
      return "Ödeme bekleniyor";
    case "APPROVED":
      return "Ödeme onaylandı";
    case "CANCELLED":
      return "İptal edildi";
    case "REFUNDED":
      return "İade edildi";
    case "EXPIRED":
      return "Süresi doldu";
    default:
      return status || "—";
  }
}

export function orderStatusTone(status?: string | null): BadgeTone {
  switch (status) {
    case "CREATED":
      return "warning";
    case "APPROVED":
      return "success";
    case "REFUNDED":
      return "info";
    case "EXPIRED":
      return "danger";
    default:
      return "neutral";
  }
}

// ---- Hak durumu (NONE | PENDING | GRANTED) ----

export function entitlementStatusLabel(status?: string | null): string {
  switch (status) {
    case "GRANTED":
      return "Hakkınız tanımlandı";
    case "PENDING":
      return "Hakkınız hazırlanıyor";
    case "NONE":
      return "Henüz hak yok";
    default:
      return status || "—";
  }
}

export function entitlementStatusTone(status?: string | null): BadgeTone {
  switch (status) {
    case "GRANTED":
      return "success";
    case "PENDING":
      return "info";
    default:
      return "neutral";
  }
}

/** Yalnız ödemesi beklenen sipariş iptal edilebilir ya da ödenebilir. */
export function isAwaitingPayment(order: Pick<MyOrderDto, "status">): boolean {
  return order.status === "CREATED";
}

/** Ödeme yapıldı ama hak henüz görünmüyor: kullanıcıya "hazırlanıyor" notu gösterilir. */
export function isGrantPending(order: Pick<MyOrderDto, "status" | "entitlementStatus">): boolean {
  return order.status === "APPROVED" && order.entitlementStatus !== "GRANTED";
}

// ---- Havale talimatı (ManualTransferProvider: iban, accountHolder, bankName, referenceCode, amount, currency) ----

export type TransferDetails = {
  iban: string;
  accountHolder: string;
  bankName: string;
  referenceCode: string;
  amount: string;
  currency: string;
  /** IBAN ve hesap sahibi doldurulmuş mu (sunucu env'i `PAYMENT_MANUAL_TRANSFER_*` boşsa false). */
  configured: boolean;
};

export function readTransferDetails(instructions?: PaymentInstructions | null): TransferDetails | null {
  const d = instructions?.details;
  if (!d) return null;
  const pick = (key: string) => (typeof d[key] === "string" ? d[key].trim() : "");
  const iban = pick("iban");
  const accountHolder = pick("accountHolder");
  return {
    iban,
    accountHolder,
    bankName: pick("bankName"),
    referenceCode: pick("referenceCode"),
    amount: pick("amount"),
    currency: pick("currency"),
    configured: iban !== "" && accountHolder !== "",
  };
}

/** IBAN'ı dörtlü gruplar (okunaklı gösterim); kopyalamada boşluksuz hali kullanılır. */
export function groupIban(iban: string): string {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

// ---- Katalog ----

export type CatalogCard = {
  skuId: string;
  title: string;
  purpose: string;
  level: string;
  output: string;
  validity: string | null;
  price: string;
};

function levelSpan(min?: string, max?: string): string {
  const a = levelLabel(min);
  const b = levelLabel(max);
  if (a && b) return a === b ? a : `${a} – ${b}`;
  return a || b || "—";
}

export function toCatalogCard(item: CatalogItemDto): CatalogCard | null {
  if (!item.skuId) return null;
  return {
    skuId: item.skuId,
    title: item.name || item.code || "Ürün",
    purpose: purposeLabel(item.examPurpose),
    level: levelSpan(item.minLevel, item.maxLevel),
    output: outputLabel(item.outputType),
    validity: item.validityDays ? `${item.validityDays} gün geçerli` : null,
    price: formatMoney(item.price, item.currency),
  };
}

// ---- Sipariş oluşturma yanıtı ({ order, instructions } ama üretilen tip yalnız {[k]: unknown}) ----

export function createdOrderId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const order = (data as { order?: unknown }).order;
  if (!order || typeof order !== "object") return null;
  const id = (order as { id?: unknown }).id;
  return typeof id === "string" && id ? id : null;
}

// ---- Hata mesajları ----

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

function textOf(err: unknown): string | undefined {
  const text = err instanceof Error ? err.message.trim() : "";
  return text || undefined;
}

/**
 * Sipariş oluşturma/iptal hataları. 409 (tekrar politikası, "önceki ödemenizin hakkı henüz tanımlanmadı")
 * ve 400 (ürün satışta değil) sunucunun açıklamasıyla OLDUĞU GİBİ gösterilir.
 */
export function orderFailureMessage(err: unknown, fallback = "İşlem şu an yapılamadı. Lütfen biraz sonra yeniden deneyin."): string {
  const status = statusOf(err);
  const text = textOf(err);
  if ((status === 409 || status === 400 || status === 403) && text) return text;
  if (status === 401) return "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.";
  if (status === 404) return "Sipariş bulunamadı.";
  return fallback;
}
