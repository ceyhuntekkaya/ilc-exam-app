"use client";

import { useMine, useSubmit, getMineQueryKey } from "@/src/api/generated/erasure-requests/erasure-requests";
import { candidateRequestText, openRequestOf, requestStatusView, submitFailureMessage, toSubmitBody, validateErasureReason } from "@/src/features/admin/retentionModel";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import { KidButton, KidCard, KidError, KidLoading, KidNotice } from "@/src/features/student/ui";
import { Textarea } from "@/src/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/**
 * R-24 (KVKK): adayın "verilerimin silinmesini talep et" ekranı. Talep açmak GERÇEK SİLMEYİ TETİKLEMEZ: talep merkeze iner, merkez
 * (kimlik doğrulama/engel kontrolüyle) değerlendirir ve yürütür. Aynı anda yalnız bir açık talep olabilir.
 */
export function ErasureSelfService() {
  const query = useMine();
  const submit = useSubmit();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const reasonIssue = validateErasureReason(reason);

  if (query.isLoading) return <KidLoading label="Talepleriniz yükleniyor…" rows={1} />;
  if (query.isError) return <KidError title="Talepler yüklenemedi" message="Silme talepleriniz şu an açılamadı." onRetry={() => void query.refetch()} retryLabel="Yeniden dene" />;

  const requests = query.data?.data ?? [];
  const open = openRequestOf(requests);

  async function send() {
    if (reasonIssue) return;
    setError(null);
    try {
      await submit.mutateAsync({ data: toSubmitBody({ reason }) });
      setReason("");
      setSent(true);
      await queryClient.invalidateQueries({ queryKey: getMineQueryKey() });
    } catch (err) {
      // 409: zaten açık bir talebiniz var — sunucu mesajı aynen.
      setError(submitFailureMessage(err));
      await queryClient.invalidateQueries({ queryKey: getMineQueryKey() });
    }
  }

  return (
    <div lang="tr" className="grid gap-5">
      <KidCard className="grid gap-3 p-5">
        <h2 className="font-kid text-lg font-bold text-slate-900">Verilerimin silinmesini talep et</h2>
        <p className="text-slate-700">
          Kişisel verilerinizin silinmesini isteyebilirsiniz (KVKK). Talep açmak verilerinizi <strong>hemen silmez</strong>: talebiniz merkeze iletilir,
          merkez tarafından değerlendirilir ve yürütülür.
        </p>
        <ul className="ml-5 list-disc text-sm text-slate-600">
          <li>Açık bir itiraz, yasal tutma ya da itiraz süresi varsa ilgili veriler engel kalkana kadar silinmez; talebiniz bekletilir.</li>
          <li>Sonuç, sertifika, ödeme, rıza ve denetim kayıtları yasal yükümlülükler nedeniyle saklanır.</li>
        </ul>
      </KidCard>

      {open || sent ? (
        <KidNotice tone="sky">
          <p role="status">
            {open ? candidateRequestText(open) : "Talebiniz alındı, merkez tarafından değerlendirilir. Bu aşamada verileriniz silinmemiştir."}
          </p>
        </KidNotice>
      ) : (
        <KidCard className="grid gap-3 p-5">
          <label htmlFor="erasure-reason" className="text-sm font-semibold text-slate-800">
            Açıklama (isteğe bağlı)
          </label>
          <Textarea id="erasure-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={reasonIssue ? true : undefined} />
          {reasonIssue ? <p className="text-xs text-rose-700">{reasonIssue}</p> : null}
          {error ? (
            <p role="alert" className="text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          <div>
            <KidButton variant="primary" onClick={() => void send()} disabled={submit.isPending || Boolean(reasonIssue)}>
              {submit.isPending ? "Gönderiliyor…" : "Silinmesini talep et"}
            </KidButton>
          </div>
        </KidCard>
      )}

      {requests.length > 0 ? (
        <section aria-label="Taleplerim" className="grid gap-3">
          <h3 className="font-kid text-base font-bold text-slate-900">Taleplerim</h3>
          <ul className="grid gap-3" data-testid="my-requests">
            {requests.map((r) => {
              const st = requestStatusView(r.status);
              return (
                <li key={r.id} className="rounded-(--sb-r-md) border border-slate-200/90 bg-white p-4 text-sm">
                  <p className="font-semibold text-slate-900">
                    {st.label} <span className="font-normal text-slate-500">· {formatDateTime(r.createdAt)}</span>
                  </p>
                  <p className="mt-1 text-slate-600">{candidateRequestText(r)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
