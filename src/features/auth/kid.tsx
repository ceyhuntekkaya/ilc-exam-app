"use client";

import { IconAlert, IconCheck } from "@/src/ui/icons";
import type { ComponentProps, ReactNode } from "react";

const kidInputClass =
  "min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/60 pr-4 pl-12 text-base font-medium text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 aria-invalid:border-rose-400 aria-invalid:ring-rose-400/15";

/** Öğrenci girişi görünümünde etiketli, soldan ikonlu alan. */
export function KidField({
  id,
  label,
  icon,
  className = "mt-5",
  ...input
}: { id: string; label: string; icon: ReactNode; className?: string } & Omit<ComponentProps<"input">, "id" | "className">) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-kid text-sm font-bold text-slate-700">
        {label}
      </label>
      <div className="relative mt-2 [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:top-1/2 [&>svg]:left-4 [&>svg]:size-5.5 [&>svg]:-translate-y-1/2 [&>svg]:text-slate-400">
        {icon}
        <input id={id} className={kidInputClass} {...input} />
      </div>
    </div>
  );
}

export function KidAlert({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200/90 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700 [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0">
      <IconAlert aria-hidden className="text-rose-600" />
      {children}
    </p>
  );
}

export function KidNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-800 [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0">
      <IconCheck aria-hidden className="text-emerald-600" />
      {children}
    </p>
  );
}

export const kidLinkClass =
  "inline-flex min-h-10 items-center font-bold text-indigo-600 transition-colors hover:text-indigo-800 underline decoration-2 underline-offset-4";

/** Hatanın HTTP durumu (customInstance `.status` koyar). */
export function errorStatus(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

/** Backend'in `{ error }` gövdesinden metin; yoksa undefined. */
export function backendMessage(err: unknown): string | undefined {
  const data = typeof err === "object" && err !== null && "data" in err ? (err as { data?: unknown }).data : undefined;
  const text = data && typeof data === "object" ? (data as { error?: unknown }).error : undefined;
  return typeof text === "string" && text.trim() ? text : undefined;
}
