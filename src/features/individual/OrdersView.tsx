"use client";

import { getMyOrdersQueryKey, useCancel, useMyOrders } from "@/src/api/generated/payment/payment";
import type { MyOrderDto } from "@/src/api/generated/models";
import { formatDateTime, formatMoney, isAwaitingPayment, orderFailureMessage } from "@/src/features/individual/commerceModel";
import { EntitlementPill, OrderStatusPill } from "@/src/features/individual/OrderStatusPill";
import { Mascot } from "@/src/features/student/mascot";
import { KidButton, KidButtonLink, KidCard, KidError, KidLoading } from "@/src/features/student/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/** F6-03: adayın kendi siparişleri (en yeni önce). Ödemesi beklenen siparişte "Öde" ve "İptal et". */
export function OrdersView() {
  const orders = useMyOrders();
  const queryClient = useQueryClient();
  const cancel = useCancel();
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (orders.isLoading) return <KidLoading label="Siparişler yükleniyor…" rows={3} />;
  if (orders.isError) {
    return <KidError title="Siparişler yüklenemedi" message={orderFailureMessage(orders.error, "Siparişleriniz şu an alınamadı.")} onRetry={() => void orders.refetch()} retryLabel="Yeniden dene" />;
  }
  const rows: MyOrderDto[] = orders.data?.data ?? [];

  async function cancelOrder(id: string) {
    setError(null);
    try {
      await cancel.mutateAsync({ id, data: { reason: "Aday iptal etti" } });
      setConfirmId(null);
      await queryClient.invalidateQueries({ queryKey: getMyOrdersQueryKey() });
    } catch (err) {
      setError(orderFailureMessage(err));
    }
  }

  if (rows.length === 0) {
    return (
      <KidCard className="flex flex-col items-center gap-4 py-10 text-center">
        <Mascot mood="waiting" size="md" />
        <h2 className="font-kid text-xl font-bold text-slate-900">Henüz siparişiniz yok</h2>
        <p className="text-slate-600">Kataloğdan bir ürün seçtiğinizde siparişiniz burada görünür.</p>
        <KidButtonLink href="/shop" variant="sun">
          Kataloğa git
        </KidButtonLink>
      </KidCard>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-200/90 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-3">
        {rows.map((order) => (
          <KidCard key={order.id} as="li" className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-kid text-lg font-bold text-slate-900">{order.skuName || order.skuCode}</h2>
              <div className="flex flex-wrap gap-2">
                <OrderStatusPill status={order.status} />
                {order.status === "APPROVED" ? <EntitlementPill status={order.entitlementStatus} /> : null}
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {formatMoney(order.price, order.currency)} · Referans: <span className="font-mono font-semibold">{order.referenceCode}</span> · {formatDateTime(order.createdAt)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {isAwaitingPayment(order) ? (
                <>
                  <KidButtonLink href={`/shop/orders/${order.id}`} variant="sun">
                    Öde
                  </KidButtonLink>
                  {confirmId === order.id ? (
                    <>
                      <KidButton variant="danger" disabled={cancel.isPending} onClick={() => order.id && void cancelOrder(order.id)}>
                        {cancel.isPending ? "İptal ediliyor…" : "Evet, iptal et"}
                      </KidButton>
                      <KidButton variant="ghost" onClick={() => setConfirmId(null)}>
                        Vazgeç
                      </KidButton>
                    </>
                  ) : (
                    <KidButton variant="ghost" onClick={() => setConfirmId(order.id ?? null)}>
                      İptal et
                    </KidButton>
                  )}
                </>
              ) : (
                <KidButtonLink href={`/shop/orders/${order.id}`} variant="soft">
                  Ayrıntı
                </KidButtonLink>
              )}
            </div>
          </KidCard>
        ))}
      </ul>
    </div>
  );
}
