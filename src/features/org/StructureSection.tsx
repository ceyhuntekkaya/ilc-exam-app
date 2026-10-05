"use client";

import { BranchesSection } from "@/src/features/org/BranchesSection";
import { GradesSection } from "@/src/features/org/GradesSection";
import { InstitutesSection } from "@/src/features/org/InstitutesSection";
import { YearsSection } from "@/src/features/org/YearsSection";
import { cn } from "@/src/lib/utils/cn";
import { useState } from "react";

const TABS = [
  { id: "institutes", label: "Kampüsler" },
  { id: "years", label: "Sezonlar" },
  { id: "grades", label: "Seviyeler" },
  { id: "branches", label: "Sınıflar" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Staff kurum ayarları: yapı bölümleri tek sayfada. Admin ayrı route kullanır. */
export function StructureSection({ companyId }: { companyId: string }) {
  const [tab, setTab] = useState<TabId>("institutes");

  return (
    <div className="grid gap-4">
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn(
              "min-h-11 shrink-0 rounded-lg px-3 text-sm",
              tab === item.id ? "bg-white font-medium text-fg shadow-sm" : "text-fg-muted",
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "institutes" ? <InstitutesSection companyId={companyId} /> : null}
      {tab === "years" ? <YearsSection companyId={companyId} /> : null}
      {tab === "grades" ? <GradesSection companyId={companyId} /> : null}
      {tab === "branches" ? <BranchesSection companyId={companyId} /> : null}
    </div>
  );
}
