"use client";

import { cn } from "@/src/lib/utils/cn";
import { IconAlert, IconCheck, IconClock, IconLock, IconRefresh } from "@/src/ui/icons";
import Link from "next/link";
import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";

/*
  Öğrenci arayüz kiti ("Skorbord"; tokenlar student-theme.css). Kurallar:
  - Dokunma hedefi en az 48px (lg: 56px). Çocuk parmağı + tablet.
  - Ekranda tek ana eylem `primary`; "devam et" vurgusu `sun`; ikincil eylemler `soft` / `ghost`.
  - Durum her zaman renk + ikon + metin (renk körlüğü, okuma düzeyi).
  - Sınav ekranında (.exam-sitting) aynı bileşenler tokenlar üzerinden sakinleşir.
*/

type KidVariant = "primary" | "sun" | "soft" | "ghost" | "danger";
type KidSize = "md" | "lg";

const kidVariants: Record<KidVariant, string> = {
  primary: "border-(--sb-ink) bg-(--sb-ink) text-(--sb-on-ink) hover:border-(--sb-fg-strong) hover:bg-(--sb-fg-strong) active:translate-y-0.5",
  sun: "border-(--sb-ink) bg-(--sb-sun-bg) text-(--sb-ink) shadow-(--sb-e1) hover:-translate-x-px hover:-translate-y-px hover:bg-(--sb-sun-hover) hover:shadow-(--sb-e2) active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  soft: "border-(--sb-ink) bg-white text-(--sb-ink) hover:bg-(--sb-tint) active:translate-y-0.5",
  ghost: "border-transparent bg-transparent text-(--sb-ink) hover:bg-(--sb-sunken)",
  danger: "border-(--sb-danger) bg-(--sb-danger) text-white hover:brightness-95 active:translate-y-0.5",
};

const kidSizes: Record<KidSize, string> = {
  md: "min-h-12 px-5 text-[15px]",
  lg: "min-h-14 px-6 text-base",
};

export function kidButtonClass({ variant = "primary", size = "md", full = false }: { variant?: KidVariant; size?: KidSize; full?: boolean } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-(--sb-r-md) border-2 font-semibold transition-[transform,box-shadow,background-color,border-color] duration-120 ease-(--sb-ease) [&>svg]:size-5 [&>svg]:shrink-0",
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-(--sb-sunken) disabled:text-(--sb-fg-muted) disabled:shadow-none",
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
  return <Tag className={cn("rounded-(--sb-r-md) border border-(--sb-line) bg-white p-5 sm:p-6", className)}>{children}</Tag>;
}

export type KidTone = "sky" | "sun" | "mint" | "coral" | "grape" | "neutral";

export const toneClass: Record<KidTone, string> = {
  sky: "bg-white text-(--sb-ink) ring-1 ring-(--sb-ink) ring-inset",
  sun: "bg-(--kid-sun-bg) text-(--kid-sun)",
  mint: "bg-(--sb-success-bg) text-(--sb-success)",
  coral: "bg-(--sb-danger-bg) text-(--sb-danger)",
  grape: "bg-(--sb-ink) text-(--sb-on-ink)",
  neutral: "bg-(--sb-sunken) text-(--sb-fg-muted)",
};

const toneIcon: Record<KidTone, ReactNode> = {
  sky: <span className="size-1.5 bg-current" aria-hidden />,
  sun: <IconClock aria-hidden />,
  mint: <IconCheck aria-hidden />,
  coral: <IconAlert aria-hidden />,
  grape: <span className="size-1.5 bg-current" aria-hidden />,
  neutral: <IconLock aria-hidden />,
};

export function StatusPill({ tone, children, icon, className }: { tone: KidTone; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span className={cn("sb-overline inline-flex h-6 items-center gap-1.5 rounded-(--sb-r-xs) px-2 whitespace-nowrap [&>svg]:size-3.5 [&>svg]:stroke-[2.5]", toneClass[tone], className)}>
      {icon ?? toneIcon[tone]}
      {children}
    </span>
  );
}

/** Bilgi kutusu: küçük etiket, altında skor tabelası rakamı (Süre, Bölüm, Soru). */
export function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-(--sb-r-md) border border-(--sb-line) bg-white p-3 sm:p-4">
      <p className="flex items-center gap-1.5 text-(--sb-fg-muted) [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[2.25]">
        {icon}
        <span className="sb-overline truncate">{label}</span>
      </p>
      <p className="sb-display text-2xl leading-none break-words text-(--sb-ink) sm:text-[2rem]">{value}</p>
    </div>
  );
}

export function KidLoading({ label = "Loading…", rows = 2 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-(--sb-r-md) border border-(--sb-line) bg-white p-5 sm:p-6">
          <div className="sb-skeleton h-6 w-2/5 rounded-(--sb-r-xs)" />
          <div className="sb-skeleton mt-4 h-4 w-3/4 rounded-(--sb-r-xs)" />
          <div className="sb-skeleton mt-2 h-4 w-2/3 rounded-(--sb-r-xs)" />
        </div>
      ))}
    </div>
  );
}

export function KidError({ title = "Something went wrong", message, onRetry, retryLabel = "Try again" }: { title?: string; message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-(--sb-r-md) border-l-4 border-(--sb-danger) bg-(--sb-danger-bg) p-5 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-(--sb-r-sm) bg-white text-(--sb-danger) [&>svg]:size-6 [&>svg]:stroke-[2.25]">
        <IconAlert aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-kid text-lg font-bold text-(--sb-ink)">{title}</p>
        <p className="text-(--sb-fg-strong)">{message}</p>
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
    <div className={cn("flex items-start gap-3 rounded-(--sb-r-md) px-4 py-3 font-medium [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:stroke-[2.25]", toneClass[tone])}>
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
  cancelLabel = "Cancel",
  busyLabel = "Please wait…",
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
    <div className="sb-fade fixed inset-0 z-50 flex items-end justify-center bg-[rgb(14_14_12/0.56)] p-3 sm:items-center sm:p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sb-rise max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-(--sb-r-lg) border-2 border-(--sb-ink) bg-white p-5 shadow-(--sb-e-overlay) sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {/* İkon solda, başlık + açıklama sağda: ikon tek başına üst satırda kalmasın. */}
        <div className="flex items-start gap-4">
          {icon ? (
            <span
              aria-hidden
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-(--sb-r-sm) [&>svg]:size-6 [&>svg]:stroke-[2.25]",
                tone === "sun" ? "border-2 border-(--sb-ink) bg-(--kid-sun-bg) text-(--sb-ink)" : "bg-(--sb-ink) text-(--sb-on-ink)",
              )}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-xl leading-snug font-bold text-(--sb-ink)">{title}</h2>
            <div className="mt-2 text-base leading-relaxed text-(--sb-fg-strong) [&_li]:relative [&_li]:pl-4 [&_li]:before:absolute [&_li]:before:top-[0.6em] [&_li]:before:left-0 [&_li]:before:size-1.5 [&_li]:before:bg-(--sb-ink)">{body}</div>
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
