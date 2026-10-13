"use client";

import { getExamReportsQueryKey } from "@/src/api/generated/admin-companies/admin-companies";
import { getListAssignmentsQueryKey } from "@/src/api/generated/admin-exams/admin-exams";
import { close, finishRemaining, getMonitorQueryKey } from "@/src/api/generated/assignment-controller/assignment-controller";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Button, ConfirmDialog, errorMessage, notify } from "@/src/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export type AssignmentLifecycleItem = {
  id: string;
  status?: string | null;
  /** Bilinen devam eden öğrenci sayısı. Şube ekranında yalnız o şube, raporda atamanın tamamı. */
  inProgress: number;
  /** Aynı türde birden fazla düğme varken hangisi olduğu (ör. sınav penceresi). */
  detail?: string;
};

type PendingAction = { id: string; kind: "close" | "finish" };

/**
 * Atamayı kapatır veya kapandıktan sonra içeride kalan oturumları teslim alır.
 * Düğmeler yalnız `assignment:manage` izninde görünür. Kapatma geri alınamaz bir yayın değildir;
 * yeni girişi keser. Kalanları bitirmek ayrı onay ister ve yalnız kapalı atamada çalışır.
 */
export function AssignmentCloseActions({
  companyId,
  items,
  branchScoped = false,
}: {
  companyId: string;
  items: AssignmentLifecycleItem[];
  /** Seçili şube bu atamanın tamamı olmayabilir; onay metni bunu söyler. */
  branchScoped?: boolean;
}) {
  const canClose = useCan(Perm.assignmentManage);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const closable = canClose ? items.filter((item) => item.id && item.status === "OPEN") : [];
  const finishable = canClose ? items.filter((item) => item.id && item.status === "CLOSED" && item.inProgress > 0) : [];

  if (closable.length === 0 && finishable.length === 0) return null;

  const target = pending ? items.find((item) => item.id === pending.id) : undefined;

  async function run() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      if (pending.kind === "close") {
        await close(pending.id);
        notify.success("Atama kapatıldı");
      } else {
        await finishRemaining(pending.id);
        notify.success("Kalan oturumlar bitirildi");
      }
      setPending(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey({ companyId }) }),
        queryClient.invalidateQueries({ queryKey: getExamReportsQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: ["assignment-roster"] }),
        queryClient.invalidateQueries({ queryKey: getMonitorQueryKey(pending.id) }),
      ]);
    } catch (err) {
      notify.error(errorMessage(err, "İşlem başarısız"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {closable.map((item) => (
          <ActionButton
            key={`close-${item.id}`}
            label="Atamayı kapat"
            detail={closable.length > 1 ? item.detail : undefined}
            variant="danger"
            disabled={busy}
            onClick={() => setPending({ id: item.id, kind: "close" })}
          />
        ))}
        {finishable.map((item) => (
          <ActionButton
            key={`finish-${item.id}`}
            label="Kalanları bitir"
            detail={finishable.length > 1 ? item.detail : undefined}
            variant="secondary"
            disabled={busy}
            onClick={() => setPending({ id: item.id, kind: "finish" })}
          />
        ))}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === "finish" ? "Kalan oturumları bitir" : "Atamayı kapat"}
        description={
          pending?.kind === "finish"
            ? finishCopy(target?.inProgress ?? 0, branchScoped)
            : closeCopy(target?.inProgress ?? 0, branchScoped, target?.detail)
        }
        confirmLabel={pending?.kind === "finish" ? "Bitir" : "Kapat"}
        tone="danger"
        pending={busy}
        onClose={() => {
          if (!busy) setPending(null);
        }}
        onConfirm={() => void run()}
      />
    </>
  );
}

function ActionButton({
  label,
  detail,
  variant,
  disabled,
  onClick,
}: {
  label: string;
  detail?: string;
  variant: "danger" | "secondary";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="grid min-w-0 justify-items-end gap-1">
      {detail ? <span className="max-w-56 text-right text-xs text-fg-muted">{detail}</span> : null}
      <Button type="button" variant={variant} className="min-h-11" disabled={disabled} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}

function closeCopy(inProgress: number, branchScoped: boolean, detail?: string) {
  const parts = [
    "Atama yeni girişlere kapanır. Sınavı henüz başlatmamış öğrenciler girmedi sayılır. Sınavda olan öğrencilerin süresi kesilmez.",
  ];
  if (detail) parts.unshift(detail + ".");
  if (inProgress > 0) {
    const where = branchScoped ? "Bu şubede" : "Şu an";
    parts.push(`${where} ${inProgress.toLocaleString("tr-TR")} öğrenci sınavda; onların süresi sürer.`);
  }
  if (branchScoped) {
    parts.push("Kapatma seçili şubeyle sınırlı değildir; atamanın tamamında yeni giriş durur.");
  }
  return parts.join(" ");
}

function finishCopy(inProgress: number, branchScoped: boolean) {
  const count =
    inProgress > 0
      ? `Devam eden ${inProgress.toLocaleString("tr-TR")} oturum`
      : "Devam eden oturumlar";
  const parts = [`${count} şu anki cevaplarıyla teslim edilir. Bu işlem geri alınamaz.`];
  if (branchScoped) {
    parts.push("Bu işlem seçili şubeyle sınırlı değildir; atamadaki devam eden tüm oturumlar teslim edilir.");
  }
  return parts.join(" ");
}
