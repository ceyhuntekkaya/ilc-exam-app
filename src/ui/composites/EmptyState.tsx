import type { ReactNode } from "react";

// default: panel görünümü (değişmedi). storefront: ../dis-sepetim çizgisinde ortalı kart — ikon rozeti, başlık,
// kısa açıklama, aksiyon. Sunucu bileşeni olduğu için UiVariant context'i okunamaz; vitrin kullanımında prop ile verilir.
export function EmptyState({
  title,
  description,
  action,
  icon,
  variant = "default",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  /** Başlığın üstündeki yuvarlak rozette gösterilir (panelde verilmezse kutu ikonu). */
  icon?: ReactNode;
  variant?: "default" | "storefront";
}) {
  if (variant === "default") {
    // Panel: bölüm kartının içinde ortalanmış sakin blok; başlık h3 (kartın başlığı h2).
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
        <span aria-hidden className="mb-3 flex size-10 items-center justify-center rounded-full bg-bg text-fg-subtle ring-1 ring-border">
          {icon ?? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Zm0 0L12 11l8-3.5M12 11v9" />
            </svg>
          )}
        </span>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-fg-muted">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
      {icon ? (
        <span
          aria-hidden
          className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-8 ring-primary-50/50 dark:bg-primary-950 dark:text-primary-400 dark:ring-primary-950/40 [&>svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
