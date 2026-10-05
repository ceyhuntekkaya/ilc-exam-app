"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getBranchesQueryKey,
  useBranches,
  useCreateBranch,
  useGrades,
  useInstitutes,
  useYears,
} from "@/src/api/generated/admin-companies/admin-companies";
import {
  Button,
  ErrorState,
  Field,
  FormDialog,
  Input,
  SectionTable,
  Select,
  errorMessage,
  notify,
} from "@/src/ui";

export function BranchesSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const yearsQ = useYears(id);
  const institutesQ = useInstitutes(id);
  const gradesQ = useGrades(id);
  const years = yearsQ.data?.data ?? [];
  const institutes = institutesQ.data?.data ?? [];
  const grades = gradesQ.data?.data ?? [];
  const activeYear = years.find((y) => y.status === "ACTIVE") ?? years[0];
  const [yearId, setYearId] = useState<string | undefined>(undefined);
  const selectedYear = yearId ?? activeYear?.id;

  const { data, isLoading, isError, error } = useBranches(id, { academicYearId: selectedYear }, {
    query: { enabled: !!selectedYear },
  });
  const rows = data?.data ?? [];
  const create = useCreateBranch();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const instituteName = useMemo(
    () => Object.fromEntries(institutes.map((i) => [i.id!, i.name ?? ""])),
    [institutes],
  );
  const gradeName = useMemo(
    () => Object.fromEntries(grades.map((g) => [g.id!, g.name ?? ""])),
    [grades],
  );

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Sezon">
          <Select
            value={selectedYear ?? ""}
            onChange={(e) => setYearId(e.target.value || undefined)}
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!selectedYear}>
          Sınıf ekle
        </Button>
      </div>

      {isLoading || !selectedYear ? (
        <div className="h-24 animate-pulse rounded-md bg-neutral-100" />
      ) : (
        <SectionTable
          flush
          empty="Sınıf yok"
          columns={["Ad", "Kampüs", "Seviye"]}
          rows={rows.map((r) => [
            r.name,
            instituteName[r.instituteId!] ?? r.instituteId,
            gradeName[r.gradeId!] ?? r.gradeId,
          ])}
        />
      )}

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sınıf ekle"
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
                instituteId: String(fd.get("instituteId") || ""),
                academicYearId: selectedYear!,
                gradeId: String(fd.get("gradeId") || ""),
              },
            });
            await queryClient.invalidateQueries({
              queryKey: getBranchesQueryKey(id, { academicYearId: selectedYear }),
            });
            setOpen(false);
            notify.success("Sınıf eklendi");
          } catch (err) {
            const message = errorMessage(err, "Sınıf eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Ad" required>
          <Input name="name" required placeholder="4-A" />
        </Field>
        <Field label="Kampüs" required>
          <Select name="instituteId" required>
            {institutes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seviye" required>
          <Select name="gradeId" required>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormDialog>
    </div>
  );
}
