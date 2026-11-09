"use client";

import { IndividualHumanQueue } from "@/src/features/grading/IndividualHumanQueue";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { EmptyState, PageHeader } from "@/src/ui";

/** R-30: bireysel havuz insan kuyruğu sayfası (merkez; `assignment:evaluate`). Atama seçilmez. */
export function IndividualHumanQueuePage() {
  const can = useCan(Perm.assignmentEvaluate);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Bireysel havuz — insan kuyruğu"
        description="Bireysel adayların AI'dan insana düşen, denetim bekleyen ve gözden geçirilmemiş AI puanlı cevapları. Atama seçmeden listelenir."
      />
      {can ? (
        <IndividualHumanQueue />
      ) : (
        <EmptyState tone="neutral" title="Yetkiniz yok" description="Bu sayfa için assignment:evaluate izni ve merkez erişimi gerekir." />
      )}
    </div>
  );
}
