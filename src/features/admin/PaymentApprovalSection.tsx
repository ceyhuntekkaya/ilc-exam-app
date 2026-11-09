"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  byReference,
  getGrantJobsQueryKey,
  getList5QueryKey,
  useApprove3,
  useGrantJobs,
  useList5,
  useRefund,
  useRetryGrantJob,
} from "@/src/api/generated/payment/payment";
import type { AccountingOrderDto, GrantJobDto, List5Status } from "@/src/api/generated/models";
import {
  ACCOUNTING_STATUS_TABS,
  canApproveOrder,
  canRefundOrder,
  failureKindLabel,
  grantStatusLabel,
  grantStatusTone,
  referenceSearchFailure,
  refundOutcome,
  retryResultMessage,
  toRefundRequest,
  validateRefund,
} from "@/src/features/admin/paymentModel";
import { formatDateTime, formatMoney, orderStatusLabel, orderStatusTone } from "@/src/features/individual/commerceModel";
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  FilterTabs,
  FormDialog,
  Input,
  SectionTable,
  SectionToolbar,
  Textarea,
  errorMessage,
  notify,
} from "@/src/ui";

const PAGE_SIZE = 20;

/**
 * F6-03 / R-18: muhasebe ekranı. Bekleyen havale siparişleri, referans koduyla arama, onay, iade (hak durumu
 * uyarısıyla) ve ölü mektup (ödeme alınmış ama hak üretilememiş) listesi + yeniden dene.
 * Yetki sunucuda (SUPER_ADMIN ya da center:manage); sunucu hataları olduğu gibi gösterilir.
 */
export function PaymentApprovalSection() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>("CREATED");
  const [page, setPage] = useState(0);
  const orders = useList5({ ...(status ? { status: status as List5Status } : {}), page, size: PAGE_SIZE });
  const rows: AccountingOrderDto[] = orders.data?.data.items ?? [];
  const total = orders.data?.data.total ?? 0;

  const [approving, setApproving] = useState<AccountingOrderDto | null>(null);
  const [refunding, setRefunding] = useState<AccountingOrderDto | null>(null);
  const [approveError, setApproveError] = useState<string | undefined>();
  const approve = useApprove3();

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getList5QueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGrantJobsQueryKey() }),
    ]);
  }

  async function doApprove(order: AccountingOrderDto) {
    if (!order.id) return;
    setApproveError(undefined);
    try {
      await approve.mutateAsync({ id: order.id });
      notify.success("Ödeme onaylandı; hak üretimi başlatıldı.");
      setApproving(null);
      await refreshAll();
    } catch (err) {
      setApproveError(errorMessage(err, "Sipariş onaylanamadı"));
    }
  }

  return (
    <div className="grid gap-6">
      <DeadLetterPanel onChanged={refreshAll} />
      <ReferenceSearch onApprove={setApproving} onRefund={setRefunding} />

      {orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} compact />
      ) : (
        <SectionTable
          loading={orders.isLoading}
          tabs={
            <FilterTabs
              label="Sipariş durumu"
              items={ACCOUNTING_STATUS_TABS}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(0);
              }}
            />
          }
          toolbar={
            <SectionToolbar count={total} noun="sipariş" loading={orders.isLoading}>
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Önceki
              </Button>
              <Button variant="secondary" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
                Sonraki
              </Button>
            </SectionToolbar>
          }
          columns={["Referans", "Aday", "Ürün", { label: "Tutar", align: "right" }, "Durum", "Hak", "Tarih", ""]}
          empty={status === "CREATED" ? "Bekleyen sipariş yok" : "Bu durumda sipariş yok"}
          emptyHint="Aday sipariş oluşturduğunda burada listelenir."
          emptyTone="neutral"
          rows={rows.map((order) => orderRow(order, setApproving, setRefunding))}
        />
      )}

      <ConfirmDialog
        open={approving !== null}
        title="Ödemeyi onayla"
        tone="primary"
        confirmLabel="Ödemeyi onayla"
        pending={approve.isPending}
        error={approveError}
        description={
          approving ? (
            <>
              <strong className="font-mono">{approving.referenceCode}</strong> referans kodlu {formatMoney(approving.price, approving.currency)} tutarındaki havalenin hesaba geçtiğini
              doğruladınız mı? Onay sonrası adayın hakkı üretilir; bu işlem geri alınamaz (yalnız iade edilebilir).
            </>
          ) : undefined
        }
        onClose={() => {
          setApproving(null);
          setApproveError(undefined);
        }}
        onConfirm={() => approving && void doApprove(approving)}
      />

      {refunding ? (
        <RefundDialog
          key={refunding.id}
          order={refunding}
          onClose={() => setRefunding(null)}
          onDone={async () => {
            setRefunding(null);
            await refreshAll();
          }}
        />
      ) : null}
    </div>
  );
}

