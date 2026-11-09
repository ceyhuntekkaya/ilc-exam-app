"use client";

import { requestRun, requestSingle } from "@/src/api/generated/ai-grading-controller/ai-grading-controller";
import { useReview } from "@/src/api/generated/evaluation-controller/evaluation-controller";
import type { ApprovalResult, QueueItem } from "@/src/api/generated/models";
import { customInstance } from "@/src/api/mutator";
import {
  AssignmentScopeFields,
  filtersToQuery,
  useAssignmentScope,
} from "@/src/features/assignments/assignmentScope";
import {
  GradingAiPrompts,
  FOREIGN_EXAM_PROMPT,
  aiPromptQueryKey,
  promptFromAnotherExam,
  type AiPromptItem,
} from "@/src/features/assignments/GradingAiPrompts";
import { GradingPrerequisites, prerequisiteQueryKey } from "@/src/features/assignments/GradingPrerequisites";
import { GradingSystemPrompt } from "@/src/features/assignments/GradingSystemPrompt";
import { AnswerReviewCard, type CardDraft } from "@/src/features/grading/AnswerReviewCard";
import {
  LANE_COPY,
  laneOf,
  mediaIdsOf,
  modeOf,
  formatGradeScore,
  percentFromAward,
  whole,
  type Lane,
  type MediaTranscript,
  type ReviewCardItem,
} from "@/src/features/grading/answerCardModel";
import { isUnreviewedAi, runProgressText, runSummaryText } from "@/src/features/grading/aiGradingModel";
import { AI_RUN_POLL_MS, useAiRuns } from "@/src/features/grading/useAiRuns";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { cn } from "@/src/lib/utils/cn";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterTabs,
  PageHeader,
  Skeleton,
  errorMessage,
  notify,
} from "@/src/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/** Kuyruk satırı (`GET …/assignments/{id}/grading`, üretilmiş `QueueItem`) ekranda kart görünümüyle okunur. */
type Item = ReviewCardItem & Pick<QueueItem, "interactionType">;

type GradingSummary = {
  submitted: number;
  grace: number;
  awaitingAuto: number;
  awaitingManual: number;
  ready: number;
  published: number;
  /** R-29: örneklemde olup insan onayı bekleyen deneme (yayını engeller). */
  awaitingAudit?: number;
  /** R-29: AI puanı olup hiç gözden geçirilmemiş deneme. */
  unreviewedAi?: number;
};

type AutoCompleteResult = {
  scored: number;
  completed: number;
  awaitingManual: number;
  inGrace: number;
};

type PublishResult = {
  published: number;
  notReady: number;
};

type ModelReply = {
  raw: string;
  rejectedRaw?: string | null;
  error?: string | null;
};

/** TEMPORARY: modele giden isteğin dökümü. Panel kalkınca bu tip de kalkar. */
type AiRequestPreview = {
  answerId: string;
  provider?: string | null;
  endpoint?: string | null;
  model?: string | null;
  partMax?: number | null;
  system?: string | null;
  user?: string | null;
  requestJson?: string | null;
  fallbackRequestJson?: string | null;
  error?: string | null;
};

type Mode = "ai" | "manual" | "prerequisites" | "prompt" | "system";

