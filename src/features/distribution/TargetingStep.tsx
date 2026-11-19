"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customInstance } from "@/src/api/mutator";
import type { StudentDto } from "@/src/api/generated/models";
import { useList20 as useOrgUnits } from "@/src/api/generated/org-units/org-units";
import {
  getCandidatesQueryKey,
  getPreviewQueryKey,
  getTargetRulesQueryKey,
  useAddTargetRule,
  useReconcileDistribution,
  useRemoveTargetRule,
  useTargetRules,
} from "@/src/api/generated/company-distributions/company-distributions";
import { Badge, Button, Checkbox, ErrorState, Field, Input, Select, Skeleton, errorMessage, notify } from "@/src/ui";
import {
  EMPTY_RULE,
  ROLES,
  RULE_TYPES,
  branchOptions,
  describeRule,
  hasIncludeRule,
  reconcileOutcome,
  ruleTypeLabel,
  studentOptions,
  toRuleRequest,
  validateRule,
  type RuleForm,
  type RuleNames,
} from "@/src/features/distribution/distributionModel";

/**
 * Hedefleme: dahil/hariç kuralları. Şube (UNIT) ve öğrenci (STATIC_LIST) listeden seçilir; kimlik elle girilmez.
 * Şube listesi org-unit ağacından (kapsam süzülü), öğrenci listesi kurum öğrenci listesinden gelir (değer `ilcIdentityId`).
 * Birim kuralında alt ağaç varsayılan KAPALI. Her kural sunucuda ayrıca kapsam denetiminden geçer
 * (kapsam dışı birim 403 döner, mesaj gösterilir).
 *
 * `live` (açılmış dağıtım): sihirbaz düğmeleri yoktur; her kural değişikliğinden sonra hedef küme sunucuda
 * uyarlanır (`reconcile`): yeni hedeflenene hak ayrılır, hedeften çıkan ve başlamamış adayın hakkı iade edilir,
 * başlamış adaya dokunulmaz. Son "dahil et" kuralı kaldırılamaz (tüm adayları düşürürdü; bunun yolu iptaldir).
 */
