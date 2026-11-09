import type { AssignUnitScopeRequest, StaffScopeDto, UnitNode } from "@/src/api/generated/models";

/**
 * E-44: kapsam satırı kuralları. Sunucu `StaffScope.isUnitOnly` ile aynı: birim dolu, kampüs/sınıf/şube boş.
 * Böyle bir satırda birimi kaldırmak boş alanları "tümü" yapıp kurum geneline AÇAR; sunucu 409 döner,
 * doğru yol satırı silmektir.
 */
export function isUnitOnlyScope(s: Pick<StaffScopeDto, "orgUnitId" | "instituteId" | "gradeId" | "branchId">): boolean {
  return Boolean(s.orgUnitId) && !s.instituteId && !s.gradeId && !s.branchId;
}

/** Birim seçici: seçim yapılmadıysa Türkçe hata, yapıldıysa null (kimlik listeden geldiği için biçim denetimi gerekmez). */
export function validateOrgUnitChoice(value: string): string | null {
  return value.trim() ? null : "Bir birim seçin.";
}

export function shortId(id?: string | null): string {
  return id ? id.slice(0, 8) : "—";
}

/** PUT gövdesi: sezon seçilmediyse alan hiç gönderilmez (şube biriminde birimin kendi sezonu kullanılır). */
export function assignUnitBody(orgUnitId: string, academicYearId?: string | null): AssignUnitScopeRequest {
  const year = academicYearId?.trim();
  return year ? { orgUnitId: orgUnitId.trim(), academicYearId: year } : { orgUnitId: orgUnitId.trim() };
}

/** Birim adı yoksa (alan isteğe bağlı) kısa kimliğe düşer; uydurma ad üretilmez. */
export function unitLabel(node: Pick<UnitNode, "id" | "name">): string {
  return node.name?.trim() || shortId(node.id);
}

/** Türkçe duyarlı, aksan ve büyük/küçük harf farkını yok sayan karşılaştırma anahtarı (İ/ı/I/i aynı). */
function fold(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export type UnitRow = { node: UnitNode; /** Arama ölçütüne kendisi uyuyor mu (false: yalnız bağlam için gösterilen üst birim). */ match: boolean };

/**
 * Ön-sıra (DFS) listeyi ad/koda göre süzer; sıra korunur. Aramada eşleşen birimlerin üst birimleri de (listede varsa)
 * bağlam olarak tutulur ki girinti anlamlı kalsın. `parentId` yoksa birim ağacın tepesidir (kök ya da izinli alt ağacın
 * tepesi); listede bulunmayan üst birim zinciri sessizce biter, döngü olsa bile sonsuz döngüye girilmez.
 */
export function filterUnits(items: readonly UnitNode[], query: string): UnitRow[] {
  const q = fold(query.trim());
  if (!q) return items.map((node) => ({ node, match: true }));
  const byId = new Map<string, UnitNode>();
  for (const n of items) if (n.id) byId.set(n.id, n);
  const matched = new Set<string>();
  const keep = new Set<string>();
  for (const n of items) {
    if (!n.id || !(fold(n.name ?? "").includes(q) || fold(n.code ?? "").includes(q))) continue;
    matched.add(n.id);
    keep.add(n.id);
    let parent = n.parentId ? byId.get(n.parentId) : undefined;
    while (parent?.id && !keep.has(parent.id)) {
      keep.add(parent.id);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
  }
  return items.filter((n) => n.id && keep.has(n.id)).map((node) => ({ node, match: matched.has(node.id!) }));
}