/** TEMPORARY: her AI kartında modele giden isteği gösterir. Kaldırılacak. */
function AiRequestDump({
  preview,
  loading,
  failed,
  errorText,
  reply,
}: {
  preview?: AiRequestPreview;
  loading: boolean;
  failed: boolean;
  errorText: string;
  reply?: ModelReply;
}) {
  return (
    <section className="grid min-w-0 gap-2 rounded-lg border border-dashed border-warning/40 bg-bg p-3">
      <p className="text-xs font-semibold text-warning">Geçici kontrol — AI&apos;ya giden veri</p>
      {failed ? (
        <p className="text-sm break-words text-danger">{errorText}</p>
      ) : loading && !preview ? (
        <p className="text-sm text-fg-muted">İstek hazırlanıyor…</p>
      ) : preview?.error ? (
        <p className="text-sm break-words text-danger">{preview.error}</p>
      ) : preview ? (
        <div className="grid min-w-0 gap-2">
          <dl className="grid min-w-0 gap-1 text-xs text-fg">
            <div className="min-w-0">
              <dt className="text-fg-muted">Sağlayıcı</dt>
              <dd className="break-all">{preview.provider || "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-fg-muted">Model</dt>
              <dd className="break-all">{preview.model || "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-fg-muted">Adres</dt>
              <dd className="break-all">{preview.endpoint || "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-fg-muted">Sınav soru puanı</dt>
              <dd>
                {preview.partMax == null ? "—" : preview.partMax} — modele gitmez. Model 0–100 döner; ekranda yüzde ve bu puana
                yuvarlanmış karşılığı yazılır.
              </dd>
            </div>
          </dl>
          <DumpBlock label="System prompt" text={preview.system || ""} />
          <DumpBlock label="User prompt" text={preview.user || ""} />
          <DumpBlock label="İstek gövdesi" text={preview.requestJson || ""} />
          {preview.fallbackRequestJson ? (
            <DumpBlock
              label="OpenAI 400 dönerse giden gövde"
              text={preview.fallbackRequestJson}
            />
          ) : null}
          <p className="text-xs break-words text-fg-muted">
            API anahtarı ve Ollama parolası burada yok. JSON ayrışmazsa aynı system ile user metninin sonuna red gerekçesi eklenip bir
            kez daha istenir.
          </p>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Bu cevap için istek yok.</p>
      )}
      {reply ? (
        <div className="grid min-w-0 gap-2 border-t border-dashed border-warning/40 pt-2">
          {reply.rejectedRaw ? <DumpBlock label="İlk dönüş (reddedildi)" text={reply.rejectedRaw} /> : null}
          <DumpBlock label="Model dönüşü" text={reply.raw} />
          {reply.error ? <p className="text-sm break-words text-danger">{reply.error}</p> : null}
        </div>
      ) : (
        <p className="border-t border-dashed border-warning/40 pt-2 text-xs text-fg-muted">
          Model dönüşü, AI ile Değerlendir denince burada görünür.
        </p>
      )}
    </section>
  );
}

function DumpBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <pre className="mt-1 max-h-72 min-w-0 overflow-auto rounded-md border border-border bg-surface p-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap text-fg">
        {text || "—"}
      </pre>
    </div>
  );
}

function ModeTabs({
  value,
  onChange,
  items,
}: {
  value: Mode;
  onChange: (value: Mode) => void;
  items: { id: Mode; label: string; count?: number }[];
}) {
  return (
    <div role="tablist" aria-label="Değerlendirme yolu" className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1 ring-1 ring-border ring-inset">
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap",
              selected ? "bg-surface text-fg shadow-sm ring-1 ring-border" : "text-fg-muted hover:text-fg",
            )}
            onClick={() => onChange(item.id)}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  "numeric rounded-full px-1.5 text-[11px] font-semibold",
                  selected ? "bg-primary-50 text-primary" : "bg-neutral-200/80 text-fg-subtle",
                )}
              >
                {item.count.toLocaleString("tr-TR")}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Teslim edilmiş denemelerin değerlendirmesi.
 * Çoktan seçmeli ve diğer objektif sorular "Otomatik Değerlendirmeleri Tamamla" ile puanlanır.
 * Açık uçlu cevaplar burada puanlanır; son elle puandan sonra toplam hesaplanır.
 * Değerlendirmesi bitmeyen deneme yayınlanmaz. Yayınlanan puan kilitlenir.
 */
