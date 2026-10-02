"use client";

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "@/src/ui/primitives/Button";
import { UiVariantProvider } from "@/src/ui/primitives/UiVariant";

/**
 * Kısa kayıt formu penceresi ("Yeni marka", "Alt kategori ekle"). ConfirmDialog ile aynı görünüm:
 * başlık + açıklama, alanlar, altta "Vazgeç / {submitLabel}". Gönderim `onSubmit(formData)` ile üst bileşene bırakılır.
 */
export function FormDialog({
  open,
  title,
  description,
  submitLabel,
  pending = false,
  error,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // overflow-visible: içerideki açılır listeler (Select) pencere kenarında kırpılmaz. Tarayıcının modal <dialog>
      // varsayılanı overflow:auto olduğundan açıkça verilir; köşe yuvarlaması iç bölümlerde (alt şerit rounded-b-xl).
      // Kısa ekranda (yatay telefon) pencere sığmazsa kaydırılır: gönder butonuna ulaşılabilsin (açılır liste orada kırpılabilir).
      className="fixed inset-0 z-50 m-auto w-[min(32rem,calc(100%-2rem))] overflow-visible rounded-xl max-h-[calc(100dvh-2rem)] [@media(max-height:640px)]:overflow-y-auto border border-border bg-surface p-0 text-left text-sm font-normal text-fg shadow-[0_24px_64px_rgb(26_26_24/0.24)] backdrop:bg-neutral-950/50 backdrop:backdrop-blur-[2px]"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <UiVariantProvider variant="admin">
        {/* Kapalıyken alanlar çizilmez: her açılışta form temiz başlar. */}
        {open ? (
          <form onSubmit={submit}>
            <div className="border-b border-border px-5 py-4">
              <h2 id={titleId} className="text-base font-semibold text-fg">
                {title}
              </h2>
              {description ? <div className="mt-1 text-[13px] leading-relaxed text-fg-muted">{description}</div> : null}
            </div>
            <div className="grid gap-4 px-5 py-4">
              {children}
              {error ? (
                <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-bg/70 px-5 py-3">
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                Vazgeç
              </Button>
              <Button type="submit" variant="primary" loading={pending}>
                {submitLabel}
              </Button>
            </div>
          </form>
        ) : null}
      </UiVariantProvider>
    </dialog>
  );
}
