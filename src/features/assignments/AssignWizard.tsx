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
import { FormGroup } from "@/src/features/authoring/shared/FormGroup";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormCard,
  IconCheck,
  Input,
  PageHeader,
  Select,
  Skeleton,
  errorMessage,
  notify,
} from "@/src/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const STEPS = [
  { title: "Kampüs ve sezon", hint: "Atamanın yapılacağı yer" },
  { title: "Hedef", hint: "Seviye, sınıf ya da öğrenci" },
  { title: "Zaman ve hak", hint: "Açılış, kapanış, deneme" },
  { title: "Önizle ve aç", hint: "Kimler alacak" },
];

const TARGET_LABEL: Record<TargetRequestType, string> = {
  [TargetRequestType.GRADE]: "Seviye",
  [TargetRequestType.CLASS]: "Sınıf",
  [TargetRequestType.STUDENT]: "Öğrenci",
};

const TARGET_HINT: Record<TargetRequestType, string> = {
  [TargetRequestType.GRADE]: "Seviyedeki tüm sınıflar ve öğrenciler.",
  [TargetRequestType.CLASS]: "Yalnız seçilen sınıfın öğrencileri.",
  [TargetRequestType.STUDENT]: "Tek öğrenci (telafi, ek oturum).",
};

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export function AssignWizard({ companyId, grantId }: { companyId: string; grantId: string }) {
  const router = useRouter();
  const hrefs = useOpsHref();
  const grantsQ = useListGrants({ companyId });
  const grant = (grantsQ.data?.data ?? []).find((row) => row.id === grantId) ?? null;
  const institutes = useInstitutes(companyId).data?.data ?? [];
  const years = useYears(companyId).data?.data ?? [];
  const grades = useGrades(companyId).data?.data ?? [];
  const branches = useBranches(companyId).data?.data ?? [];
  const studentsData = useStudents(companyId).data;
  const students = useMemo(() => studentsData?.data ?? [], [studentsData]);
  const create = useCreateAssignment();
  const setTargets = useSetTargets();
  const openAssignment = useOpen();

  const [step, setStep] = useState(1);
  const [instituteId, setInstituteId] = useState("");
  const [yearId, setYearId] = useState("");
  const [targetType, setTargetType] = useState<TargetRequestType>(TargetRequestType.CLASS);
  const [targetId, setTargetId] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [attempts, setAttempts] = useState(1);
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const season = yearId || grant?.academicYearId || "";

  const studentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students) {
      if (student.id) map.set(student.id, `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim());
    }
    return map;
  }, [students]);

  const targets: { id?: string; name?: string }[] =
    targetType === TargetRequestType.GRADE
      ? grades
      : targetType === TargetRequestType.STUDENT
        ? students.map((student) => ({ id: student.id, name: studentName.get(student.id ?? "") }))
        : // Sınıf listesi seçilen kampüsle sınırlı (kampüssüz kayıtlar her zaman görünür).
          branches.filter((row) => !row.instituteId || row.instituteId === instituteId);

  const rangeError = from && until && until < from ? "Kapanış, açılıştan önce olamaz." : null;
  const attemptsError = !Number.isFinite(attempts) || attempts < 1 ? "En az 1 deneme hakkı olmalı." : null;
  const stepValid =
    step === 1 ? Boolean(instituteId && season) : step === 2 ? Boolean(targetId) : step === 3 ? !rangeError && !attemptsError : true;

  async function prepare() {
    if (!grant?.examVersionId || !grant.id || !season) return;
    setError(null);
    setPreparing(true);
    try {
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
      setStep(4);
    } catch (err) {
      setError(errorMessage(err, "Atama hazırlanamadı"));
    } finally {
      setPreparing(false);
    }
  }

  async function openNow() {
    if (!draftId) return;
    setError(null);
    try {
      await openAssignment.mutateAsync({ id: draftId });
      notify.success("Atama açıldı");
      router.push(hrefs.assignments);
    } catch (err) {
      setError(errorMessage(err, "Atama açılamadı"));
    }
  }

  const back = { href: hrefs.licensed, label: "Lisanslı sınavlar" };

  if (grantsQ.isError) {
    return (
      <div>
        <PageHeader title="Atama aç" back={back} />
        <ErrorState error={grantsQ.error} onRetry={() => void grantsQ.refetch()} />
      </div>
    );
  }
  if (grantsQ.isLoading) {
    return (
      <div className="grid gap-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (!grant) {
    return (
      <div>
        <PageHeader title="Atama aç" back={back} />
        <EmptyState title="Lisans bulunamadı" description="Bu lisans kaldırılmış ya da kurumunuza ait değil. Lisanslı sınavlar listesinden yeniden seçin." />
      </div>
    );
  }

  const instituteName = institutes.find((row) => row.id === instituteId)?.name ?? "—";
  const yearName = years.find((row) => row.id === season)?.name ?? "—";
  const targetName = targets.find((row) => row.id === targetId)?.name ?? "—";

  return (
    <div className="@container space-y-5">
      <PageHeader
        title={grant.examTitle ?? "Atama aç"}
        description="Dört adımda sınavı kimin, ne zaman ve kaç denemeyle alacağını belirleyin. Açmadan önce öğrenci listesini görürsünüz."
        back={back}
      />

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Adımlar">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const state = n === step ? "current" : n < step ? "done" : "todo";
          return (
            <li
              key={s.title}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                state === "current" ? "border-primary-200 bg-primary-50/60" : "border-border bg-surface"
              }`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === "done" ? "bg-success text-white" : state === "current" ? "bg-primary text-white" : "bg-neutral-100 text-fg-subtle"
                }`}
              >
                {state === "done" ? <IconCheck className="size-3.5" aria-hidden /> : n}
              </span>
              <span className="min-w-0">
                <span className={`block text-[13px] font-semibold ${state === "todo" ? "text-fg-muted" : "text-fg"}`}>{s.title}</span>
                <span className="block text-xs text-fg-subtle">{s.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid items-start gap-5 @min-[60rem]:grid-cols-[minmax(0,1fr)_19rem] @min-[80rem]:grid-cols-[minmax(0,1fr)_22rem]">
      <FormCard
        className="@container/form"
        title={STEPS[step - 1].title}
        description={STEPS[step - 1].hint}
        footer={
          <>
            {step < 4 ? (
              <Button type="button" variant="ghost" className="sm:mr-auto" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
                ← Geri
              </Button>
            ) : (
              <p className="text-[13px] text-fg-subtle sm:mr-auto">Taslak oluşturuldu; açana kadar öğrenciler görmez.</p>
            )}
            {step < 3 ? (
              <Button type="button" disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
                Devam et →
              </Button>
            ) : step === 3 ? (
              <Button type="button" loading={preparing} disabled={!stepValid || preparing} onClick={() => void prepare()}>
                Önizle
              </Button>
            ) : (
              <Button type="button" loading={openAssignment.isPending} disabled={!draftId || previewNames.length === 0} onClick={() => void openNow()}>
                Atamayı aç
              </Button>
            )}
          </>
        }
      >
        {step === 1 ? (
          <div className="grid gap-4 @min-[28rem]/form:grid-cols-2">
            <Field label="Kampüs" required>
              <Select
                value={instituteId}
                onChange={(e) => {
                  setInstituteId(e.target.value);
                  setTargetId("");
                }}
              >
                <option value="">Seçin</option>
                {institutes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sezon" required hint={grant.academicYearId ? "Lisansın sezonu varsayılan olarak seçili." : undefined}>
              <Select value={season} onChange={(e) => setYearId(e.target.value)}>
                <option value="">Seçin</option>
                {years.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <fieldset className="grid gap-2 @min-[36rem]/form:grid-cols-3">
              <legend className="sr-only">Hedef türü</legend>
              {(Object.keys(TARGET_LABEL) as TargetRequestType[]).map((type) => {
                const selected = targetType === type;
                return (
                  <label
                    key={type}
                    className={`flex min-h-11 cursor-pointer flex-col rounded-xl border p-3 transition-colors ${
                      selected ? "border-primary-300 bg-primary-50/60 ring-1 ring-primary-200" : "border-border bg-surface hover:border-border-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      value={type}
                      checked={selected}
                      onChange={() => {
                        setTargetType(type);
                        setTargetId("");
                      }}
                      className="sr-only"
                    />
                    <span className={`text-sm font-semibold ${selected ? "text-primary" : "text-fg"}`}>{TARGET_LABEL[type]}</span>
                    <span className="mt-0.5 text-xs text-fg-subtle">{TARGET_HINT[type]}</span>
                  </label>
                );
              })}
            </fieldset>
            <Field
              label={TARGET_LABEL[targetType]}
              required
              hint={targets.length === 0 ? "Bu kampüste seçilebilecek kayıt yok. Kurum ayarlarından ekleyin." : undefined}
            >
              <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Seçin</option>
                {targets.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name || "—"}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <FormGroup title="Sınav penceresi" hint="Boş bırakılırsa atama açıldığı andan kapatılana kadar girilebilir.">
              <div className="grid gap-4 @min-[28rem]/form:grid-cols-2">
                <Field label="Açılış" hint="Öğrenciler bu andan itibaren girebilir.">
                  <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="Kapanış" hint={rangeError ? undefined : "Bu andan sonra yeni giriş yapılamaz."} error={rangeError ?? undefined}>
                  <Input type="datetime-local" min={from || undefined} value={until} onChange={(e) => setUntil(e.target.value)} />
                </Field>
              </div>
            </FormGroup>
            <FormGroup title="Deneme">
              <div className="grid gap-4 @min-[28rem]/form:grid-cols-2">
                <Field label="Deneme hakkı" hint="Öğrencinin sınava kaç kez başlayabileceği." error={attemptsError ?? undefined}>
                  <Input type="number" min={1} max={10} step={1} suffix="hak" value={attempts} onChange={(e) => setAttempts(Number(e.target.value))} />
                </Field>
              </div>
            </FormGroup>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <div className="rounded-lg border border-border">
              <p className="border-b border-border bg-neutral-50/60 px-3.5 py-2 text-[13px] text-fg-muted">
                <span className="numeric font-semibold text-fg">{previewNames.length.toLocaleString("tr-TR")}</span> öğrenci bu atamayı alacak
              </p>
              {previewNames.length === 0 ? (
                <p className="px-3.5 py-4 text-sm text-fg-muted">Hedefte öğrenci yok. Hedefi değiştirmek için yeni atama başlatın.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-border overflow-auto text-sm">
                  {previewNames.map((name, i) => (
                    <li key={`${name}-${i}`} className="px-3.5 py-2">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </FormCard>

      {/* Canlı özet: seçimler her adımda görünür; dar alanda formun altına iner. */}
      <aside aria-label="Atama özeti" className="rounded-xl border border-border bg-surface shadow-sm @min-[60rem]:sticky @min-[60rem]:top-20">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold text-fg">Atama özeti</h2>
          <p className="text-xs text-fg-subtle">Açmadan önce öğrenci listesini görürsünüz.</p>
        </header>
        <dl className="divide-y divide-border text-[13px]">
          {[
            { k: "Sınav", v: grant.examTitle ?? "—" },
            { k: "Kampüs", v: instituteId ? instituteName : "—" },
            { k: "Sezon", v: season ? yearName : "—" },
            { k: TARGET_LABEL[targetType], v: targetId ? targetName : "—" },
            { k: "Açılış", v: from ? formatDateTime(from) : "Hemen" },
            { k: "Kapanış", v: until ? formatDateTime(until) : "Kapatılana kadar" },
            { k: "Deneme hakkı", v: String(attempts) },
          ].map((row) => (
            <div key={row.k} className="flex items-baseline justify-between gap-3 px-4 py-2">
              <dt className="shrink-0 text-fg-subtle">{row.k}</dt>
              <dd className="min-w-0 truncate text-right font-medium text-fg">{row.v}</dd>
            </div>
          ))}
        </dl>
      </aside>
      </div>
    </div>
  );
}
