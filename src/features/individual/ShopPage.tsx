import { KidButtonLink } from "@/src/features/student/ui";
import type { ReactNode } from "react";

/** Mağaza sayfa çerçevesi: Türkçe başlık + gezinme. Sunucu bileşeni (etkileşim yok). */
export function ShopPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div lang="tr" className="grid gap-5">
      <header className="grid gap-3">
        <nav aria-label="Mağaza" className="flex flex-wrap gap-2">
          <KidButtonLink href="/student" variant="ghost">
            Ana sayfa
          </KidButtonLink>
          <KidButtonLink href="/shop" variant="ghost">
            Ürünler
          </KidButtonLink>
          <KidButtonLink href="/shop/entitlements" variant="ghost">
            Haklarım
          </KidButtonLink>
          <KidButtonLink href="/shop/orders" variant="ghost">
            Siparişlerim
          </KidButtonLink>
          <KidButtonLink href="/student/history" variant="ghost">
            Geçmişim
          </KidButtonLink>
        </nav>
        <h1 className="sb-display text-3xl leading-tight tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {intro ? <p className="max-w-2xl text-base text-slate-600">{intro}</p> : null}
      </header>
      {children}
    </div>
  );
}