export function TargetingStep({
  companyId,
  distributionId,
  onBack,
  onNext,
  live = false,
}: {
  companyId: string;
  distributionId: string;
  onBack?: () => void;
  onNext?: () => void;
  live?: boolean;
}) {
  const queryClient = useQueryClient();
  const rulesQ = useTargetRules(distributionId);
  const add = useAddTargetRule();
  const remove = useRemoveTargetRule();
  const reconcile = useReconcileDistribution();
  const [form, setForm] = useState<RuleForm>(EMPTY_RULE);
  const [error, setError] = useState<string | null>(null);
  const rules = rulesQ.data?.data ?? [];
  const includeCount = rules.filter((r) => !r.exclude).length;
  const isLastInclude = (rule: { exclude?: boolean }) => !rule.exclude && includeCount <= 1;
  const typeInfo = RULE_TYPES.find((t) => t.value === form.type);

  const unitsQ = useOrgUnits(companyId, { query: { retry: false } });
  const studentsQ = useQuery({
    queryKey: ["distribution-target-students", companyId],
    queryFn: () => customInstance<{ data: StudentDto[] }>(`/companies/${companyId}/students`),
    retry: false,
  });
  const units = useMemo(() => unitsQ.data?.data?.items ?? [], [unitsQ.data]);
  const branches = useMemo(() => branchOptions(units), [units]);
  const students = useMemo(() => studentOptions(studentsQ.data?.data ?? []), [studentsQ.data]);
  const names: RuleNames = useMemo(
    () => ({
      units: new Map(branches.map((o) => [o.value, o.label])),
      students: new Map(students.options.map((o) => [o.value, o.label])),
    }),
    [branches, students],
  );
  const selectedUnit = form.type === "UNIT" ? units.find((u) => u.id === form.refId) : undefined;

  function patch(next: Partial<RuleForm>) {
    setForm((s) => ({ ...s, ...next }));
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getTargetRulesQueryKey(distributionId) });
    // Kurallar değişince önceki önizleme geçersizdir.
    await queryClient.invalidateQueries({ queryKey: getPreviewQueryKey(distributionId) });
  }

  /** Açılmış dağıtımda kural değişince hedef kümeyi uyarlar ve sonucu bildirir. */
  async function applyLive() {
    if (!live) return;
    const result = await reconcile.mutateAsync({ distributionId });
    await queryClient.invalidateQueries({ queryKey: getCandidatesQueryKey(distributionId) });
    const outcome = reconcileOutcome(result.data);
    if (outcome.tone === "warning") notify.error(outcome.message);
    else notify.success(outcome.message);
  }

  async function submit() {
    setError(null);
    const problem = validateRule(form);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await add.mutateAsync({ distributionId, data: toRuleRequest(form) });
      await refresh();
      await applyLive();
      setForm((s) => ({ ...EMPTY_RULE, type: s.type, role: s.role }));
    } catch (err) {
      setError(errorMessage(err, "Kural eklenemedi"));
    }
  }

  async function removeRule(ruleId: string) {
    setError(null);
    try {
      await remove.mutateAsync({ distributionId, ruleId });
      await refresh();
      if (live) await applyLive();
      else notify.success("Kural kaldırıldı");
    } catch (err) {
      setError(errorMessage(err, "Kural kaldırılamadı"));
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-fg">Eklenen kurallar</h3>
        {rulesQ.isLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : rulesQ.isError ? (
          <ErrorState error={rulesQ.error} onRetry={() => void rulesQ.refetch()} compact />
        ) : rules.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-fg-muted">
            Henüz kural yok. En az bir “dahil et” kuralı ekleyin; “hariç tut” kuralları sonuçtan kişi çıkarır.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {rules.map((rule) => (
              <li key={rule.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm">
                <Badge tone={rule.exclude ? "danger" : "success"}>{rule.exclude ? "Hariç tut" : "Dahil et"}</Badge>
                <span className="font-medium text-fg">{ruleTypeLabel(rule.type)}</span>
                <span className="text-fg-muted">{describeRule(rule, names)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  disabled={remove.isPending || reconcile.isPending || (live && isLastInclude(rule))}
                  title={live && isLastInclude(rule) ? "Son “dahil et” kuralı kaldırılamaz; dağıtımı iptal edebilirsiniz." : undefined}
                  onClick={() => rule.id && void removeRule(rule.id)}
                >
                  Kaldır
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-bg/60 p-3 sm:p-4">
        <h3 className="text-sm font-semibold text-fg">Kural ekle</h3>
        <Field label="Kural türü" hint={typeInfo?.hint}>
          <Select
            value={form.type}
            onChange={(e) => patch({ type: e.target.value as RuleForm["type"], refId: "", includeSubtree: false })}
          >
            {RULE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        {form.type === "MEMBERSHIP_ROLE" ? (
          <Field label="Rol">
            <Select value={form.role} onChange={(e) => patch({ role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : form.type === "UNIT" ? (
          <Field
            label="Şube"
            required
            hint={
              unitsQ.isError
                ? errorMessage(unitsQ.error, "Şube listesi yüklenemedi")
                : unitsQ.data?.data?.warning ?? undefined
            }
          >
            <Select
              searchable
              searchPlaceholder="Şube ara"
              value={form.refId}
              disabled={unitsQ.isLoading || unitsQ.isError}
              onChange={(e) => patch({ refId: e.target.value, includeSubtree: false })}
            >
              <option value="">{unitsQ.isLoading ? "Şubeler yükleniyor…" : branches.length ? "Şube seçin" : "Şube yok"}</option>
              {branches.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : form.type === "STATIC_LIST" ? (
          <Field
            label="Öğrenci"
            required
            hint={
              studentsQ.isError
                ? errorMessage(studentsQ.error, "Öğrenci listesi yüklenemedi")
                : students.unlinked > 0
                  ? `${students.unlinked} öğrencinin hesabı henüz bir ILC kimliğine bağlı olmadığı için listede yok.`
                  : undefined
            }
          >
            <Select
              searchable
              searchPlaceholder="Ad, numara ya da kullanıcı adı"
              value={form.refId}
              disabled={studentsQ.isLoading || studentsQ.isError}
              onChange={(e) => patch({ refId: e.target.value })}
            >
              <option value="">
                {studentsQ.isLoading ? "Öğrenciler yükleniyor…" : students.options.length ? "Öğrenci seçin" : "Öğrenci yok"}
              </option>
              {students.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Yükleme (batch) kimliği" required hint="UUID.">
            <Input value={form.refId} autoComplete="off" onChange={(e) => patch({ refId: e.target.value })} placeholder="00000000-0000-0000-0000-000000000000" />
          </Field>
        )}

        {form.type === "UNIT" && (selectedUnit?.childCount ?? 0) > 0 ? (
          <Checkbox
            label="Alt birimleri de dahil et"
            description="Kapalıyken yalnız seçilen birimin kendisi hedeflenir."
            checked={form.includeSubtree}
            onChange={(e) => patch({ includeSubtree: e.target.checked })}
          />
        ) : null}
        <Checkbox
          label="Hariç tut"
          description="İşaretliyse bu kural eşleşenleri hedeften çıkarır."
          checked={form.exclude}
          onChange={(e) => patch({ exclude: e.target.checked })}
        />
        <div>
          <Button type="button" variant="secondary" loading={add.isPending || reconcile.isPending} onClick={() => void submit()}>
            Kuralı ekle
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {live ? null : (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>
            Geri
          </Button>
          <Button type="button" disabled={!hasIncludeRule(rules)} onClick={onNext}>
            Önizlemeye geç
          </Button>
        </div>
      )}
    </div>
  );
}
