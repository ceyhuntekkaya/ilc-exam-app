import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeading({
  title,
  href,
  hrefLabel = "Tümünü Gör",
  badge,
  action,
  as: Heading = "h2",
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  badge?: ReactNode;
  /** `href` yerine serbest aksiyon (ör. "Yeni Adres Ekle" butonu) — başlığın sağında durur (../dis-sepetim profil sekmesi kalıbı). */
  action?: ReactNode;
  /** Sayfanın ana başlığı olarak kullanılırken "h1". */
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Heading className="text-xl font-semibold text-fg sm:text-2xl">{title}</Heading>
        {badge}
      </div>
      {href ? (
        <Link href={href} className="text-sm font-medium text-primary hover:text-primary-hover">
          {hrefLabel} →
        </Link>
      ) : null}
      {action}
    </div>
  );
}
