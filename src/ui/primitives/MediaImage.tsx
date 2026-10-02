"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";

/**
 * Backend görseli; yoksa ya da yüklenemezse (`MEDIA_NOT_FOUND`, kırık URL) `fallback` gösterilir. next/image
 * kullanılmıyor: görseller aynı origin proxy'den gelir ve optimizasyon sunucusu proxy'nin oturum kapısından geçemez.
 *
 * Görsel yüklenene kadar `fallback` arkada durur, img üstte görünmezdir; böylece yükleme sırasında ve hata anında
 * kullanıcı boş kutu, kırık görsel ikonu ya da alt metni görmez. Sunucuda render edilen img, React hydrate olmadan
 * hata verirse `onError` hiç tetiklenmez; bu yüzden mount'ta `complete`/`naturalWidth` ile durum ayrıca kontrol edilir.
 */
export function MediaImage({
  src,
  alt,
  fallback,
  className,
  eager = false,
}: {
  src?: string;
  alt: string;
  fallback: ReactNode;
  className?: string;
  eager?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    const img = ref.current;
    if (!img?.complete) return;
    const settled = img.naturalWidth > 0 ? "loaded" : "failed";
    const timer = window.setTimeout(() => setState(settled), 0);
    return () => window.clearTimeout(timer);
  }, [src]);

  if (!src || state === "failed") return <>{fallback}</>;
  return (
    <span className="relative block size-full">
      {state === "loading" ? <span className="absolute inset-0">{fallback}</span> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        referrerPolicy="no-referrer"
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setState("loaded")}
        onError={() => setState("failed")}
        className={cn(
          "relative size-full object-contain text-transparent transition-opacity duration-300",
          state === "loaded" ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </span>
  );
}
