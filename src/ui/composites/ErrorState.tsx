"use client";

import { useState } from "react";

/** HTTP durumuna göre kullanıcıya ne yapacağını söyleyen açıklama (ham "Forbidden" yerine). */
const STATUS_HINT: Record<number, { title: string; hint: string }> = {
  401: { title: "Oturum süresi doldu", hint: "Devam etmek için yeniden giriş yapın." },
  403: { title: "Bu alana erişiminiz yok", hint: "Hesabınızın bu işlem için yetkisi bulunmuyor." },
  404: { title: "Kayıt bulunamadı", hint: "Kayıt silinmiş ya da bağlantı hatalı olabilir." },
  409: { title: "Çakışma oluştu", hint: "Kayıt başka biri tarafından değiştirilmiş olabilir; sayfayı yenileyin." },
  500: { title: "Sunucu hatası", hint: "Sorun bizde. Birkaç saniye sonra yeniden deneyin." },
  502: { title: "Sunucuya ulaşılamıyor", hint: "Bağlantı geçici olarak kesildi. Yeniden deneyin." },
  503: { title: "Servis geçici olarak kapalı", hint: "Bakım ya da yoğunluk olabilir. Biraz sonra deneyin." },
};

function statusOf(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

/**
 * Veri alınamadığında bölümün yerine çıkan durum: tonlu ikon + başlık + ne yapılacağı + "Tekrar dene".
 * `error` verilirse HTTP durumundan anlaşılır başlık/açıklama türetilir; `message` teknik ayrıntı olarak soluk gösterilir.
 */
export function ErrorState({
  title,
  message,
  error,
  traceId,
  onRetry,
  compact = false,
}: {
  title?: string;
  message?: string;
  /** Yakalanan hata nesnesi; `status` alanı varsa başlık/açıklama ondan gelir. */
  error?: unknown;
  traceId?: string;
  /** Verilirse "Tekrar dene" butonu çıkar (ör. react-query `refetch`). */
  onRetry?: () => void;
  /** Bölüm/kart içinde: daha az dikey boşluk. */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const known = STATUS_HINT[statusOf(error) ?? -1];
  const detail = message ?? (error instanceof Error ? error.message : undefined);
  const heading = title ?? known?.title ?? "Veriler yüklenemedi";
  const hint = known?.hint ?? "Bağlantınızı kontrol edip yeniden deneyin.";

  async function copy() {
    if (!traceId) return;
    await navigator.clipboard.writeText(traceId);
    setCopied(true);
  }

  return (
    <div
      role="alert"
      className={`flex flex-col items-center rounded-xl border border-danger/20 bg-danger-bg/60 text-center ${compact ? "px-5 py-7" : "px-6 py-12"}`}
    >
      <span aria-hidden className="mb-3 flex size-11 items-center justify-center rounded-full bg-surface text-danger shadow-sm ring-1 ring-danger/15">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5M12 16.5h.01M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>
      <h2 className="text-[15px] font-semibold text-fg">{heading}</h2>
      <p className="mt-1 max-w-md text-[13px] leading-relaxed text-fg-muted">{hint}</p>
      {detail && detail !== heading ? (
        <p className="mt-2 max-w-md rounded-md bg-surface/70 px-2 py-1 font-mono text-[11.5px] wrap-break-word text-fg-subtle">{detail}</p>
      ) : null}
      {onRetry || traceId ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-fg shadow-xs hover:border-border-strong hover:bg-bg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="size-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />
              </svg>
              Tekrar dene
            </button>
          ) : null}
          {traceId ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="font-mono text-fg-subtle">{traceId}</span>
              <button type="button" className="font-medium text-primary hover:underline" onClick={copy}>
                {copied ? "Kopyalandı" : "Kopyala"}
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
