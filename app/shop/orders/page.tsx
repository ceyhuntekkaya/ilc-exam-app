import { OrdersView } from "@/src/features/individual/OrdersView";
import { ShopPage } from "@/src/features/individual/ShopPage";

export default function ShopOrdersPage() {
  return (
    <ShopPage title="Siparişlerim" intro="Ödemesi beklenen siparişleri buradan ödeyebilir ya da iptal edebilirsiniz.">
      <OrdersView />
    </ShopPage>
  );
}
