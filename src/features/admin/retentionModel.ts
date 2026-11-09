import type { AppOutcome, Execution, ExecuteRequest, HoldView, OpenHoldRequest, PolicyView, RequestView, RunReport, SetPolicyRequest } from "@/src/api/generated/models";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

/**
 * R-24 (KVKK): saklama süresi paneli ve talep üzerine silme modeli. Saklama süreleri HUKUKİ karardır: bu modül hiçbir süre
 * değeri önermez/doldurmaz; süre yalnız merkezin girdiği değerdir, boş (null) = süresiz = o veri türünde silme ÇALIŞMAZ.
 */

// ── Veri türleri ───────────────────────────────────────────────────────────────────────────────────

export type DataKindCode = "SES" | "FOTOGRAF" | "DOKUM" | "YANIT" | "OLAY_GUNLUGU" | "KAYIT_PII";

export type DataKindDef = { code: DataKindCode; label: string; description: string; warning?: string };

/** Sunucunun `DataKind` sırası değil, ekranda okunur sıra. Açıklamalar sunucu belgelerinden; süre içermez. */
export const DATA_KINDS: DataKindDef[] = [
  { code: "SES", label: "Ses kaydı", description: "Cevap ve mikrofon kontrolü ses DOSYASI. Dosya silinir; satır ve döküm kalır." },
  { code: "FOTOGRAF", label: "Fotoğraf", description: "Kamera kontrolü kayıt dosyası. Dosya silinir." },
  { code: "DOKUM", label: "Ses dökümü", description: "Ses dosyasının metne dökümü (STT). Metin silinir; ses dosyasından bağımsız bir süreye tabidir." },
  {
    code: "YANIT",
    label: "Yanıt içeriği",
    description: "Adayın cevap içeriği. İçerik boşaltılır; satır ve puan bağı kalır.",
    warning: "Psikometri istatistik çıkarımı bu veriyi okuyor: süre kısa tutulursa silinen yanıtlar madde istatistiklerine ve yeniden puanlamaya girmez.",
  },
  { code: "OLAY_GUNLUGU", label: "Olay günlüğü", description: "Sınav olay satırları ile oturum/onay/kontrol kayıtlarındaki IP, tarayıcı ve cihaz izi. Dar bir istisnayla ve izli silinir." },
  { code: "KAYIT_PII", label: "Kayıt kişisel verisi", description: "Tamamlanan veya süresi dolan kendi kendine kayıt ile veli onayındaki kişisel veri (e-posta, ad, doğum tarihi)." },
];

export function dataKindDef(code?: string | null): DataKindDef {
  return DATA_KINDS.find((d) => d.code === code) ?? { code: (code ?? "SES") as DataKindCode, label: code || "—", description: "" };
}

/** Sunucu 6 türün hepsini döner; eksik gelirse (eski sunucu) satır yine de çizilir ve "bilinmiyor" görünür. */
export type PolicyRow = { def: DataKindDef; view: PolicyView | null };

export function policyRows(views: readonly PolicyView[] | undefined): PolicyRow[] {
  return DATA_KINDS.map((def) => ({ def, view: views?.find((v) => v.dataKind === def.code) ?? null }));
}

export function stateView(state?: string | null): { label: string; tone: Tone; waiting: boolean } {
  if (state === "ACTIVE") return { label: "Etkin", tone: "success", waiting: false };
  if (state === "WAITING_FOR_DECISION") return { label: "Karar bekliyor — silme çalışmaz", tone: "warning", waiting: true };
  return { label: "Bilinmiyor — silme çalışmaz", tone: "neutral", waiting: true };
}

export function daysText(days?: number | null): string {
  return days === null || days === undefined ? "Süresiz" : `${days.toLocaleString("tr-TR")} gün`;
}

export const POLICY_MAX_DAYS = 36500;
export const POLICY_REASON_MAX = 500;

/** Boş süre = süresiz (null). Doluysa 1..36500 tam sayı. Varsayılan/önerilen değer YOKTUR. */
export function validateDays(text: string): { value: number | null; error: string | null } {
  const t = text.trim();
  if (!t) return { value: null, error: null };
  if (!/^\d+$/.test(t)) return { value: null, error: "Tam sayı (gün) girin ya da süresiz için boş bırakın" };
  const n = Number(t);
  if (n < 1 || n > POLICY_MAX_DAYS) return { value: null, error: `Süre 1 ile ${POLICY_MAX_DAYS.toLocaleString("tr-TR")} gün arasında olmalı` };
  return { value: n, error: null };
}

export function validatePolicyReason(reason: string): string | null {
  const t = reason.trim();
  if (!t) return "Gerekçe zorunlu (hukuki dayanak / karar referansı)";
  if (t.length > POLICY_REASON_MAX) return `Gerekçe en çok ${POLICY_REASON_MAX} karakter olabilir`;
  return null;
}

