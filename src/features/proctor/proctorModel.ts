import type { AssignmentView, CredentialDto } from "@/src/api/generated/models";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

// ───────────── gözetmen rolü (R-22) ─────────────

export const PROCTOR_ROLES = ["ILC_PERSONNEL", "ACCREDITED_EXTERNAL", "INSTITUTION_STAFF"] as const;
export type ProctorRoleValue = (typeof PROCTOR_ROLES)[number];

export const ROLE_LABEL: Record<ProctorRoleValue, string> = {
  ILC_PERSONNEL: "ILC personeli",
  ACCREDITED_EXTERNAL: "Akredite harici gözetmen",
  INSTITUTION_STAFF: "Kurum personeli",
};

export const ROLE_HINT: Record<ProctorRoleValue, string> = {
  ILC_PERSONNEL: "Yalnız merkez (ILC) kadrosundan atanabilir.",
  ACCREDITED_EXTERNAL: "Yalnız geçerli (onaylı, süresi dolmamış) akreditasyonu olan personel için; aksi halde reddedilir ya da kurum personeli rolüne düşer.",
  INSTITUTION_STAFF: "Kurumun kendi personeli; akreditasyon gerekmez. Bütünlük seviyesine en düşük katkıyı verir.",
};

export function roleLabel(role?: string | null): string {
  return ROLE_LABEL[role as ProctorRoleValue] ?? role ?? "—";
}

export type AssignForm = { staffId: string; role: string; maxCandidates: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID_RE.test(value.trim());

export function validateAssign(form: AssignForm): Partial<Record<keyof AssignForm, string>> {
  const errors: Partial<Record<keyof AssignForm, string>> = {};
  // Boş staffId: sunucu çağıranın kendisini atar.
  if (form.staffId.trim() !== "" && !isUuid(form.staffId)) errors.staffId = "Geçerli bir kullanıcı kimliği (UUID) girin ya da boş bırakın";
  if (!PROCTOR_ROLES.includes(form.role as ProctorRoleValue)) errors.role = "Rol seçin";
  if (form.maxCandidates.trim() !== "") {
    const n = Number(form.maxCandidates);
    if (!Number.isInteger(n) || n < 1) errors.maxCandidates = "En az 1 olan bir tam sayı girin";
  }
  return errors;
}

export function toAssignRequest(form: AssignForm) {
  const max = form.maxCandidates.trim();
  return {
    ...(form.staffId.trim() ? { staffId: form.staffId.trim() } : {}),
    role: form.role as ProctorRoleValue,
    ...(max ? { maxCandidates: Number(max) } : {}),
  };
}

/** Düşürülmüş atama: istenen rol akreditasyon nedeniyle uygulanamadı (`downgraded=true`) — uyarı metni. */
export function downgradeWarning(view: Pick<AssignmentView, "downgraded" | "requestedRole" | "effectiveRole">): string | null {
  if (!view.downgraded) return null;
  return `İstenen rol “${roleLabel(view.requestedRole)}”, geçerli rol “${roleLabel(view.effectiveRole)}”: akreditasyon geçerli değil (onaylanmamış, süresi dolmuş ya da askıda). Bütünlük seviyesi geçerli role göre hesaplanır.`;
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

/** Atama/akreditasyon hataları: 409 (zaten atanmış, kapanmış seans, akreditasyon yok, kadro uyuşmazlığı) ve 400/403 sunucu mesajıyla aynen. */
export function proctorFailureMessage(err: unknown, fallback = "İşlem tamamlanamadı"): string {
  const status = statusOf(err);
  const text = err instanceof Error ? err.message.trim() : "";
  if ((status === 409 || status === 400 || status === 403 || status === 404) && text) return text;
  return text || fallback;
}

// ───────────── akreditasyon (R-22 /proctor/credentials) ─────────────

export const CREDENTIAL_STATUS_TABS: { label: string; value: string | null }[] = [
  { label: "Tümü", value: null },
  { label: "Bekleyen", value: "PENDING" },
  { label: "Onaylı", value: "APPROVED" },
  { label: "Reddedilen", value: "REJECTED" },
  { label: "Askıda", value: "SUSPENDED" },
];

export function credentialStatusLabel(status?: string | null): string {
  switch (status) {
    case "PENDING":
      return "Onay bekliyor";
    case "APPROVED":
      return "Onaylı";
    case "REJECTED":
      return "Reddedildi";
    case "SUSPENDED":
      return "Askıda";
    default:
      return status || "—";
  }
}

export function credentialStatusTone(status?: string | null): Tone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
    case "SUSPENDED":
      return "danger";
    default:
      return "neutral";
  }
}

/** Onaylı ama süresi dolmuş akreditasyon geçerli sayılmaz (rol düşer). */
export function isCredentialValidNow(c: Pick<CredentialDto, "status" | "validUntil">, now: Date = new Date()): boolean {
  if (c.status !== "APPROVED" || !c.validUntil) return false;
  return new Date(c.validUntil).getTime() > now.getTime();
}

export type CredentialAction = "approve" | "reject" | "suspend";

/**
 * Merkez eylemleri: bekleyen onaylanır/reddedilir, onaylı askıya alınır. Talep eden/personelin kendisi onaylayamaz (sunucu 409).
 * Kurum yalnız talep eder; bu eylemler `central=false` iken HİÇ sunulmaz.
 */
export function credentialActions(c: Pick<CredentialDto, "status">, central: boolean): CredentialAction[] {
  if (!central) return [];
  if (c.status === "PENDING") return ["approve", "reject"];
  if (c.status === "APPROVED") return ["suspend"];
  return [];
}

export type CredentialForm = { staffId: string; trainedAt: string; validUntil: string };

export function dayToInstant(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function validateCredentialRequest(form: CredentialForm, now: Date = new Date()): Partial<Record<keyof CredentialForm, string>> {
  const errors: Partial<Record<keyof CredentialForm, string>> = {};
  if (!isUuid(form.staffId)) errors.staffId = "Geçerli bir personel kimliği (UUID) girin";
  const trained = dayToInstant(form.trainedAt);
  const until = dayToInstant(form.validUntil);
  if (!trained) errors.trainedAt = "Eğitim tarihi zorunlu";
  if (!until) errors.validUntil = "Geçerlilik bitişi zorunlu";
  else if (trained && new Date(until) <= new Date(trained)) errors.validUntil = "Geçerlilik bitişi eğitim tarihinden sonra olmalı";
  else if (new Date(until) <= now) errors.validUntil = "Geçerlilik bitişi gelecekte bir tarih olmalı";
  return errors;
}

export function toCredentialRequest(form: CredentialForm) {
  return { staffId: form.staffId.trim(), trainedAt: dayToInstant(form.trainedAt)!, validUntil: dayToInstant(form.validUntil)! };
}
