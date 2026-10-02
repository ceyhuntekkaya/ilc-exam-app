"use client";

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";
import { IconAlert, IconCheck } from "@/src/ui/icons";
import { Button } from "@/src/ui/primitives/Button";
import { Field } from "@/src/ui/primitives/Field";
import { Input } from "@/src/ui/primitives/Input";
import { Textarea } from "@/src/ui/primitives/Textarea";
import { UiVariantProvider } from "@/src/ui/primitives/UiVariant";

/**
 * İşlem onayı: tonlu ikon + başlık + sonuçları anlatan açıklama; gerekiyorsa gerekçe alanı ve onay ifadesi.
 * Metinler resmî ve açıklayıcı yazılır: ne olacağı, kimi etkilediği, geri alınıp alınamayacağı.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  tone = "danger",
  reasonRequired = false,
  reasonLabel = "Gerekçe",
  reasonHint,
  confirmPhrase,
  pending = false,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  reasonRequired?: boolean;
  /** Gerekçe alanının etiketi (ör. "Ret gerekçesi"). */
  reasonLabel?: string;
  /** Gerekçe alanının altındaki açıklama (ör. "Örneğin: belge okunaklı değil."). */
  reasonHint?: string;
  confirmPhrase?: string;
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (input: { reason: string }) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reason = String(data.get("reason") ?? "");
    const phrase = String(data.get("phrase") ?? "");
    if (confirmPhrase && phrase.trim() !== confirmPhrase) return;
    onConfirm({ reason });
  }

  const danger = tone === "danger";
  const ToneIcon = danger ? IconAlert : IconCheck;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Metin stilleri sıfırlanır: pencere tablo hücresi içinde render edildiğinde (satır eylemleri) hücrenin
      // text-right / whitespace-nowrap / font-medium / tabular-nums stillerini miras almasın.
      className="fixed inset-0 z-50 m-auto w-[min(30rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-border bg-surface p-0 text-left text-sm font-normal whitespace-normal normal-nums text-fg shadow-[0_24px_64px_rgb(26_26_24/0.24)] backdrop:bg-neutral-950/50 backdrop:backdrop-blur-[2px]"
      onClose={onClose}
    >
      {/* Alanlar ve butonlar her panelde aynı kompakt görünümde (açan butonun ortamından bağımsız). */}
      <UiVariantProvider variant="admin">
        <form onSubmit={submit}>
          <div className="flex gap-4 p-5">
            <span
              aria-hidden
              className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", danger ? "bg-danger-bg text-danger" : "bg-primary-50 text-primary-600")}
            >
              <ToneIcon className="size-5" />
            </span>
            <div className="grid min-w-0 flex-1 gap-4">
              <div>
                <h2 id={titleId} className="text-base font-semibold text-fg">
                  {title}
                </h2>
                {description ? (
                  <div id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                    {description}
                  </div>
                ) : null}
              </div>
              {reasonRequired ? (
                <Field label={reasonLabel} hint={reasonHint} required>
                  <Textarea name="reason" required rows={3} />
                </Field>
              ) : null}
              {confirmPhrase ? (
                <Field label={`Onaylamak için "${confirmPhrase}" yazınız`} required>
                  <Input name="phrase" required autoComplete="off" />
                </Field>
              ) : null}
              {error ? (
                <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-bg/70 px-5 py-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant={danger ? "danger-solid" : "primary"} loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </UiVariantProvider>
    </dialog>
  );
}