/** `retentionDays` null iken alan HİÇ gönderilmez değil, açıkça null gider: sunucu null = süresiz yazar. */
export function toSetPolicyRequest(code: DataKindCode, days: number | null, reason: string): SetPolicyRequest {
  return { dataKind: code, retentionDays: days as unknown as number, reason: reason.trim() };
}

export function policyFailureMessage(err: unknown, fallback = "Saklama süresi kaydedilemedi"): string {
  const text = err instanceof Error ? err.message.trim() : "";
  return text || fallback;
}

// ── Koşum (kuru / gerçek) ──────────────────────────────────────────────────────────────────────────

/**
 * Sunucu `RunReport.items` için OpenAPI `Report` adını başka bir şemayla (`ReportModel` değil, `report.ts`) çakıştırıyor;
 * üretilen tip yanlış. Gerçek şekil `RetentionJob.Report`'tur — burada elle tanımlı ve çalışma zamanında savunmalı okunur.
 */
export type RunItem = {
  dataKind?: string;
  companyId?: string | null;
  retentionDays?: number | null;
  skippedNoPolicy?: boolean;
  eligible?: number;
  blocked?: number;
  erased?: number;
  failed?: number;
};

export function runItems(report: Pick<RunReport, "items"> | null | undefined): RunItem[] {
  const items = (report?.items ?? []) as unknown;
  return Array.isArray(items) ? (items as RunItem[]) : [];
}

export type RunTotals = { eligible: number; blocked: number; erased: number; failed: number; skipped: number };

export function runTotals(items: readonly RunItem[]): RunTotals {
  return items.reduce<RunTotals>(
    (t, i) => ({
      eligible: t.eligible + (i.eligible ?? 0),
      blocked: t.blocked + (i.blocked ?? 0),
      erased: t.erased + (i.erased ?? 0),
      failed: t.failed + (i.failed ?? 0),
      skipped: t.skipped + (i.skippedNoPolicy ? 1 : 0),
    }),
    { eligible: 0, blocked: 0, erased: 0, failed: 0, skipped: 0 },
  );
}

export function isDryRunReport(report: Pick<RunReport, "mode"> | null | undefined): boolean {
  return report?.mode !== "EXECUTE";
}

/** KURU KOŞUM isteği: dryRun AÇIKÇA true gönderilir (sunucu varsayılanına güvenilmez). */
export function dryRunBody(companyId: string): { companyId?: string; dryRun: true } {
  const id = companyId.trim();
  return id ? { companyId: id, dryRun: true } : { dryRun: true };
}

export function executeBody(companyId: string): { companyId?: string; dryRun: false } {
  const id = companyId.trim();
  return id ? { companyId: id, dryRun: false } : { dryRun: false };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v.trim());

export function validateOptionalCompany(value: string): string | null {
  return !value.trim() || isUuid(value) ? null : "Geçerli bir kurum kimliği (UUID) girin ya da tüm kurumlar için boş bırakın";
}

export const EXECUTE_PHRASE = "SİL";

export type RealRunGate = { allowed: boolean; reason: string | null };

/**
 * GERÇEK SİLME düğmesi kuralı: (1) sunucuda silme bayrağı açık olmalı (`executeEnabled=true`; durum bilinmiyorsa kapalı sayılır),
 * (2) aynı kapsamda (kurum/tüm kurumlar) bu oturumda bir KURU KOŞUM yapılmış olmalı. Kuru koşum kuralı sunucu kuralı değil,
 * panelin ek emniyetidir: "önce kuru koşumda doğrula".
 */
export function realRunGate(args: { executeEnabled: boolean | undefined; dryRunScope: string | null; scope: string }): RealRunGate {
  if (args.executeEnabled !== true) {
    return { allowed: false, reason: "Silme KAPALI: sunucuda silme bayrağı (execute-enabled) kapalı olduğu için gerçek silme yapılamaz." };
  }
  if (args.dryRunScope === null || args.dryRunScope !== args.scope.trim()) {
    return { allowed: false, reason: "Önce aynı kapsamda bir kuru koşum yapın ve sonucu inceleyin." };
  }
  return { allowed: true, reason: null };
}

export function runFailureMessage(err: unknown): string {
  const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
  const text = err instanceof Error ? err.message.trim() : "";
  if (status === 409 && text) return text; // silme bayrağı kapalıyken dryRun=false
  if (status === 403) return "Bu işlem yalnız merkez ve saklama yönetimi (retention:manage) yetkisiyle yapılır.";
  return text || "Koşum başarısız oldu.";
}

// ── Yasal tutma ────────────────────────────────────────────────────────────────────────────────────

