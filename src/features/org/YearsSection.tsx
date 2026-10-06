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

const COLUMNS = ["Ad", "Dönem", "Durum", ""];

function formatDate(value?: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export function YearsSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error, refetch } = useYears(id);
  // En yeni sezon üstte.
  const rows = [...(data?.data ?? [])].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  const create = useCreateYear();
  const activate = useActivateYear();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [toActivate, setToActivate] = useState<{ id: string; name?: string } | null>(null);
  const active = rows.find((r) => r.status === "ACTIVE");
  const rangeError = start && end && end < start ? "Bitiş, başlangıçtan önce olamaz." : undefined;

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  const openNew = () => {
    setFormError(null);
    setStart("");
    setEnd("");
    setOpen(true);
  };

  return (
    <div className="grid gap-4">
      <SectionTable
        toolbar={
          <SectionToolbar count={rows.length} noun="sezon" loading={isLoading}>
            <Button size="sm" onClick={openNew}>
              Sezon ekle
            </Button>
          </SectionToolbar>
        }
        loading={isLoading}
        empty="Henüz sezon yok"
        emptyHint="Sezon (eğitim yılı) sınıfları ve öğrenci kayıtlarını gruplar. Sınıf eklemeden önce bir sezon oluşturup aktifleştirin."
        emptyAction={<Button onClick={openNew}>İlk sezonu ekle</Button>}
        columns={COLUMNS}
        rows={rows.map((r) => [
          r.name,
          <span key="d" className="whitespace-nowrap">
            {formatDate(r.startDate)} – {formatDate(r.endDate)}
          </span>,
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : r.status === "DRAFT" ? "info" : "neutral"} dot>
            {yearStatusLabel(r.status)}
          </Badge>,
          r.status === "DRAFT" ? (
            <Button key="a" size="sm" variant="secondary" onClick={() => setToActivate({ id: r.id!, name: r.name })}>
              Aktifleştir
            </Button>
          ) : (
            ""
          ),
        ])}
      />
      <ConfirmDialog
        open={toActivate !== null}
        onClose={() => setToActivate(null)}
        title="Sezon aktifleştirilsin mi?"
        tone="primary"
        confirmLabel="Aktifleştir"
        pending={activate.isPending}
        description={
          active
            ? `"${toActivate?.name}" aktif sezon olur; yeni öğrenci kayıtları ve sınıf listeleri varsayılan olarak bu sezonu kullanır. Şu an aktif olan "${active.name}" sezonu etkilenebilir.`
            : `"${toActivate?.name}" aktif sezon olur; yeni öğrenci kayıtları ve sınıf listeleri varsayılan olarak bu sezonu kullanır.`
        }
        onConfirm={async () => {
          if (!toActivate) return;
          try {
            await activate.mutateAsync({ id, yid: toActivate.id });
            await queryClient.invalidateQueries({ queryKey: getYearsQueryKey(id) });
            notify.success("Sezon aktifleştirildi");
            setToActivate(null);
          } catch (err) {
            notify.error(errorMessage(err, "Sezon aktifleştirilemedi"));
          }
        }}
      />
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sezon ekle"
        description="Yeni sezon taslak olarak eklenir; kullanmaya başlamak için listeden aktifleştirin."
        submitLabel="Ekle"
        pending={create.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          if (rangeError) {
            setFormError(rangeError);
            return;
          }
          try {
            await create.mutateAsync({
              id,
              data: { name: String(fd.get("name") || "").trim(), startDate: start, endDate: end },
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
          <Field label="Başlangıç" required hint="Eğitim yılının ilk günü.">
            <Input type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Bitiş" required error={rangeError}>
            <Input type="date" required min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      </FormDialog>
    </div>
  );
}
