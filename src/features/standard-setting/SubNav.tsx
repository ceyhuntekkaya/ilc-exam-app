"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePanel } from "@/src/features/panel/PanelContext";
import { cn } from "@/src/lib/utils/cn";

const LINKS = [
  { suffix: "", label: "Çalışmalar" },
  { suffix: "/credentials", label: "Panelist kimlikleri" },
  { suffix: "/cut-scores", label: "Kesme puanları" },
] as const;

/** Standart belirleme alt gezinmesi. */
export function StandardSettingSubNav() {
  const { basePath } = usePanel();
  const pathname = usePathname();
  const root = `${basePath}/content/standard-setting`;
  const activeSuffix = LINKS.slice(1).find((l) => pathname.startsWith(`${root}${l.suffix}`))?.suffix ?? "";
  return (
    <nav aria-label="Standart belirleme" className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-border">
      {LINKS.map((link) => {
        const active = link.suffix === activeSuffix;
        return (
          <Link
            key={link.suffix}
            href={`${root}${link.suffix}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-1 py-2.5 text-[13px] font-medium",
              active ? "border-primary text-primary" : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
