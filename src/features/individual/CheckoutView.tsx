"use client";

import { getDetail1QueryKey, getMyOrdersQueryKey, useCancel, useDetail1 } from "@/src/api/generated/payment/payment";
import type { MyOrderDto } from "@/src/api/generated/models";
import {
  entitlementStatusLabel,
  formatDateTime,
  formatMoney,
  groupIban,
  isAwaitingPayment,
  isGrantPending,
  orderFailureMessage,
  orderStatusLabel,
  readTransferDetails,
} from "@/src/features/individual/commerceModel";
import { OrderStatusPill } from "@/src/features/individual/OrderStatusPill";
import { KidButton, KidButtonLink, KidCard, KidError, KidLoading, KidNotice } from "@/src/features/student/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/** Tek siparişin ödeme ekranı: havale talimatı + referans kodu; ödeme beklenen siparişi iptal etme. */
export function CheckoutView({ orderId }: { orderId: string }) {
  const detail = useDetail1(orderId);
  if (detail.isLoading) return <KidLoading label="Sipariş yükleniyor…" rows={2} />;
  if (detail.isError || !detail.data) {
    return <KidError title="Sipariş açılamadı" message={orderFailureMessage(detail.error, "Sipariş şu an alınamadı.")} onRetry={() => void detail.refetch()} retryLabel="Yeniden dene" />;
  }
  return <OrderCheckout order={detail.data.data} />;
}

export function OrderCheckout({ order }: { order: MyOrderDto }) {
  const queryClient = useQueryClient();
  const cancel = useCancel();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const transfer = readTransferDetails(order.instructions);
  const awaiting = isAwaitingPayment(order);

  async function copyReference() {
    if (!order.referenceCode) return;
    try {
      await navigator.clipboard.writeText(order.referenceCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function cancelOrder() {
    if (!order.id) return;
    setError(null);
    try {
      await cancel.mutateAsync({ id: order.id, data: { reason: "Aday iptal etti" } });
      setConfirming(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getDetail1QueryKey(order.id) }),
        queryClient.invalidateQueries({ queryKey: getMyOrdersQueryKey() }),
      ]);
    } catch (err) {
      setError(orderFailureMessage(err));
    }
  }

  return (
    <div className="grid gap-4">
      <KidCard className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-kid text-xl font-bold text-slate-900">{order.skuName || order.skuCode || "Sipariş"}</h2>
          <OrderStatusPill status={order.status} />
        </div>
        <p className="sb-display text-3xl text-slate-900">{formatMoney(order.price, order.currency)}</p>
        <p className="text-sm text-slate-500">Sipariş tarihi: {formatDateTime(order.createdAt)}</p>
        {order.status === "APPROVED" ? (
          <KidNotice tone={order.entitlementStatus === "GRANTED" ? "mint" : "sky"}>
            {isGrantPending(order) ? "Ödemeniz onaylandı. Hakkınız hazırlanıyor; birkaç dakika içinde tanımlanır." : entitlementStatusLabel(order.entitlementStatus)}
          </KidNotice>
        ) : null}
        {order.status === "EXPIRED" ? (
          <KidNotice tone="coral">Bu siparişin süresi doldu. Ödeme yapmayın; kataloğdan yeni bir sipariş oluşturun.</KidNotice>
        ) : null}
        {order.status === "CANCELLED" || order.status === "REFUNDED" ? <KidNotice tone="neutral">{orderStatusLabel(order.status)}.</KidNotice> : null}
      </KidCard>

      {awaiting ? (
        <KidCard className="grid gap-4">
          <h3 className="font-kid text-lg font-bold text-slate-900">Havale ile ödeme</h3>
          {transfer && transfer.configured ? (
            <>
              <p className="text-slate-600">Aşağıdaki hesaba havale yapın. Açıklama kısmına referans kodunu aynen yazın; kod olmadan yapılan ödeme eşleştirilemez.</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <TransferRow label="Banka" value={transfer.bankName || "—"} />
                <TransferRow label="Hesap sahibi" value={transfer.accountHolder} />
                <TransferRow label="IBAN" value={groupIban(transfer.iban)} mono />
                <TransferRow label="Tutar" value={formatMoney(order.price, order.currency)} />
              </dl>
              <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-4 text-center">
                <p className="text-sm font-semibold text-amber-900">Havale açıklaması (referans kodu)</p>
                <p aria-label="Referans kodu" className="mt-1 font-mono text-2xl font-extrabold tracking-wider break-all text-slate-900">
                  {order.referenceCode}
                </p>
                <KidButton variant="soft" className="mt-3" onClick={() => void copyReference()}>
                  {copied ? "Kopyalandı" : "Kodu kopyala"}
                </KidButton>
              </div>
              <p className="text-sm text-slate-500">Ödemeniz muhasebe tarafından kontrol edilip onaylanınca hakkınız tanımlanır; bu birkaç iş günü sürebilir.</p>
            </>
          ) : (
            <>
              <KidNotice tone="sun">Havale bilgileri şu an görüntülenemiyor. Lütfen kurum yetkilisiyle iletişime geçin ve referans kodunuzu iletin.</KidNotice>
              <p className="font-mono text-xl font-bold break-all">{order.referenceCode}</p>
            </>
          )}
          {error ? (
            <p role="alert" className="rounded-2xl border border-rose-200/90 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          {confirming ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-700">Siparişi iptal etmek istediğinize emin misiniz?</span>
              <KidButton variant="danger" disabled={cancel.isPending} onClick={() => void cancelOrder()}>
                {cancel.isPending ? "İptal ediliyor…" : "Evet, iptal et"}
              </KidButton>
              <KidButton variant="ghost" onClick={() => setConfirming(false)}>
                Vazgeç
              </KidButton>
            </div>
          ) : (
            <div>
              <KidButton variant="ghost" onClick={() => setConfirming(true)}>
                Siparişi iptal et
              </KidButton>
            </div>
          )}
        </KidCard>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <KidButtonLink href="/shop/orders" variant="soft">
          Siparişlerim
        </KidButtonLink>
        <KidButtonLink href="/shop" variant="ghost">
          Kataloğa dön
        </KidButtonLink>
      </div>
    </div>
  );
}

function TransferRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className={mono ? "mt-0.5 font-mono text-base font-semibold break-all text-slate-900" : "mt-0.5 text-base font-semibold text-slate-900"}>{value}</dd>
    </div>
  );
}
