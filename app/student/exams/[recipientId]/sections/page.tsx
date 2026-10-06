"use client";

import { ExamApiError, enterSection, postState } from "@/src/features/exam-flow/api";
import { ConfirmDialog, SectionStatusBadge } from "@/src/features/exam-flow/ConfirmDialog";
import { useExamClock, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { formatClock, formatDuration } from "@/src/features/exam-flow/format";
import { readSession } from "@/src/features/exam-flow/session";
import { useState } from "react";

export default function SectionListPage() {
  const { recipientId, state, applyState, held } = useExamFlow();
  const remaining = useExamClock(held, state?.clock ?? null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state) return null;

  const finished = state.stage === "FINISHED" || state.finishedReason != null;
  const incomplete = state.sections.some((section) => section.status !== "COMPLETED" && section.status !== "EXPIRED");
  const examLeft = state.clock.examRemainingMs;

  async function enter(sectionId: string) {
    const session = readSession(recipientId);
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const entered = await enterSection(session.applicationId, session.sessionToken, sectionId);
      applyState(entered.state);
    } catch (err) {
      const flow = err instanceof ExamApiError ? err : null;
      if (flow?.state) applyState(flow.state);
      setError(flow?.message || "Bölüm açılamadı");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function finish(confirmIncomplete: boolean) {
    const session = readSession(recipientId);
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      applyState(await postState(`/applications/${session.applicationId}/finish`, session.sessionToken, { confirmIncomplete }));
    } catch (err) {
      setError(err instanceof ExamApiError ? err.message : "Sınav bitirilemedi");
    } finally {
      setBusy(false);
      setConfirmFinish(false);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">Bölümler</h2>
          <p className="text-sm text-ilc-navy/70">Bölüm listesinde süre durur. Bölüme girince işler.</p>
        </div>
        <p className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ilc-navy ring-1 ring-ilc-line">
          Sınav süresi: {examLeft == null ? "Süresiz" : formatClock(remaining ?? examLeft)}
          {finished ? " · Süre doldu" : ""}
        </p>
      </header>
      {state.finishedReason === "EXAM_TIME_UP" || (examLeft === 0 && state.clock.examRemainingMs === 0) ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Süre doldu. Bölümlere tekrar girilemez.</p>
      ) : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {state.sections.map((section) => (
          <li key={section.sectionId} className="rounded-3xl bg-white p-4 ring-1 ring-ilc-line md:p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-ilc-navy">{section.title}</h3>
              <SectionStatusBadge status={section.status} />
            </div>
            <p className="mt-2 text-sm text-ilc-navy/80">
              {section.questionCount} soru · {section.durationMs == null ? "Süresiz" : formatDuration(section.durationMs / 1000)}
              {section.remainingMs != null && section.status === "ACTIVE" ? ` · kalan ${formatClock(section.remainingMs)}` : ""}
            </p>
            {section.lockReason ? <p className="mt-2 text-sm text-ilc-navy/70">{section.lockReason}</p> : null}
            {!finished && section.canEnter ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPending(section.sectionId)}
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                {section.status === "ACTIVE" || section.status === "LEFT" ? "Devam et" : "Gir"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!finished && state.canFinish ? (
        <button type="button" disabled={busy} onClick={() => setConfirmFinish(true)} className="min-h-11 rounded-xl bg-white px-4 text-sm ring-1 ring-ilc-line">
          Sınavı bitir
        </button>
      ) : null}
      {pending ? (
        <ConfirmDialog
          title="Bölüme girilsin mi?"
          body={
            state.sections.find((section) => section.sectionId === pending)?.allowReturnAfterLeave === false
              ? "Bölüme girdiğinizde süreniz başlar. Bu bölümden çıktıktan sonra geri dönemezsiniz."
              : "Bölüme girdiğinizde süreniz başlar."
          }
          confirmLabel="Gir"
          onConfirm={() => void enter(pending)}
          onCancel={() => setPending(null)}
        />
      ) : null}
      {confirmFinish ? (
        <ConfirmDialog
          title="Sınavı bitir"
          body={incomplete ? "Tamamlanmamış bölüm var. Yine de teslim edilsin mi?" : "Sınav teslim edilsin mi?"}
          confirmLabel="Teslim et"
          onConfirm={() => void finish(incomplete)}
          onCancel={() => setConfirmFinish(false)}
        />
      ) : null}
    </section>
  );
}
