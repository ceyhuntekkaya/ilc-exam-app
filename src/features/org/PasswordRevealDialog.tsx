"use client";

import { useEffect, useId, useRef } from "react";
import { Button, SecretNotice } from "@/src/ui";
import { UiVariantProvider } from "@/src/ui/primitives/UiVariant";

/**
 * Bir kez gösterilen parola (başlangıç ya da geçici). Kapatılınca değer bellekten atılır; bir daha okunamaz.
 */
export function PasswordRevealDialog({
  open,
  title,
  studentLabel,
  username,
  password,
  hint,
  onClose,
}: {
  open: boolean;
  title: string;
  studentLabel: string;
  username?: string;
  password: string;
  hint: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 m-auto w-[min(32rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-border bg-surface p-0 text-left text-sm font-normal whitespace-normal normal-nums text-fg shadow-[0_24px_64px_rgb(26_26_24/0.24)] backdrop:bg-neutral-950/50 backdrop:backdrop-blur-[2px]"
      onCancel={(event) => event.preventDefault()}
      onClose={onClose}
    >
      <UiVariantProvider variant="admin">
        <div className="grid gap-4 p-5">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              {studentLabel}
              {username ? ` · Kullanıcı adı: ${username}` : ""}
            </p>
          </div>
          <SecretNotice label="Parola" value={password} hint={hint} />
        </div>
        <div className="flex justify-end border-t border-border bg-bg/70 px-5 py-3">
          <Button type="button" onClick={onClose}>
            Kaydettim, kapat
          </Button>
        </div>
      </UiVariantProvider>
    </dialog>
  );
}
