"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { IconAlert, IconCheck, IconX } from "@/src/ui/icons";
import { cn } from "@/src/lib/utils/cn";

export type ToastTone = "success" | "danger" | "info";

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
  duration: number;
};

type Listener = () => void;

const DEFAULT_DURATION = 3500;
const MAX_VISIBLE = 4;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return toasts;
}

/** Stable empty list — getServerSnapshot must return a cached value. */
const EMPTY_TOASTS: ToastItem[] = [];

function getServerSnapshot(): ToastItem[] {
  return EMPTY_TOASTS;
}

function push(tone: ToastTone, message: string, duration = DEFAULT_DURATION) {
  const text = message.trim();
  if (!text) return;
  const id = `t-${++seq}`;
  toasts = [{ id, tone, message: text, duration }, ...toasts].slice(0, MAX_VISIBLE);
  emit();
  if (duration > 0) {
    window.setTimeout(() => dismiss(id), duration);
  }
}

function dismiss(id: string) {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

/** Global bildirim API — hook gerekmez; herhangi bir yerden çağrılabilir. */
export const notify = {
  success(message: string, duration?: number) {
    push("success", message, duration ?? DEFAULT_DURATION);
  },
  error(message: string, duration?: number) {
    push("danger", message, duration ?? 5000);
  },
  info(message: string, duration?: number) {
    push("info", message, duration ?? DEFAULT_DURATION);
  },
  dismiss,
  /** Promise sonucuna göre başarı/hata toast’ı gösterir; hatayı yeniden fırlatır. */
  async run<T>(
    promise: Promise<T>,
    opts: { success?: string; error?: string },
  ): Promise<T> {
    try {
      const result = await promise;
      if (opts.success) push("success", opts.success, DEFAULT_DURATION);
      return result;
    } catch (err) {
      push("danger", errorMessage(err, opts.error ?? "İşlem başarısız"), 5000);
      throw err;
    }
  },
};

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message.trim() ? err.message : fallback;
}

const toneStyles: Record<
  ToastTone,
  { box: string; iconWrap: string; Icon: typeof IconCheck }
> = {
  success: {
    box: "border-success/25 bg-success-bg text-success",
    iconWrap: "bg-success/15 text-success",
    Icon: IconCheck,
  },
  danger: {
    box: "border-danger/25 bg-danger-bg text-danger",
    iconWrap: "bg-danger/15 text-danger",
    Icon: IconAlert,
  },
  info: {
    box: "border-info/25 bg-info-bg text-info",
    iconWrap: "bg-info/15 text-info",
    Icon: IconAlert,
  },
};

function ToastCard({ item }: { item: ToastItem }) {
  const s = toneStyles[item.tone];
  return (
    <div
      role={item.tone === "danger" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-3.5 py-3 shadow-[0_12px_40px_rgb(26_26_24/0.12)] animate-toast-in",
        s.box,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          s.iconWrap,
        )}
      >
        <s.Icon className="size-4" />
      </span>
      <p className="min-w-0 flex-1 pt-1 text-sm font-medium leading-snug text-fg">{item.message}</p>
      <button
        type="button"
        aria-label="Kapat"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-black/5 hover:text-fg"
        onClick={() => dismiss(item.id)}
      >
        <IconX className="size-4" />
      </button>
    </div>
  );
}

/** Root Providers içinde bir kez mount edilir. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:inset-x-auto sm:right-4 sm:items-end sm:px-0"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
