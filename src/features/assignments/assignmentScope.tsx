"use client";

import { useBranches, useGrades, useInstitutes, useYears } from "@/src/api/generated/admin-companies/admin-companies";
import { useListAssignments, useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { customInstance } from "@/src/api/mutator";
import { Field, FormCard, Select, Skeleton } from "@/src/ui";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type RosterPhase = "NONE" | "ASSIGNED" | "IN_PROGRESS" | "FINISHED" | "EVALUATED" | "ABSENT";

export type RosterRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  assignmentId?: string | null;
  recipientId?: string | null;
  phase: RosterPhase;
};

export type RosterFilters = {
  instituteId: string;
  yearId: string;
  examVersionId: string;
  gradeId: string;
  branchId: string;
};

const FILTER_KEYS = ["instituteId", "yearId", "examVersionId", "gradeId", "branchId"] as const;

export function filtersFromQuery(query: string): RosterFilters {
  const params = new URLSearchParams(query);
  return {
    instituteId: params.get("instituteId") ?? "",
    yearId: params.get("yearId") ?? "",
    examVersionId: params.get("examVersionId") ?? "",
    gradeId: params.get("gradeId") ?? "",
    branchId: params.get("branchId") ?? "",
  };
}

export function filtersToQuery(filters: RosterFilters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key]) params.set(key, filters[key]);
  }
  return params;
}

function byTr(a: string, b: string) {
  return a.localeCompare(b, "tr");
}

/**
 * Atama ekranındaki kampüs → sezon → sınav → seviye → şube seçimi.
 * Seçim adres çubuğunda durur; değerlendirme aynı seçimle açılır.
 */
export function useAssignmentScope(companyId: string) {
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

  const rosterRows = rosterQ.data?.data ?? [];
  /** Bu şubede sınavı bitirmiş (yayınlanmış dahil) öğrencilerin atamaları. Sıra şube listesiyle aynı. */
  const gradingIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const row of rosterRows) {
      if ((row.phase !== "FINISHED" && row.phase !== "EVALUATED") || !row.assignmentId) continue;
      if (seen.has(row.assignmentId)) continue;
      seen.add(row.assignmentId);
      ids.push(row.assignmentId);
    }
    return ids;
  }, [rosterRows]);
  const gradingId = gradingIds[0] ?? null;

  const listError = institutesQ.error ?? yearsQ.error ?? gradesQ.error ?? branchesQ.error ?? assignmentsQ.error ?? grantsQ.error;
  const listLoading =
    institutesQ.isLoading || yearsQ.isLoading || gradesQ.isLoading || branchesQ.isLoading || assignmentsQ.isLoading || grantsQ.isLoading;
  const listFailed =
    institutesQ.isError || yearsQ.isError || gradesQ.isError || branchesQ.isError || assignmentsQ.isError || grantsQ.isError;

  function refetchLists() {
    void institutesQ.refetch();
    void yearsQ.refetch();
    void gradesQ.refetch();
    void branchesQ.refetch();
    void assignmentsQ.refetch();
    void grantsQ.refetch();
  }

  const ready = Boolean(campusId && seasonId && examValue && branchValue);

  return {
    query,
    filters,
    writeFilters,
    institutes,
    showCampus,
    campusId,
    showSeason,
    seasonId,
    seasonOptions,
    exams,
    examValue,
    gradeOptions,
    gradeValue,
    branchOptions,
    branchValue,
    assignments,
    grants,
    rosterQ,
    rosterRows,
    gradingIds,
    gradingId,
    listError,
    listLoading,
    listFailed,
    refetchLists,
    ready,
  };
}

export function AssignmentScopeFields({
  scope,
  description = "Sınav, seviye ve şubeyi seçin. Liste seçime göre dolar.",
}: {
  scope: ReturnType<typeof useAssignmentScope>;
  description?: string;
}) {
  const {
    listLoading,
    showCampus,
    campusId,
    institutes,
    showSeason,
    seasonId,
    seasonOptions,
    exams,
    examValue,
    gradeOptions,
    gradeValue,
    branchOptions,
    branchValue,
    writeFilters,
  } = scope;

  return (
    <FormCard title="Filtre" description={description}>
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
                  examVersionId: examValue,
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
                  examVersionId: examValue,
                  gradeId: gradeValue,
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
  );
}
