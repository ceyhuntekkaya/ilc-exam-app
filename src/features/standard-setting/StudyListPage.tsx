"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getListStudiesQueryKey, useCreateStudy, useListStudies } from "@/src/api/generated/standart-belirleme/standart-belirleme";
import type { CreateStudyRequestMethod } from "@/src/api/generated/models";
import { useCan, usePanel } from "@/src/features/panel/PanelContext";
import { formatWhen, useCentralRequest } from "@/src/features/psychometrics/central";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import { ExamVersionPicker } from "@/src/features/standard-setting/pickers";
import { StandardSettingSubNav } from "@/src/features/standard-setting/SubNav";
import {
  METHOD_LABEL,
  STUDY_STATUS_TONE,
  formatNumber,
  isUuid,
  methodLabel,
  studyStatusLabel,
} from "@/src/features/standard-setting/model";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ButtonLink, ErrorState, Field, FormDialog, PageHeader, SectionTable, SectionToolbar, Select, errorMessage, notify } from "@/src/ui";

/** R-15 (E-37): standart belirleme çalışmaları — liste ve yeni çalışma oluşturma. */
export function StudyListPage() {
  const { ready, request } = useCentralRequest();
  const { basePath } = usePanel();
  const canManage = useCan(Perm.psychometricsManage);
  const query = useListStudies({ query: { enabled: ready }, request });
  const [creating, setCreating] = useState(false);
  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Standart Belirleme"
        description="Sınav sürümleri için Angoff veya Bookmark çalışması: panel kur, tur aç, istatistiği izle, sonlandır; ardından kesme puanı önerisi iki onayla yürürlüğe girer."
      />
      <PsychometricsTabs />
      <StandardSettingSubNav />
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <SectionTable
          columns={["Sınav", "Yöntem", "Durum", "Panelist", "Tur", "Kesme", "Oluşturulma", ""]}
          loading={query.isLoading || !ready}
          empty="Henüz çalışma yok"
          emptyHint={canManage ? "“Yeni çalışma” ile bir sınav sürümü için çalışma başlatın." : "Bir çalışma açıldığında burada listelenecektir."}
          emptyTone="neutral"
          toolbar={
            <SectionToolbar count={rows.length} noun="çalışma" loading={query.isLoading}>
              {canManage ? <Button onClick={() => setCreating(true)}>Yeni çalışma</Button> : null}
            </SectionToolbar>
          }
          rows={rows.map((row) => [
            <span key="e">
              {row.examCode ?? "—"} <span className="font-normal text-fg-muted">{row.examTitle}</span>
            </span>,
            methodLabel(row.method),
            <Badge key="s" tone={STUDY_STATUS_TONE[row.status ?? ""] ?? "neutral"} dot>
              {studyStatusLabel(row.status)}
            </Badge>,
            String(row.panelistCount ?? 0),
            row.openRoundNo ? `${row.roundCount ?? 0} (tur ${row.openRoundNo} açık)` : String(row.roundCount ?? 0),
            row.finalCut !== undefined ? formatNumber(row.finalCut) : "—",
            formatWhen(row.createdAt),
            <div key="a" className="flex justify-end">
              <ButtonLink size="sm" variant="secondary" href={`${basePath}/content/standard-setting/${row.id}`}>
                Detay
              </ButtonLink>
            </div>,
          ])}
        />
      )}
      <CreateStudyDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

export function CreateStudyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { request } = useCentralRequest();
  const { basePath } = usePanel();
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useCreateStudy({ request });
  const [examVersionId, setExamVersionId] = useState("");
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!isUuid(examVersionId)) return setError("Geçerli bir sınav sürümü kimliği girin");
    if (!method) return setError("Yöntem seçin");
    setError(null);
    try {
      const result = await create.mutateAsync({ data: { examVersionId: examVersionId.trim(), method: method as CreateStudyRequestMethod } });
      await queryClient.invalidateQueries({ queryKey: getListStudiesQueryKey() });
      notify.success("Çalışma oluşturuldu");
      onClose();
      if (result.data.id) router.push(`${basePath}/content/standard-setting/${result.data.id}`);
    } catch (e) {
      setError(errorMessage(e, "Çalışma oluşturulamadı"));
    }
  }

  return (
    <FormDialog
      open={open}
      title="Yeni standart belirleme çalışması"
      description="Yöntem sonradan değiştirilemez. Bookmark için sınavın her maddesinin kalibre edilmiş zorluk parametresi olmalıdır; aksi halde tur açılamaz."
      submitLabel="Oluştur"
      pending={create.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <ExamVersionPicker value={examVersionId} onChange={setExamVersionId} />
      <Field label="Yöntem" required>
        <Select value={method} onChange={(event) => setMethod(event.target.value)}>
          <option value="">Seçin</option>
          {Object.entries(METHOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
    </FormDialog>
  );
}
