import type { ReactNode } from "react";
import { Badge } from "@/src/ui/primitives/Badge";

export type EntityMetric = {
  label: string;
  value: string;
  /** Değerin rengi: durum bildiren metrikler için (ör. ödemeler donduruldu → warning). */
  tone?: "default" | "success" | "warning" | "danger" | "muted";
  icon?: keyof typeof METRIC_ICONS;
};

const METRIC_ICONS = {
  star: "m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9L12 3.5Z",
  wallet: "M4 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4V7Zm0 0V6a2 2 0 0 1 2-2h10M16 13h.01",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  calendar: "M5 6h14v14H5V6Zm0 4h14M9 4v4m6-4v4",
  money: "M3 7h18v10H3V7Zm9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  store: "M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M10 20v-5h4v5",
  box: "M4 8l8-4 8 4v8l-8 4-8-4V8Zm8-4v16M4 8l8 4 8-4",
  layers: "m12 4 8 4-8 4-8-4 8-4Zm-8 8 8 4 8-4M4 16l8 4 8-4",
  tag: "M4 4h7l9 9-7 7-9-9V4Zm4.5 4.5h.01",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m2 15h3a5 5 0 0 0-4-4.9",
  tree: "M6 4h4v4H6V4Zm0 12h4v4H6v-4Zm8-6h4v4h-4v-4ZM8 8v8m0-4h6",
};

const METRIC_TONE = {
  default: "text-fg",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-fg-muted",
};

function initials(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "?"}${parts[1]?.[0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

/**
 * Detay başlığı: avatar (baş harfler) + ad + durum rozeti, altında kimlik (isteğe bağlı link), altında metrik şeridi.
 * Eylemler sağda; dar ekranda başlığın altına iner.
 */
export function EntityHeader({
  title,
  identity,
  identityHref,
  identityLabel,
  status,
  statusTone = "neutral",
  metrics,
  actions,
  avatar,
  titleAs: Title = "h1",
}: {
  title: string;
  /** Baş harfler yerine gösterilecek görsel (ör. kategori ikonu); kutunun içine sığdırılır. */
  avatar?: ReactNode;
  /** Sayfada üstte başka bir h1 varsa (ör. PageHeader) başlık h2 olarak verilir. */
  titleAs?: "h1" | "h2";
  identity?: string;
  /** Verilirse kimlik yeni sekmede açılan link olur (ör. mağazanın vitrin sayfası). */
  identityHref?: string;
  /** Link metni (ör. "Mağaza sayfasını görüntüle"); verilirse kimlik adresi yanında soluk gösterilir. */
  identityLabel?: string;
  status?: string;
  statusTone?: "neutral" | "success" | "warning" | "danger" | "info" | "brand";
  metrics?: EntityMetric[];
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <div aria-hidden className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-primary-500 to-primary-800 text-base font-bold text-white shadow-sm">
          {avatar ?? initials(title)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Title className="truncate font-display text-[22px] font-semibold tracking-tight text-fg">{title}</Title>
            {status ? (
              <Badge dot tone={statusTone === "brand" ? "info" : statusTone}>
                {status}
              </Badge>
            ) : null}
          </div>
          {identity ? (
            identityHref && identityLabel ? (
              // Ne olduğu anlaşılır link: ikon + açıklayıcı metin + yeni sekme işareti; adres yanında soluk.
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
                <a
                  href={identityHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary-hover hover:underline"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5c0 1.4 1.1 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.1 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1 2.5 2.6 2.5S20 10.9 20 9.5M10 20v-5h4v5" />
                  </svg>
                  {identityLabel}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="size-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-8 8M10 7H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" />
                  </svg>
                  <span className="sr-only">(yeni sekmede açılır)</span>
                </a>
                <span className="font-mono text-xs text-fg-subtle">{identity}</span>
              </p>
            ) : identityHref ? (
              <a
                href={identityHref}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-fg-muted transition-colors hover:text-primary"
              >
                {identity}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-8 8M10 7H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" />
                </svg>
                <span className="sr-only">(yeni sekmede açılır)</span>
              </a>
            ) : (
              <p className="mt-0.5 font-mono text-[13px] text-fg-muted">{identity}</p>
            )
          ) : null}
          {metrics && metrics.length > 0 ? (
            // Bilgi çipleri: ikon + soluk etiket + tonlu değer, tek satırda; dar ekranda sarar.
            <dl className="mt-3 flex flex-wrap gap-2">
              {metrics.map((item) => (
                <div key={item.label} className="inline-flex items-center gap-1.5 rounded-md bg-bg px-2.5 py-1 text-[13px] ring-1 ring-border">
                  {item.icon ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden className="size-3.5 shrink-0 text-fg-subtle">
                      <path strokeLinecap="round" strokeLinejoin="round" d={METRIC_ICONS[item.icon]} />
                    </svg>
                  ) : null}
                  <dt className="text-fg-subtle">{item.label}</dt>
                  <dd className={`font-semibold ${METRIC_TONE[item.tone ?? "default"]}`}>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
