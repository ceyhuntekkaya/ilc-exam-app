import { cn } from "@/src/lib/utils/cn";
import { Button } from "@/src/ui/primitives/Button";

/**
 * Uzun panel formlarının kaydet şeridi (formun sonunda durur).
 * - Değişiklik yokken: akışta, sade; butonlar pasif, ekranda gezinmez.
 * - Değişiklik (ya da kayıt hatası) varken: ekranın altına yapışır, gölgeli; "Kaydedilmemiş değişiklikler" uyarısı.
 * - Kaydedilince: kısa süre başarı mesajı (süreyi kullanan bileşen `saved`i kapatarak yönetir).
 * Submit butonu `type="submit"`: şerit bir <form> içinde kullanılır.
 */
export function SaveBar({
  dirty,
  pending = false,
  saved = false,
  error,
  disabled = false,
  submitLabel = "Değişiklikleri kaydet",
  onReset,
}: {
  dirty: boolean;
  pending?: boolean;
  saved?: boolean;
  error?: string | null;
  /** Kaydetme yetkisi/özelliği kapalıysa. */
  disabled?: boolean;
  submitLabel?: string;
  /** Verilmezse Vazgeç butonu gösterilmez (ör. yeni kayıt formu). */
  onReset?: () => void;
}) {
  const active = dirty || pending || Boolean(error);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 transition-shadow sm:flex-row sm:items-center sm:justify-between sm:px-5",
        active
          ? "sticky bottom-3 z-10 border-border bg-surface/95 shadow-[0_8px_24px_rgb(26_26_24/0.12)] backdrop-blur"
          : "border-border bg-surface shadow-sm",
      )}
    >
      <p className="flex min-h-5 items-center gap-2 text-[13px]" aria-live="polite">
        {error ? (
          <span role="alert" className="text-danger">
            {error}
          </span>
        ) : dirty ? (
          <>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-warning" />
            <span className="font-medium text-fg">Kaydedilmemiş değişiklikler var</span>
          </>
        ) : saved ? (
          <span className="text-success">Değişiklikler kaydedildi</span>
        ) : null}
      </p>
      <div className="flex justify-end gap-2">
        {onReset ? (
          <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={onReset}>
            Vazgeç
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={disabled || !dirty} loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
