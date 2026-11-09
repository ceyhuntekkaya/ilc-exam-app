import type { AssignUnitScopeRequest, StaffScopeDto } from "@/src/api/generated/models";

/**
 * E-44: kapsam satırı kuralları. Sunucu `StaffScope.isUnitOnly` ile aynı: birim dolu, kampüs/sınıf/şube boş.
 * Böyle bir satırda birimi kaldırmak boş alanları "tümü" yapıp kurum geneline AÇAR; sunucu 409 döner,
 * doğru yol satırı silmektir.
 */
export function isUnitOnlyScope(s: Pick<StaffScopeDto, "orgUnitId" | "instituteId" | "gradeId" | "branchId">): boolean {
  return Boolean(s.orgUnitId) && !s.instituteId && !s.gradeId && !s.branchId;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Birim kimliği (UUID) girişi; boş veya biçimi bozuksa Türkçe hata, geçerliyse null. */
export function validateOrgUnitId(value: string): string | null {
  const v = value.trim();
  if (!v) return "Birim kimliği zorunlu.";
  if (!UUID_RE.test(v)) return "Birim kimliği geçerli bir UUID olmalı (örn. 00000000-0000-0000-0000-000000000000).";
  return null;
}

export function shortId(id?: string | null): string {
  return id ? id.slice(0, 8) : "—";
}

/** PUT gövdesi: sezon seçilmediyse alan hiç gönderilmez (şube biriminde birimin kendi sezonu kullanılır). */
export function assignUnitBody(orgUnitId: string, academicYearId?: string | null): AssignUnitScopeRequest {
  const year = academicYearId?.trim();
  return year ? { orgUnitId: orgUnitId.trim(), academicYearId: year } : { orgUnitId: orgUnitId.trim() };
}
