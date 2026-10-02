import { cn } from "@/src/lib/utils/cn";

/**
 * Ürün görseli yoksa ya da yüklenemezse (backend 404 / `MEDIA_NOT_FOUND`, kırık URL) gösterilen marka yer tutucusu:
 * soluk Diş Sepetim logosu. Kullanıcı kırık görsel ikonu ya da boş kutu görmez. Açık/koyu tema için iki logo
 * dosyası var (header'daki gibi).
 */
export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Ürün görseli hazırlanıyor"
      className={cn("flex size-full items-center justify-center bg-neutral-50 p-[12%] dark:bg-neutral-900", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG vektör logo */}
      <img src="/images/logo.svg" alt="" aria-hidden className="max-h-16 w-full max-w-40 object-contain opacity-35 grayscale dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG vektör logo */}
      <img src="/images/logo-white.svg" alt="" aria-hidden className="hidden max-h-16 w-full max-w-40 object-contain opacity-30 dark:block" />
    </span>
  );
}
