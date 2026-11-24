import { CatalogView } from "@/src/features/individual/CatalogView";
import { ShopPage } from "@/src/features/individual/ShopPage";

export default function ShopCatalogPage() {
  return (
    <ShopPage title="Products" intro="Choose a placement test or another exam product. Payment is made by bank transfer.">
      <CatalogView />
    </ShopPage>
  );
}
