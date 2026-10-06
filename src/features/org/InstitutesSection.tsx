"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getInstitutesQueryKey,
  useCreateInstitute,
  useDeleteInstitute,
  useInstitutes,
  useUpdateInstitute,
} from "@/src/api/generated/admin-companies/admin-companies";
import type { InstituteDto } from "@/src/api/generated/models";
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

const COLUMNS = ["Ad", "Kod", "Durum", ""];

export function InstitutesSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error, refetch } = useInstitutes(id);
  const rows = data?.data ?? [];
  const create = useCreateInstitute();
  const update = useUpdateInstitute();
  const remove = useDeleteInstitute();
  const queryClient = useQueryClient();
  // null: kapalı, "new": yeni kampüs, kayıt: düzenleme.
  const [editing, setEditing] = useState<InstituteDto | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name?: string } | null>(null);
  const current = editing && editing !== "new" ? editing : null;

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  const openNew = () => {
    setFormError(null);
    setEditing("new");
  };

  return (
    <div className="grid gap-4">
      <SectionTable
        toolbar={
          <SectionToolbar count={rows.length} noun="kampüs" loading={isLoading}>
            <Button size="sm" onClick={openNew}>
              Kampüs ekle
            </Button>
          </SectionToolbar>
        }
        loading={isLoading}
        empty="Henüz kampüs yok"
        emptyHint="Sınıflar, öğrenci kayıtları ve atamalar bir kampüse bağlanır. İlk kampüsü ekleyerek başlayın."
        emptyAction={<Button onClick={openNew}>İlk kampüsü ekle</Button>}
        columns={COLUMNS}
        rows={rows.map((r) => [
          r.name,
          r.code ? <span key="c" className="font-mono text-[13px]">{r.code}</span> : "—",
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : "neutral"} dot>
            {r.status === "ACTIVE" ? "Aktif" : "Pasif"}
          </Badge>,
          <div key="a" className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFormError(null);
                setEditing(r);
              }}
            >
              Düzenle
            </Button>
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => setPendingDelete({ id: r.id!, name: r.name })}>
              Sil
            </Button>
          </div>,
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
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? "Kampüsü düzenle" : "Kampüs ekle"}
        submitLabel={current ? "Kaydet" : "Ekle"}
        pending={create.isPending || update.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          const body = { name: String(fd.get("name") || "").trim(), code: String(fd.get("code") || "").trim() || undefined };
          try {
            if (current?.id) await update.mutateAsync({ id, iid: current.id, data: body });
            else await create.mutateAsync({ id, data: body });
            await queryClient.invalidateQueries({ queryKey: getInstitutesQueryKey(id) });
            setEditing(null);
            notify.success(current ? "Kampüs güncellendi" : "Kampüs eklendi");
          } catch (err) {
            const message = errorMessage(err, current ? "Kampüs güncellenemedi" : "Kampüs eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Ad" required>
          <Input name="name" required defaultValue={current?.name ?? ""} placeholder="Merkez Kampüs" />
        </Field>
        <Field label="Kod" hint="Kısa tanıtıcı; raporlarda ve dışa aktarımda görünür.">
          <Input name="code" defaultValue={current?.code ?? ""} placeholder="MRKZ" />
        </Field>
      </FormDialog>
    </div>
  );
}
