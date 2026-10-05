"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionsQueryKey,
  useCreateSubscription,
  usePatchSubscription,
  useSubscriptions,
} from "@/src/api/generated/admin-companies/admin-companies";
import { subscriptionStatusLabel } from "@/src/features/admin/labels";
import { usePanelRole } from "@/src/features/panel/PanelContext";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  FormDialog,
  Input,
  SectionTable,
  SectionToolbar,
  errorMessage,
  notify,
} from "@/src/ui";

export function SubscriptionSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const role = usePanelRole();
  const { data, isLoading, isError, error, refetch } = useSubscriptions(id);
  const rows = data?.data ?? [];
  const create = useCreateSubscription();
  const patch = usePatchSubscription();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getSubscriptionsQueryKey(id) });
  }

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;
  if (isLoading) return <SectionTable flush loading empty="" columns={["Dönem", { label: "Max öğrenci", align: "right" }, "Durum", ""]} rows={[]} />;

  return (
    <div className="grid gap-4">
      {role === "SUPER_ADMIN" ? (
        <SectionToolbar count={rows.length} noun="üyelik">
          <Button size="sm" onClick={() => setOpen(true)}>
            Yeni üyelik
          </Button>
        </SectionToolbar>
      ) : null}
      <SectionTable
        flush
        empty="Üyelik yok"
        emptyHint="Bu kurum için henüz abonelik tanımlanmamış."
        columns={["Dönem", { label: "Max öğrenci", align: "right" }, "Durum", ""]}
        rows={rows.map((r) => [
          `${r.startDate ?? "—"} → ${r.endDate ?? "—"}`,
          r.maxStudents === 0 ? "Sınırsız" : String(r.maxStudents),
          <Badge
            key="st"
            tone={r.status === "ACTIVE" ? "success" : r.status === "CANCELLED" ? "danger" : "warning"}
            dot
          >
            {subscriptionStatusLabel(r.status)}
          </Badge>,
          r.status === "ACTIVE" ? (
            <Button
              key="act"
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await patch.mutateAsync({ id, sid: r.id!, data: { cancel: true } });
                  await refresh();
                  notify.success("Üyelik iptal edildi");
                } catch (err) {
                  notify.error(errorMessage(err, "Üyelik iptal edilemedi"));
                }
              }}
            >
              İptal
            </Button>
          ) : (
            ""
          ),
        ])}
      />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Yeni üyelik"
        submitLabel="Ekle"
        pending={create.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          const __s = String(fd.get("startDate") || "");
          const __e = String(fd.get("endDate") || "");
          if (__s && __e && __e < __s) {
            setFormError("Bitiş tarihi başlangıçtan önce olamaz.");
            return;
          }
          try {
            await create.mutateAsync({
              id,
              data: {
                startDate: String(fd.get("startDate") || ""),
                endDate: String(fd.get("endDate") || ""),
                maxStudents: Number(fd.get("maxStudents") || 0),
              },
            });
            await refresh();
            setOpen(false);
            notify.success("Üyelik eklendi");
          } catch (err) {
            const message = errorMessage(err, "Üyelik eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Başlangıç" required>
            <Input name="startDate" type="date" required />
          </Field>
          <Field label="Bitiş" required hint="Bu günün sonunda erişim kapanır">
            <Input name="endDate" type="date" required />
          </Field>
        </div>
        <Field label="En fazla öğrenci" hint="0 = sınırsız">
          <Input name="maxStudents" type="number" min={0} defaultValue={0} />
        </Field>
      </FormDialog>
    </div>
  );
}