export const HOLD_SCOPES: { value: OpenHoldRequest["scopeType"] & string; label: string; hint: string }[] = [
  { value: "APPLICATION", label: "Deneme", hint: "Tek bir sınav denemesi" },
  { value: "STUDENT", label: "Aday", hint: "Bir adayın tüm verisi" },
  { value: "COMPANY", label: "Kurum", hint: "Bir kurumun tüm verisi" },
];

export function holdScopeLabel(scope?: string | null): string {
  return HOLD_SCOPES.find((s) => s.value === scope)?.label ?? (scope || "—");
}

export const HOLD_REASON_MAX = 1000;

export function validateHold(scopeId: string, reason: string): { scopeId?: string; reason?: string } {
  const errors: { scopeId?: string; reason?: string } = {};
  if (!isUuid(scopeId)) errors.scopeId = "Geçerli bir kapsam kimliği (UUID) girin";
  const r = reason.trim();
  if (!r) errors.reason = "Gerekçe zorunlu";
  else if (r.length > HOLD_REASON_MAX) errors.reason = `Gerekçe en çok ${HOLD_REASON_MAX} karakter olabilir`;
  return errors;
}

export function activeHolds(holds: readonly HoldView[] | undefined): HoldView[] {
  return (holds ?? []).filter((h) => !h.releasedAt);
}

/** Açık itirazlı denemede bırakma 409 döner; sunucu mesajı AYNEN gösterilir ("önce itiraz dosyası kapatılmalı"). */
export function holdFailureMessage(err: unknown, fallback = "İşlem yapılamadı"): string {
  const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
  const text = err instanceof Error ? err.message.trim() : "";
  if ((status === 409 || status === 400 || status === 403) && text) return text;
  return text || fallback;
}

// ── Talep üzerine silme ────────────────────────────────────────────────────────────────────────────

export const ERASURE_FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: "Tümü" },
  { value: "RECEIVED", label: "Alındı" },
  { value: "DEFERRED", label: "Ertelendi" },
  { value: "COMPLETED", label: "Tamamlandı" },
  { value: "REJECTED", label: "Reddedildi" },
];

export function requestStatusView(status?: string | null): { label: string; tone: Tone; open: boolean } {
  switch (status) {
    case "RECEIVED":
      return { label: "Alındı — değerlendirilecek", tone: "info", open: true };
    case "DEFERRED":
      return { label: "Ertelendi — engel kalkınca yeniden yürütülür", tone: "warning", open: true };
    case "COMPLETED":
      return { label: "Tamamlandı", tone: "success", open: false };
    case "REJECTED":
      return { label: "Reddedildi", tone: "danger", open: false };
    default:
      return { label: status || "—", tone: "neutral", open: false };
  }
}

/** Yalnız açık talep (RECEIVED/DEFERRED) yürütülür/reddedilir; sunucu kapalı talepte 409 döner. */
export function canActOnRequest(request: Pick<RequestView, "status">): boolean {
  return requestStatusView(request.status).open;
}

export const VIA_LABELS: Record<string, string> = { SELF: "Aday kendisi", STAFF: "Kurum personeli", CENTER: "Merkez" };

export function viaLabel(via?: string | null): string {
  return VIA_LABELS[via ?? ""] ?? (via || "—");
}

/** Yürütme sonucunun üst durumu (dryRun: WOULD_*). */
export function executionStatusView(status?: string | null): { label: string; description: string; tone: Tone } {
  switch (status) {
    case "WOULD_COMPLETE":
      return { label: "Kuru koşum: tamamlanırdı", description: "Hiçbir şey silinmedi. Gerçek yürütmede tüm denemeler silinir ve kimlik EN SON anonimleştirilir.", tone: "info" };
    case "WOULD_DEFER":
      return { label: "Kuru koşum: ertelenirdi", description: "Hiçbir şey silinmedi. Gerçek yürütmede engelsiz denemeler silinir; engelli deneme kalırsa talep ertelenir ve kimlik anonimleştirilmez.", tone: "warning" };
    case "COMPLETED":
      return { label: "Tamamlandı", description: "Tüm denemeler kapıdan geçti ve silindi; hesap/profil kimliği anonimleştirildi.", tone: "success" };
    case "DEFERRED":
      return { label: "Ertelendi", description: "Engelli (yasal tutma, açık itiraz/inceleme, itiraz süresi) veya hatalı deneme var: o denemeler silinmedi ve kimlik anonimleştirilmedi. Engel kalkınca talep yeniden yürütülür.", tone: "warning" };
    default:
      return { label: status || "—", description: "", tone: "neutral" };
  }
}

