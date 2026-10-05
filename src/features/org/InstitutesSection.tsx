"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getInstitutesQueryKey,
  useCreateInstitute,
  useDeleteInstitute,
  useInstitutes,
} from "@/src/api/generated/admin-companies/admin-companies";
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  FormDialog,
  Input,
  SectionTable,
  SectionToolbar,
  errorMessage,
  notify,
} from "@/src/ui";

export function InstitutesSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error, refetch } = useInstitutes(id);
  const rows = data?.data ?? [];
  const create = useCreateInstitute();
  const remove = useDeleteInstitute();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name?: string } | null>(null);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;
  if (isLoading) return <SectionTable flush loading empty="" columns={["Ad", "Kod", "Durum", ""]} rows={[]} />;

  return (
    <div className="grid gap-4">
      <SectionToolbar count={rows.length} noun="kampüs">
        <Button size="sm" onClick={() => setOpen(true)}>
          Kampüs ekle
        </Button>
      </SectionToolbar>
      <SectionTable
        flush
        empty="Kampüs yok"
        columns={["Ad", "Kod", "Durum", ""]}
        rows={rows.map((r) => [
          r.name,
          r.code || "—",
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : "neutral"} dot>
            {r.status === "ACTIVE" ? "Aktif" : "Pasif"}
          </Badge>,
          <Button key="d" size="sm" variant="danger" onClick={() => setPendingDelete({ id: r.id!, name: r.name })}>
            Sil
          </Button>,
        ])}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Kampüsü sil"
        description={`"${pendingDelete?.name ?? "Kampüs"}" silinecek. Bağlı sınıf ve kayıtlar etkilenebilir; bu işlem geri alınamaz.`}
        confirmLabel="Sil"
        tone="danger"
        pending={remove.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await remove.mutateAsync({ id, iid: pendingDelete.id });
            await queryClient.invalidateQueries({ queryKey: getInstitutesQueryKey(id) });
            notify.success("Kampüs silindi");
            setPendingDelete(null);
          } catch (err) {
            notify.error(errorMessage(err, "Kampüs silinemedi"));
          }
        }}
      />
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Kampüs ekle"
        submitLabel="Ekle"
        pending={create.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          try {
            await create.mutateAsync({
              id,
              data: { name: String(fd.get("name") || ""), code: String(fd.get("code") || "") || undefined },
            });
            await queryClient.invalidateQueries({ queryKey: getInstitutesQueryKey(id) });
            setOpen(false);
            notify.success("Kampüs eklendi");
          } catch (err) {
            const message = errorMessage(err, "Kampüs eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Ad" required>
          <Input name="name" required />
        </Field>
        <Field label="Kod">
          <Input name="code" />
        </Field>
      </FormDialog>
    </div>
  );
}
