"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getPreviewQueryKey,
  getTargetRulesQueryKey,
  useAddTargetRule,
  useRemoveTargetRule,
  useTargetRules,
} from "@/src/api/generated/company-distributions/company-distributions";
import { Badge, Button, Checkbox, ErrorState, Field, Input, Select, Skeleton, errorMessage, notify } from "@/src/ui";
import {
  EMPTY_RULE,
  ROLES,
  RULE_TYPES,
  describeRule,
  hasIncludeRule,
  ruleTypeLabel,
  toRuleRequest,
  validateRule,
  type RuleForm,
} from "@/src/features/distribution/distributionModel";

/**
 * Hedefleme: dahil/hariç kuralları. Birim kuralında alt ağaç varsayılan KAPALI. Yalnız DRAFT'ta çağrılır;
 * her kural sunucuda ayrıca kapsam denetiminden geçer (kapsam dışı birim 403 döner, mesaj gösterilir).
 */
export function TargetingStep({
  distributionId,
  onBack,
  onNext,
}: {
  distributionId: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const queryClient = useQueryClient();
  const rulesQ = useTargetRules(distributionId);
  const add = useAddTargetRule();
  const remove = useRemoveTargetRule();
  const [form, setForm] = useState<RuleForm>(EMPTY_RULE);
  const [error, setError] = useState<string | null>(null);
  const rules = rulesQ.data?.data ?? [];
  const typeInfo = RULE_TYPES.find((t) => t.value === form.type);

  function patch(next: Partial<RuleForm>) {
    setForm((s) => ({ ...s, ...next }));
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getTargetRulesQueryKey(distributionId) });
    // Kurallar değişince önceki önizleme geçersizdir.
    await queryClient.invalidateQueries({ queryKey: getPreviewQueryKey(distributionId) });
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
      notify.success("Kural kaldırıldı");
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
                <span className="text-fg-muted">{describeRule(rule)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  disabled={remove.isPending}
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
          <Select value={form.type} onChange={(e) => patch({ type: e.target.value as RuleForm["type"] })}>
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
        ) : (
          <Field
            label={form.type === "UNIT" ? "Birim kimliği" : form.type === "STATIC_LIST" ? "Kimlik (ilcIdentityId)" : "Yükleme (batch) kimliği"}
            required
            hint={form.type === "UNIT" ? "Birimin UUID’si. Birim ağacı seçicisi henüz yok; kimlik elle girilir." : "UUID."}
          >
            <Input value={form.refId} autoComplete="off" onChange={(e) => patch({ refId: e.target.value })} placeholder="00000000-0000-0000-0000-000000000000" />
          </Field>
        )}

        {form.type === "UNIT" ? (
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
          <Button type="button" variant="secondary" loading={add.isPending} onClick={() => void submit()}>
            Kuralı ekle
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Geri
        </Button>
        <Button type="button" disabled={!hasIncludeRule(rules)} onClick={onNext}>
          Önizlemeye geç
        </Button>
      </div>
    </div>
  );
}
