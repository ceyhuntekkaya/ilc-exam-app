"use client";

import { useBranches, useGrades, useInstitutes, useYears } from "@/src/api/generated/admin-companies/admin-companies";
import { useListAssignments, useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { customInstance } from "@/src/api/mutator";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, ButtonLink, ErrorState, Field, FormCard, SectionTable, SectionToolbar, Select, Skeleton } from "@/src/ui";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Phase = "NONE" | "ASSIGNED" | "IN_PROGRESS" | "FINISHED" | "EVALUATED" | "ABSENT";

type RosterRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  assignmentId?: string | null;
  recipientId?: string | null;
  phase: Phase;
};

const COLUMNS = ["Öğrenci", "Durum", "Tarih", ""];

const PHASE: Record<Exclude<Phase, "NONE">, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  ASSIGNED: { label: "Atandı", tone: "neutral" },
  IN_PROGRESS: { label: "Devam Ediyor", tone: "info" },
  FINISHED: { label: "Bitti", tone: "warning" },
  EVALUATED: { label: "Değerlendirildi", tone: "success" },
  ABSENT: { label: "Girmedi", tone: "danger" },
};

function byTr(a: string, b: string) {
  return a.localeCompare(b, "tr");
}

function formatWindow(from?: string | null, until?: string | null) {
  const stamp = (value?: string | null) =>
    value ? new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : null;
  const start = stamp(from);
  const end = stamp(until);
  if (!start && !end) return "Süresiz";
  return `${start ?? "Hemen"} → ${end ?? "Kapatılana kadar"}`;
}

type RosterFilters = {
  instituteId: string;
  yearId: string;
  examVersionId: string;
  gradeId: string;
  branchId: string;
};

const FILTER_KEYS = ["instituteId", "yearId", "examVersionId", "gradeId", "branchId"] as const;

function filtersFromQuery(query: string): RosterFilters {
  const params = new URLSearchParams(query);
  return {
    instituteId: params.get("instituteId") ?? "",
    yearId: params.get("yearId") ?? "",
    examVersionId: params.get("examVersionId") ?? "",
    gradeId: params.get("gradeId") ?? "",
    branchId: params.get("branchId") ?? "",
  };
}

function filtersToQuery(filters: RosterFilters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key]) params.set(key, filters[key]);
  }
  return params;
}

/**
 * Atama listesi: kampüs ve sezon yalnızca birden fazlaysa seçilir.
 * Sınav (o sezonda ataması olanlar) → seviye → sınıf, ardından şubedeki tüm öğrenciler.
 */
