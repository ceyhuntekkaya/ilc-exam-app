"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getInstitutesQueryKey,
  useCreateInstitute,
  useDeleteInstitute,
  useInstitutes,
} from "@/src/api/generated/admin-companies/admin-companies";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { Badge, Button, ErrorState, Field, FormDialog, Input, SectionTable } from "@/src/ui";

export default function CompanyInstitutesPage() {
  return (
    <CompanyDetailFrame section="institutes">
      <Body />
    </CompanyDetailFrame>
  );
}

function Body() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useInstitutes(id);
  const rows = data?.data ?? [];
  const create = useCreateInstitute();
  const remove = useDeleteInstitute();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          Kampüs ekle
        </Button>
      </div>
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
          <Button
            key="d"
            size="sm"
            variant="ghost"
            onClick={async () => {
              await remove.mutateAsync({ id, iid: r.id! });
              await queryClient.invalidateQueries({ queryKey: getInstitutesQueryKey(id) });
            }}
          >
            Sil
          </Button>,
        ])}
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
          } catch (err) {
            setFormError(err instanceof Error ? err.message : "Eklenemedi");
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
