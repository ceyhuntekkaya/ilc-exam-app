"use client";

import { useState } from "react";
import { Button } from "@/src/ui/primitives/Button";

function maskIban(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < 8) return "••••";
  return `${compact.slice(0, 4)} •••• •••• ${compact.slice(-4)}`;
}

function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at < 1) return "•••";
  const name = value.slice(0, at);
  const domain = value.slice(at);
  return `${name.slice(0, 1)}•••${domain}`;
}

function maskCard(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}

const MASKERS = {
  iban: maskIban,
  email: maskEmail,
  card: maskCard,
  phone: maskPhone,
} as const;

export function MaskedValue({
  value,
  kind,
  onReveal,
}: {
  value: string | null | undefined;
  kind: keyof typeof MASKERS;
  onReveal?: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!value) return <span>—</span>;
  const shown = open ? value : MASKERS[kind](value);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-sm">{shown}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) onReveal?.();
        }}
      >
        {open ? "Gizle" : "Aç"}
      </Button>
    </span>
  );
}