function orderRow(order: AccountingOrderDto, onApprove: (o: AccountingOrderDto) => void, onRefund: (o: AccountingOrderDto) => void) {
  return [
    <span key="r" className="font-mono text-[13px] font-semibold">
      {order.referenceCode}
    </span>,
    <span key="c">
      {order.candidateName || "—"}
      {order.candidateUsername ? <span className="block text-xs text-fg-muted">{order.candidateUsername}</span> : null}
    </span>,
    order.skuName || order.skuCode || "—",
    formatMoney(order.price, order.currency),
    <Badge key="s" tone={orderStatusTone(order.status)} dot>
      {orderStatusLabel(order.status)}
    </Badge>,
    order.grantStatus ? (
      <Badge key="g" tone={grantStatusTone(order.grantStatus)} dot>
        {grantStatusLabel(order.grantStatus)}
      </Badge>
    ) : (
      "—"
    ),
    formatDateTime(order.createdAt),
    <div key="a" className="flex justify-end gap-1.5">
      {canApproveOrder(order) ? (
        <Button size="sm" onClick={() => onApprove(order)}>
          Onayla
        </Button>
      ) : null}
      {canRefundOrder(order) ? (
        <Button size="sm" variant="danger" onClick={() => onRefund(order)}>
          İade et
        </Button>
      ) : null}
    </div>,
  ];
}

