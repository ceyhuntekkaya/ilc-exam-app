"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGradesQueryKey,
  useCreateGrade,
  useGrades,
  useUpdateGrade,
} from "@/src/api/generated/admin-companies/admin-companies";
import type { GradeDto } from "@/src/api/generated/models";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  FormDialog,
  Input,
  SectionTable,
  SectionToolbar,
  Select,
  errorMessage,
  notify,
} from "@/src/ui";

const COLUMNS = [{ label: "Sıra", align: "right" as const }, "Ad", "Durum", ""];

export function GradesSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error, refetch } = useGrades(id);
  // Sıra numarasına göre (sırasızlar sonda).
  const rows = [...(data?.data ?? [])].sort((a, b) => (a.levelOrder ?? 999) - (b.levelOrder ?? 999));
  const create = useCreateGrade();
  const update = useUpdateGrade();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<GradeDto | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const current = editing && editing !== "new" ? editing : null;
  const nextOrder = rows.reduce((max, r) => Math.max(max, r.levelOrder ?? 0), 0) + 1;

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  const openNew = () => {
    setFormError(null);
    setEditing("new");
  };

  return (
    <div className="grid gap-4">
      <SectionTable
        toolbar={
          <SectionToolbar count={rows.length} noun="seviye" loading={isLoading}>
            <Button size="sm" onClick={openNew}>
              Seviye ekle
            </Button>
          </SectionToolbar>
        }
        loading={isLoading}
        empty="Henüz seviye yok"
        emptyHint="Seviyeler (ör. 3. sınıf, 4. sınıf) sınıfları gruplar ve seviye bazında atama yapmayı sağlar."
        emptyAction={<Button onClick={openNew}>İlk seviyeyi ekle</Button>}
        columns={COLUMNS}
        rows={rows.map((r) => [
          r.levelOrder != null ? String(r.levelOrder) : "—",
          <span key="n" className="font-medium text-fg">{r.name}</span>,
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : "neutral"} dot>
            {r.status === "ACTIVE" ? "Aktif" : "Pasif"}
          </Badge>,
          <div key="a" className="flex justify-end">
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
          </div>,
        ])}
      />
      <FormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? "Seviyeyi düzenle" : "Seviye ekle"}
        submitLabel={current ? "Kaydet" : "Ekle"}
        pending={create.isPending || update.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          const name = String(fd.get("name") || "").trim();
          const levelOrder = Number(fd.get("levelOrder") || 0) || undefined;
          try {
            if (current?.id) {
              await update.mutateAsync({
                id,
                gid: current.id,
                data: { name, levelOrder, status: String(fd.get("status") || current.status) as "ACTIVE" | "PASSIVE" },
              });
            } else {
              await create.mutateAsync({ id, data: { name, levelOrder } });
            }
            await queryClient.invalidateQueries({ queryKey: getGradesQueryKey(id) });
            setEditing(null);
            notify.success(current ? "Seviye güncellendi" : "Seviye eklendi");
          } catch (err) {
            const message = errorMessage(err, current ? "Seviye güncellenemedi" : "Seviye eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <Field label="Ad" required>
            <Input name="name" required defaultValue={current?.name ?? ""} placeholder="4. sınıf" />
          </Field>
          <Field label="Sıra" hint="Listede sıralama.">
            <Input name="levelOrder" type="number" min={1} step={1} defaultValue={current?.levelOrder ?? (current ? undefined : nextOrder)} />
          </Field>
        </div>
        {current ? (
          <Field label="Durum" hint="Pasif seviye yeni sınıf ve kayıtlarda seçilemez.">
            <Select name="status" defaultValue={current.status ?? "ACTIVE"}>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
            </Select>
          </Field>
        ) : null}
      </FormDialog>
    </div>
  );
}