export function appStatusView(status?: string | null): { label: string; tone: Tone } {
  switch (status) {
    case "ERASED":
      return { label: "Silindi", tone: "success" };
    case "BLOCKED":
      return { label: "Engelli — silinmedi", tone: "warning" };
    case "LOCKED":
      return { label: "Kilitli — silinmedi", tone: "warning" };
    case "NOTHING_TO_DO":
      return { label: "Silinecek veri yok", tone: "neutral" };
    case "FAILED":
      return { label: "Hata", tone: "danger" };
    case "PREVIEW":
      return { label: "Önizleme", tone: "info" };
    default:
      return { label: status || "—", tone: "neutral" };
  }
}

export function blockerText(blocker?: string | null): string | null {
  switch (blocker) {
    case null:
    case undefined:
    case "":
    case "NONE":
      return null;
    case "NOT_SETTLED":
      return "Sonuç henüz yerleşmedi (yayınlanmamış ya da itiraz süresi dolmadı)";
    case "LEGAL_HOLD":
      return "Yasal tutma var";
    case "OPEN_APPEAL":
      return "Açık itiraz dosyası var";
    case "OPEN_REVIEW":
      return "Açık inceleme talebi var";
    case "LOCKED":
      return "Deneme başka bir işlemde kilitli";
    default:
      return blocker;
  }
}

/** Yayınlanmamış-sonuç kararı adayı: kapıyı yalnız "yerleşmedi" tutuyorsa merkez gerekçeli kararla kaldırabilir (yasal tutma/itiraz ASLA). */
export function canWaive(app: Pick<AppOutcome, "blocker" | "status">): boolean {
  return app.blocker === "NOT_SETTLED";
}

export const WAIVER_REASON_MAX = 500;

export function validateWaiver(selected: readonly string[], reason: string): string | null {
  if (selected.length === 0) return null;
  const r = reason.trim();
  if (!r) return "Yerleşmemiş denemeyi silme kararı için gerekçe zorunlu";
  if (r.length > WAIVER_REASON_MAX) return `Gerekçe en çok ${WAIVER_REASON_MAX} karakter olabilir`;
  return null;
}

/** Yürütme isteği. Kuru koşum varsayılandır; gerçek yürütme dryRun=false'u AÇIKÇA ister. Karar yoksa waive alanları gönderilmez. */
export function toExecuteBody(args: { dryRun: boolean; waive?: readonly string[]; waiverReason?: string }): ExecuteRequest {
  const body: ExecuteRequest = { dryRun: args.dryRun };
  if (args.waive && args.waive.length > 0) {
    body.waiveUnsettled = [...args.waive];
    body.waiverReason = (args.waiverReason ?? "").trim();
  }
  return body;
}

/** Gerçek yürütme düğmesi: açık talep + son kuru koşum AYNI talep için yapılmış ve sonucu görülmüş olmalı. */
export function canExecuteRequest(args: { request: Pick<RequestView, "status" | "id">; previewedRequestId: string | null; previewDryRun: boolean }): boolean {
  return canActOnRequest(args.request) && args.previewDryRun && args.previewedRequestId === args.request.id;
}

export type ExecutionSummary = { applications: number; erased: number; blocked: number; failed: number };

export function summarizeExecution(e: Pick<Execution, "applications" | "failed"> | null | undefined): ExecutionSummary {
  const apps = e?.applications ?? [];
  return {
    applications: apps.length,
    erased: apps.filter((a) => a.status === "ERASED").length,
    blocked: apps.filter((a) => a.status === "BLOCKED" || a.status === "LOCKED" || (a.status === "PREVIEW" && a.blocker)).length,
    failed: e?.failed ?? apps.filter((a) => a.status === "FAILED").length,
  };
}

export function erasureFailureMessage(err: unknown, fallback = "İşlem yapılamadı"): string {
  const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
  const text = err instanceof Error ? err.message.trim() : "";
  if ((status === 409 || status === 400 || status === 403 || status === 404) && text) return text;
  return text || fallback;
}

export const ERASURE_REASON_MAX = 1000;

export function validateErasureReason(reason: string): string | null {
  return reason.trim().length > ERASURE_REASON_MAX ? `Açıklama en çok ${ERASURE_REASON_MAX} karakter olabilir` : null;
}

/** Aday/personel talebi: gerekçe isteğe bağlıdır. Boşsa alan gönderilmez. */
export function toSubmitBody(args: { subjectUserId?: string; reason: string }): { subjectUserId?: string; reason?: string } {
  const body: { subjectUserId?: string; reason?: string } = {};
  if (args.subjectUserId) body.subjectUserId = args.subjectUserId;
  if (args.reason.trim()) body.reason = args.reason.trim();
  return body;
}

export function openRequestOf(requests: readonly RequestView[] | undefined): RequestView | undefined {
  return (requests ?? []).find((r) => canActOnRequest(r));
}
