import type { ReactNode } from "react";
import { BackLink } from "@/src/ui/composites/BackLink";

/** Başlığın yanındaki kayıt sayısı rozeti. */
export function CountBadge({ count }: { count: number }) {
  return (
    <span className="numeric rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-fg-muted" aria-label={`${count} kayıt`}>
      {count.toLocaleString("tr-TR")}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  count,
  countSlot,
  back,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Liste sayfalarında başlığın yanında kayıt sayısı rozeti. */
  count?: number;
  /** Sayı sonradan gelecekse (Suspense ile akan veri) rozet yerine verilen öğe; `CountBadge` ile aynı görünüm. */
  countSlot?: ReactNode;
  /** Form/alt sayfalarda başlığın üstünde üst listeye dönüş linki (detay sayfalarıyla aynı görünüm). */
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 grid gap-4">
      {back ? <BackLink href={back.href} label={back.label} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            {countSlot ?? (count !== undefined ? <CountBadge count={count} /> : null)}
          </div>
          {description ? <p className="mt-1 max-w-2xl text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
