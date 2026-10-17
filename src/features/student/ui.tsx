"use client";

import { Mascot, type MascotMood } from "@/src/features/student/mascot";
import { cn } from "@/src/lib/utils/cn";
import { IconAlert, IconCheck, IconClock, IconLock, IconRefresh } from "@/src/ui/icons";
import Link from "next/link";
import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";

/*
  Öğrenci Arayüz Kiti ("Modern Energetic Academy")
  - Ergonomik dokunma hedefleri: en az 48px (md), 54-56px (lg). Tablet & dokunmatik dostu.
  - Eylem Hiyerarşisi:
    - primary: Canlı indigo degradeli, yükseltilmiş ana eylem.
    - sun: Güneş amberi degradeli, "Devam et / Kutla / Teslim et" motivasyon odağı.
    - soft: Temiz beyaz yüzey, rafine çizgi ve yumuşak hover.
    - ghost: İkincil yönlendirme.
  - Durum etiketleri: İkon + metin + yumuşak cam tonu.
*/

type KidVariant = "primary" | "sun" | "soft" | "ghost" | "danger";
type KidSize = "md" | "lg";

const kidVariants: Record<KidVariant, string> = {
  primary:
    "border-transparent bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  sun:
    "border-transparent bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  soft:
    "border border-slate-200/90 bg-white text-slate-800 shadow-xs hover:bg-slate-50/80 hover:border-indigo-200 hover:text-indigo-900 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  ghost:
    "border-transparent bg-transparent text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-700 active:scale-[0.98]",
  danger:
    "border-transparent bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-500/20 hover:from-rose-700 hover:to-rose-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
};

const kidSizes: Record<KidSize, string> = {
  md: "min-h-12 px-5 text-[15px] font-semibold",
  lg: "min-h-14 px-6 text-base font-bold",
};

export function kidButtonClass({
  variant = "primary",
  size = "md",
  full = false,
}: { variant?: KidVariant; size?: KidSize; full?: boolean } = {}) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-(--sb-r-md) border font-kid transition-all duration-150 ease-out select-none [&>svg]:size-5 [&>svg]:shrink-0",
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none",
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

export function KidCard({
  className,
  children,
  as: Tag = "section",
}: { className?: string; children: ReactNode; as?: "section" | "article" | "div" | "li" }) {
  return (
    <Tag
      className={cn(
        "rounded-(--sb-r-md) border border-slate-200/80 bg-white p-5 shadow-(--sb-e1) transition-shadow duration-200 sm:p-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export type KidTone = "sky" | "sun" | "mint" | "coral" | "grape" | "neutral";

export const toneClass: Record<KidTone, string> = {
  sky: "bg-sky-50 text-sky-800 border border-sky-200/90",
  sun: "bg-amber-50 text-amber-900 border border-amber-200/90",
  mint: "bg-emerald-50 text-emerald-900 border border-emerald-200/90",
  coral: "bg-rose-50 text-rose-900 border border-rose-200/90",
  grape: "bg-purple-50 text-purple-900 border border-purple-200/90",
  neutral: "bg-slate-100/90 text-slate-700 border border-slate-200/90",
};

const toneIcon: Record<KidTone, ReactNode> = {
  sky: <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />,
  sun: <IconClock aria-hidden className="text-amber-600" />,
  mint: <IconCheck aria-hidden className="text-emerald-600" />,
  coral: <IconAlert aria-hidden className="text-rose-600" />,
  grape: <span className="size-1.5 rounded-full bg-purple-500" aria-hidden />,
  neutral: <IconLock aria-hidden className="text-slate-500" />,
};

export function StatusPill({
  tone,
  children,
  icon,
  className,
}: { tone: KidTone; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "sb-overline inline-flex h-6.5 items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap text-xs font-bold transition-colors [&>svg]:size-3.5 [&>svg]:stroke-[2.5]",
        toneClass[tone],
        className,
      )}
    >
      {icon ?? toneIcon[tone]}
      {children}
    </span>
  );
}

/** Bilgi kutusu: küçük etiket, altında skor tabelası rakamı (Süre, Bölüm, Soru). */
export function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-(--sb-r-md) border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:border-indigo-200 sm:p-4">
      <p className="flex items-center gap-1.5 text-slate-500 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[2.25] [&>svg]:text-indigo-500">
        {icon}
        <span className="sb-overline truncate text-slate-500">{label}</span>
      </p>
      <p className="sb-display text-2xl leading-none tracking-tight break-words text-slate-900 sm:text-[1.85rem]">{value}</p>
    </div>
  );
}

export function KidLoading({ label = "Loading…", rows = 2 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-(--sb-r-md) border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="sb-skeleton h-6 w-2/5 rounded-(--sb-r-xs)" />
          <div className="sb-skeleton mt-4 h-4 w-3/4 rounded-(--sb-r-xs)" />
          <div className="sb-skeleton mt-2 h-4 w-2/3 rounded-(--sb-r-xs)" />
        </div>
      ))}
    </div>
  );
}

export function KidError({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
}: { title?: string; message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-(--sb-r-md) border border-rose-200/90 bg-rose-50/70 p-5 shadow-xs sm:flex-row sm:items-center">
      <Mascot mood="thinking" size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-kid text-lg font-bold text-slate-900">{title}</p>
        <p className="text-slate-700">{message}</p>
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
    <div className={cn("flex items-start gap-3 rounded-(--sb-r-md) px-4 py-3 font-medium shadow-xs [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:stroke-[2.25]", toneClass[tone])}>
      {icon ?? toneIcon[tone]}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * Onay penceresi. Mobilde alttan açılır (başparmak erişimi), büyük ekranda ortada.
 * Modern cam zeminli dialog penceresi.
 */
export function KidDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  busyLabel = "Please wait…",
  tone = "primary",
  icon,
  mascot,
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
  /** Verilirse ikonun yerine geçer. */
  mascot?: MascotMood;
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
    <div className="sb-fade fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-xs p-3 sm:items-center sm:p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sb-rise max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-indigo-100/80 bg-white p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={cn("flex items-start gap-4", mascot && "flex-col sm:flex-row sm:gap-5")}>
          {mascot ? (
            <Mascot mood={mascot} size="md" />
          ) : icon ? (
            <span
              aria-hidden
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-2xl shadow-xs [&>svg]:size-6 [&>svg]:stroke-[2.25]",
                tone === "sun" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700",
              )}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="font-kid text-xl leading-snug font-bold text-slate-900">{title}</h2>
            <div className="mt-2 text-base leading-relaxed text-slate-600 [&_li]:relative [&_li]:pl-4 [&_li]:before:absolute [&_li]:before:top-[0.6em] [&_li]:before:left-0 [&_li]:before:size-1.5 [&_li]:before:rounded-full [&_li]:before:bg-indigo-600">{body}</div>
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
