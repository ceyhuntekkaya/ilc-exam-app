"use client";

import { usePublish, useReview } from "@/src/api/generated/evaluation-controller/evaluation-controller";
import { customInstance } from "@/src/api/mutator";
import {
  AssignmentScopeFields,
  filtersToQuery,
  useAssignmentScope,
} from "@/src/features/assignments/assignmentScope";
import { GradingAiPrompts, aiPromptQueryKey } from "@/src/features/assignments/GradingAiPrompts";
import { GradingPrerequisites, prerequisiteQueryKey } from "@/src/features/assignments/GradingPrerequisites";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { cn } from "@/src/lib/utils/cn";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FilterTabs,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
  errorMessage,
  notify,
} from "@/src/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  answerId: string;
  applicationId: string;
  studentId?: string | null;
  studentName?: string | null;
  gradeId?: string | null;
  branchId?: string | null;
  interactionType: string;
  answer: Record<string, unknown>;
  mediaIds?: string[] | null;
  transcripts?: MediaTranscript[] | null;
  feedback?: string | null;
  finalScore?: number | null;
  scored: boolean;
};

type MediaTranscript = {
  mediaId: string;
  transcript?: string | null;
  status?: string | null;
  error?: string | null;
};

type Lane = "audio" | "text" | "video" | "image";
type Mode = "ai" | "manual" | "prerequisites" | "prompt";

const LANE_COPY: Record<Lane, { title: string; hint: string; empty: string }> = {
  audio: {
    title: "Sesler",
    hint: "Konuşma kaydı. Sesi Tanımla, kayıtları sırayla metne çevirir.",
    empty: "Ses kaydı yok",
  },
  text: {
    title: "Metinler",
    hint: "Yazılı cevap. Dil modeli puanı sonra bağlanacak.",
    empty: "Metin cevap yok",
  },
  video: {
    title: "Videolar",
    hint: "Öğrencinin yüklediği video.",
    empty: "Video yok",
  },
  image: {
    title: "Görseller",
    hint: "Öğrencinin yüklediği görsel.",
    empty: "Görsel yok",
  },
};

function laneOf(type: string): Lane {
  switch (type) {
    case "AUDIO_RESPONSE":
      return "audio";
    case "VIDEO_RESPONSE":
      return "video";
    case "IMAGE_RESPONSE":
      return "image";
    default:
      return "text";
  }
}

function modeOf(lane: Lane): "ai" | "manual" {
  return lane === "audio" || lane === "text" ? "ai" : "manual";
}

function interactionLabel(type: string) {
  return getTemplate(type)?.label ?? type;
}

function answerText(answer: Record<string, unknown>): { text: string; raw: boolean } {
  const direct = answer?.text;
  if (typeof direct === "string" && direct.trim()) return { text: direct, raw: false };
  const texts = Object.values(answer ?? {}).filter((value): value is string => typeof value === "string" && value.trim() !== "");
  if (texts.length > 0) return { text: texts.join("\n\n"), raw: false };
  return { text: JSON.stringify(answer ?? {}, null, 2), raw: true };
}

function mediaIdsOf(item: Item): string[] {
  const ids = new Set<string>();
  for (const id of item.mediaIds ?? []) {
    if (id) ids.add(id);
  }
  const one = item.answer?.mediaId;
  if (typeof one === "string" && one) ids.add(one);
  const many = item.answer?.mediaIds;
  if (Array.isArray(many)) {
    for (const id of many) {
      if (typeof id === "string" && id) ids.add(id);
    }
  }
  return [...ids];
}

function formatScore(value: number) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function mediaSrc(companyId: string, applicationId: string, mediaId: string) {
  return `/api/backend/companies/${companyId}/applications/${applicationId}/media/${mediaId}/content`;
}

