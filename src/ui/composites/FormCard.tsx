import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";

/**
 * Panel formlarının kartı: başlık + açıklama, alanlar, altta sağa yaslı eylem şeridi.
 * Uzun formlar birden çok FormCard'a bölünür (Temel bilgiler / Görseller / Vergi …); kart içinde kart açılmaz.
 */
export function FormCard({
  title,
  description,
  aside,
  footer,
  children,
  className,
}: {
  title?: string;
  description?: ReactNode;
  /** Başlık satırının sağı (ör. "Yeni değer" butonu, durum rozeti). */
  aside?: ReactNode;
  /** Alt şerit: kaydet/vazgeç butonları, hata/başarı mesajı. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-border bg-surface shadow-sm", className)}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-t-xl border-b border-border bg-neutral-50/60 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
            {description ? <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p> : null}
          </div>
          {aside ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div> : null}
        </header>
      ) : null}
      <div className="grid gap-4 p-4 sm:p-5">{children}</div>
      {footer ? (
        <footer className="flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-bg/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

/** Form alanlarını iki sütuna dizer (dar ekranda tek sütun); `wide` alanlar için `sm:col-span-2`. */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/** Kaydet sonrası geri bildirim satırı; footer'da butonların solunda durur. */
export function FormMessage({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  return (
    <p role={tone === "danger" ? "alert" : "status"} className={cn("text-[13px] sm:mr-auto", tone === "danger" ? "text-danger" : "text-success")}>
      {children}
    </p>
  );
}
