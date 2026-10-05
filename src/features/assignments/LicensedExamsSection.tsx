"use client";

import { useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { GrantDialog } from "@/src/features/assignments/GrantDialog";
import { useOpsHref, usePanelRole } from "@/src/features/panel/PanelContext";
import { Badge, Button, ButtonLink, ErrorState, SectionTable, SectionToolbar } from "@/src/ui";
import { useState } from "react";

export function LicensedExamsSection({ companyId }: { companyId: string }) {
  const role = usePanelRole();
  const hrefs = useOpsHref();
  const { data, isLoading, isError, error, refetch } = useListGrants({ companyId });
  const rows = data?.data ?? [];
  const [open, setOpen] = useState(false);
  const canGrant = role === "SUPER_ADMIN";

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;
  if (isLoading) return <SectionTable flush loading empty="" columns={["Sınav", "Versiyon", "Geçerlilik", "Kota", ""]} rows={[]} />;

  return (
    <div className="grid gap-4">
      <SectionToolbar count={rows.length} noun="lisanslı sınav">
        {canGrant ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            Lisans ver
          </Button>
        ) : (
          <ButtonLink href={hrefs.assignments} variant="secondary" size="sm">
            Atamalar
          </ButtonLink>
        )}
      </SectionToolbar>
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
