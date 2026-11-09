"use client";

import { ErasureRequestsSection } from "@/src/features/admin/ErasureRequestsSection";
import { RetentionSection } from "@/src/features/admin/RetentionSection";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { EmptyState, PageHeader } from "@/src/ui";

/** R-24: KVKK saklama ve silme sayfası (merkez). Bölümler izne göre: saklama yönetimi `retention:manage`, silme talepleri `erasure:manage`. */
export function RetentionPage() {
  const canRetention = useCan(Perm.retentionManage);
  const canErasure = useCan(Perm.erasureManage);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Saklama ve silme (KVKK)"
        description="Saklama süreleri, silme koşumu ve yasal tutma. Süreler hukuki karardır; silme geri alınamaz ve varsayılan olarak kapalıdır."
      />
      {canRetention ? <RetentionSection /> : null}
      {canErasure ? <ErasureRequestsSection /> : null}
      {!canRetention && !canErasure ? (
        <EmptyState tone="neutral" title="Yetkiniz yok" description="Bu sayfa için retention:manage veya erasure:manage izni ve merkez erişimi gerekir." />
      ) : null}
    </div>
  );
}
