"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGradesQueryKey,
  useCreateGrade,
  useGrades,
} from "@/src/api/generated/admin-companies/admin-companies";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { Badge, Button, ErrorState, Field, FormDialog, Input, SectionTable } from "@/src/ui";

export default function CompanyGradesPage() {
  return (
    <CompanyDetailFrame section="grades">
      <Body />
    </CompanyDetailFrame>
  );
}

function Body() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useGrades(id);
  const rows = data?.data ?? [];
  const create = useCreateGrade();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          Seviye ekle
        </Button>
      </div>
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
          } catch (err) {
            setFormError(err instanceof Error ? err.message : "Eklenemedi");
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