function AnswerBody({
  item,
  companyId,
  lane,
  transcripts,
  activeMediaId,
}: {
  item: Item;
  companyId: string;
  lane: Lane;
  transcripts: Record<string, MediaTranscript>;
  activeMediaId: string | null;
}) {
  const ids = mediaIdsOf(item);
  if (lane === "text") {
    const { text, raw } = answerText(item.answer ?? {});
    return (
      <div className="rounded-lg bg-bg px-3.5 py-3">
        <p className="mb-1 text-xs font-medium text-fg-subtle">Öğrenci cevabı</p>
        <p className={raw ? "font-mono text-xs whitespace-pre-wrap text-fg-muted" : "text-sm whitespace-pre-wrap text-fg"}>{text}</p>
      </div>
    );
  }
  if (ids.length === 0) {
    return <p className="text-sm text-fg-muted">{LANE_COPY[lane].empty}.</p>;
  }
  return (
    <div className="grid gap-3">
      {ids.map((mediaId) => {
        const src = mediaSrc(companyId, item.applicationId, mediaId);
        if (lane === "audio") {
          const transcript = transcripts[mediaId];
          const listening = activeMediaId === mediaId;
          return (
            <div key={mediaId} className="grid gap-2">
              <audio controls preload="none" src={src} className="w-full" />
              {listening ? <p className="text-sm text-fg-muted">Dinleniyor…</p> : null}
              {!listening && transcript?.status === "READY" ? (
                <div className="rounded-lg bg-bg px-3.5 py-3">
                  <p className="mb-1 text-xs font-medium text-fg-subtle">Metin</p>
                  <p className="text-sm whitespace-pre-wrap text-fg">
                    {transcript.transcript?.trim() ? transcript.transcript : "Sesten metin çıkmadı."}
                  </p>
                </div>
              ) : null}
              {!listening && transcript?.status === "FAILED" ? (
                <p role="alert" className="text-sm text-danger">
                  {transcript.error || "Metne çevrilemedi"}
                </p>
              ) : null}
            </div>
          );
        }
        if (lane === "video") {
          return (
            <video
              key={mediaId}
              controls
              preload="metadata"
              src={src}
              className="aspect-video max-h-72 w-full rounded-lg bg-black object-contain"
            />
          );
        }
        return (
          // Öğrenci yüklemesi; boyut cevap dosyasına göre değişir.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={mediaId} src={src} alt="Öğrenci görseli" className="max-h-72 w-full rounded-lg bg-bg object-contain" />
        );
      })}
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
 * Açık uçlu cevapların puanlanması.
 * AI yolu: ses (sonra konuşmadan metne) ve metin (sonra dil modeli). Manuel yol: video ve görsel.
 * Otomatik puan bağlanana kadar puanı personel girer.
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
  const queueIds = useMemo(
    () => (assignmentId ? [assignmentId] : scope.ready ? scope.gradingIds : []),
    [assignmentId, scope.ready, scope.gradingIds],
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
    queryKey: ["grading", companyId, queueIds],
    enabled: queueIds.length > 0,
    queryFn: async () => {
      const batches = await Promise.all(
        queueIds.map((id) => customInstance<{ data: Item[] }>(`/companies/${companyId}/assignments/${id}/grading`)),
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
      data.sort((a, b) => (a.studentName ?? "").localeCompare(b.studentName ?? "", "tr"));
      return { data };
    },
  });
  const rows = query.data?.data ?? [];
  const [score, setScore] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>("pending");
  const [mode, setMode] = useState<Mode>("ai");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [transcriptOverrides, setTranscriptOverrides] = useState<Record<string, MediaTranscript>>({});
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [transcriptProgress, setTranscriptProgress] = useState<{ index: number; total: number } | null>(null);
  const review = useReview();
  const publish = usePublish();
  const openedExam = useRef("");

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
      customInstance<{ data: { items: unknown[] } }>(
        `/companies/${companyId}/exam-versions/${examVersionId}/ai-prompts`,
      ),
  });

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

  const isScored = (item: Item) => item.scored || saved[item.answerId];
  const pendingCount = rows.filter((item) => !isScored(item)).length;
  const scoped = contextMismatch
    ? []
    : rows.filter((item) => {
        if (scope.gradeValue && item.gradeId !== scope.gradeValue) return false;
        if (scope.branchValue && item.branchId !== scope.branchValue) return false;
        return true;
      });
  const statusRows = scoped.filter((item) => (filter === "done" ? isScored(item) : !isScored(item)));
  const aiRows = statusRows.filter((item) => modeOf(laneOf(item.interactionType)) === "ai");
  const manualRows = statusRows.filter((item) => modeOf(laneOf(item.interactionType)) === "manual");
  const visible = mode === "ai" ? aiRows : manualRows;
  const leftLane: Lane = mode === "ai" ? "audio" : "video";
  const rightLane: Lane = mode === "ai" ? "text" : "image";
  const leftItems = visible.filter((item) => laneOf(item.interactionType) === leftLane);
  const rightItems = visible.filter((item) => laneOf(item.interactionType) === rightLane);
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

  async function identifyAudio() {
    const jobs = leftItems.flatMap((item) =>
      mediaIdsOf(item).map((mediaId) => ({ applicationId: item.applicationId, mediaId })),
    );
    if (jobs.length === 0 || activeMediaId) return;
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
      setActiveMediaId(null);
      setTranscriptProgress(null);
    }
  }

  async function save(item: Item) {
    const raw = score[item.answerId] ?? (item.finalScore != null ? String(item.finalScore) : "");
    if (raw === "") {
      notify.error("Önce puan girin");
      return;
    }
    const finalScore = Number(raw);
    setSavingId(item.answerId);
    try {
      await review.mutateAsync({
        id: item.answerId,
        data: {
          finalScore,
          rubric: { criteria: [{ label: "Genel", score: finalScore }] },
          feedback: feedback[item.answerId] ?? item.feedback ?? "",
        } as { finalScore: number },
      });
      setSaved((currentSaved) => ({ ...currentSaved, [item.answerId]: true }));
      notify.success("Değerlendirme kaydedildi");
    } catch (err) {
      notify.error(errorMessage(err, "Kaydedilemedi"));
    } finally {
      setSavingId(null);
    }
  }

  async function publishResults() {
    if (queueIds.length === 0) return;
    try {
      for (const id of queueIds) {
        await publish.mutateAsync({ id });
      }
      notify.success("Sonuçlar yayınlandı");
      setConfirmPublish(false);
    } catch (err) {
      notify.error(errorMessage(err, "Yayınlanamadı"));
    }
  }

  function scoreValue(item: Item) {
    return Object.prototype.hasOwnProperty.call(score, item.answerId)
      ? score[item.answerId]
      : item.finalScore != null
        ? String(item.finalScore)
        : "";
  }

  function feedbackValue(item: Item) {
    return Object.prototype.hasOwnProperty.call(feedback, item.answerId) ? feedback[item.answerId] : (item.feedback ?? "");
  }

  function renderCard(item: Item, index: number) {
    const lane = laneOf(item.interactionType);
    const done = isScored(item);
    const shownScore = done ? Number(scoreValue(item)) : null;
    return (
      <article key={item.answerId} className="grid min-w-0 gap-3 rounded-xl border border-border p-4">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{item.studentName?.trim() || "Öğrenci"}</p>
            <p className="text-xs text-fg-muted">
              <span className="numeric mr-1.5 text-fg-subtle">#{index + 1}</span>
              {interactionLabel(item.interactionType)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {done && shownScore != null && !Number.isNaN(shownScore) ? (
              <span className="numeric text-sm font-semibold text-fg">{formatScore(shownScore)} puan</span>
            ) : null}
            <Badge tone={done ? "success" : "warning"} dot>
              {done ? "Puanlandı" : "Bekliyor"}
            </Badge>
          </div>
        </header>
        <AnswerBody
          item={item}
          companyId={companyId}
          lane={lane}
          transcripts={transcripts}
          activeMediaId={activeMediaId}
        />
        <Field label="Puan" required>
          <Input
            type="number"
            min={0}
            step={0.5}
            suffix="puan"
            value={scoreValue(item)}
            onChange={(e) => setScore((currentScore) => ({ ...currentScore, [item.answerId]: e.target.value }))}
          />
        </Field>
        <Field label="Geri bildirim" hint="Öğrenci sonuç ekranında görür.">
          <Textarea
            rows={2}
            value={feedbackValue(item)}
            onChange={(e) => setFeedback((currentFeedback) => ({ ...currentFeedback, [item.answerId]: e.target.value }))}
          />
        </Field>
        <div className="flex justify-end">
          <Button type="button" loading={savingId === item.answerId} disabled={savingId !== null} onClick={() => void save(item)}>
            {done ? "Güncelle" : "Kaydet"}
          </Button>
        </div>
      </article>
    );
  }

  function renderColumn(lane: Lane, items: Item[]) {
    const copy = LANE_COPY[lane];
    const identifying = transcriptProgress != null;
    return (
      <section className="grid min-w-0 content-start gap-3">
        {lane === "audio" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={items.length === 0 || identifying || query.isLoading}
              onClick={() => void identifyAudio()}
            >
              {identifying && transcriptProgress
                ? `Tanımlanıyor ${transcriptProgress.index}/${transcriptProgress.total}`
                : "Sesi Tanımla"}
            </Button>
            {identifying ? (
              <p className="text-xs text-fg-muted" aria-live="polite">
                Sesler sırayla metne çevriliyor.
              </p>
            ) : null}
          </div>
        ) : null}
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
      description="Sınavı seçin. Açık uçlu ve sesli cevap sorularının modele gidecek metni AI metni sekmesindedir. Ses ve metin AI yolunda, video ve görsel manuel yolda puanlanır."
      back={board ? undefined : { href: filterKey ? `${hrefs.assignments}?${filterKey}` : hrefs.assignments, label: "Atamalar" }}
      actions={
        <Button type="button" onClick={() => setConfirmPublish(true)} disabled={queueIds.length === 0 || !query.isSuccess || contextMismatch}>
          Sonuçları yayınla
        </Button>
      }
    />
  );

  if (query.isError) {
    return (
      <div>
        {header}
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
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
        : scope.rosterQ.isLoading
          ? null
          : !scope.gradingId
            ? { title: "Bu şubede değerlendirilecek cevap yok", description: "Seçilen sınavı bu şubede bitirmiş öğrenci bulunmuyor." }
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
                { label: "Bekleyen", value: "pending", count: query.isSuccess ? scoped.filter((item) => !isScored(item)).length : undefined },
                { label: "Puanlanan", value: "done", count: query.isSuccess ? scoped.filter((item) => isScored(item)).length : undefined },
              ]}
            />
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
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
              ]}
            />
            {mode === "prerequisites" ? (
              <GradingPrerequisites companyId={companyId} examVersionId={examVersionId} />
            ) : mode === "prompt" ? (
              <GradingAiPrompts companyId={companyId} examVersionId={examVersionId} />
            ) : board && scope.ready && scope.rosterQ.isLoading ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : answerWaiting ? (
              <EmptyState tone="neutral" title={answerWaiting.title} description={answerWaiting.description} />
            ) : (
              <>
                {mode === "ai" ? (
                  <p className="text-xs text-fg-muted">
                    Sesler Sesi Tanımla ile metne çevrilir. Metinlerin dil modeliyle puanlanması sonra bağlanacak. Puanı şimdilik siz girin.
                  </p>
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
        pending={publish.isPending}
        description={
          pendingCount > 0
            ? `${pendingCount} cevap henüz puanlanmadı. Yayınlarsanız öğrenciler eksik puanla sonuçlarını görür. Yayın geri alınamaz.`
            : "Öğrenciler ve yetkili personel sonuçları görmeye başlar. Yayın geri alınamaz."
        }
        onClose={() => setConfirmPublish(false)}
        onConfirm={() => void publishResults()}
      />
    </div>
  );
}
