"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionsQueryKey,
  useCreateSubscription,
  usePatchSubscription,
  useSubscriptions,
} from "@/src/api/generated/admin-companies/admin-companies";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { subscriptionStatusLabel } from "@/src/features/admin/labels";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  FormDialog,
  Input,
  SectionTable,
  errorMessage,
  notify,
} from "@/src/ui";

export default function CompanySubscriptionPage() {
  return (
    <CompanyDetailFrame section="subscription">
      <Body />
    </CompanyDetailFrame>
  );
}

function Body() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useSubscriptions(id);
  const rows = data?.data ?? [];
  const create = useCreateSubscription();
  const patch = usePatchSubscription();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getSubscriptionsQueryKey(id) });
  }

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          Yeni üyelik
        </Button>
      </div>
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
        <Field label="Başlangıç" required>
          <Input name="startDate" type="date" required />
        </Field>
        <Field label="Bitiş" required>
          <Input name="endDate" type="date" required />
        </Field>
        <Field label="Max öğrenci" hint="0 = sınırsız">
          <Input name="maxStudents" type="number" min={0} defaultValue={0} />
        </Field>
      </FormDialog>
    </div>
  );
}
