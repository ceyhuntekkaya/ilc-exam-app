"use client";

import {
  LANE_COPY,
  answerText,
  awardFromPercent,
  formatGradeScore,
  interactionLabel,
  laneOf,
  mediaIdsOf,
  mediaSrc,
  percentFromAward,
  whole,
  type Lane,
  type MediaTranscript,
  type ReviewCardItem,
} from "@/src/features/grading/answerCardModel";
import { answerBadges, isUnreviewedAi } from "@/src/features/grading/aiGradingModel";
import { Badge, Button, Field, Input, Textarea } from "@/src/ui";
import { useState, type ReactNode } from "react";

export type CardDraft = { percent: string; score: string; rationale: string; feedback: string };

function AnswerBody({
  item,
  companyId,
  lane,
  transcripts,
  activeMediaId,
}: {
  item: ReviewCardItem;
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

/**
 * R-30: ORTAK cevap kartı. Kurumsal puanlama ekranı (`GradingSection`), bireysel havuz insan kuyruğu
 * (`IndividualHumanQueue`) ve R-32 (inceleme talebi) aynı kartı kullanır: yazılı cevap, ses + transkript,
 * AI puanı / gerekçesi / geri bildirimi, durum rozetleri, Onayla / Değiştir.
 *
 * Kontrollü bileşen: puan alanlarının değerleri (`draft`) ve eylemler çağıran tarafta durur.
 * - `draft` + `onDraftChange` + `onSave` yoksa kart salt özet gösterir (puan alanı yok).
 * - `onApprove` verilirse ve cevap "AI puanı — gözden geçirilmedi" ise alanlar kilitli gelir; "Onayla" puanı olduğu gibi
 *   onaylar, "Değiştir" alanları açar (kayıt `PUT …/evaluation`).
 * - `item.answer` yoksa içerik yerine `contentNote` yazılır.
 */
export function AnswerReviewCard({
  item,
  index,
  companyId,
  transcripts = {},
  activeMediaId = null,
  draft,
  onDraftChange,
  done,
  busy = false,
  saving = false,
  onSave,
  approving = false,
  onApprove,
  evaluating = false,
  onEvaluate,
  evaluateDisabled = false,
  notice,
  extra,
  contentNote,
}: {
  item: ReviewCardItem;
  index?: number;
  companyId: string;
  transcripts?: Record<string, MediaTranscript>;
  activeMediaId?: string | null;
  draft?: CardDraft;
  onDraftChange?: (patch: Partial<CardDraft>) => void;
  done?: boolean;
  /** Başka bir eylem sürüyor: bu kartın düğmeleri kapanır. */
  busy?: boolean;
  saving?: boolean;
  onSave?: () => void;
  approving?: boolean;
  onApprove?: () => void;
  evaluating?: boolean;
  onEvaluate?: () => void;
  evaluateDisabled?: boolean;
  notice?: ReactNode;
  extra?: ReactNode;
  contentNote?: string;
}) {
  const [editing, setEditing] = useState(false);
  const lane = laneOf(item.interactionType);
  const locked = Boolean(item.published);
  const isDone = done ?? item.scored;
  const unreviewed = isUnreviewedAi(item) && Boolean(onApprove) && !locked;
  const fieldsDisabled = locked || (unreviewed && !editing);
  const editable = Boolean(draft && onDraftChange);

  const shownScore = item.finalScore ?? (draft && draft.score.trim() !== "" ? Number(draft.score) : null);
  const shownPercent = draft && draft.percent.trim() !== "" ? Number(draft.percent) : (item.percent ?? null);
  const examMax = item.examPoints;
  const badges = answerBadges({ ...item, scored: isDone });
  const jobActive = item.jobStatus === "PENDING" || item.jobStatus === "RUNNING";

  return (
    <article className="grid min-w-0 gap-3 rounded-xl border border-border p-4" data-testid={`answer-card-${item.answerId}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{item.studentName?.trim() || "Öğrenci"}</p>
          <p className="text-xs text-fg-muted">
            {index != null ? <span className="numeric mr-1.5 text-fg-subtle">#{index + 1}</span> : null}
            {item.attemptNo && item.attemptNo > 0 ? `${item.attemptNo}. deneme · ` : ""}
            {item.examTitle ? `${item.examTitle} · ` : ""}
            {interactionLabel(item.interactionType)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shownScore != null && !Number.isNaN(shownScore) ? (
            <span className="numeric text-sm font-semibold text-fg">
              {shownPercent != null && !Number.isNaN(shownPercent) ? `${whole(shownPercent)}% · ` : ""}
              {formatGradeScore(shownScore)}
              {examMax != null ? ` / ${formatGradeScore(examMax)}` : ""} puan
            </span>
          ) : null}
          <Badge tone={locked ? "info" : isDone ? "success" : "warning"} dot>
            {locked ? "Yayınlandı" : isDone ? "Puanlandı" : "Bekliyor"}
          </Badge>
        </div>
      </header>
      {badges.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Değerlendirme durumu">
          {badges.map((badge) => (
            <li key={badge.key}>
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {item.answer ? (
        <AnswerBody item={item} companyId={companyId} lane={lane} transcripts={transcripts} activeMediaId={activeMediaId} />
      ) : contentNote ? (
        <p className="rounded-lg bg-bg px-3.5 py-3 text-sm text-fg-muted">{contentNote}</p>
      ) : null}
      {notice}
      {editable && draft && onDraftChange ? (
        <>
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <Field label="Soru puan yüzdesi" required>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                suffix="%"
                value={draft.percent}
                disabled={fieldsDisabled}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next.trim() === "") {
                    onDraftChange({ percent: next, score: "" });
                    return;
                  }
                  const parsed = Number(next);
                  if (!Number.isNaN(parsed) && examMax != null && examMax > 0) {
                    onDraftChange({ percent: next, score: awardFromPercent(parsed, examMax) });
                  } else onDraftChange({ percent: next });
                }}
              />
            </Field>
            <Field
              label="Sınav soru puanı"
              required
              hint={examMax != null ? `Bu sınavda soru ${formatGradeScore(examMax)} puan.` : undefined}
            >
              <Input
                type="number"
                min={0}
                max={examMax ?? undefined}
                step={1}
                suffix="puan"
                value={draft.score}
                disabled={fieldsDisabled}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next.trim() === "") {
                    onDraftChange({ score: next, percent: "" });
                    return;
                  }
                  const parsed = Number(next);
                  if (!Number.isNaN(parsed) && examMax != null && examMax > 0) {
                    onDraftChange({ score: next, percent: percentFromAward(parsed, examMax) });
                  } else onDraftChange({ score: next });
                }}
              />
            </Field>
          </div>
          {!locked && onEvaluate && (lane === "audio" || lane === "text") ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full md:w-auto"
              loading={evaluating || jobActive}
              disabled={evaluateDisabled || jobActive || (busy && !evaluating)}
              onClick={onEvaluate}
            >
              AI ile Değerlendir
            </Button>
          ) : null}
          {lane === "audio" || lane === "text" ? (
            <Field label="Gerekçe" hint="Rubriğe dayalı. Öğrenci bunu görmez.">
              <Textarea
                rows={3}
                value={draft.rationale}
                disabled={fieldsDisabled}
                onChange={(e) => onDraftChange({ rationale: e.target.value })}
              />
            </Field>
          ) : null}
          <Field label="Geri bildirim" hint="Öğrenci sonuç ekranında görür.">
            <Textarea
              rows={2}
              value={draft.feedback}
              disabled={fieldsDisabled}
              onChange={(e) => onDraftChange({ feedback: e.target.value })}
            />
          </Field>
        </>
      ) : null}
      {extra}
      {locked ? null : (
        <div className="flex flex-wrap justify-end gap-2">
          {unreviewed ? (
            <>
              {editable && !editing ? (
                <Button type="button" variant="secondary" className="min-h-11" disabled={busy || approving} onClick={() => setEditing(true)}>
                  Değiştir
                </Button>
              ) : null}
              <Button
                type="button"
                className="min-h-11"
                loading={approving}
                disabled={busy && !approving}
                onClick={onApprove}
              >
                Onayla
              </Button>
              {editing && onSave ? (
                <Button type="button" className="min-h-11" loading={saving} disabled={busy && !saving} onClick={onSave}>
                  Kaydet
                </Button>
              ) : null}
            </>
          ) : editable && onSave ? (
            <Button type="button" className="min-h-11" loading={saving} disabled={busy && !saving} onClick={onSave}>
              {isDone ? "Güncelle" : "Kaydet"}
            </Button>
          ) : null}
        </div>
      )}
    </article>
  );
}
