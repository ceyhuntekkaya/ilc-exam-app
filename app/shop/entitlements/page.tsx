import { EntitlementsView } from "@/src/features/individual/EntitlementsView";
import { ShopPage } from "@/src/features/individual/ShopPage";

export default function EntitlementsPage() {
  return (
    <ShopPage title="My entitlements" intro="The exam entitlements you have purchased are listed here. Start your attempt here when you are ready.">
      <EntitlementsView />
    </ShopPage>
  );
}
