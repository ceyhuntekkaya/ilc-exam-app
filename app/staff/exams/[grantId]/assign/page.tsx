"use client";

import { customInstance } from "@/src/api/mutator";
import { useAuth } from "@/src/components/auth-provider";
import { Button } from "@/src/ui/primitives/Button";
import { Field } from "@/src/ui/primitives/Field";
import { Select } from "@/src/ui/primitives/Select";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Named = { id: string; name: string };
type Student = { id: string; firstName: string; lastName: string };
type Licensed = { grantId: string; examVersionId: string; academicYearId: string; title: string };
type Directory = {
  institutes: Named[];
  years: Named[];
  grades: Named[];
  branches: Named[];
  students: Student[];
};

export default function AssignWizardPage() {
  const params = useParams<{ grantId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [grant, setGrant] = useState<Licensed | null>(null);
  const [step, setStep] = useState(0);
  const [instituteId, setInstituteId] = useState("");
  const [yearId, setYearId] = useState("");
  const [targetType, setTargetType] = useState("CLASS");
  const [targetId, setTargetId] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [attempts, setAttempts] = useState(1);
  const [preview, setPreview] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      customInstance<{ data: Directory }>("/my-company/directory"),
      customInstance<{ data: Licensed[] }>("/my-company/licensed-exams"),
    ]).then(([dir, exams]) => {
      setDirectory(dir.data);
      const found = exams.data.find((row) => row.grantId === params.grantId) ?? null;
      setGrant(found);
      setYearId(found?.academicYearId ?? "");
    }).catch((err: Error) => setError(err.message));
  }, [params.grantId]);

  async function prepare() {
    if (!grant || !directory) return;
    setError(null);
    try {
      const created = await customInstance<{ data: { id: string } }>("/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: user?.companyId,
          instituteId,
          examVersionId: grant.examVersionId,
          examGrantId: grant.grantId,
          academicYearId: yearId,
          availableFrom: from ? new Date(from).toISOString() : null,
          availableUntil: until ? new Date(until).toISOString() : null,
          maxAttempts: attempts,
        }),
      });
      // companyId is required. Read it from the first institute's company via a follow-up if missing.
      const assignmentId = created.data.id;
      await customInstance(`/assignments/${assignmentId}/targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ type: targetType, targetId, exclude: false }]),
      });
      const seen = await customInstance<{ data: { displayName?: string; studentId?: string }[] }>(
        `/assignments/${assignmentId}/preview`,
      );
      setDraftId(assignmentId);
      setPreview((seen.data ?? []).map((row) => row.displayName || row.studentId || "Öğrenci"));
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Atama açılamadı");
    }
  }

  const targets = targetType === "GRADE" ? directory?.grades : targetType === "STUDENT" ? [] : directory?.branches;

  return (
    <section className="mx-auto grid max-w-3xl gap-4">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-ilc-navy">
        {grant?.title ?? "Atama"}
      </h1>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {step === 0 ? (
        <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-ilc-line md:grid-cols-2">
          <Field label="Kampüs">
            <Select value={instituteId} onChange={(e) => setInstituteId(e.target.value)}>
              <option value="">Seçin</option>
              {directory?.institutes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
          <Field label="Sezon">
            <Select value={yearId} onChange={(e) => setYearId(e.target.value)}>
              {directory?.years.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
          <Button type="button" disabled={!instituteId || !yearId} onClick={() => setStep(1)}>Devam</Button>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-ilc-line">
          <Field label="Hedef">
            <Select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              <option value="GRADE">Seviye</option>
              <option value="CLASS">Şube</option>
              <option value="STUDENT">Öğrenci</option>
            </Select>
          </Field>
          <Field label="Kim">
            <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Seçin</option>
              {targetType === "STUDENT"
                ? directory?.students.map((row) => (
                    <option key={row.id} value={row.id}>{row.firstName} {row.lastName}</option>
                  ))
                : targets?.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
          <Button type="button" disabled={!targetId} onClick={() => setStep(2)}>Devam</Button>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-ilc-line md:grid-cols-2">
          <Field label="Başlangıç">
            <input className="min-h-11 rounded-md border px-3" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Bitiş">
            <input className="min-h-11 rounded-md border px-3" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
          <Field label="Deneme hakkı">
            <input className="min-h-11 rounded-md border px-3" type="number" min={1} value={attempts} onChange={(e) => setAttempts(Number(e.target.value))} />
          </Field>
          <Button type="button" onClick={prepare}>Önizle</Button>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-ilc-line">
          <p className="text-sm text-ilc-navy">{preview.length} öğrenci bu atamayı alacak.</p>
          <ul className="max-h-48 overflow-auto text-sm">
            {preview.map((name) => <li key={name}>{name}</li>)}
          </ul>
          <Button
            type="button"
            onClick={async () => {
              if (!draftId) return;
              await customInstance(`/assignments/${draftId}/open`, { method: "POST" });
              router.push("/staff/exams/assignments");
            }}
          >
            Atamayı aç
          </Button>
        </div>
      ) : null}
    </section>
  );
}
