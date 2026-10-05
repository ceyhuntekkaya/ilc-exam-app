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
  SectionToolbar,
  errorMessage,
  notify,
} from "@/src/ui";

export function YearsSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error, refetch } = useYears(id);
  const rows = data?.data ?? [];
  const create = useCreateYear();
  const activate = useActivateYear();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;
  if (isLoading) return <SectionTable flush loading empty="" columns={["Ad", "Dönem", "Durum", ""]} rows={[]} />;

  return (
    <div className="grid gap-4">
      <SectionToolbar count={rows.length} noun="sezon">
        <Button size="sm" onClick={() => setOpen(true)}>
          Sezon ekle
        </Button>
      </SectionToolbar>
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
          const __s = String(fd.get("startDate") || "");
          const __e = String(fd.get("endDate") || "");
          if (__s && __e && __e < __s) {
            setFormError("Sezon bitişi başlangıçtan önce olamaz.");
            return;
          }
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Başlangıç" required>
            <Input name="startDate" type="date" required />
          </Field>
          <Field label="Bitiş" required>
            <Input name="endDate" type="date" required />
          </Field>
        </div>
      </FormDialog>
    </div>
  );
}
