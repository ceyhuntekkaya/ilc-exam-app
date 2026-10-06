"use client";

import { usePublish, useReview } from "@/src/api/generated/evaluation-controller/evaluation-controller";
import { customInstance } from "@/src/api/mutator";
import {
  AssignmentScopeFields,
  filtersToQuery,
  useAssignmentScope,
} from "@/src/features/assignments/assignmentScope";
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
import { useEffect, useRef, useState } from "react";

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
  feedback?: string | null;
  finalScore?: number | null;
  scored: boolean;
};

type Lane = "audio" | "text" | "video" | "image";
type Mode = "ai" | "manual";

const LANE_COPY: Record<Lane, { title: string; hint: string; empty: string }> = {
  audio: {
    title: "Sesler",
    hint: "Konuşma kaydı. Metne çevirme sonra bağlanacak.",
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

function modeOf(lane: Lane): Mode {
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
}: {
  item: Item;
  companyId: string;
  lane: Lane;
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
          return <audio key={mediaId} controls preload="none" src={src} className="w-full" />;
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
  /** Verilmezse kuyruk, seçilen sınav ve şubenin atamasından gelir (`/staff/grading`). */
  assignmentId?: string;
}) {
  const board = !assignmentId;
  const hrefs = useOpsHref();
  const router = useRouter();
  const scope = useAssignmentScope(companyId);
  const seeded = useRef(false);
  const lastTarget = useRef("");
  const activeId = assignmentId ?? (scope.ready ? scope.gradingId : null);

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
    queryKey: ["grading", companyId, activeId],
    enabled: Boolean(activeId),
    queryFn: () => customInstance<{ data: Item[] }>(`/companies/${companyId}/assignments/${activeId}/grading`),
  });
  const rows = query.data?.data ?? [];
  const [score, setScore] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>("pending");
  const [mode, setMode] = useState<Mode>("ai");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const review = useReview();
  const publish = usePublish();

  const current = scope.assignments.find((row) => row.id === assignmentId);
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
    if (!activeId) return;
    try {
      await publish.mutateAsync({ id: activeId });
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
        <AnswerBody item={item} companyId={companyId} lane={lane} />
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
      description="Sınav ve şubeyi seçin. Ses ve metin AI yolunda, video ve görsel manuel yolda puanlanır."
      back={board ? undefined : { href: filterKey ? `${hrefs.assignments}?${filterKey}` : hrefs.assignments, label: "Atamalar" }}
      actions={
        <Button type="button" onClick={() => setConfirmPublish(true)} disabled={!activeId || !query.isSuccess || contextMismatch}>
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

  const waiting = board
    ? !scope.examValue
      ? { title: "Sınavı seçin", description: "Cevaplar, sınav ve şube seçilince o şubeye ait olarak listelenir." }
      : !scope.ready
        ? { title: "Şubeyi seçin", description: "Seviye ve şube seçilince bu sınavın o şubedeki cevapları açılır." }
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

      {scope.listLoading ? null : waiting ? (
        <EmptyState tone="neutral" title={waiting.title} description={waiting.description} />
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
              ]}
            />
            {mode === "ai" ? (
              <p className="text-xs text-fg-muted">
                Sesler önce metne çevrilecek, metinler dil modeliyle puanlanacak. Bağlantı henüz yok; puanı şimdilik siz girin.
              </p>
            ) : null}
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              {renderColumn(leftLane, leftItems)}
              {renderColumn(rightLane, rightItems)}
            </div>
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
