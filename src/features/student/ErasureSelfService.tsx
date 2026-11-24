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

  if (query.isLoading) return <KidLoading label="Loading your requests…" rows={1} />;
  if (query.isError) return <KidError title="Could not load requests" message="We could not open your deletion requests right now." onRetry={() => void query.refetch()} retryLabel="Try again" />;

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
    <div lang="en" className="grid gap-5">
      <KidCard className="grid gap-3 p-5">
        <h2 className="font-kid text-lg font-bold text-slate-900">Request deletion of my data</h2>
        <p className="text-slate-700">
          You can ask for your personal data to be deleted (KVKK). Opening a request <strong>does not delete your data immediately</strong>: your request is sent to the centre,
          which assesses and processes it.
        </p>
        <ul className="ml-5 list-disc text-sm text-slate-600">
          <li>If there is an open appeal, a legal hold or an appeal period, the related data is not deleted until the block is lifted; your request is put on hold.</li>
          <li>Results, certificates, payments, consents and audit records are kept because of legal obligations.</li>
        </ul>
      </KidCard>

      {open || sent ? (
        <KidNotice tone="sky">
          <p role="status">
            {open ? candidateRequestText(open) : "Your request was received and will be assessed by the centre. Your data has not been deleted at this stage."}
          </p>
        </KidNotice>
      ) : (
        <KidCard className="grid gap-3 p-5">
          <label htmlFor="erasure-reason" className="text-sm font-semibold text-slate-800">
            Note (optional)
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
              {submit.isPending ? "Sending…" : "Request deletion"}
            </KidButton>
          </div>
        </KidCard>
      )}

      {requests.length > 0 ? (
        <section aria-label="My requests" className="grid gap-3">
          <h3 className="font-kid text-base font-bold text-slate-900">My requests</h3>
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
