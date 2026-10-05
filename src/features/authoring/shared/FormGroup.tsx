"use client";

import type { ChangeEvent, ReactNode } from "react";
import { Checkbox } from "@/src/ui";

/** Form bölümü içinde alt başlık: alanları anlamlı gruplara ayırır (kart içinde kart açmadan). */
export function FormGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full">
        <span className="block text-[13px] font-semibold text-fg">{title}</span>
        {hint ? <span className="block text-xs text-fg-subtle">{hint}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Açıklamalı açık/kapalı ayar kartı: başlık + öğrenciye etkisi + durum rozeti.
 * Tek satırlık açıklamasız onay kutusu yerine; yazar ne seçtiğini bilsin.
 */
export function SettingToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors ${
        checked ? "border-primary-200 bg-primary-50/40" : "border-border bg-surface"
      }`}
    >
      <Checkbox label={<span className="font-medium text-fg">{label}</span>} description={description} checked={checked} disabled={disabled} onChange={onChange} />
      <span
        aria-hidden
        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          checked ? "bg-primary text-white" : "bg-neutral-100 text-fg-subtle"
        }`}
      >
        {checked ? "Açık" : "Kapalı"}
      </span>
    </div>
  );
}
