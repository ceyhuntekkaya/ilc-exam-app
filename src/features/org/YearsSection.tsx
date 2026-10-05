"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getYearsQueryKey,
  useActivateYear,
  useCreateYear,
  useYears,
} from "@/src/api/generated/admin-companies/admin-companies";
import { yearStatusLabel } from "@/src/features/admin/labels";
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

export function YearsSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error } = useYears(id);
  const rows = data?.data ?? [];
  const create = useCreateYear();
  const activate = useActivateYear();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          Sezon ekle
        </Button>
      </div>
      <SectionTable
        flush
        empty="Sezon yok"
        columns={["Ad", "Dönem", "Durum", ""]}
        rows={rows.map((r) => [
          r.name,
          `${r.startDate ?? "—"} → ${r.endDate ?? "—"}`,
          <Badge
            key="s"
            tone={r.status === "ACTIVE" ? "success" : r.status === "DRAFT" ? "info" : "neutral"}
            dot
          >
            {yearStatusLabel(r.status)}
          </Badge>,
          r.status === "DRAFT" ? (
            <Button
              key="a"
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await activate.mutateAsync({ id, yid: r.id! });
                  await queryClient.invalidateQueries({ queryKey: getYearsQueryKey(id) });
                  notify.success("Sezon aktifleştirildi");
                } catch (err) {
                  notify.error(errorMessage(err, "Sezon aktifleştirilemedi"));
                }
              }}
            >
              Aktifleştir
            </Button>
          ) : (
            ""
          ),
        ])}
      />
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sezon ekle"
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
                startDate: String(fd.get("startDate") || ""),
                endDate: String(fd.get("endDate") || ""),
              },
            });
            await queryClient.invalidateQueries({ queryKey: getYearsQueryKey(id) });
            setOpen(false);
            notify.success("Sezon eklendi");
          } catch (err) {
            const message = errorMessage(err, "Sezon eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Ad" required>
          <Input name="name" required placeholder="2026-2027" />
        </Field>
        <Field label="Başlangıç" required>
          <Input name="startDate" type="date" required />
        </Field>
        <Field label="Bitiş" required>
          <Input name="endDate" type="date" required />
        </Field>
      </FormDialog>
    </div>
  );
}
