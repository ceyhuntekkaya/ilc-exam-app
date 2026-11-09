"use client";

import { useMemo, useState } from "react";
import { useDeleteScope, useInstitutes, useYears } from "@/src/api/generated/admin-companies/admin-companies";
import { useList20 as useOrgUnits } from "@/src/api/generated/org-units/org-units";
import { useAssign, useRemove } from "@/src/api/generated/staff-unit-scope/staff-unit-scope";
import type { StaffDto, StaffScopeDto } from "@/src/api/generated/models";
import { useCan } from "@/src/features/panel/PanelContext";
import { OrgUnitPicker } from "@/src/features/org/OrgUnitPicker";
import { assignUnitBody, isUnitOnlyScope, shortId, unitLabel, validateOrgUnitChoice } from "@/src/features/org/scopeModel";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ConfirmDialog, Field, FormCard, FormMessage, Select, errorMessage, notify } from "@/src/ui";

function fullName(r?: StaffDto | null) {
  return `${r?.firstName ?? ""} ${r?.lastName ?? ""}`.trim() || r?.username || "Personel";
}

/**
 * E-44: personelin kapsam satırlarına BİRİM (OrgUnit) ata / kaldır. Birim ataması olmayan birim yöneticisi birim bazında
 * hiçbir veri göremez (sunucu fail-closed). Yetki `staff:assign_scope`; yetkisiz kullanıcıya düğmeler gösterilmez.
 * Sunucu kuralları (kök birim atanamaz, kendi satırını değiştiremez, kapsamı aşan atama 403, yalnız-birim satırda
 * birim kaldırma 409) sunucu mesajıyla AYNEN gösterilir; ekran bunları önceden tahmin edip değiştirmez.
 *
 * Birim, kurumun birim ağacından (GET /companies/{id}/org-units, `staff:assign_scope`; orval'da `list_19` adıyla üretilir)
 * seçilir; satırlarda birim adı gösterilir, liste yoksa/yüklenemediyse kısa kimlik (tam UUID title'da) gösterilir.
 * Birim yöneticisi yalnız kendi alt ağacını görür; listeyi sunucu zaten kapsama göre süzer.
 */
