"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePanel } from "@/src/features/panel/PanelContext";
import { cn } from "@/src/lib/utils/cn";

const TABS = [
  { slug: "ctt", label: "CTT" },
  { slug: "dif", label: "DIF" },
  { slug: "item-fit", label: "Madde uyumu" },
  { slug: "anchor-sets", label: "Anchor setleri" },
  { slug: "standard-setting", label: "Standart belirleme" },
  { slug: "certificate-gate", label: "Sertifika kapısı" },
] as const;

/** Psikometri ekranları arasında geçiş şeridi (CTT, DIF, anchor, standart belirleme). Menü izinleri ayrıca uygulanır. */
export function PsychometricsTabs() {
  const { basePath } = usePanel();
  const pathname = usePathname();
  return (
    <nav aria-label="Psikometri" className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1 ring-1 ring-border ring-inset">
      {TABS.map((tab) => {
        const href = `${basePath}/content/${tab.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap",
              active ? "bg-surface text-fg shadow-sm ring-1 ring-border" : "text-fg-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
