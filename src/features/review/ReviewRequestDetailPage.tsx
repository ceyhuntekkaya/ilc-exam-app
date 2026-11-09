"use client";

import { useCan } from "@/src/features/panel/PanelContext";
import { ReviewRequestDetail } from "@/src/features/review/ReviewRequestDetail";
import { Perm } from "@/src/lib/permissions";
import { EmptyState } from "@/src/ui";

/** R-32: talep ayrıntısı sayfası (`assignment:evaluate`). `companyHint`: listeden gelen kurum kapsamı. */
export function ReviewRequestDetailPage({ id, companyHint }: { id: string; companyHint?: string | null }) {
  const can = useCan(Perm.assignmentEvaluate);
  if (!can) {
    return <EmptyState tone="neutral" title="Yetkiniz yok" description="Bu sayfa için assignment:evaluate izni gerekir." />;
  }
  return <ReviewRequestDetail id={id} companyHint={companyHint} />;
}
