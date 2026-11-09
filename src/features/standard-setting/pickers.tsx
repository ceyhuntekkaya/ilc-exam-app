"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customInstance } from "@/src/api/mutator";
import type { StaffDto } from "@/src/api/generated/models";
import { authoringApi, type ExamListItem } from "@/src/features/authoring/shared/client";
import { useCentralRequest } from "@/src/features/psychometrics/central";
import { Button, Field, Input, Select, errorMessage } from "@/src/ui";

export function staffDisplayName(staff: StaffDto): string {
  return `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim() || staff.username || staff.id || "Personel";
}

/**
 * Merkez personelini ada/kullanıcı adına göre arar (`GET /companies/{merkez}/staff`). Bu uç `staff:assign_scope` ister;
 * yetki yoksa ya da liste alınamazsa kullanıcı kimliği elle (UUID) girilir — ayrı bir "merkez personeli ara" ucu yok.
 */
export function StaffPicker({ onPick, excludeIds = [], actionLabel = "Seç" }: { onPick: (staffUserId: string, name?: string) => void; excludeIds?: readonly string[]; actionLabel?: string }) {
  const { ready, tenantId } = useCentralRequest();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [manual, setManual] = useState("");
  const query = useQuery({
    queryKey: ["central-staff", tenantId, submitted],
    enabled: ready && tenantId !== null,
    retry: false,
    queryFn: () =>
      customInstance<{ data: { items: StaffDto[]; total: number } }>(
        `/companies/${tenantId}/staff?page=0&size=50${submitted ? `&q=${encodeURIComponent(submitted)}` : ""}`,
      ),
  });
  const rows = (query.data?.data.items ?? []).filter((s) => s.id && !excludeIds.includes(s.id));

  return (
    <div className="grid gap-3">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <Field label="Personel ara" hint="Ad veya kullanıcı adı">
          <Input value={q} onChange={(event) => setQ(event.target.value)} />
        </Field>
        <Button type="submit" variant="secondary" disabled={!ready}>
          Ara
        </Button>
      </form>
      {query.isError ? (
        <p className="text-[13px] text-fg-muted">
          Personel listesi alınamadı ({errorMessage(query.error, "yetki yok")}). Kullanıcı kimliğini (UUID) elle girebilirsiniz.
        </p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="grid max-h-48 gap-1 overflow-y-auto rounded-lg border border-border p-1">
          {rows.map((staff) => (
            <li key={staff.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 hover:bg-neutral-50">
              <span className="text-sm">
                {staffDisplayName(staff)} <span className="text-fg-subtle">· {staff.username}</span>
              </span>
              <Button type="button" size="sm" variant="secondary" onClick={() => onPick(staff.id!, staffDisplayName(staff))}>
                {actionLabel}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Kullanıcı kimliği (UUID)">
          <Input value={manual} onChange={(event) => setManual(event.target.value)} placeholder="00000000-0000-…" />
        </Field>
        <Button type="button" variant="secondary" disabled={!manual.trim()} onClick={() => onPick(manual.trim())}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Sınav sürümü seçici: sınav listesinden sınavı seçince, o sınavın hak (grant) kayıtlarındaki sürümler listelenir.
 * Sürüm kimliğini doğrudan veren bir "merkez sınav sürümleri" ucu yok; hak verilmemiş bir sürüm için kimlik elle girilir.
 */
export function ExamVersionPicker({ value, onChange }: { value: string; onChange: (examVersionId: string) => void }) {
  const { ready } = useCentralRequest();
  const [examId, setExamId] = useState("");
  const exams = useQuery({
    queryKey: ["ss-exams"],
    enabled: ready,
    retry: false,
    queryFn: () => authoringApi.listExams(undefined, 0, 100),
  });
  const grants = useQuery({
    queryKey: ["ss-exam-grants", examId],
    enabled: ready && examId !== "",
    retry: false,
    queryFn: () => authoringApi.listExamGrants(examId),
  });
  const versions = Array.from(new Map((grants.data ?? []).map((g) => [g.examVersionId, g.versionNo])).entries());

  return (
    <div className="grid gap-3">
      <Field label="Sınav" hint="Sınav sürümünü bulmak için sınavı seçin">
        <Select value={examId} onChange={(event) => setExamId(event.target.value)}>
          <option value="">Seçin</option>
          {(exams.data?.items ?? []).map((exam: ExamListItem) => (
            <option key={exam.id} value={exam.id}>
              {exam.code} — {exam.title}
            </option>
          ))}
        </Select>
      </Field>
      {examId && grants.isSuccess && versions.length === 0 ? (
        <p className="text-[13px] text-fg-muted">Bu sınavın hak verilmiş sürümü yok; sürüm kimliğini aşağıya elle girin.</p>
      ) : null}
      {grants.isError ? <p className="text-[13px] text-danger">{errorMessage(grants.error, "Sürümler alınamadı")}</p> : null}
      {versions.length > 0 ? (
        <Field label="Sürüm">
          <Select value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">Seçin</option>
            {versions.map(([id, no]) => (
              <option key={id} value={id}>
                v{no} — {id.slice(0, 8)}…
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="Sınav sürümü kimliği (UUID)" required>
        <Input name="examVersionId" value={value} onChange={(event) => onChange(event.target.value)} placeholder="00000000-0000-…" />
      </Field>
    </div>
  );
}
