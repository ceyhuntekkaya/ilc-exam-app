import { CheckoutView } from "@/src/features/individual/CheckoutView";
import { ShopPage } from "@/src/features/individual/ShopPage";

export default async function ShopOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ShopPage title="Sipariş ve ödeme">
      <CheckoutView orderId={id} />
    </ShopPage>
  );
}