export function ScopeAssignmentSection({
  companyId,
  staff,
  onChanged,
  onClose,
}: {
  companyId: string;
  staff: StaffDto;
  onChanged?: () => Promise<unknown> | void;
  onClose?: () => void;
}) {
  const canAssign = useCan(Perm.staffAssignScope);
  const assign = useAssign();
  const remove = useRemove();
  const deleteScope = useDeleteScope();
  const institutesData = useInstitutes(companyId).data;
  const years = useYears(companyId).data?.data ?? [];
  const instituteName = useMemo(() => Object.fromEntries((institutesData?.data ?? []).map((i) => [i.id!, i.name ?? ""])), [institutesData]);
  const scopes = staff.scopes ?? [];
  // Uç `staff:assign_scope` ister; izni olmayana boşuna 403 üretmemek için yalnız atayabilen kullanıcıda çekilir.
  const orgUnits = useOrgUnits(companyId, { query: { enabled: canAssign, retry: false } });
  const unitList = orgUnits.data?.data;
  const unitItems = useMemo(() => unitList?.items ?? [], [unitList]);
  const unitById = useMemo(() => new Map(unitItems.filter((u) => u.id).map((u) => [u.id!, u])), [unitItems]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState("");
  const [yearId, setYearId] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [deleting, setDeleting] = useState<StaffScopeDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const editing = scopes.find((s) => s.id === editingId) ?? null;
  const unitIssue = validateOrgUnitChoice(unitId);

  const changed = async () => {
    await onChanged?.();
  };

  function startEdit(s: StaffScopeDto) {
    setEditingId(s.id ?? null);
    setUnitId(s.orgUnitId ?? "");
    setYearId(s.academicYearId ?? "");
    setTouched(false);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing?.id || !staff.id) return;
    setTouched(true);
    if (unitIssue) return;
    setError(null);
    try {
      await assign.mutateAsync({ id: companyId, uid: staff.id, sid: editing.id, data: assignUnitBody(unitId, yearId) });
      await changed();
      setEditingId(null);
      notify.success("Birim kapsamı atandı");
    } catch (err) {
      setError(errorMessage(err, "Birim kapsamı atanamadı"));
    }
  }

  async function removeUnit(s: StaffScopeDto) {
    if (!s.id || !staff.id) return;
    setRowError(null);
    try {
      await remove.mutateAsync({ id: companyId, uid: staff.id, sid: s.id });
      await changed();
      notify.success("Birim kapsamı kaldırıldı");
    } catch (err) {
      setRowError({ id: s.id, message: errorMessage(err, "Birim kapsamı kaldırılamadı") });
    }
  }

  async function deleteRow() {
    if (!deleting?.id || !staff.id) return;
    setDeleteError(undefined);
    try {
      await deleteScope.mutateAsync({ id: companyId, uid: staff.id, sid: deleting.id });
      await changed();
      setDeleting(null);
      if (editingId === deleting.id) setEditingId(null);
      notify.success("Kapsam satırı silindi");
    } catch (err) {
      setDeleteError(errorMessage(err, "Kapsam satırı silinemedi"));
    }
  }

  return (
    <FormCard
      title={`Birim kapsamı · ${fullName(staff)}`}
      description="Birim yöneticisi yalnız kendisine birim atanmış kapsam satırlarında birim bazlı veriyi görür; birimi olmayan satır birim bazında hiçbir şey göstermez."
      aside={onClose ? <Button type="button" size="sm" variant="ghost" onClick={onClose}>Kapat</Button> : undefined}
    >
      {!canAssign ? (
        <p role="note" className="text-[13px] text-fg-muted">
          Birim ataması için <span className="font-mono">staff:assign_scope</span> izni gerekir; kapsam satırları yalnız görüntülenir.
        </p>
      ) : null}
      {scopes.length === 0 ? (
        <p className="rounded-md bg-warning-bg px-3 py-2 text-[13px] text-warning">Bu personelin kapsam satırı yok. Önce Roller bölümünden rol ekleyin.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border" data-testid="scope-rows">
          {scopes.map((s) => {
            const unitOnly = isUnitOnlyScope(s);
            const unit = s.orgUnitId ? unitById.get(s.orgUnitId) : undefined;
            return (
              <li key={s.id} className="grid gap-2 px-3 py-2.5" data-testid={`scope-${s.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 text-sm">
                    <span className="font-medium text-fg">{s.roleName ?? "Rol"}</span>
                    <span className="text-fg-subtle">
                      {" "}
                      · {s.instituteId ? (instituteName[s.instituteId] ?? "Kampüs") : "Kurum geneli"}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                      {s.orgUnitId ? (
                        <>
                          <span className="text-fg-muted">Birim:</span>
                          {unit ? (
                            <span title={s.orgUnitId}>
                              <span className="font-medium text-fg">{unitLabel(unit)}</span>
                              {unit.code ? <span className="font-mono text-xs text-fg-subtle"> ({unit.code})</span> : null}
                            </span>
                          ) : (
                            <span className="font-mono" title={s.orgUnitId}>{shortId(s.orgUnitId)}</span>
                          )}
                          {unitOnly ? <Badge tone="warning">Yalnız birim</Badge> : null}
                        </>
                      ) : (
                        <span className="text-fg-subtle">Birim atanmamış</span>
                      )}
                    </div>
                  </div>
                  {canAssign ? (
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={() => startEdit(s)}>
                        {s.orgUnitId ? "Birimi değiştir" : "Birim ata"}
                      </Button>
                      {s.orgUnitId && !unitOnly ? (
                        <Button type="button" size="sm" variant="ghost" className="min-h-11" disabled={remove.isPending} onClick={() => void removeUnit(s)}>
                          Birimi kaldır
                        </Button>
                      ) : null}
                      {unitOnly ? (
                        <Button type="button" size="sm" variant="ghost" className="min-h-11 text-danger" onClick={() => { setDeleteError(undefined); setDeleting(s); }}>
                          Satırı sil
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {unitOnly ? (
                  <p role="note" className="rounded-md bg-warning-bg px-3 py-2 text-[13px] text-warning">
                    Bu satır yalnız birim kapsamı taşıyor: birimi kaldırmak kapsamı daraltmaz, kurum geneline AÇAR. Bu yüzden &quot;Birimi kaldır&quot;
                    yoktur; kapsamı kaldırmak için satırı silin.
                  </p>
                ) : null}
                {rowError && rowError.id === s.id ? (
                  <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-[13px] text-danger">
                    {rowError.message}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canAssign && editing ? (
        <form onSubmit={(e) => void submit(e)} className="grid gap-3 border-t border-border pt-4" aria-label="Birim ata">
          <p className="text-[13px] font-semibold text-fg">
            {editing.roleName ?? "Rol"} satırına birim {editing.orgUnitId ? "değiştir" : "ata"}
          </p>
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <OrgUnitPicker
              items={unitItems}
              loading={orgUnits.isLoading}
              error={orgUnits.error}
              onRetry={() => void orgUnits.refetch()}
              truncated={unitList?.truncated}
              warning={unitList?.warning}
              value={unitId}
              onChange={setUnitId}
              invalidMessage={touched ? (unitIssue ?? undefined) : undefined}
            />
            <Field label="Sezon" hint="İsteğe bağlı. Şube biriminde birimin kendi sezonu kullanılır.">
              <Select value={yearId} onChange={(e) => setYearId(e.target.value)}>
                <option value="">Belirtme</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={assign.isPending}>
              Vazgeç
            </Button>
            <Button type="submit" loading={assign.isPending}>
              Birimi ata
            </Button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Kapsam satırı silinsin mi?"
        description={
          <p>
            {deleting?.roleName ?? "Rol"} rolünün bu kapsam satırı silinir; personel bu satırdan gelen erişimi kaybeder. Bu satırda başka kapsam yoktur,
            yani kurum geneline açılma olmaz.
          </p>
        }
        confirmLabel="Satırı sil"
        pending={deleteScope.isPending}
        error={deleteError}
        onClose={() => setDeleting(null)}
        onConfirm={() => void deleteRow()}
      />
    </FormCard>
  );
}
