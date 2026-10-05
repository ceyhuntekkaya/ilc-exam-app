"use client";

import {
  useBranches,
  useGrades,
  useInstitutes,
  useStudents,
  useYears,
} from "@/src/api/generated/admin-companies/admin-companies";
import { useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import {
  preview,
  useCreateAssignment,
  useOpen,
  useSetTargets,
} from "@/src/api/generated/assignment-controller/assignment-controller";
import { TargetRequestType } from "@/src/api/generated/models";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Button, Field, Input, Select, errorMessage } from "@/src/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function AssignWizard({ companyId, grantId }: { companyId: string; grantId: string }) {
  const router = useRouter();
  const hrefs = useOpsHref();
  const grants = useListGrants({ companyId }).data?.data ?? [];
  const grant = grants.find((row) => row.id === grantId) ?? null;
  const institutes = useInstitutes(companyId).data?.data ?? [];
  const years = useYears(companyId).data?.data ?? [];
  const grades = useGrades(companyId).data?.data ?? [];
  const branches = useBranches(companyId).data?.data ?? [];
  const students = useStudents(companyId).data?.data ?? [];
  const create = useCreateAssignment();
  const setTargets = useSetTargets();
  const openAssignment = useOpen();

  const [step, setStep] = useState(0);
  const [instituteId, setInstituteId] = useState("");
  const [yearId, setYearId] = useState(grant?.academicYearId ?? "");
  const [targetType, setTargetType] = useState<TargetRequestType>(TargetRequestType.CLASS);
  const [targetId, setTargetId] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [attempts, setAttempts] = useState(1);
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const studentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students) {
      if (student.id) map.set(student.id, `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim());
    }
    return map;
  }, [students]);

  async function prepare() {
    if (!grant?.examVersionId || !grant.id) return;
    setError(null);
    try {
      const season = yearId || grant.academicYearId;
      if (!season) return;
      const created = await create.mutateAsync({
        data: {
          companyId,
          instituteId,
          examVersionId: grant.examVersionId,
          examGrantId: grant.id,
          academicYearId: season,
          availableFrom: from ? new Date(from).toISOString() : undefined,
          availableUntil: until ? new Date(until).toISOString() : undefined,
          maxAttempts: attempts,
        },
      });
      const assignmentId = created.data.id;
      if (!assignmentId) throw new Error("Atama oluşturulamadı");
      await setTargets.mutateAsync({
        id: assignmentId,
        data: [{ type: targetType, targetId, exclude: false }],
      });
      const seen = await preview(assignmentId);
      setDraftId(assignmentId);
      setPreviewNames(
        (seen.data ?? []).map((row) => studentName.get(row.studentId ?? "") || row.studentId || "Öğrenci"),
      );
      setStep(3);
    } catch (err) {
      setError(errorMessage(err, "Atama açılamadı"));
    }
  }

  const targets =
    targetType === TargetRequestType.GRADE
      ? grades
      : targetType === TargetRequestType.STUDENT
        ? students.map((student) => ({
            id: student.id,
            name: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
          }))
        : branches;

  return (
    <section className="mx-auto grid max-w-3xl gap-4">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-ilc-navy">
        {grant?.examTitle ?? "Atama"}
      </h1>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {step === 0 ? (
        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2">
          <Field label="Kampüs">
            <Select value={instituteId} onChange={(e) => setInstituteId(e.target.value)}>
              <option value="">Seçin</option>
              {institutes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sezon">
            <Select value={yearId || grant?.academicYearId || ""} onChange={(e) => setYearId(e.target.value)}>
              {years.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" disabled={!instituteId || !(yearId || grant?.academicYearId)} onClick={() => setStep(1)}>
            Devam
          </Button>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4">
          <Field label="Hedef">
            <Select value={targetType} onChange={(e) => setTargetType(e.target.value as TargetRequestType)}>
              <option value={TargetRequestType.GRADE}>Seviye</option>
              <option value={TargetRequestType.CLASS}>Şube</option>
              <option value={TargetRequestType.STUDENT}>Öğrenci</option>
            </Select>
          </Field>
          <Field label="Kim">
            <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Seçin</option>
              {targets.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" disabled={!targetId} onClick={() => setStep(2)}>
            Devam
          </Button>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2">
          <Field label="Başlangıç">
            <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Bitiş">
            <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
          <Field label="Deneme hakkı">
            <Input type="number" min={1} value={attempts} onChange={(e) => setAttempts(Number(e.target.value))} />
          </Field>
          <Button type="button" onClick={() => void prepare()}>
            Önizle
          </Button>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-fg">{previewNames.length} öğrenci bu atamayı alacak.</p>
          <ul className="max-h-48 overflow-auto text-sm">
            {previewNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <Button
            type="button"
            disabled={!draftId || openAssignment.isPending}
            onClick={async () => {
              if (!draftId) return;
              await openAssignment.mutateAsync({ id: draftId });
              router.push(hrefs.assignments);
            }}
          >
            Atamayı aç
          </Button>
        </div>
      ) : null}
    </section>
  );
}
