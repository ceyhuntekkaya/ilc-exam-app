"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListConsentTextsQueryKey,
  useAddVersion,
  useListConsentTexts,
} from "@/src/api/generated/consent-administration/consent-administration";
import { ConsentTextRowConsentType } from "@/src/api/generated/models";
import type { ConsentTextRow, ConsentTextVersionRow } from "@/src/api/generated/models";
import { Button, ErrorState, Field, FormCard, FormMessage, Input, Textarea, errorMessage, notify } from "@/src/ui";

type ConsentType = (typeof ConsentTextRowConsentType)[keyof typeof ConsentTextRowConsentType];

/**
 * Sabit tip listesi (bugün 4): hukuktan metin gelmediği için `EMPLOYMENT_CONTEXT` boş kalabilir —
 * bu bir hata değil, "henüz metin tanımlanmadı" durumudur (F3B-18 açık maddesi). Yer tutucu metin yazılmaz.
 */
const TYPE_INFO: { type: ConsentType; label: string; description: string }[] = [
  {
    type: ConsentTextRowConsentType.MEDIA_RECORDING,
    label: "Görüntü/ses kaydı",
    description: "Sınav sırasında görüntü/ses kaydı alınmasına ilişkin rıza metni.",
  },
  {
    type: ConsentTextRowConsentType.DATA_PROCESSING,
    label: "Veri işleme",
    description: "Öğrenci verilerinin işlenmesine ilişkin rıza metni.",
  },
  {
    type: ConsentTextRowConsentType.EMPLOYMENT_CONTEXT,
    label: "İstihdam bağlamı",
    description: "İstihdam bağlamında alınan rıza metni. Hukuktan metin gelene kadar yer tutucu yazılmaz; metin boşken bu rıza türü fiilen devre dışıdır.",
  },
  {
    type: ConsentTextRowConsentType.DEMOGRAPHIC_DATA,
    label: "Demografik veri",
    description: "Ana dil gibi demografik verilerin işlenmesine ilişkin rıza metni.",
  },
];

export function ConsentTextsSection() {
  const { data, isLoading, isError, error, refetch } = useListConsentTexts();
  const rows: ConsentTextRow[] = data?.data ?? [];

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  return (
    <div className="grid gap-4">
      {TYPE_INFO.map((info) => (
        <ConsentTypeCard
          key={info.type}
          type={info.type}
          label={info.label}
          description={info.description}
          row={rows.find((r) => r.consentType === info.type)}
          loading={isLoading}
        />
      ))}
    </div>
  );
}

function ConsentTypeCard({
  type,
  label,
  description,
  row,
  loading,
}: {
  type: ConsentType;
  label: string;
  description: string;
  row?: ConsentTextRow;
  loading: boolean;
}) {
  const versions: ConsentTextVersionRow[] = [...(row?.versions ?? [])].sort(
    (a, b) => (b.versionNo ?? 0) - (a.versionNo ?? 0),
  );
  const addVersion = useAddVersion();
  const queryClient = useQueryClient();
  const [uiLocale, setUiLocale] = useState("tr-TR");
  const [body, setBody] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!body.trim()) {
      setFormError("Metin boş olamaz.");
      return;
    }
    try {
      await addVersion.mutateAsync({
        type,
        data: {
          uiLocale: uiLocale.trim() || "tr-TR",
          body: body.trim(),
          effectiveAt: effectiveAt ? new Date(`${effectiveAt}T00:00:00`).toISOString() : undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListConsentTextsQueryKey() });
      setBody("");
      setEffectiveAt("");
      notify.success("Sürüm eklendi");
    } catch (err) {
      const message = errorMessage(err, "Sürüm eklenemedi");
      setFormError(message);
      notify.error(message);
    }
  }

  return (
    <FormCard title={label} description={description}>
      <div className="grid gap-3">
        <p className="text-[13px] font-medium text-fg-muted">Mevcut sürümler</p>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
        ) : versions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-[13px] text-fg-subtle">
            Henüz metin tanımlanmadı.
          </p>
        ) : (
          <ul className="grid gap-2">
            {versions.map((v) => (
              <li key={v.id} className="rounded-lg border border-border px-3 py-2.5">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-fg">
                  <span>Sürüm {v.versionNo}</span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-fg-muted">{v.uiLocale}</span>
                  <span className="text-xs font-normal text-fg-subtle">
                    Yürürlük: {v.effectiveAt ? new Date(v.effectiveAt).toLocaleString("tr-TR") : "—"}
                  </span>
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-fg-muted">{v.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 border-t border-border pt-4">
        <p className="text-[13px] font-medium text-fg-muted">Yeni sürüm ekle</p>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <Field label="Dil" hint="UI locale">
            <Input value={uiLocale} onChange={(e) => setUiLocale(e.target.value)} placeholder="tr-TR" />
          </Field>
          <Field label="Yürürlük tarihi" hint="Boş bırakılırsa backend şimdi kullanır.">
            <Input type="date" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} />
          </Field>
        </div>
        <Field label="Metin" required>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Rıza metni…" />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {formError ? <FormMessage tone="danger">{formError}</FormMessage> : <span className="sm:mr-auto" />}
          <Button type="submit" loading={addVersion.isPending}>
            Sürüm ekle
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
