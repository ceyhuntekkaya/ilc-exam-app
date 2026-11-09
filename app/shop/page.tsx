import { CatalogView } from "@/src/features/individual/CatalogView";
import { ShopPage } from "@/src/features/individual/ShopPage";

export default function ShopCatalogPage() {
  return (
    <ShopPage title="Ürünler" intro="Seviye tespit ve diğer sınav ürünlerini seçin. Ödemeyi banka havalesiyle yaparsınız.">
      <CatalogView />
    </ShopPage>
  );
}
