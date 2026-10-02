"use client";

import { useListGrants, useListExams } from "@/src/api/generated/admin-exams/admin-exams";
import { useYears } from "@/src/api/generated/admin-companies/admin-companies";
import { useCreateGrant } from "@/src/api/generated/assignment-controller/assignment-controller";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { Badge, Button, ErrorState, Field, FormDialog, Input, SectionTable, Select } from "@/src/ui";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function CompanyGrantsPage() {
  return (
    <CompanyDetailFrame section="grants">
      <Body />
    </CompanyDetailFrame>
  );
}

function Body() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useListGrants({ companyId: id });
  const exams = useListExams({ status: "PUBLISHED" }).data?.data ?? [];
  const years = useYears(id).data?.data ?? [];
  const activeYear = years.find((y) => y.status === "ACTIVE");
  const rows = data?.data ?? [];
  const createGrant = useCreateGrant();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          Sınav hakkı ver
        </Button>
      </div>
      <SectionTable
        flush
        empty="Atanan sınav yok"
        emptyHint="Genel merkezden bu kuruma henüz sınav hakkı verilmemiş."
        columns={["Sınav", "Versiyon", "Geçerlilik", "Kota", ""]}
        rows={rows.map((r) => [
          <div key="t">
            <p className="font-medium">{r.examTitle ?? "—"}</p>
            <p className="text-xs text-fg-muted">{r.examCode}</p>
          </div>,
          r.examVersionNo != null ? `v${r.examVersionNo}` : "—",
          `${r.validFrom ? new Date(r.validFrom).toLocaleDateString("tr-TR") : "—"} → ${
            r.validUntil ? new Date(r.validUntil).toLocaleDateString("tr-TR") : "∞"
          }`,
          r.quota ?? "∞",
          r.mandatory ? (
            <Badge key="m" tone="warning" dot>
              Zorunlu
            </Badge>
          ) : (
            ""
          ),
        ])}
      />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sınav hakkı ver"
        submitLabel="Ver"
        pending={createGrant.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          try {
            await createGrant.mutateAsync({
              data: {
                companyId: id,
                examId: String(fd.get("examId") || ""),
                academicYearId: String(fd.get("academicYearId") || ""),
                validFrom: new Date(String(fd.get("validFrom") || "")).toISOString(),
                validUntil: fd.get("validUntil")
                  ? new Date(String(fd.get("validUntil"))).toISOString()
                  : undefined,
                quota: Number(fd.get("quota") || 0) || undefined,
                mandatory: fd.get("mandatory") === "on",
              },
            });
            await refetch();
            setOpen(false);
          } catch (err) {
            setFormError(err instanceof Error ? err.message : "Verilemedi");
          }
        }}
      >
        <Field label="Sınav" required>
          <Select name="examId" required>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sezon" required>
          <Select name="academicYearId" required defaultValue={activeYear?.id ?? ""}>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Geçerlilik başlangıç" required>
          <Input name="validFrom" type="datetime-local" required />
        </Field>
        <Field label="Geçerlilik bitiş">
          <Input name="validUntil" type="datetime-local" />
        </Field>
        <Field label="Kota" hint="Boş = sınırsız">
          <Input name="quota" type="number" min={1} />
        </Field>
        <label className="flex items-center gap-2 text-[13px] text-fg">
          <input type="checkbox" name="mandatory" />
          Zorunlu sınav
        </label>
      </FormDialog>
    </div>
  );
}
