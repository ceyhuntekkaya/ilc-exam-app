"use client";

import { useList } from "@/src/api/generated/admin-companies/admin-companies";
import { useListExams } from "@/src/api/generated/admin-exams/admin-exams";
import { useYears } from "@/src/api/generated/admin-companies/admin-companies";
import { useCreateGrant } from "@/src/api/generated/assignment-controller/assignment-controller";
import type { ExamSummaryDto } from "@/src/api/generated/models";
import { examStatusLabel } from "@/src/features/admin/labels";
import {
  Badge,
  Button,
  DataGrid,
  ErrorState,
  Field,
  FormDialog,
  Input,
  PageHeader,
  Select,
  errorMessage,
  notify,
  type GridColDef,
} from "@/src/ui";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminExamsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useListExams({ status: "PUBLISHED" });
  const rows = data?.data ?? [];
  const companies = useList({ size: 100 }).data?.data?.content ?? [];
  const createGrant = useCreateGrant();
  const [grantExam, setGrantExam] = useState<ExamSummaryDto | null>(null);
  const [companyId, setCompanyId] = useState("");
  const yearsQ = useYears(companyId, { query: { enabled: !!companyId } });
  const years = yearsQ.data?.data ?? [];
  const [formError, setFormError] = useState<string | null>(null);

  const columns = useMemo<GridColDef<ExamSummaryDto>[]>(
    () => [
      {
        field: "title",
        headerName: "Sınav",
        minWidth: 240,
        renderCell: ({ row }) => (
          <div>
            <p className="font-medium text-fg">{row.title}</p>
            <p className="text-xs text-fg-muted">
              {row.code} · v{row.versionNumber}
            </p>
          </div>
        ),
      },
      {
        field: "status",
        headerName: "Durum",
        width: 120,
        renderCell: ({ row }) => (
          <Badge tone="success" dot>
            {examStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        field: "purpose",
        headerName: "Amaç",
        width: 120,
        valueGetter: (_v, row) => row.purpose ?? "—",
      },
      {
        field: "actions",
        headerName: "",
        width: 140,
        renderCell: ({ row }) => (
          <Button size="sm" variant="secondary" onClick={() => setGrantExam(row)}>
            Lisans ver
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Sınavlar"
        description="Yayınlanmış katalog sınavlarını görüntüleyin ve okullara lisans verin."
        count={rows.length}
      />

      {isError ? (
        <ErrorState message={error instanceof Error ? error.message : "Liste yüklenemedi"} />
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id!}
            loading={isLoading}
            embedded
            emptyState={{
              title: "Yayınlı sınav yok",
              description: "Önce bir sınav yayınlanmalı.",
            }}
            hideFooter={rows.length <= 20}
          />
        </div>
      )}

      <FormDialog
        open={!!grantExam}
        onClose={() => {
          setGrantExam(null);
          setCompanyId("");
          setFormError(null);
        }}
        title="Okula sınav lisansı ver"
        description={grantExam ? `${grantExam.title} (${grantExam.code})` : undefined}
        submitLabel="Ver"
        pending={createGrant.isPending}
        error={formError}
        onSubmit={async (fd) => {
          if (!grantExam?.id) return;
          setFormError(null);
          try {
            const cid = String(fd.get("companyId") || "");
            await createGrant.mutateAsync({
              data: {
                companyId: cid,
                examId: grantExam.id,
                academicYearId: String(fd.get("academicYearId") || ""),
                validFrom: new Date(String(fd.get("validFrom") || "")).toISOString(),
                validUntil: fd.get("validUntil")
                  ? new Date(String(fd.get("validUntil"))).toISOString()
                  : undefined,
                mandatory: fd.get("mandatory") === "on",
              },
            });
            setGrantExam(null);
            notify.success("Sınav lisansı verildi");
            router.push(`/admin/companies/${cid}/grants`);
          } catch (err) {
            const message = errorMessage(err, "Sınav lisansı verilemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Kurum" required>
          <Select
            name="companyId"
            required
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">Seçin…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sezon" required>
          <Select name="academicYearId" required disabled={!companyId}>
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
        <label className="flex items-center gap-2 text-[13px] text-fg">
          <input type="checkbox" name="mandatory" />
          Zorunlu
        </label>
        {companyId ? (
          <p className="text-[13px] text-fg-muted">
            Detay:{" "}
            <Link className="text-primary underline" href={`/admin/companies/${companyId}/grants`}>
              kurum atanan sınavlar
            </Link>
          </p>
        ) : null}
      </FormDialog>
    </div>
  );
}
