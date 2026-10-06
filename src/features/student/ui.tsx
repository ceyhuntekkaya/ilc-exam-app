"use client";

import { cn } from "@/src/lib/utils/cn";
import { IconAlert, IconCheck, IconClock, IconLock, IconRefresh } from "@/src/ui/icons";
import Link from "next/link";
import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";

/*
  Öğrenci arayüz kiti. Kurallar:
  - Dokunma hedefi en az 48px (lg: 56px). Çocuk parmağı + tablet.
  - Ekranda tek ana eylem `primary`; ikincil eylemler `soft` / `ghost`.
  - Durum her zaman renk + ikon + metin (renk körlüğü, okuma düzeyi).
*/

type KidVariant = "primary" | "sun" | "soft" | "ghost" | "danger";
type KidSize = "md" | "lg";

const kidVariants: Record<KidVariant, string> = {
  primary: "bg-primary-600 text-white shadow-[0_3px_0_var(--color-primary-800)] hover:bg-primary-700 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-primary-800)]",
  sun: "bg-secondary-400 text-neutral-950 shadow-[0_3px_0_var(--color-secondary-600)] hover:bg-secondary-300 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-secondary-600)]",
  soft: "bg-white text-primary-800 ring-2 ring-primary-200 hover:bg-primary-50 hover:ring-primary-300",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  danger: "bg-(--kid-coral) text-white hover:brightness-110",
};

const kidSizes: Record<KidSize, string> = {
  md: "min-h-11 px-4 text-[15px]",
  lg: "min-h-12 px-5 text-base",
};

export function kidButtonClass({ variant = "primary", size = "md", full = false }: { variant?: KidVariant; size?: KidSize; full?: boolean } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-kid font-bold transition [&>svg]:size-[18px] [&>svg]:shrink-0",
    "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
    kidVariants[variant],
    kidSizes[size],
    full && "w-full",
  );
}

export function KidButton({
  variant,
  size,
  full,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: KidVariant; size?: KidSize; full?: boolean }) {
  return <button type="button" className={cn(kidButtonClass({ variant, size, full }), className)} {...props} />;
}

export function KidButtonLink({
  variant,
  size,
  full,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: KidVariant; size?: KidSize; full?: boolean }) {
  return <Link className={cn(kidButtonClass({ variant, size, full }), className)} {...props} />;
}

export function KidCard({ className, children, as: Tag = "section" }: { className?: string; children: ReactNode; as?: "section" | "article" | "div" | "li" }) {
  return <Tag className={cn("rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 sm:p-6", className)}>{children}</Tag>;
}

export type KidTone = "sky" | "sun" | "mint" | "coral" | "grape" | "neutral";

export const toneClass: Record<KidTone, string> = {
  sky: "bg-(--kid-sky-bg) text-(--kid-sky)",
  sun: "bg-(--kid-sun-bg) text-(--kid-sun)",
  mint: "bg-(--kid-mint-bg) text-(--kid-mint)",
  coral: "bg-(--kid-coral-bg) text-(--kid-coral)",
  grape: "bg-(--kid-grape-bg) text-(--kid-grape)",
  neutral: "bg-neutral-100 text-neutral-600",
};

const toneIcon: Record<KidTone, ReactNode> = {
  sky: <span className="size-2 rounded-full bg-current" aria-hidden />,
  sun: <IconClock aria-hidden />,
  mint: <IconCheck aria-hidden />,
  coral: <IconAlert aria-hidden />,
  grape: <span className="size-2 rounded-full bg-current" aria-hidden />,
  neutral: <IconLock aria-hidden />,
};

export function StatusPill({ tone, children, icon, className }: { tone: KidTone; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap [&>svg]:size-3.5", toneClass[tone], className)}>
      {icon ?? toneIcon[tone]}
      {children}
    </span>
  );
}

/** İkonlu bilgi kutusu: Süre, Soru sayısı vb. */
export function InfoTile({ icon, label, value, tone = "sky" }: { icon: ReactNode; label: string; value: ReactNode; tone?: KidTone }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2 rounded-xl bg-neutral-50 p-2.5 ring-1 ring-neutral-200 sm:flex-row sm:items-center sm:gap-3">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-5", toneClass[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] text-neutral-600">{label}</p>
        <p className="font-kid text-base leading-tight font-bold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

export function KidLoading({ label = "Yükleniyor…", rows = 2 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="animate-pulse rounded-3xl bg-white p-6 ring-1 ring-neutral-200">
          <div className="h-5 w-1/2 rounded-full bg-neutral-100" />
          <div className="mt-4 h-4 w-3/4 rounded-full bg-neutral-100" />
          <div className="mt-2 h-4 w-2/3 rounded-full bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export function KidError({ title = "Bir sorun oldu", message, onRetry, retryLabel = "Tekrar dene" }: { title?: string; message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-3xl bg-(--kid-coral-bg) p-5 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-(--kid-coral) [&>svg]:size-5">
        <IconAlert aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-kid text-base font-bold text-neutral-900">{title}</p>
        <p className="text-neutral-700">{message}</p>
      </div>
      {onRetry ? (
        <KidButton variant="soft" onClick={onRetry}>
          <IconRefresh aria-hidden />
          {retryLabel}
        </KidButton>
      ) : null}
    </div>
  );
}

/** Kısa uyarı / bilgi şeridi. */
export function KidNotice({ tone = "sun", icon, children }: { tone?: KidTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3 font-medium [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0", toneClass[tone])}>
      {icon ?? toneIcon[tone]}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * Onay penceresi. Mobilde alttan açılır (başparmak erişimi), büyük ekranda ortada.
 * Esc ve arka plana tıklama vazgeçer; açılınca odak güvenli düğmede (Vazgeç).
 */
export function KidDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Vazgeç",
  busyLabel = "Bekle…",
  tone = "primary",
  icon,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busyLabel?: string;
  tone?: "primary" | "sun";
  icon?: ReactNode;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/45 p-3 sm:items-center sm:p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {/* İkon solda, başlık + açıklama sağda: ikon tek başına üst satırda kalmasın. */}
        <div className="flex items-start gap-4">
          {icon ? (
            <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-xl [&>svg]:size-6", tone === "sun" ? toneClass.sun : toneClass.sky)}>{icon}</span>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-lg leading-snug font-bold text-neutral-900">{title}</h2>
            <div className="mt-1.5 text-[15px] leading-relaxed text-neutral-700 [&_li]:relative [&_li]:pl-4 [&_li]:before:absolute [&_li]:before:top-[0.6em] [&_li]:before:left-0 [&_li]:before:size-1.5 [&_li]:before:rounded-full [&_li]:before:bg-neutral-400">{body}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <KidButton ref={cancelRef} variant="soft" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">
            {cancelLabel}
          </KidButton>
          <KidButton variant={tone} onClick={onConfirm} disabled={busy} className="w-full sm:w-auto sm:min-w-32">
            {busy ? busyLabel : confirmLabel}
          </KidButton>
        </div>
      </div>
    </div>
  );
}
