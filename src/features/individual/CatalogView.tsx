"use client";

import { useCatalog } from "@/src/api/generated/individual-catalog/individual-catalog";
import { useCreateOrder } from "@/src/api/generated/payment/payment";
import { createdOrderId, orderFailureMessage, toCatalogCard, type CatalogCard } from "@/src/features/individual/commerceModel";
import { Mascot } from "@/src/features/student/mascot";
import { KidButton, KidButtonLink, KidCard, KidError, KidLoading, StatusPill } from "@/src/features/student/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * F6-02: bireysel ürün kataloğu. Sunucu yalnız fiyatı tanımlı, satışa açık ürünleri döndürür; sertifika ürünleri
 * kapı (CertificateGate) kapalıyken listeye HİÇ girmez. Liste boşsa bu bir hata değil, boş durumdur.
 */
export function CatalogView() {
  const router = useRouter();
  const catalog = useCatalog();
  const createOrder = useCreateOrder();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (catalog.isLoading) return <KidLoading label="Loading products…" rows={3} />;
  if (catalog.isError) {
    return <KidError title="Products could not be loaded" message={orderFailureMessage(catalog.error, "The product list could not be loaded right now.")} onRetry={() => void catalog.refetch()} retryLabel="Try again" />;
  }

  const cards = (catalog.data?.data ?? []).map(toCatalogCard).filter((c): c is CatalogCard => c !== null);

  async function buy(skuId: string) {
    setError(null);
    setBuyingId(skuId);
    try {
      const result = await createOrder.mutateAsync({ data: { skuId } });
      const orderId = createdOrderId(result.data);
      if (orderId) router.push(`/shop/orders/${orderId}`);
      else router.push("/shop/orders");
    } catch (err) {
      // 409 (tekrar politikası / önceki ödemenin hakkı tanımlanmadı) ve 400 (ürün satışta değil) olduğu gibi gösterilir.
      setError(orderFailureMessage(err));
      setBuyingId(null);
    }
  }

  if (cards.length === 0) {
    return (
      <KidCard className="flex flex-col items-center gap-4 py-10 text-center">
        <Mascot mood="waiting" size="md" />
        <h2 className="font-kid text-xl font-bold text-slate-900">No products are on sale right now</h2>
        <p className="max-w-md text-slate-600">Exams and reports will be listed here once they go on sale. Please check back later.</p>
        <KidButtonLink href="/shop/orders" variant="soft">
          My orders
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
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <KidCard key={card.skuId} as="li" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="sky">{card.purpose}</StatusPill>
              <StatusPill tone="grape">{card.output}</StatusPill>
            </div>
            <h2 className="font-kid text-xl font-bold text-slate-900">{card.title}</h2>
            <dl className="grid gap-1 text-sm text-slate-600">
              <div className="flex gap-2">
                <dt className="font-semibold">Level:</dt>
                <dd>{card.level}</dd>
              </div>
              {card.validity ? (
                <div className="flex gap-2">
                  <dt className="font-semibold">Validity:</dt>
                  <dd>{card.validity}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <p className="sb-display text-2xl text-slate-900">{card.price}</p>
              <KidButton variant="sun" disabled={buyingId !== null} onClick={() => void buy(card.skuId)}>
                {buyingId === card.skuId ? "Creating order…" : "Buy"}
              </KidButton>
            </div>
          </KidCard>
        ))}
      </ul>
      <p className="text-sm text-slate-500">
        Payment is made by bank transfer. After you place an order, you will see the transfer details and your reference code.
      </p>
    </div>
  );
}
