import { EntitlementsView } from "@/src/features/individual/EntitlementsView";
import { ShopPage } from "@/src/features/individual/ShopPage";

export default function EntitlementsPage() {
  return (
    <ShopPage title="Haklarım" intro="Satın aldığınız sınav hakları burada listelenir. Hazır olduğunuzda denemeyi buradan başlatın.">
      <EntitlementsView />
    </ShopPage>
  );
}
