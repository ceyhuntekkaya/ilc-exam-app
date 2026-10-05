"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGradesQueryKey,
  useCreateGrade,
  useGrades,
} from "@/src/api/generated/admin-companies/admin-companies";
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

export function GradesSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error, refetch } = useGrades(id);
  const rows = data?.data ?? [];
  const create = useCreateGrade();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;
  if (isLoading) return <SectionTable flush loading empty="" columns={[{ label: "Sıra", align: "right" }, "Ad", "Durum"]} rows={[]} />;

  return (
    <div className="grid gap-4">
      <SectionToolbar count={rows.length} noun="seviye">
        <Button size="sm" onClick={() => setOpen(true)}>
          Seviye ekle
        </Button>
      </SectionToolbar>
      <SectionTable
        flush
        empty="Seviye yok"
        columns={[{ label: "Sıra", align: "right" }, "Ad", "Durum"]}
        rows={rows.map((r) => [
          String(r.levelOrder ?? ""),
          r.name,
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : "neutral"} dot>
            {r.status === "ACTIVE" ? "Aktif" : "Pasif"}
          </Badge>,
        ])}
      />
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Seviye ekle"
        submitLabel="Ekle"
        pending={create.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          try {
            await create.mutateAsync({
              id,
              data: {
                name: String(fd.get("name") || ""),
                levelOrder: Number(fd.get("levelOrder") || 0) || undefined,
              },
            });
            await queryClient.invalidateQueries({ queryKey: getGradesQueryKey(id) });
            setOpen(false);
            notify.success("Seviye eklendi");
          } catch (err) {
            const message = errorMessage(err, "Seviye eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Ad" required>
          <Input name="name" required />
        </Field>
        <Field label="Sıra">
          <Input name="levelOrder" type="number" min={1} />
        </Field>
      </FormDialog>
    </div>
  );
}
