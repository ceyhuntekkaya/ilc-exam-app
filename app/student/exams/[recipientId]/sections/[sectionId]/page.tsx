"use client";

import { ExamApiError, postState, putPosition, sectionContent } from "@/src/features/exam-flow/api";
import { ConfirmDialog } from "@/src/features/exam-flow/ConfirmDialog";
import { useExamClock, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { ReconnectOverlay } from "@/src/features/exam-flow/ReconnectOverlay";
import { formatClock } from "@/src/features/exam-flow/format";
import { QuestionView } from "@/src/features/exam-player";
import { LiveExamSessionProvider } from "@/src/features/exam-player/session/LiveExamSessionProvider";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { readSession } from "@/src/features/exam-flow/session";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { examQuestionId?: string; question: { body?: QuestionViewModel; parts: QuestionViewModel["parts"] } };

export default function SectionQuestionPage() {
  const params = useParams<{ recipientId: string; sectionId: string }>();
  const { state, applyState, held } = useExamFlow();
  const remaining = useExamClock(held, state?.clock ?? null);
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"complete" | "leave" | null>(null);
  const section = state?.sections.find((item) => item.sectionId === params.sectionId);
  const session = readSession(params.recipientId);

  const resumeItemId = state?.currentItemId;
  useEffect(() => {
    const current = readSession(params.recipientId);
    if (!current || state?.stage !== "IN_SECTION" || state.currentSectionId !== params.sectionId) return;
    let cancelled = false;
    sectionContent(current.applicationId, current.sessionToken, params.sectionId)
      .then((loaded) => {
        if (cancelled) return;
        const list = loaded as Item[];
        setItems(list);
        const found = list.findIndex((item) => item.examQuestionId === resumeItemId);
        setIndex(found >= 0 ? found : 0);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ExamApiError ? err.message : "Sorular yüklenemedi");
      });
    return () => {
      cancelled = true;
    };
  }, [params.recipientId, params.sectionId, state?.currentSectionId, state?.stage]);

  useEffect(() => {
    if (remaining !== 0 || !state?.clock.running) return;
    const current = readSession(params.recipientId);
    if (!current) return;
    postState(`/applications/${current.applicationId}/heartbeat`, current.sessionToken, { events: [] })
      .then(applyState)
      .catch((err: unknown) => {
        if (err instanceof ExamApiError && err.state) applyState(err.state);
      });
  }, [applyState, params.recipientId, remaining, state?.clock.running]);

  useEffect(() => {
    const current = readSession(params.recipientId);
    const item = items[index];
    if (!current || !item?.examQuestionId) return;
    putPosition(current.applicationId, current.sessionToken, params.sectionId, item.examQuestionId).catch(() => undefined);
  }, [index, items, params.recipientId, params.sectionId]);

  if (!state || !session || !section) return <p className="text-sm text-ilc-navy/70">Bölüm açılıyor…</p>;

  const item = items[index];
  const model: QuestionViewModel | null = item
    ? {
        instruction: item.question.body?.instruction,
        stimulus: item.question.body?.stimulus ?? [],
        mainAudio: item.question.body?.mainAudio,
        parts: item.question.parts ?? [],
      }
    : null;
  const answered = item?.examQuestionId ? state.answeredItemIds.includes(item.examQuestionId) : false;
  const canNext = section.allowSkip || answered || index >= items.length - 1;

  async function act(path: "complete" | "leave") {
    setError(null);
    try {
      applyState(await postState(`/applications/${session!.applicationId}/sections/${params.sectionId}/${path}`, session!.sessionToken));
    } catch (err) {
      const flow = err instanceof ExamApiError ? err : null;
      if (flow?.state) applyState(flow.state);
      setError(flow?.message || "İşlem yapılamadı");
    } finally {
      setConfirm(null);
    }
  }

  return (
    <LiveExamSessionProvider applicationId={session.applicationId} sessionToken={session.sessionToken}>
      <div className="relative flex min-h-[70vh] flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ilc-line">
          <p className="text-sm font-medium text-ilc-navy">{section.title} · Soru {items.length ? index + 1 : 0} / {items.length}</p>
          <p className="text-sm font-semibold text-ilc-navy">{formatClock(remaining)}</p>
        </header>
        {remaining != null && remaining > 0 && remaining <= (state.clock.timeWarningSeconds ?? 300) * 1000 ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Süre azalıyor.</p>
        ) : null}
        <div className={held ? "pointer-events-none blur-sm" : undefined}>
          {model ? <QuestionView model={model} /> : <p className="text-sm text-ilc-navy/70">Sorular yükleniyor.</p>}
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <footer className="mt-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" disabled={!section.allowBack || index === 0} className="min-h-11 rounded-xl bg-white ring-1 ring-ilc-line disabled:opacity-40" onClick={() => setIndex((value) => Math.max(0, value - 1))}>Önceki</button>
          <button type="button" disabled={!canNext || index >= items.length - 1} className="min-h-11 rounded-xl bg-white ring-1 ring-ilc-line disabled:opacity-40" onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))}>Sonraki</button>
          {section.allowReturnAfterLeave ? (
            <button type="button" className="min-h-11 rounded-xl bg-white ring-1 ring-ilc-line" onClick={() => setConfirm("leave")}>Bölümden çık</button>
          ) : <span />}
          <button type="button" className="min-h-11 rounded-xl bg-ilc-navy text-sm text-white" onClick={() => setConfirm("complete")}>Bölümü bitir</button>
        </footer>
        <ReconnectOverlay show={held} />
        {confirm ? (
          <ConfirmDialog
            title={confirm === "complete" ? "Bölüm bitirilsin mi?" : "Bölümden çıkılsın mı?"}
            body="Süre bu ekrandan çıkınca durur."
            confirmLabel="Onayla"
            onConfirm={() => void act(confirm)}
            onCancel={() => setConfirm(null)}
          />
        ) : null}
      </div>
    </LiveExamSessionProvider>
  );
}
