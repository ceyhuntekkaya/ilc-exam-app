"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListDeclarationsQueryKey,
  useDeclare,
  useListDeclarations,
} from "@/src/api/generated/consent-administration/consent-administration";
import { InstitutionDeclarationRequestScopeItem } from "@/src/api/generated/models";
import {
  Button,
  Checkbox,
  ErrorState,
  Field,
  FormCard,
  FormMessage,
  Input,
  SectionTable,
  SectionToolbar,
  errorMessage,
  notify,
} from "@/src/ui";

type ScopeValue = (typeof InstitutionDeclarationRequestScopeItem)[keyof typeof InstitutionDeclarationRequestScopeItem];

const SCOPE_OPTIONS: { value: ScopeValue; label: string }[] = [
  { value: InstitutionDeclarationRequestScopeItem.MEDIA_RECORDING, label: "Görüntü/ses kaydı" },
  { value: InstitutionDeclarationRequestScopeItem.DATA_PROCESSING, label: "Veri işleme" },
  { value: InstitutionDeclarationRequestScopeItem.EMPLOYMENT_CONTEXT, label: "İstihdam bağlamı" },
  { value: InstitutionDeclarationRequestScopeItem.DEMOGRAPHIC_DATA, label: "Demografik veri (örn. ana dil)" },
];

function scopeLabel(value?: string | null): string {
  return SCOPE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "—";
}

/**
 * D66: reşit olmayanların rızası kurum tarafından alınır; kurum bunu sözleşme eki ile ILC'ye beyan eder.
 * Sistemde çocuktan rıza istenmez — bu ekran sadece o beyanı kaydeder/listeler (`/my-company/institution-declarations`,
 * tenant oturumdan çıkar; `companyId` burada yalnız sorgu anahtarını kurum değişince tazelemek için kullanılır).
 */
export function InstitutionDeclarationSection({ companyId }: { companyId: string }) {
  const { data, isLoading, isError, error, refetch } = useListDeclarations({
    query: { queryKey: [...getListDeclarationsQueryKey(), companyId] },
  });
  const rows = [...(data?.data ?? [])].sort((a, b) => (b.declaredAt ?? "").localeCompare(a.declaredAt ?? ""));

  const declare = useDeclare();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<ScopeValue[]>([]);
  const [documentRef, setDocumentRef] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  function toggle(value: ScopeValue) {
    setScope((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (scope.length === 0) {
      setFormError("En az bir rıza türü seçin.");
      return;
    }
    const ref = documentRef.trim();
    if (!ref) {
      setFormError("Belge referansı girin.");
      return;
    }
    try {
      await declare.mutateAsync({ data: { scope, documentRef: ref } });
      await queryClient.invalidateQueries({ queryKey: getListDeclarationsQueryKey() });
      setScope([]);
      setDocumentRef("");
      notify.success("Beyan kaydedildi");
    } catch (err) {
      const message = errorMessage(err, "Beyan kaydedilemedi");
      setFormError(message);
      notify.error(message);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-border bg-neutral-50/60 px-3.5 py-3 text-[13px] leading-relaxed text-fg-muted">
        <span className="font-semibold text-fg">Reşit olmayan öğrenciler:</span> rızası kurum tarafından alınır; kurum
        bunu sözleşme eki ile ILC&apos;ye beyan eder. Sistemde çocuktan rıza istenmez — bu ekran o beyanı kaydeder.
        Görüntü/ses kaydı ve veri işleme rızası da, reşit olmayan öğrenciler için, kurum adına burada beyan edilebilir.
      </div>

      <SectionTable
        toolbar={<SectionToolbar count={rows.length} noun="beyan" loading={isLoading} />}
        loading={isLoading}
        empty="Henüz beyan kaydı yok"
        emptyHint="Aşağıdaki formla ilk beyanı ekleyin."
        columns={["Tarih", "Kapsam", "Belge referansı", "Beyan eden"]}
        rows={rows.map((r) => [
          r.declaredAt ? new Date(r.declaredAt).toLocaleString("tr-TR") : "—",
          (r.scope ?? []).map(scopeLabel).join(", ") || "—",
          r.documentRef ?? "—",
          r.declaredBy ?? "—",
        ])}
      />

      <form onSubmit={(event) => void onSubmit(event)}>
        <FormCard
          title="Yeni beyan ekle"
          description='Örn. "Sözleşme eki no: 2026-XX" referansıyla kurumun aldığı rızayı beyan edin.'
        >
          <Field label="Kapsam" required hint="Hangi rıza türleri için beyan ediliyor.">
            <div className="grid gap-0.5">
              {SCOPE_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  checked={scope.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
              ))}
            </div>
          </Field>
          <Field label="Belge referansı" required>
            <Input
              value={documentRef}
              onChange={(e) => setDocumentRef(e.target.value)}
              placeholder="Sözleşme eki no: 2026-XX"
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {formError ? <FormMessage tone="danger">{formError}</FormMessage> : <span className="sm:mr-auto" />}
            <Button type="submit" loading={declare.isPending}>
              Beyanı kaydet
            </Button>
          </div>
        </FormCard>
      </form>
    </div>
  );
}
