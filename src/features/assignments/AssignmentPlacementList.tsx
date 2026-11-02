"use client";

import type { AssignmentSummaryDto, ExamGrantDto } from "@/src/api/generated/models";
import { assignmentStatusLabel } from "@/src/features/admin/labels";
import { istanbulLabel } from "@/src/features/assignments/istanbulTime";
import { Badge, FilterTabs, SectionTable, SectionToolbar } from "@/src/ui";
import { useMemo, useState } from "react";

const COLUMNS = ["Sınav", "Nereye", "Hedef", "Pencere", "Durum"];

const PLACE: Record<string, string> = {
  GRADE: "Seviye",
  CLASS: "Sınıf",
  STUDENT: "Öğrenci",
};

function formatWindow(from?: string | null, until?: string | null) {
  const start = istanbulLabel(from);
  const end = istanbulLabel(until);
  if (!start && !end) return "Süresiz";
  return `${start ?? "Hemen"} → ${end ?? "Kapatılana kadar"}`;
}

function windowEnded(row: AssignmentSummaryDto, now = Date.now()) {
  return Boolean(row.availableUntil && Date.parse(row.availableUntil) < now);
}

/** Kapalı ya da penceresi dolmuş atama. İlk açılışta gizlenir. */
function finished(row: AssignmentSummaryDto) {
  return row.status === "CLOSED" || windowEnded(row);
}

function placeLabel(row: AssignmentSummaryDto) {
  const types = new Set((row.targets ?? []).map((target) => target.type).filter(Boolean) as string[]);
  const labels = [...types].map((type) => PLACE[type] ?? type);
  return labels.length > 0 ? labels.join(", ") : "—";
}

function targetLabel(row: AssignmentSummaryDto) {
  const parts = (row.targets ?? []).map((target) => {
    const name = target.label?.trim() || "—";
    return target.exclude ? `Hariç: ${name}` : name;
  });
  return parts.length > 0 ? parts.join(", ") : "—";
}

/**
 * Seviye, sınıf veya öğrenciye yapılmış atamalar.
 * Bitenler (kapalı veya süresi dolmuş) ilk açılışta görünmez; sekmeden açılır.
 */
export function AssignmentPlacementList({
  assignments,
  grants,
  campusId,
  seasonId,
  loading,
}: {
  assignments: AssignmentSummaryDto[];
  grants: ExamGrantDto[];
  campusId: string;
  seasonId: string;
  loading: boolean;
}) {
  const [tab, setTab] = useState<"open" | "done">("open");
  const scoped = useMemo(() => {
    return assignments.filter((row) => {
      if (row.status === "DRAFT") return false;
      if (!row.targets?.some((target) => target.type === "GRADE" || target.type === "CLASS" || target.type === "STUDENT")) {
        return false;
      }
      if (row.examStatus && row.examStatus !== "PUBLISHED") return false;
      if (campusId && row.instituteId !== campusId) return false;
      if (seasonId && row.academicYearId !== seasonId) return false;
      return true;
    });
  }, [assignments, campusId, seasonId]);
  const openRows = scoped.filter((row) => !finished(row));
  const doneRows = scoped.filter((row) => finished(row));
  const rows = tab === "done" ? doneRows : openRows;

  return (
    <section className="grid min-w-0 gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-fg">Atama listesi</h2>
        <p className="mt-0.5 text-[13px] text-fg-muted">Seviye, sınıf veya öğrenciye yapılan atamalar ve gittikleri yer.</p>
      </div>
      <SectionTable
        tabs={
          <FilterTabs
            label="Atama listesi"
            value={tab}
            onChange={(value) => setTab(value === "done" ? "done" : "open")}
            items={[
              { label: "Süren", value: "open", count: loading ? undefined : openRows.length },
              { label: "Biten", value: "done", count: loading ? undefined : doneRows.length },
            ]}
          />
        }
        toolbar={<SectionToolbar count={loading ? undefined : rows.length} noun="atama" loading={loading} />}
        loading={loading}
        columns={COLUMNS}
        empty={tab === "done" ? "Biten atama yok" : "Süren atama yok"}
        emptyTone="neutral"
        emptyHint={
          tab === "done"
            ? "Kapalı veya süresi dolmuş atama bu sezonda yok."
            : "Biten atamalar Biten sekmesinde. Yeni atama lisanslı sınavdan yapılır."
        }
        rows={rows.map((row) => {
          const grant =
            grants.find((item) => item.examVersionId === row.examVersionId && item.academicYearId === row.academicYearId) ??
            grants.find((item) => item.examVersionId === row.examVersionId);
          const title = grant?.examTitle ?? "Sınav";
          const version = row.examVersionNo != null ? `v${row.examVersionNo}` : null;
          const expiredOpen = row.status === "OPEN" && windowEnded(row);
          return [
            <span key="exam" className="block min-w-0">
              <span className="block font-medium text-fg">{title}</span>
              {version ? <span className="text-xs text-fg-subtle">{version}</span> : null}
            </span>,
            placeLabel(row),
            <span key="where" className="block min-w-0 whitespace-normal">{targetLabel(row)}</span>,
            <span key="window" className="block whitespace-normal">{formatWindow(row.availableFrom, row.availableUntil)}</span>,
            <Badge
              key="status"
              tone={row.status === "OPEN" && !expiredOpen ? "success" : "neutral"}
              dot
            >
              {expiredOpen ? "Süresi doldu" : assignmentStatusLabel(row.status)}
            </Badge>,
          ];
        })}
      />
    </section>
  );
}