/** Referans koduyla arama. Kod sunucuda normalize edilir (boşluk/tire/küçük harf serbest). */
function ReferenceSearch({ onApprove, onRefund }: { onApprove: (o: AccountingOrderDto) => void; onRefund: (o: AccountingOrderDto) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<AccountingOrderDto | null>(null);

  async function search() {
    const query = code.trim();
    if (!query) return;
    setBusy(true);
    setError(null);
    setFound(null);
    try {
      const result = await byReference(query);
      setFound(result.data);
    } catch (err) {
      setError(referenceSearchFailure(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="ref-search" className="grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h2 id="ref-search" className="text-sm font-semibold text-fg">
        Referans koduyla ara
      </h2>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="min-w-64 flex-1">
          <Field label="Havale açıklamasındaki kod">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ILC-XXXX-XX" autoComplete="off" spellCheck={false} />
          </Field>
        </div>
        <Button type="submit" loading={busy} disabled={!code.trim()}>
          Ara
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {found ? (
        <SectionTable columns={["Referans", "Aday", "Ürün", { label: "Tutar", align: "right" }, "Durum", "Hak", "Tarih", ""]} empty="" rows={[orderRow(found, onApprove, onRefund)]} />
      ) : null}
    </section>
  );
}

/** Ölü mektup: ödeme alınmış ama hak üretilememiş siparişler. Boş değilse sayfanın en üstünde, uyarı olarak görünür. */
function DeadLetterPanel({ onChanged }: { onChanged: () => Promise<void> }) {
  const jobs = useGrantJobs({ status: "DEAD", page: 0, size: 50 });
  const retry = useRetryGrantJob();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const list: GrantJobDto[] = jobs.data?.data ?? [];

  if (jobs.isError) return <ErrorState title="Ölü mektup listesi alınamadı" error={jobs.error} onRetry={() => void jobs.refetch()} compact />;
  if (jobs.isLoading || list.length === 0) return null;

  async function doRetry(job: GrantJobDto) {
    if (!job.id) return;
    setRetryingId(job.id);
    try {
      const result = await retry.mutateAsync({ id: job.id });
      const outcome = retryResultMessage(result.data);
      if (outcome.ok) notify.success(outcome.message);
      else notify.error(outcome.message);
      await onChanged();
    } catch (err) {
      notify.error(errorMessage(err, "Yeniden deneme başlatılamadı"));
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <section aria-labelledby="dead-letters" className="grid gap-3 rounded-xl border-2 border-danger/40 bg-danger-bg/40 p-4">
      <div>
        <h2 id="dead-letters" className="text-base font-semibold text-danger">
          Ödeme alındı, hak üretilemedi ({list.length})
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Aşağıdaki siparişlerde ödeme onaylandı ama adayın hakkı tanımlanamadı. Nedeni giderin, sonra “Yeniden dene”yi kullanın; aday bu sırada hakkını göremez.
        </p>
      </div>
      <SectionTable
        columns={["Referans", "Aday", "Ürün", "Hata türü", "Son hata", { label: "Deneme", align: "right" }, "Ölü tarihi", ""]}
        empty=""
        rows={list.map((job) => [
          <span key="r" className="font-mono text-[13px] font-semibold">
            {job.referenceCode}
          </span>,
          job.candidateName || "—",
          job.skuName || "—",
          failureKindLabel(job.failureKind),
          <span key="e" className="block max-w-64 truncate" title={job.lastError}>
            {job.lastError || "—"}
          </span>,
          String(job.attemptCount ?? 0),
          formatDateTime(job.deadAt),
          <div key="a" className="flex justify-end">
            <Button size="sm" loading={retryingId === job.id} disabled={retryingId !== null} onClick={() => void doRetry(job)}>
              Yeniden dene
            </Button>
          </div>,
        ])}
      />
    </section>
  );
}

function RefundDialog({ order, onClose, onDone }: { order: AccountingOrderDto; onClose: () => void; onDone: () => Promise<void> }) {
  const refund = useRefund();
  const [amount, setAmount] = useState(order.price != null ? String(order.price).replace(".", ",") : "");
  const [reason, setReason] = useState("");
  const [issues, setIssues] = useState<{ amount?: string; reason?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof refundOutcome> | null>(null);

  async function submit() {
    setError(null);
    const found = validateRefund(amount, reason, order.price);
    setIssues(found);
    const body = toRefundRequest(amount, reason);
    if (Object.keys(found).length > 0 || !body || !order.id) return;
    try {
      const response = await refund.mutateAsync({ id: order.id, data: body });
      setResult(refundOutcome(response.data.entitlement));
    } catch (err) {
      setError(errorMessage(err, "İade kaydedilemedi"));
    }
  }

  if (result) {
    return (
      <ConfirmDialog
        open
        title={result.needsReview ? "İade kaydedildi, hak geri alınmadı" : "İade kaydedildi"}
        tone={result.needsReview ? "danger" : "primary"}
        confirmLabel="Tamam"
        description={<span role="status">{result.message}</span>}
        onClose={() => void onDone()}
        onConfirm={() => void onDone()}
      />
    );
  }

  return (
    <FormDialog
      open
      title="İade kaydet"
      description={
        <>
          <strong className="font-mono">{order.referenceCode}</strong> · {order.candidateName} · {formatMoney(order.price, order.currency)}. Kullanılmamış hak geri alınır; kullanılmış ya da rezerve hak geri alınmaz ve elle incelenmelidir.
        </>
      }
      submitLabel="İadeyi kaydet"
      pending={refund.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-3">
        <Field label="İade tutarı" required error={issues.amount}>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Gerekçe" required error={issues.reason}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </Field>
      </div>
    </FormDialog>
  );
}