export function AssignmentRosterSection({ companyId }: { companyId: string }) {
  const hrefs = useOpsHref();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const institutesQ = useInstitutes(companyId);
  const yearsQ = useYears(companyId);
  const gradesQ = useGrades(companyId);
  const branchesQ = useBranches(companyId);
  const assignmentsQ = useListAssignments({ companyId });
  const grantsQ = useListGrants({ companyId });

  const [filters, setFilters] = useState<RosterFilters>(() => filtersFromQuery(query));
  const { instituteId, yearId, examVersionId, gradeId, branchId } = filters;

  useEffect(() => {
    setFilters((current) => {
      const next = filtersFromQuery(query);
      return FILTER_KEYS.every((key) => current[key] === next[key]) ? current : next;
    });
  }, [query]);

  function writeFilters(next: RosterFilters) {
    setFilters(next);
    const qs = filtersToQuery(next).toString();
    if (qs === query) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const institutes = useMemo(() => institutesQ.data?.data ?? [], [institutesQ.data]);
  const years = useMemo(() => yearsQ.data?.data ?? [], [yearsQ.data]);
  const grades = useMemo(
    () => [...(gradesQ.data?.data ?? [])].filter((row) => row.status !== "PASSIVE"),
    [gradesQ.data],
  );
  const branches = useMemo(() => branchesQ.data?.data ?? [], [branchesQ.data]);
  const assignments = useMemo(() => assignmentsQ.data?.data ?? [], [assignmentsQ.data]);
  const grants = useMemo(() => grantsQ.data?.data ?? [], [grantsQ.data]);

  const showCampus = institutes.length > 1;
  const campusId = institutes.length === 1 ? (institutes[0]?.id ?? "") : instituteId;

  const seasonOptions = useMemo(() => {
    if (!campusId) return [];
    const ids = new Set<string>();
    for (const branch of branches) {
      if (branch.instituteId === campusId && branch.academicYearId) ids.add(branch.academicYearId);
    }
    for (const row of assignments) {
      if (row.instituteId === campusId && row.academicYearId && row.status !== "DRAFT") ids.add(row.academicYearId);
    }
    const matched = years.filter((year) => year.id && ids.has(year.id));
    const source = matched.length > 0 ? matched : years;
    return [...source].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  }, [campusId, branches, assignments, years]);

  const showSeason = Boolean(campusId) && seasonOptions.length > 1;
  const seasonId =
    seasonOptions.length === 1
      ? (seasonOptions[0]?.id ?? "")
      : seasonOptions.some((year) => year.id === yearId)
        ? yearId
        : "";

  const exams = useMemo(() => {
    if (!campusId || !seasonId) return [];
    const seen = new Map<string, string>();
    for (const row of assignments) {
      if (row.instituteId !== campusId || row.academicYearId !== seasonId || row.status === "DRAFT" || !row.examVersionId) {
        continue;
      }
      if (seen.has(row.examVersionId)) continue;
      const titled =
        grants.find((grant) => grant.examVersionId === row.examVersionId && grant.academicYearId === seasonId)?.examTitle ??
        grants.find((grant) => grant.examVersionId === row.examVersionId)?.examTitle ??
        "Sınav";
      seen.set(row.examVersionId, titled);
    }
    return [...seen.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => byTr(a.title, b.title));
  }, [assignments, grants, campusId, seasonId]);

  const examValue = exams.some((exam) => exam.id === examVersionId) ? examVersionId : "";

  const gradeOptions = useMemo(() => {
    if (!campusId || !seasonId) return [];
    const ids = new Set(
      branches
        .filter((branch) => branch.instituteId === campusId && branch.academicYearId === seasonId && branch.gradeId)
        .map((branch) => branch.gradeId as string),
    );
    return grades
      .filter((grade) => grade.id && ids.has(grade.id))
      .sort((a, b) => (a.levelOrder ?? 999) - (b.levelOrder ?? 999) || byTr(a.name ?? "", b.name ?? ""));
  }, [branches, grades, campusId, seasonId]);

  const gradeValue = gradeOptions.some((grade) => grade.id === gradeId) ? gradeId : "";

  const branchOptions = useMemo(() => {
    if (!campusId || !seasonId || !gradeValue) return [];
    return branches
      .filter(
        (branch) =>
          branch.instituteId === campusId && branch.academicYearId === seasonId && branch.gradeId === gradeValue && branch.id,
      )
      .sort((a, b) => byTr(a.name ?? "", b.name ?? ""));
  }, [branches, campusId, seasonId, gradeValue]);

  const branchValue = branchOptions.some((branch) => branch.id === branchId) ? branchId : "";

  const rosterQ = useQuery({
    queryKey: ["assignment-roster", companyId, campusId, seasonId, examValue, branchValue],
    enabled: Boolean(campusId && seasonId && examValue && branchValue),
    queryFn: () => {
      const params = new URLSearchParams({
        companyId,
        instituteId: campusId,
        academicYearId: seasonId,
        examVersionId: examValue,
        branchId: branchValue,
      });
      return customInstance<{ data: RosterRow[] }>(`/assignments/roster?${params.toString()}`);
    },
  });

  const rows = rosterQ.data?.data ?? [];
  const gradingId = (() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.phase !== "FINISHED" || !row.assignmentId) continue;
      counts.set(row.assignmentId, (counts.get(row.assignmentId) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  })();

  const listError = institutesQ.error ?? yearsQ.error ?? gradesQ.error ?? branchesQ.error ?? assignmentsQ.error ?? grantsQ.error;
  const listLoading =
    institutesQ.isLoading || yearsQ.isLoading || gradesQ.isLoading || branchesQ.isLoading || assignmentsQ.isLoading || grantsQ.isLoading;

  if (institutesQ.isError || yearsQ.isError || gradesQ.isError || branchesQ.isError || assignmentsQ.isError || grantsQ.isError) {
    return (
      <ErrorState
        error={listError}
        onRetry={() => {
          void institutesQ.refetch();
          void yearsQ.refetch();
          void gradesQ.refetch();
          void branchesQ.refetch();
          void assignmentsQ.refetch();
          void grantsQ.refetch();
        }}
        compact
      />
    );
  }

  const ready = Boolean(campusId && seasonId && examValue && branchValue);
  const listQuery = filtersToQuery(filters).toString();
  const returnTo = listQuery ? `${pathname}?${listQuery}` : pathname;
  const waiting =
    campusId && seasonId && exams.length === 0
      ? { title: "Bu sezonda ataması olan sınav yok", hint: "Başka bir sezon seçin ya da lisanslı sınavlardan yeni bir atama açın." }
      : examValue && gradeValue && branchOptions.length === 0
        ? { title: "Bu seviyede şube yok", hint: "Başka bir seviye seçin." }
        : { title: "Öğrenciler burada listelenir", hint: "Sınav, seviye ve şubeyi seçince şubedeki öğrencilerin durumu görünür." };

  return (
    <div className="grid gap-4">
      <FormCard title="Filtre" description="Sınav, seviye ve şubeyi seçin. Liste seçime göre dolar.">
        {listLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showCampus ? (
              <Field label="Kampüs" required>
                <Select
                  value={campusId}
                  onChange={(e) =>
                    writeFilters({
                      instituteId: e.target.value,
                      yearId: "",
                      examVersionId: "",
                      gradeId: "",
                      branchId: "",
                    })
                  }
                >
                  <option value="">Seçin</option>
                  {institutes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            {showSeason ? (
              <Field label="Sezon" required>
                <Select
                  value={seasonId}
                  onChange={(e) =>
                    writeFilters({
                      instituteId: campusId,
                      yearId: e.target.value,
                      examVersionId: "",
                      gradeId: "",
                      branchId: "",
                    })
                  }
                >
                  <option value="">Seçin</option>
                  {seasonOptions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label="Sınav" required>
              <Select
                value={examValue}
                disabled={!campusId || !seasonId || exams.length === 0}
                onChange={(e) =>
                  writeFilters({
                    instituteId: campusId,
                    yearId: seasonId,
                    examVersionId: e.target.value,
                    gradeId: "",
                    branchId: "",
                  })
                }
              >
                <option value="">Seçin</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seviye" required>
              <Select
                value={gradeValue}
                disabled={!examValue || gradeOptions.length === 0}
                onChange={(e) =>
                  writeFilters({
                    instituteId: campusId,
                    yearId: seasonId,
                    examVersionId,
                    gradeId: e.target.value,
                    branchId: "",
                  })
                }
              >
                <option value="">Seçin</option>
                {gradeOptions.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Şube" required>
              <Select
                value={branchValue}
                disabled={!gradeValue || branchOptions.length === 0}
                onChange={(e) =>
                  writeFilters({
                    instituteId: campusId,
                    yearId: seasonId,
                    examVersionId,
                    gradeId,
                    branchId: e.target.value,
                  })
                }
              >
                <option value="">Seçin</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </FormCard>

      {listLoading ? (
        <SectionTable loading columns={COLUMNS} rows={[]} empty="" />
      ) : !ready ? (
        <SectionTable columns={COLUMNS} rows={[]} empty={waiting.title} emptyHint={waiting.hint} emptyTone="neutral" />
      ) : rosterQ.isError ? (
        <ErrorState error={rosterQ.error} onRetry={() => void rosterQ.refetch()} compact />
      ) : (
        <SectionTable
          loading={rosterQ.isLoading}
          columns={COLUMNS}
          empty="Bu şubede öğrenci yok"
          emptyHint="Seçilen kampüs, sezon ve şubede aktif kaydı olan öğrenci bulunmuyor."
          emptyTone="neutral"
          toolbar={
            <SectionToolbar count={rosterQ.isSuccess ? rows.length : undefined} noun="öğrenci" loading={rosterQ.isLoading}>
              {gradingId ? (
                <ButtonLink href={hrefs.grading(gradingId)} size="sm">
                  Değerlendir
                </ButtonLink>
              ) : null}
              <ButtonLink href={hrefs.licensed} variant="secondary" size="sm">
                Yeni atama
              </ButtonLink>
            </SectionToolbar>
          }
          rows={rows.map((row) => {
            const phase = row.phase === "NONE" ? null : PHASE[row.phase];
            const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Öğrenci";
            const assignment = assignments.find((item) => item.id === row.assignmentId);
            return [
              name,
              phase ? (
                <Badge key="p" tone={phase.tone} dot>
                  {phase.label}
                </Badge>
              ) : (
                ""
              ),
              assignment ? (
                <span key="d" className="whitespace-normal">
                  {formatWindow(assignment.availableFrom, assignment.availableUntil)}
                </span>
              ) : (
                ""
              ),
              row.phase === "IN_PROGRESS" && row.assignmentId ? (
                <div key="a" className="flex justify-end">
                  <ButtonLink
                    href={`${hrefs.monitor(row.assignmentId)}?studentId=${encodeURIComponent(row.studentId)}&from=${encodeURIComponent(returnTo)}`}
                    variant="secondary"
                    size="sm"
                  >
                    İzle
                  </ButtonLink>
                </div>
              ) : (
                ""
              ),
            ];
          })}
        />
      )}
    </div>
  );
}