export function GradingSection({
  companyId,
  assignmentId,
}: {
  companyId: string;
  /** Verilmezse kuyruk, seçilen sınav ve şubede bitirmiş her öğrencinin atamasından gelir (`/staff/grading`). */
  assignmentId?: string;
}) {
  const board = !assignmentId;
  const hrefs = useOpsHref();
  const router = useRouter();
  const scope = useAssignmentScope(companyId);
  const seeded = useRef(false);
  const lastTarget = useRef("");
  const runLock = useRef(false);
  const sourcesQ = useQuery({
    queryKey: ["grading-sources", companyId, scope.campusId, scope.seasonId, scope.examValue, scope.branchValue],
    enabled: board && scope.ready,
    queryFn: () => {
      const params = new URLSearchParams({
        companyId,
        instituteId: scope.campusId,
        academicYearId: scope.seasonId,
        examVersionId: scope.examValue,
        branchId: scope.branchValue,
      });
      return customInstance<{ data: string[] }>(`/assignments/grading-sources?${params.toString()}`);
    },
  });
  const queueIds = useMemo(
    () => (assignmentId ? [assignmentId] : scope.ready ? (sourcesQ.data?.data ?? []) : []),
    [assignmentId, scope.ready, sourcesQ.data],
  );

  useEffect(() => {
    if (!assignmentId || seeded.current || scope.query || scope.listLoading) return;
    const assignment = scope.assignments.find((row) => row.id === assignmentId);
    if (!assignment?.instituteId || !assignment.academicYearId || !assignment.examVersionId) return;
    seeded.current = true;
    scope.writeFilters({
      instituteId: assignment.instituteId,
      yearId: assignment.academicYearId,
      examVersionId: assignment.examVersionId,
      gradeId: "",
      branchId: "",
    });
  }, [assignmentId, scope]);

  const filterKey = filtersToQuery(scope.filters).toString();
  useEffect(() => {
    if (!assignmentId || !scope.ready || !scope.gradingId || scope.gradingId === assignmentId) return;
    const href = hrefs.grading(scope.gradingId);
    const target = filterKey ? `${href}?${filterKey}` : href;
    if (lastTarget.current === target) return;
    lastTarget.current = target;
    router.replace(target, { scroll: false });
  }, [scope.ready, scope.gradingId, assignmentId, filterKey, hrefs, router]);

  const query = useQuery({
    queryKey: ["grading", companyId, queueIds, scope.gradeValue, scope.branchValue],
    enabled: queueIds.length > 0,
    // R-30: kuyrukta (PENDING/RUNNING) iş olan cevap varsa liste 5 sn'de bir yenilenir. Sayfa kapanıp açılınca
    // sürmekte olan koşum buradan görülür; koşum kimliği saklanmaz.
    refetchInterval: (q: { state: { data?: { data: Item[] } } }) =>
      (q.state.data?.data ?? []).some((row) => row.jobStatus === "PENDING" || row.jobStatus === "RUNNING") ? AI_RUN_POLL_MS : false,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (scope.gradeValue) params.set("gradeId", scope.gradeValue);
      if (scope.branchValue) params.set("branchId", scope.branchValue);
      const qs = params.toString();
      const batches = await Promise.all(
        queueIds.map((id) =>
          customInstance<{ data: Item[] }>(
            `/companies/${companyId}/assignments/${id}/grading${qs ? `?${qs}` : ""}`,
          ),
        ),
      );
      const seen = new Set<string>();
      const data: Item[] = [];
      for (const batch of batches) {
        for (const item of batch.data ?? []) {
          if (seen.has(item.answerId)) continue;
          seen.add(item.answerId);
          data.push(item);
        }
      }
      data.sort((a, b) => {
        const byName = (a.studentName ?? "").localeCompare(b.studentName ?? "", "tr");
        if (byName !== 0) return byName;
        return (a.attemptNo ?? 0) - (b.attemptNo ?? 0);
      });
      return { data };
    },
  });
  const rows = (query.data?.data ?? []) as Item[];
  const [score, setScore] = useState<Record<string, string>>({});
  const [percent, setPercent] = useState<Record<string, string>>({});
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<{ index: number; total: number } | null>(null);
  const [queueingAll, setQueueingAll] = useState(false);
  const [queueingId, setQueueingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>("pending");
  const [mode, setMode] = useState<Mode>("ai");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [transcriptOverrides, setTranscriptOverrides] = useState<Record<string, MediaTranscript>>({});
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [transcriptProgress, setTranscriptProgress] = useState<{ index: number; total: number } | null>(null);
  const review = useReview();
  const [autoPending, setAutoPending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const openedExam = useRef("");
  const scopeBody = useMemo(() => {
    const body: { assignmentIds: string[]; gradeId?: string; branchId?: string } = { assignmentIds: queueIds };
    if (board && scope.gradeValue) body.gradeId = scope.gradeValue;
    if (board && scope.branchValue) body.branchId = scope.branchValue;
    return body;
  }, [board, queueIds, scope.gradeValue, scope.branchValue]);

  const current = scope.assignments.find((row) => row.id === assignmentId);
  const examVersionId = scope.examValue || current?.examVersionId || "";
  const prerequisites = useQuery({
    queryKey: prerequisiteQueryKey(companyId, examVersionId),
    enabled: Boolean(examVersionId),
    queryFn: () =>
      customInstance<{ data: { missingCount: number } }>(
        `/companies/${companyId}/exam-versions/${examVersionId}/grading-prerequisites`,
      ),
  });
  const aiPrompts = useQuery({
    queryKey: aiPromptQueryKey(companyId, examVersionId),
    enabled: Boolean(examVersionId),
    queryFn: () =>
      customInstance<{ data: { items: AiPromptItem[] } }>(
        `/companies/${companyId}/exam-versions/${examVersionId}/ai-prompts`,
      ),
  });
  const promptItems = aiPrompts.data?.data.items ?? [];

  useEffect(() => {
    if (!examVersionId || !prerequisites.isSuccess) return;
    if (openedExam.current === examVersionId) return;
    openedExam.current = examVersionId;
    if ((prerequisites.data?.data.missingCount ?? 0) > 0) setMode("prerequisites");
  }, [examVersionId, prerequisites.isSuccess, prerequisites.data]);
  const contextMismatch = Boolean(
    current &&
      ((scope.campusId && current.instituteId && current.instituteId !== scope.campusId) ||
        (scope.seasonId && current.academicYearId && current.academicYearId !== scope.seasonId) ||
        (scope.examValue && current.examVersionId && current.examVersionId !== scope.examValue)),
  );
  const summaryQ = useQuery({
    queryKey: ["grading-summary", companyId, scopeBody],
    enabled: queueIds.length > 0 && !contextMismatch,
    queryFn: () => {
      const params = new URLSearchParams();
      for (const id of scopeBody.assignmentIds) params.append("assignmentIds", id);
      if (scopeBody.gradeId) params.set("gradeId", scopeBody.gradeId);
      if (scopeBody.branchId) params.set("branchId", scopeBody.branchId);
      return customInstance<{ data: GradingSummary }>(`/companies/${companyId}/grading/summary?${params.toString()}`);
    },
  });
  const summary = summaryQ.data?.data;
  const { track, active: runsActive, progress: runProgress } = useAiRuns(companyId, (finished) => {
    void Promise.all([query.refetch(), summaryQ.refetch()]);
    notify.success(
      finished.failed > 0
        ? `AI değerlendirmesi bitti. ${runProgressText(finished)}, ${finished.failed} iş başarısız.`
        : `AI değerlendirmesi bitti. ${runProgressText(finished)}.`,
    );
  });
  // Sayfa yeniden açılmışsa (koşum kimliği yok) sürmekte olan iş cevapların jobStatus alanından görülür;
  // iş bitince özet sayaçları da yenilenir.
  const activeJobCount = (query.data?.data ?? []).filter((row) => row.jobStatus === "PENDING" || row.jobStatus === "RUNNING").length;
  const prevActiveJobs = useRef(0);
  const refetchSummary = summaryQ.refetch;
  useEffect(() => {
    if (prevActiveJobs.current > 0 && activeJobCount === 0) void refetchSummary();
    prevActiveJobs.current = activeJobCount;
  }, [activeJobCount, refetchSummary]);

  const isScored = (item: Item) => item.scored || saved[item.answerId];
  // R-30: insan bakmadığı AI puanı "Bekleyen"de kalır (Onayla / Değiştir bekliyor); "Puanlanan" yalnız insan/otomatik kararı gösterir.
  const isSettled = (item: Item) => isScored(item) && !(isUnreviewedAi(item) && !saved[item.answerId]);
  const scoped = contextMismatch
    ? []
    : rows.filter((item) => {
        // Kör değerlendirme seviye ve şubeyi yanıttan siler. Kuyruk isteği bu
        // filtreyi sunucuda uygular; burada null yerleşimi elemek listeyi boşaltır.
        if (!item.gradeId && !item.branchId) return true;
        if (scope.gradeValue && item.gradeId !== scope.gradeValue) return false;
        if (scope.branchValue && item.branchId !== scope.branchValue) return false;
        return true;
      });
  const statusRows = scoped.filter((item) => (filter === "done" ? isSettled(item) : !isSettled(item)));
  const aiRows = statusRows.filter((item) => modeOf(laneOf(item.interactionType)) === "ai");
  const manualRows = statusRows.filter((item) => modeOf(laneOf(item.interactionType)) === "manual");
  const visible = mode === "ai" ? aiRows : manualRows;
  // R-30: AI metni eksik sorular (escapeReason=PROMPT_MISSING) tekil listelenir; her biri "AI metni" sekmesine bağlanır.
  const missingPromptQuestions = useMemo(() => {
    const seen = new Map<string, number>();
    for (const item of scoped) {
      if (item.escapeReason !== "PROMPT_MISSING" || item.scored || !item.questionVersionId) continue;
      seen.set(item.questionVersionId, (seen.get(item.questionVersionId) ?? 0) + 1);
    }
    return [...seen.entries()].map(([questionVersionId, answers]) => {
      const row = promptItems.find((p) => p.questionVersionId === questionVersionId);
      return {
        questionVersionId,
        answers,
        label: row ? `${row.questionOrder}. soru${row.questionCode ? ` (${row.questionCode})` : ""}` : "Soru",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, aiPrompts.data]);
  const leftLane: Lane = mode === "ai" ? "audio" : "video";
  const rightLane: Lane = mode === "ai" ? "text" : "image";
  const leftItems = visible.filter((item) => laneOf(item.interactionType) === leftLane);
  const rightItems = visible.filter((item) => laneOf(item.interactionType) === rightLane);
  const previewKey = mode === "ai" ? visible.map((item) => item.answerId).join(",") : "";
  const transcriptStamp = Object.values(transcriptOverrides)
    .map((row) => `${row.mediaId}:${row.status ?? ""}`)
    .sort()
    .join(",");
  const requestPreview = useQuery({
    queryKey: ["ai-request-preview", companyId, previewKey, transcriptStamp],
    enabled: previewKey.length > 0,
    queryFn: () =>
      customInstance<{ data: AiRequestPreview[] }>(`/companies/${companyId}/answers/ai-request-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerIds: previewKey.split(",") }),
      }),
  });
  const previewByAnswer = useMemo(() => {
    const map = new Map<string, AiRequestPreview>();
    for (const row of requestPreview.data?.data ?? []) map.set(row.answerId, row);
    return map;
  }, [requestPreview.data]);
  const serverTranscripts = useMemo(() => {
    const map: Record<string, MediaTranscript> = {};
    for (const item of query.data?.data ?? []) {
      for (const transcript of item.transcripts ?? []) {
        if (transcript.mediaId) map[transcript.mediaId] = transcript;
      }
    }
    return map;
  }, [query.data]);
  const transcripts = { ...serverTranscripts, ...transcriptOverrides };
  const actionBusy =
    transcriptProgress != null ||
    activeMediaId != null ||
    queueingAll ||
    queueingId != null ||
    approvingId != null ||
    savingId != null ||
    saveProgress != null ||
    autoPending ||
    publishPending;

  async function identifyAudio() {
    const jobs = leftItems.flatMap((item) =>
      mediaIdsOf(item).map((mediaId) => ({ applicationId: item.applicationId, mediaId })),
    );
    if (jobs.length === 0 || activeMediaId || runLock.current) return;
    runLock.current = true;
    setTranscriptProgress({ index: 0, total: jobs.length });
    try {
      for (let index = 0; index < jobs.length; index += 1) {
        const job = jobs[index];
        setTranscriptProgress({ index: index + 1, total: jobs.length });
        setActiveMediaId(job.mediaId);
        try {
          const result = await customInstance<{ data: MediaTranscript }>(
            `/companies/${companyId}/applications/${job.applicationId}/media/${job.mediaId}/transcript`,
            { method: "POST" },
          );
          if (result.data?.mediaId) {
            setTranscriptOverrides((current) => ({ ...current, [result.data.mediaId]: result.data }));
          }
        } catch (err) {
          const message = errorMessage(err, "Metne çevrilemedi");
          setTranscriptOverrides((current) => ({
            ...current,
            [job.mediaId]: { mediaId: job.mediaId, status: "FAILED", error: message },
          }));
          if (message.includes("STT adresi")) {
            notify.error(message);
            break;
          }
        }
      }
    } finally {
      runLock.current = false;
      setActiveMediaId(null);
      setTranscriptProgress(null);
    }
  }

  async function save(item: Item, silent = false) {
    const raw = scoreValue(item);
    if (raw.trim() === "") {
      if (!silent) notify.error("Önce puan girin");
      return false;
    }
    const finalScore = Number(raw);
    if (Number.isNaN(finalScore)) {
      if (!silent) notify.error("Puan sayı olmalı");
      return false;
    }
    const examMax = item.examPoints;
    if (examMax != null && (finalScore < 0 || finalScore > examMax)) {
      if (!silent) notify.error(`Puan 0 ile ${formatGradeScore(examMax)} arasında olmalı`);
      return false;
    }
    const percentRaw = percentValue(item).trim();
    const percentScore = percentRaw === "" ? Number(percentFromAward(finalScore, examMax)) : Number(percentRaw);
    setSavingId(item.answerId);
    try {
      await review.mutateAsync({
        id: item.answerId,
        data: {
          finalScore,
          rubric: {
            percent: Number.isNaN(percentScore) ? undefined : percentScore,
            criteria: [{ label: "General", score: finalScore }],
          },
          feedback: feedbackValue(item),
          rationale: rationaleValue(item),
        } as { finalScore: number },
      });
      setSaved((currentSaved) => ({ ...currentSaved, [item.answerId]: true }));
      if (!silent) {
        notify.success("Değerlendirme kaydedildi");
        void Promise.all([query.refetch(), summaryQ.refetch()]);
      }
      return true;
    } catch (err) {
      if (!silent) notify.error(errorMessage(err, "Kaydedilemedi"));
      return false;
    } finally {
      setSavingId(null);
    }
  }

  /**
   * R-30: tarayıcı AI sonucunu KAYDETMEZ. İş kuyruğa atılır; puanı sunucudaki worker yazar (`AI_ACCEPTED`).
   * Gelen sonuç gözden geçirilip Onayla / Değiştir ile insan puanına çevrilir.
   */
  async function queueSingle(item: Item) {
    if (promptFromAnotherExam(item.questionVersionId, promptItems)) {
      notify.error(FOREIGN_EXAM_PROMPT);
      return;
    }
    if (queueingId || queueingAll) return;
    setQueueingId(item.answerId);
    try {
      const result = await requestSingle(companyId, item.answerId);
      track(result.data?.runId ? [result.data.runId] : []);
      notify.success("Cevap AI kuyruğuna alındı");
      void query.refetch();
    } catch (err) {
      notify.error(errorMessage(err, "Kuyruğa alınamadı"));
    } finally {
      setQueueingId(null);
    }
  }

  async function queueAll() {
    if (queueIds.length === 0 || actionBusy || runLock.current) return;
    runLock.current = true;
    setQueueingAll(true);
    try {
      const result = await requestRun(companyId, scopeBody);
      const summaryText = runSummaryText(result.data ?? {});
      if ((result.data?.queued ?? 0) > 0) notify.success(summaryText);
      else notify.error(`Sıraya alınacak cevap yok. ${summaryText}`);
      track(result.data?.runIds ?? []);
      void Promise.all([query.refetch(), summaryQ.refetch()]);
    } catch (err) {
      notify.error(errorMessage(err, "Kuyruğa alınamadı"));
    } finally {
      runLock.current = false;
      setQueueingAll(false);
    }
  }

  async function approve(item: Item) {
    if (approvingId) return;
    setApprovingId(item.answerId);
    try {
      await customInstance<{ data: ApprovalResult }>(`/companies/${companyId}/answers/${item.answerId}/evaluation/approve`, {
        method: "POST",
      });
      notify.success("AI puanı onaylandı");
      await Promise.all([query.refetch(), summaryQ.refetch()]);
    } catch (err) {
      notify.error(errorMessage(err, "Onaylanamadı"));
    } finally {
      setApprovingId(null);
    }
  }

  async function saveAll() {
    const items = [...leftItems, ...rightItems].filter((item) => complete(item) && !item.published);
    if (items.length === 0) {
      notify.error("Puan, gerekçe ve geri bildirim dolu cevap yok");
      return;
    }
    if (actionBusy || runLock.current) return;
    runLock.current = true;
    let savedCount = 0;
    setSaveProgress({ index: 0, total: items.length });
    try {
      for (let index = 0; index < items.length; index += 1) {
        setSaveProgress({ index: index + 1, total: items.length });
        if (await save(items[index], true)) savedCount += 1;
      }
    } finally {
      runLock.current = false;
      setSaveProgress(null);
      setSavingId(null);
    }
    if (savedCount > 0) {
      notify.success(`${savedCount} değerlendirme kaydedildi`);
      void summaryQ.refetch();
    } else notify.error("Kaydedilemedi");
  }

  async function completeAutomatic() {
    if (queueIds.length === 0 || autoPending || contextMismatch) return;
    setAutoPending(true);
    try {
      const result = await customInstance<{ data: AutoCompleteResult }>(
        `/companies/${companyId}/grading/auto-complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scopeBody),
        },
      );
      const data = result.data;
      const parts = [`${data?.scored ?? 0} denemenin otomatik puanı tamamlandı`];
      if ((data?.completed ?? 0) > 0) parts.push(`${data?.completed} sonuç hesaplandı`);
      if ((data?.awaitingManual ?? 0) > 0) parts.push(`${data?.awaitingManual} deneme elle puan bekliyor`);
      if ((data?.inGrace ?? 0) > 0) parts.push(`${data?.inGrace} deneme süre penceresi açık olduğu için atlandı`);
      notify.success(parts.join(". "));
      await Promise.all([query.refetch(), summaryQ.refetch()]);
    } catch (err) {
      notify.error(errorMessage(err, "Otomatik değerlendirme tamamlanamadı"));
    } finally {
      setAutoPending(false);
    }
  }

  async function publishResults() {
    if (queueIds.length === 0 || publishPending || (summary?.ready ?? 0) === 0) return;
    setPublishPending(true);
    try {
      const result = await customInstance<{ data: PublishResult }>(
        `/companies/${companyId}/grading/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scopeBody),
        },
      );
      const data = result.data;
      const published = data?.published ?? 0;
      const notReady = data?.notReady ?? 0;
      notify.success(
        notReady > 0
          ? `${published} öğrenci yayınlandı. ${notReady} öğrenci değerlendirmesi bitmediği için yayınlanmadı.`
          : `${published} öğrenci yayınlandı`,
      );
      setConfirmPublish(false);
      await Promise.all([query.refetch(), summaryQ.refetch()]);
    } catch (err) {
      notify.error(errorMessage(err, "Yayınlanamadı"));
    } finally {
      setPublishPending(false);
    }
  }

  function scoreValue(item: Item) {
    if (Object.prototype.hasOwnProperty.call(score, item.answerId)) return score[item.answerId];
    return item.finalScore != null ? formatGradeScore(item.finalScore) : "";
  }

  function percentValue(item: Item) {
    if (Object.prototype.hasOwnProperty.call(percent, item.answerId)) return percent[item.answerId];
    if (item.percent != null) return whole(item.percent);
    if (item.finalScore != null && item.examPoints != null && item.examPoints > 0) {
      return percentFromAward(item.finalScore, item.examPoints);
    }
    return "";
  }

  function feedbackValue(item: Item) {
    return Object.prototype.hasOwnProperty.call(feedback, item.answerId) ? feedback[item.answerId] : (item.feedback ?? "");
  }

  function rationaleValue(item: Item) {
    return Object.prototype.hasOwnProperty.call(rationale, item.answerId) ? rationale[item.answerId] : (item.rationale ?? "");
  }

  function complete(item: Item) {
    const raw = scoreValue(item).trim();
    if (raw === "" || Number.isNaN(Number(raw))) return false;
    return rationaleValue(item).trim() !== "" && feedbackValue(item).trim() !== "";
  }

  function renderCard(item: Item, index: number) {
    const lane = laneOf(item.interactionType);
    const foreignPrompt = promptFromAnotherExam(item.questionVersionId, promptItems);
    const draft: CardDraft = {
      percent: percentValue(item),
      score: scoreValue(item),
      rationale: rationaleValue(item),
      feedback: feedbackValue(item),
    };
    return (
      <AnswerReviewCard
        key={item.answerId}
        item={item}
        index={index}
        companyId={companyId}
        transcripts={transcripts}
        activeMediaId={activeMediaId}
        draft={draft}
        done={isScored(item)}
        busy={actionBusy}
        onDraftChange={(patch) => {
          if (patch.percent !== undefined) setPercent((current) => ({ ...current, [item.answerId]: patch.percent as string }));
          if (patch.score !== undefined) setScore((current) => ({ ...current, [item.answerId]: patch.score as string }));
          if (patch.rationale !== undefined) setRationale((current) => ({ ...current, [item.answerId]: patch.rationale as string }));
          if (patch.feedback !== undefined) setFeedback((current) => ({ ...current, [item.answerId]: patch.feedback as string }));
        }}
        saving={savingId === item.answerId}
        onSave={() => void save(item)}
        approving={approvingId === item.answerId}
        onApprove={() => void approve(item)}
        evaluating={queueingId === item.answerId}
        evaluateDisabled={foreignPrompt || queueingAll}
        onEvaluate={() => void queueSingle(item)}
        notice={
          foreignPrompt ? (
            <p className="rounded-lg border border-warning/30 bg-warning-bg px-3.5 py-2.5 text-sm break-words text-warning">
              {FOREIGN_EXAM_PROMPT}
            </p>
          ) : null
        }
        extra={
          lane === "audio" || lane === "text" ? (
            <AiRequestDump
              preview={previewByAnswer.get(item.answerId)}
              loading={requestPreview.isLoading || requestPreview.isFetching}
              failed={requestPreview.isError}
              errorText={requestPreview.isError ? errorMessage(requestPreview.error, "AI isteği okunamadı") : ""}
            />
          ) : null
        }
      />
    );
  }

  function renderColumn(lane: Lane, items: Item[]) {
    const copy = LANE_COPY[lane];
    return (
      <section className="grid min-w-0 content-start gap-3">
        <header className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">
            {copy.title}
            <span className="numeric ml-2 font-medium text-fg-subtle">{query.isSuccess ? items.length : ""}</span>
          </h3>
          <p className="mt-0.5 text-xs text-fg-muted">{copy.hint}</p>
        </header>
        {query.isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : items.length === 0 ? (
          <EmptyState compact tone="neutral" title={copy.empty} description={filter === "pending" ? "Bu sütunda bekleyen cevap yok." : "Bu sütunda puanlanmış cevap yok."} />
        ) : (
          items.map((item, index) => renderCard(item, index))
        )}
      </section>
    );
  }

  const header = (
    <PageHeader
      title="Değerlendirme"
      description="Çoktan seçmeli sorular otomatik puanlanır. Açık uçlu cevaplar burada puanlanır. Değerlendirmesi bitmeyen öğrenci yayınlanmaz."
      back={board ? undefined : { href: filterKey ? `${hrefs.assignments}?${filterKey}` : hrefs.assignments, label: "Atamalar" }}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            loading={autoPending}
            disabled={queueIds.length === 0 || contextMismatch || actionBusy || !summary || summary.submitted === 0 || summary.submitted === summary.published}
            onClick={() => void completeAutomatic()}
          >
            Otomatik Değerlendirmeleri Tamamla
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={queueIds.length === 0 || contextMismatch || actionBusy || (summary?.ready ?? 0) === 0}
            onClick={() => setConfirmPublish(true)}
          >
            Sonuçları yayınla
          </Button>
          {(summary?.awaitingAudit ?? 0) > 0 ? (
            <p role="status" className="basis-full text-xs text-warning">
              {summary?.awaitingAudit} deneme denetim bekliyor; denetim tamamlanmadan yayınlanmaz.
            </p>
          ) : null}
        </div>
      }
    />
  );

  if (query.isError || (board && sourcesQ.isError)) {
    return (
      <div>
        {header}
        <ErrorState
          error={query.error ?? sourcesQ.error}
          onRetry={() => {
            if (query.isError) void query.refetch();
            if (sourcesQ.isError) void sourcesQ.refetch();
          }}
        />
      </div>
    );
  }

  const gate = examVersionId
    ? null
    : {
        title: "Sınavı seçin",
        description: board
          ? "Cevaplar, sınav ve şube seçilince o şubeye ait olarak listelenir."
          : "Değerlendirme, sınav seçilince açılır.",
      };
  const answerWaiting = !examVersionId
    ? null
    : board
      ? !scope.ready
        ? { title: "Şubeyi seçin", description: "Seviye ve şube seçilince bu sınavın o şubedeki cevapları açılır." }
        : sourcesQ.isLoading
          ? null
          : (sourcesQ.data?.data.length ?? 0) === 0
            ? { title: "Bu şubede değerlendirilecek cevap yok", description: "Seçilen sınavı bu şubede teslim etmiş öğrenci bulunmuyor." }
            : null
      : contextMismatch && scope.ready && !scope.gradingId
        ? { title: "Bu şubede puanlanacak cevap yok", description: "Tamamlanmış sınavı olan başka bir şube seçin." }
        : contextMismatch
          ? { title: "Şubeyi seçin", description: "Sınav, seviye ve şube seçilince o şubenin değerlendirmesi açılır." }
          : null;

  return (
    <div className="grid gap-4">
      {header}
      {scope.listFailed ? (
        <ErrorState error={scope.listError} onRetry={scope.refetchLists} compact />
      ) : (
        <AssignmentScopeFields
          scope={scope}
          description="Sınav, seviye ve şubeyi seçin. Liste, seçilen sınavın o şubesindeki cevaplarla dolar."
        />
      )}

      {scope.listLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : gate ? (
        <EmptyState tone="neutral" title={gate.title} description={gate.description} />
      ) : (
        <section className="min-w-0 rounded-xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border">
            <FilterTabs
              label="Cevap durumu"
              value={filter}
              onChange={setFilter}
              items={[
                { label: "Bekleyen", value: "pending", count: query.isSuccess ? scoped.filter((item) => !isSettled(item)).length : undefined },
                { label: "Puanlanan", value: "done", count: query.isSuccess ? scoped.filter((item) => isSettled(item)).length : undefined },
              ]}
            />
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            {queueIds.length === 0 || contextMismatch ? null : summaryQ.isError ? (
              <ErrorState compact error={summaryQ.error} onRetry={() => void summaryQ.refetch()} />
            ) : (
              <div className="grid gap-2">
                <dl className="flex flex-wrap gap-2">
                  {(
                    [
                      ["Teslim", summary?.submitted],
                      ["Süre penceresi", summary?.grace],
                      ["Otomatik bekleyen", summary?.awaitingAuto],
                      ["Elle bekleyen", summary?.awaitingManual],
                      ["Yayına hazır", summary?.ready],
                      ["Yayınlandı", summary?.published],
                      ["Denetim bekliyor", summary?.awaitingAudit],
                      ["AI puanı — gözden geçirilmedi", summary?.unreviewedAi],
                    ] as const
                  ).map(([label, count]) => (
                    <div key={label} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-3">
                      <dt className="text-xs text-fg-muted">{label}</dt>
                      <dd className="numeric text-sm font-semibold text-fg">{summaryQ.isSuccess ? count : "–"}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-fg-muted">
                  Sayılar teslim edilmiş denemelerdir.
                  {board ? "" : " Otomatik puanlama ve yayın bu atamanın tamamını kapsar."}
                </p>
              </div>
            )}
            <ModeTabs
              value={mode}
              onChange={setMode}
              items={[
                { id: "ai", label: "AI Değerlendirme", count: query.isSuccess ? aiRows.length : undefined },
                { id: "manual", label: "Manuel değerlendirme", count: query.isSuccess ? manualRows.length : undefined },
                {
                  id: "prerequisites",
                  label: "Ön Koşullar",
                  count: prerequisites.isSuccess ? prerequisites.data?.data.missingCount : undefined,
                },
                {
                  id: "prompt",
                  label: "AI metni",
                  count: aiPrompts.isSuccess ? aiPrompts.data?.data.items.length : undefined,
                },
                { id: "system", label: "Sistem promptu" },
              ]}
            />
            {mode === "prerequisites" ? (
              <GradingPrerequisites companyId={companyId} examVersionId={examVersionId} />
            ) : mode === "prompt" ? (
              <GradingAiPrompts companyId={companyId} examVersionId={examVersionId} />
            ) : mode === "system" ? (
              <GradingSystemPrompt companyId={companyId} />
            ) : board && scope.ready && sourcesQ.isLoading ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : answerWaiting ? (
              <EmptyState tone="neutral" title={answerWaiting.title} description={answerWaiting.description} />
            ) : (
              <>
                {mode === "ai" && missingPromptQuestions.length > 0 ? (
                  <section
                    role="alert"
                    data-testid="missing-prompts"
                    className="grid gap-2 rounded-lg border border-warning/30 bg-warning-bg px-3.5 py-3"
                  >
                    <p className="text-sm font-semibold text-warning">Bu soruların AI metni yok</p>
                    <ul className="grid gap-1.5">
                      {missingPromptQuestions.map((q) => (
                        <li key={q.questionVersionId} className="flex flex-wrap items-center gap-2 text-sm text-fg">
                          <span>
                            {q.label} · {q.answers} cevap insan kuyruğunda
                          </span>
                          <button
                            type="button"
                            className="min-h-11 text-[13px] font-medium text-primary underline-offset-2 hover:underline"
                            onClick={() => setMode("prompt")}
                          >
                            AI metni
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {mode === "ai" ? (
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        className="min-h-11 w-full sm:w-auto"
                        disabled={leftItems.length === 0 || actionBusy || query.isLoading}
                        onClick={() => void identifyAudio()}
                      >
                        {transcriptProgress
                          ? `Tanımlanıyor ${transcriptProgress.index}/${transcriptProgress.total}`
                          : "Sesi Tanımla"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full sm:w-auto"
                        loading={queueingAll}
                        disabled={leftItems.length + rightItems.length === 0 || actionBusy || query.isLoading}
                        onClick={() => void queueAll()}
                      >
                        Tümünü değerlendir
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full sm:w-auto"
                        disabled={leftItems.length + rightItems.length === 0 || actionBusy || query.isLoading}
                        onClick={() => void saveAll()}
                      >
                        {saveProgress ? `Kaydediliyor ${saveProgress.index}/${saveProgress.total}` : "Tümünü kaydet"}
                      </Button>
                    </div>
                    {runsActive ? (
                      <div role="status" aria-live="polite" className="grid gap-1" data-testid="ai-run-progress">
                        <progress
                          className="h-2 w-full overflow-hidden rounded-full accent-primary"
                          max={Math.max(runProgress.total, 1)}
                          value={runProgress.finished}
                          aria-label="AI değerlendirme ilerlemesi"
                        />
                        <p className="text-xs text-fg-muted">
                          {runProgress.total > 0 ? runProgressText(runProgress) : "AI işleri sıraya alındı…"}
                        </p>
                      </div>
                    ) : null}
                    <p className="text-xs text-fg-muted" aria-live="polite">
                      {transcriptProgress
                        ? "Sesler sırayla metne çevriliyor."
                        : "Değerlendirme sunucuda kuyruktan yürür; sayfayı kapatabilirsiniz. AI puanı Onayla ya da Değiştir ile insan puanına çevrilir. Tümünü kaydet yalnız puan, gerekçe ve geri bildirimi dolu cevapları yazar."}
                    </p>
                  </div>
                ) : null}
                <div className="grid min-w-0 gap-4">
                  {renderColumn(leftLane, leftItems)}
                  {renderColumn(rightLane, rightItems)}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmPublish}
        title="Sonuçlar yayınlansın mı?"
        tone="primary"
        confirmLabel="Yayınla"
        pending={publishPending}
        description={`${
          (summary?.grace ?? 0) + (summary?.awaitingAuto ?? 0) + (summary?.awaitingManual ?? 0) > 0
            ? `${summary?.ready ?? 0} öğrenci yayınlanacak, ${(summary?.grace ?? 0) + (summary?.awaitingAuto ?? 0) + (summary?.awaitingManual ?? 0)} öğrenci değerlendirmesi bitmediği için yayınlanmayacak. Yayın geri alınamaz.`
            : `${summary?.ready ?? 0} öğrenci yayınlanacak. Yayın geri alınamaz.`
        }${(summary?.awaitingAudit ?? 0) > 0 ? ` ${summary?.awaitingAudit} deneme denetim bekliyor; bunlar yayınlanmaz.` : ""}${(summary?.unreviewedAi ?? 0) > 0 ? ` ${summary?.unreviewedAi} denemede AI puanı gözden geçirilmedi.` : ""}`}
        onClose={() => setConfirmPublish(false)}
        onConfirm={() => void publishResults()}
      />
    </div>
  );
}
