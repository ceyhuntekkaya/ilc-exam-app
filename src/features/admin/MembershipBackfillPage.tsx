"use client";

import { MembershipBackfillSection } from "@/src/features/admin/MembershipBackfillSection";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { EmptyState, PageHeader } from "@/src/ui";

/** B-47: üyelik geri doldurma sayfası (merkez, `staff:manage_roles`). */
export function MembershipBackfillPage() {
  const can = useCan(Perm.staffManageRoles);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Üyelik backfill"
        description="Mevcut hesaplara üyelik kaydı üretir. Kuru koşum varsayılandır; sonuçtaki eksik alanlar ve roller elle tamamlanır."
      />
      {can ? (
        <MembershipBackfillSection />
      ) : (
        <EmptyState tone="neutral" title="Yetkiniz yok" description="Bu sayfa için staff:manage_roles izni ve merkez erişimi gerekir." />
      )}
    </div>
  );
}
