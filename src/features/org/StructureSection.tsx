"use client";

import { useState, type ReactNode } from "react";
import { useBranches, useGrades, useInstitutes, useYears } from "@/src/api/generated/admin-companies/admin-companies";
import { BranchesSection } from "@/src/features/org/BranchesSection";
import { GradesSection } from "@/src/features/org/GradesSection";
import { InstitutesSection } from "@/src/features/org/InstitutesSection";
import { YearsSection } from "@/src/features/org/YearsSection";
import { cn } from "@/src/lib/utils/cn";
import { IconCheck, Skeleton } from "@/src/ui";

type TabId = "institutes" | "years" | "grades" | "branches";

/**
 * Staff kurum ayarları: kurum yapısı kurulum sırasıyla (Kampüs → Sezon → Seviye → Sınıf).
 * Sekmeler adım kartıdır: sıra numarası (tamamsa ✓), ad, kayıt sayısı ve ne işe yaradığı.
 * Seçili sekmenin tablosu (`SectionTable` kartı) hemen altında; sekme ↔ kart arası sayfanın genel aralığıyla aynı.
 */
export function StructureSection({ companyId }: { companyId: string }) {
  const institutes = useInstitutes(companyId).data?.data;
  const years = useYears(companyId).data?.data;
  const grades = useGrades(companyId).data?.data;
  const branches = useBranches(companyId, undefined).data?.data;

  const tabs: { id: TabId; label: string; hint: string; count?: number; panel: ReactNode }[] = [
    { id: "institutes", label: "Kampüsler", hint: "Okul binaları / şubeler", count: institutes?.length, panel: <InstitutesSection companyId={companyId} /> },
    { id: "years", label: "Sezonlar", hint: "Eğitim yılları", count: years?.length, panel: <YearsSection companyId={companyId} /> },
    { id: "grades", label: "Seviyeler", hint: "Sınıf düzeyleri", count: grades?.length, panel: <GradesSection companyId={companyId} /> },
    { id: "branches", label: "Sınıflar", hint: "Öğrenci grupları", count: branches?.length, panel: <BranchesSection companyId={companyId} /> },
  ];

  // İlk açılışta eksik ilk adım seçilir (kurulum yarımsa oradan devam); hepsi doluysa Kampüsler.
  const [picked, setPicked] = useState<TabId | null>(null);
  const loaded = tabs.every((t) => t.count !== undefined);
  const firstMissing = loaded ? tabs.find((t) => t.count === 0)?.id : undefined;
  const active = picked ?? firstMissing ?? "institutes";
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Kurum yapısı" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tabs.map((t, i) => {
          const selected = t.id === active;
          const done = (t.count ?? 0) > 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`structure-tab-${t.id}`}
              aria-selected={selected}
              aria-controls="structure-panel"
              onClick={() => setPicked(t.id)}
              className={cn(
                "flex min-h-11 items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                selected
                  ? "border-primary-300 bg-primary-50/70 ring-1 ring-primary-200"
                  : "border-border bg-surface shadow-sm hover:border-border-strong hover:bg-neutral-50",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done ? "bg-success text-white" : selected ? "bg-primary text-white" : "bg-neutral-100 text-fg-subtle",
                )}
              >
                {done ? <IconCheck className="size-3.5" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm font-semibold", selected ? "text-primary" : "text-fg")}>{t.label}</span>
                  {t.count === undefined ? (
                    <Skeleton className="h-4 w-6 rounded-full" />
                  ) : (
                    <span
                      className={cn(
                        "numeric rounded-full px-1.5 text-[11px] font-semibold",
                        t.count === 0 ? "bg-warning-bg text-warning" : selected ? "bg-primary-100 text-primary" : "bg-neutral-100 text-fg-subtle",
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-fg-subtle">{t.count === 0 ? "Henüz eklenmedi" : t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="structure-panel" aria-labelledby={`structure-tab-${current.id}`}>
        {current.panel}
      </div>
    </div>
  );
}
