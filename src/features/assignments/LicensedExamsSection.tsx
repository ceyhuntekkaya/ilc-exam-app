"use client";

import { useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { GrantDialog } from "@/src/features/assignments/GrantDialog";
import { useOpsHref, usePanelRole } from "@/src/features/panel/PanelContext";
import { Badge, Button, ButtonLink, ErrorState, SectionTable } from "@/src/ui";
import { useState } from "react";

export function LicensedExamsSection({ companyId }: { companyId: string }) {
  const role = usePanelRole();
  const hrefs = useOpsHref();
  const { data, isLoading, isError, error } = useListGrants({ companyId });
  const rows = data?.data ?? [];
  const [open, setOpen] = useState(false);
  const canGrant = role === "SUPER_ADMIN";

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        {canGrant ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            Lisans ver
          </Button>
        ) : (
          <ButtonLink href={hrefs.assignments} variant="secondary" size="sm">
            Atamalar
          </ButtonLink>
        )}
      </div>
      <SectionTable
        flush
        empty="Lisanslı sınav yok"
        emptyHint="Bu kuruma henüz sınav lisansı verilmemiş."
        columns={["Sınav", "Versiyon", "Geçerlilik", "Kota", ""]}
        rows={rows.map((row) => [
          <div key="t">
            <p className="font-medium">{row.examTitle ?? "—"}</p>
            <p className="text-xs text-fg-muted">{row.examCode}</p>
          </div>,
          row.examVersionNo != null ? `v${row.examVersionNo}` : "—",
          `${row.validFrom ? new Date(row.validFrom).toLocaleDateString("tr-TR") : "—"} → ${
            row.validUntil ? new Date(row.validUntil).toLocaleDateString("tr-TR") : "∞"
          }`,
          row.quota ?? "∞",
          <div key="a" className="flex flex-wrap items-center justify-end gap-2">
            {row.mandatory ? (
              <Badge tone="warning" dot>
                Zorunlu
              </Badge>
            ) : null}
            {row.id ? (
              <ButtonLink href={hrefs.assign(row.id)} variant="ghost" size="sm">
                Atama aç
              </ButtonLink>
            ) : null}
          </div>,
        ])}
      />
      {canGrant ? (
        <GrantDialog open={open} onClose={() => setOpen(false)} companyId={companyId} />
      ) : null}
    </div>
  );
}
