"use client";

import { useList } from "@/src/api/generated/admin-companies/admin-companies";
import { useYears } from "@/src/api/generated/admin-companies/admin-companies";
import { useListExams } from "@/src/api/generated/admin-exams/admin-exams";
import { useCreateGrant } from "@/src/api/generated/assignment-controller/assignment-controller";
import { useQueryClient } from "@tanstack/react-query";
import { getListGrantsQueryKey } from "@/src/api/generated/admin-exams/admin-exams";
import { Field, FormDialog, Input, Select, errorMessage, notify } from "@/src/ui";
import { useState } from "react";

export function GrantDialog({
  open,
  onClose,
  companyId: lockedCompanyId,
  examId: lockedExamId,
  onGranted,
}: {
  open: boolean;
  onClose: () => void;
  companyId?: string;
  examId?: string;
  onGranted?: (companyId: string) => void;
}) {
  const [companyId, setCompanyId] = useState(lockedCompanyId ?? "");
  const activeCompany = lockedCompanyId ?? companyId;
  const years = useYears(activeCompany, { query: { enabled: !!activeCompany } }).data?.data ?? [];
  const exams = useListExams(
    { status: "PUBLISHED" },
    { query: { enabled: open && !lockedExamId } },
  ).data?.data ?? [];
  const companies = useList(
    { size: 100 },
    { query: { enabled: open && !lockedCompanyId } },
  ).data?.data?.content ?? [];
  const createGrant = useCreateGrant();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const activeYear = years.find((year) => year.status === "ACTIVE");

  return (
    <FormDialog
      open={open}
      onClose={() => {
        setFormError(null);
        if (!lockedCompanyId) setCompanyId("");
        onClose();
      }}
      title="Sınav lisansı ver"
      submitLabel="Ver"
      pending={createGrant.isPending}
      error={formError}
      onSubmit={async (fd) => {
        const cid = lockedCompanyId ?? String(fd.get("companyId") || "");
        const examId = lockedExamId ?? String(fd.get("examId") || "");
        setFormError(null);
        const __s = String(fd.get("validFrom") || "");
        const __e = String(fd.get("validUntil") || "");
        if (__s && __e && __e < __s) {
          setFormError("Geçerlilik bitişi başlangıçtan önce olamaz.");
          return;
        }
        try {
          await createGrant.mutateAsync({
            data: {
              companyId: cid,
              examId,
              academicYearId: String(fd.get("academicYearId") || ""),
              validFrom: new Date(String(fd.get("validFrom") || "")).toISOString(),
              validUntil: fd.get("validUntil")
                ? new Date(String(fd.get("validUntil"))).toISOString()
                : undefined,
              mandatory: fd.get("mandatory") === "on",
            },
          });
          await queryClient.invalidateQueries({ queryKey: getListGrantsQueryKey({ companyId: cid }) });
          notify.success("Sınav lisansı verildi");
          onGranted?.(cid);
          onClose();
        } catch (err) {
          const message = errorMessage(err, "Sınav lisansı verilemedi");
          setFormError(message);
          notify.error(message);
        }
      }}
    >
      {lockedCompanyId ? null : (
        <Field label="Kurum" required>
          <Select name="companyId" required value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">Seçin…</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {lockedExamId ? null : (
        <Field label="Sınav" required>
          <Select name="examId" required>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title} ({exam.code})
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Sezon" required>
        <Select name="academicYearId" required defaultValue={activeYear?.id ?? ""} disabled={!activeCompany}>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Geçerlilik başlangıcı" required hint="Kurum bu tarihten itibaren sınavı atayabilir.">
        <Input name="validFrom" type="datetime-local" required />
      </Field>
      <Field label="Geçerlilik bitişi" hint="Boş = süresiz lisans.">
        <Input name="validUntil" type="datetime-local" />
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
        <input type="checkbox" name="mandatory" />
        Zorunlu sınav
      </label>
    </FormDialog>
  );
}
