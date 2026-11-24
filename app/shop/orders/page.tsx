import { OrdersView } from "@/src/features/individual/OrdersView";
import { ShopPage } from "@/src/features/individual/ShopPage";

export default function ShopOrdersPage() {
  return (
    <ShopPage title="My orders" intro="You can pay for or cancel orders awaiting payment here.">
      <OrdersView />
    </ShopPage>
  );
}
