"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getStudentsQueryKey,
  useCreateStudent,
  useGrades,
  useInstitutes,
  useStudents,
  useYears,
} from "@/src/api/generated/admin-companies/admin-companies";
import { userStatusLabel } from "@/src/features/admin/labels";
import {
  Badge,
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

export function StudentsSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error } = useStudents(id);
  const years = useYears(id).data?.data ?? [];
  const institutes = useInstitutes(id).data?.data ?? [];
  const grades = useGrades(id).data?.data ?? [];
  const activeYear = years.find((y) => y.status === "ACTIVE");
  const rows = data?.data ?? [];
  const create = useCreateStudent();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          Öğrenci ekle
        </Button>
      </div>
      <SectionTable
        flush
        empty="Öğrenci yok"
        columns={["Ad", "No", "Kullanıcı", "Durum", "Kayıtlar"]}
        rows={rows.map((r) => [
          `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
          r.studentNumber || "—",
          r.username,
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : "warning"} dot>
            {userStatusLabel(r.status)}
          </Badge>,
          String(r.enrollments?.length ?? 0),
        ])}
      />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Öğrenci ekle"
        submitLabel="Ekle"
        pending={create.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          try {
            await create.mutateAsync({
              id,
              data: {
                username: String(fd.get("username") || ""),
                firstName: String(fd.get("firstName") || ""),
                lastName: String(fd.get("lastName") || ""),
                studentNumber: String(fd.get("studentNumber") || ""),
                academicYearId: String(fd.get("academicYearId") || "") || undefined,
                instituteId: String(fd.get("instituteId") || "") || undefined,
                gradeId: String(fd.get("gradeId") || "") || undefined,
              },
            });
            await queryClient.invalidateQueries({ queryKey: getStudentsQueryKey(id) });
            setOpen(false);
            notify.success("Öğrenci eklendi");
          } catch (err) {
            const message = errorMessage(err, "Öğrenci eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Kullanıcı adı" required>
          <Input name="username" required />
        </Field>
        <Field label="Öğrenci no" required>
          <Input name="studentNumber" required />
        </Field>
        <Field label="Ad" required>
          <Input name="firstName" required />
        </Field>
        <Field label="Soyad" required>
          <Input name="lastName" required />
        </Field>
        <Field label="Sezon">
          <Select name="academicYearId" defaultValue={activeYear?.id ?? ""}>
            <option value="">—</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kampüs">
          <Select name="instituteId">
            <option value="">—</option>
            {institutes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seviye">
          <Select name="gradeId">
            <option value="">—</option>
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
