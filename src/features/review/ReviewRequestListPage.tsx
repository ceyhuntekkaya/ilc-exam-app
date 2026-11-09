"use client";

import { useCan } from "@/src/features/panel/PanelContext";
import { ReviewRequestList } from "@/src/features/review/ReviewRequestList";
import { Perm } from "@/src/lib/permissions";
import { EmptyState, PageHeader } from "@/src/ui";

/** R-32: inceleme talepleri sayfası (`assignment:evaluate`). Staff ve admin rotaları aynı sayfayı kullanır. */
export function ReviewRequestListPage() {
  const can = useCan(Perm.assignmentEvaluate);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="İnceleme talepleri"
        description="Adayların sonuç için açtığı inceleme talepleri. Talebi açın, cevapların puanını gerekirse düzeltin, sonucu adaya bildirin."
      />
      {can ? (
        <ReviewRequestList />
      ) : (
        <EmptyState tone="neutral" title="Yetkiniz yok" description="Bu sayfa için assignment:evaluate izni gerekir." />
      )}
    </div>
  );
}
