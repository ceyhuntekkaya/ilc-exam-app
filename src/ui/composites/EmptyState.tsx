import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";

type Tone = "primary" | "neutral" | "warning";

const TONES: Record<Tone, { box: string; badge: string; back: string }> = {
  primary: {
    box: "border-primary-100 bg-linear-to-b from-primary-50/80 via-primary-50/30 to-surface",
    badge: "text-primary ring-primary-100",
    back: "bg-primary-100/70",
  },
  neutral: {
    box: "border-border bg-linear-to-b from-neutral-100/70 to-surface",
    badge: "text-fg-muted ring-border",
    back: "bg-neutral-200/70",
  },
  warning: {
    box: "border-warning/20 bg-linear-to-b from-warning-bg to-surface",
    badge: "text-warning ring-warning/20",
    back: "bg-warning/15",
  },
};

const BOX_ICON = "M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Zm0 0L12 11l8-3.5M12 11v9";

/**
 * Boş durum: "burada henüz bir şey yok, şunu yap" anlatan blok.
 * - Tonlu zemin + katmanlı ikon rozeti (silik kesik çizgili kutu yerine; boşluk açıkça "boş" okunur).
 * - `embedded`: tablo/liste kartının içinde — çerçeve ve zemin çizilmez (kart içinde kart olmasın).
 * - `compact`: dar alanlar (yan liste, sekme içi) için küçük ölçü.
 * - `tone`: primary (varsayılan, "ilk kaydı oluştur"), neutral (filtre/arama sonucu boş), warning (önkoşul eksik).
 * - `action` birincil, `secondaryAction` ikincil eylem.
 */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  tone = "primary",
  embedded = false,
  compact = false,
  variant = "default",
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** Rozet içindeki ikon (verilmezse kutu ikonu). */
  icon?: ReactNode;
  tone?: Tone;
  embedded?: boolean;
  compact?: boolean;
  variant?: "default" | "storefront";
}) {
  if (variant === "default") {
    const t = TONES[tone];
    return (
      <div
        className={cn(
          "flex flex-col items-center text-center",
          compact ? "px-4 py-6" : "px-6 py-10 sm:py-12",
          embedded ? null : cn("rounded-xl border", t.box),
        )}
      >
        <span aria-hidden className={cn("relative", compact ? "mb-3" : "mb-4")}>
          {/* Arkadaki eğik kart: "boş sayfa / boş liste" hissi. */}
          <span className={cn("absolute inset-0 rotate-6 rounded-2xl", t.back)} />
          <span
            className={cn(
              "relative flex items-center justify-center rounded-2xl bg-surface shadow-sm ring-1 [&>svg]:shrink-0",
              compact ? "size-10 [&>svg]:size-5" : "size-14 [&>svg]:size-6",
              t.badge,
            )}
          >
            {icon ?? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={BOX_ICON} />
              </svg>
            )}
          </span>
        </span>
        <h3 className={cn("font-semibold text-fg", compact ? "text-sm" : "text-base")}>{title}</h3>
        <div className={cn("mt-1 max-w-md leading-relaxed text-fg-muted", compact ? "text-[13px]" : "text-sm")}>{description}</div>
        {action || secondaryAction ? (
          <div className={cn("flex flex-wrap items-center justify-center gap-2", compact ? "mt-3" : "mt-5")}>
            {action}
            {secondaryAction}
          </div>
        ) : null}
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
