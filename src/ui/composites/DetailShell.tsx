import { BackLink } from "@/src/ui/composites/BackLink";
import type { ReactNode } from "react";

/**
 * Panel detay sayfası iskeleti:
 *   geri linki → başlık kartı [başlık · durum şeritleri · grup sekmeleri · grup içi sekmeler] → bölüm kartı.
 * Grup içi sekmeler kartın içinde, grup sekmelerinin hemen altında gri şerit: hangi gruba ait oldukları görsel olarak bağlı.
 * Başlık yapışkan değil: içerik alanı ekranın tamamını kullanır; sekmeler hemen başlığın altında.
 */
export function DetailShell({
  header,
  tabs,
  subtabs,
  back,
  sectionTitle,
  sectionGroup,
  notice,
  children,
}: {
  header: ReactNode;
  tabs?: ReactNode;
  subtabs?: ReactNode;
  back?: { href: string; label: string };
  /** Bölüm kartının başlığı (seçili sayfanın adı). */
  sectionTitle?: string;
  /** Bölüm başlığının önünde soluk grup adı ("Mağaza / Genel"); başlıkla aynıysa verilmez. */
  sectionGroup?: string;
  /** Başlığın altında, sekmelerin üstünde kritik durum şeritleri (askıda, ödeme dondurma vb.). */
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      {back ? <BackLink href={back.href} label={back.label} /> : null}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="p-4 sm:p-5">{header}</div>
        {notice ? <div className="grid gap-2 px-4 pb-4 sm:px-5 sm:pb-5">{notice}</div> : null}
        {tabs ? <div className="border-t border-border">{tabs}</div> : null}
        {subtabs ? <div className="rounded-b-xl border-t border-border bg-neutral-50 px-3 py-2 sm:px-4">{subtabs}</div> : null}
      </div>
      <section className="min-w-0 rounded-xl border border-border bg-surface shadow-sm">
        {sectionTitle ? (
          <header className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-fg">
              <span aria-hidden className="mr-1 h-4 w-1 rounded-full bg-primary" />
              {sectionGroup ? (
                <>
                  <span className="font-normal text-fg-subtle">{sectionGroup}</span>
                  <span aria-hidden className="font-normal text-border-strong">/</span>
                </>
              ) : null}
              {sectionTitle}
            </h2>
          </header>
        ) : null}
        {/* İçteki tablo kartı gölgesiz: bölüm kartının içinde ikinci bir "yüzen" kart olmasın. */}
        <div className="p-4 sm:p-5 [&_[data-section-table]]:shadow-none">{children}</div>
      </section>
    </div>
  );
}
