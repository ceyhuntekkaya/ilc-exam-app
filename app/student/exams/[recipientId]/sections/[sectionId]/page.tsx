"use client";

import { ExamApiError, postState, putPosition, sectionContent } from "@/src/features/exam-flow/api";
import { useExamClock, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { ReconnectOverlay } from "@/src/features/exam-flow/ReconnectOverlay";
import { formatClock } from "@/src/features/exam-flow/format";
import { QuestionFrame, QuestionView } from "@/src/features/exam-player";
import { confirmCloseBatch, flushAnswerOutbox, takeCloseBatch } from "@/src/features/exam-player/session/answerOutboxClient";
import { getAnswerOutbox, type OutboxRecord } from "@/src/features/exam-player/session/answerOutbox";
import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { LiveExamSessionProvider } from "@/src/features/exam-player/session/LiveExamSessionProvider";
import { waitForMediaUploads } from "@/src/features/exam-player/session/mediaOutbox";
import { resetPlayerGuard, saveAllUnsaved, usePlayerGuard } from "@/src/features/exam-player/session/playerGuard";
import { viewBodyOf, type QuestionViewModel } from "@/src/features/exam-player/types";
import { readSession } from "@/src/features/exam-flow/session";
import { KidButton, KidDialog, KidLoading, KidNotice } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowLeft, IconArrowRight, IconCheck, IconClock, IconFlag, IconPause, IconRefresh, IconVolume } from "@/src/ui/icons";
import { useParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";

type Item = { examQuestionId?: string; question: { body?: QuestionViewModel; parts: QuestionViewModel["parts"] } };

export default function SectionQuestionPage() {
  const params = useParams<{ recipientId: string; sectionId: string }>();
  const { state, applyState, held } = useExamFlow();
  const timerHeld = held;
  const remaining = useExamClock(timerHeld, state?.clock ?? null);
  // Sınavın geneli için ayrı sayaç (bölüm süresi yok sayılır).
  const clock = state?.clock ?? null;
  const examOnlyClock = useMemo(() => (clock ? { ...clock, sectionRemainingMs: null } : null), [clock]);
  const examLeft = useExamClock(timerHeld, examOnlyClock);
  // Ses/video çalarken geçiş kilitli; kaydedilmemiş yazı varken geçişte sorulur.
  const guard = usePlayerGuard();
  const mediaBusy = guard.activeMedia != null;
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  useEffect(() => () => resetPlayerGuard(), []);
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"complete" | "leave" | null>(null);
  const [busy, setBusy] = useState(false);
  // "Start again": soru bileşeni sıfırdan açılsın (yalnız ekran; sunucuya istek yok).
  const [resetRound, setResetRound] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const section = state?.sections.find((item) => item.sectionId === params.sectionId);
  const session = readSession(params.recipientId);

  const resumeItemId = state?.currentItemId;
  // İçerik yalnız bölüm değişince yüklenir; kaldığı soru yükleme anındaki değerle okunur (her geçişte yeniden yükleme yok).
  const resumeIndex = useEffectEvent((list: Item[]) => {
    const found = list.findIndex((item) => item.examQuestionId === resumeItemId);
    return found >= 0 ? found : 0;
  });
  useEffect(() => {
    const current = readSession(params.recipientId);
    if (!current || state?.stage !== "IN_SECTION" || state.currentSectionId !== params.sectionId) return;
    let cancelled = false;
    sectionContent(current.applicationId, current.sessionToken, params.sectionId)
      .then((loaded) => {
        if (cancelled) return;
        const list = loaded as Item[];
        setItems(list);
        setIndex(resumeIndex(list));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ExamApiError ? err.message : "Questions could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.recipientId, params.sectionId, state?.currentSectionId, state?.stage]);

  // Süre bitince sunucuya bir kez haber ver. Sunucu hâlâ "çalışıyor" derse yeni saat yine 0 olur;
  // kilit 5 sn tutulur ki her yanıtta yeniden istek atılıp döngüye girilmesin (düzenli heartbeat zaten 5 sn'de bir).
  const zeroSentAt = useRef(0);
  useEffect(() => {
    if (remaining !== 0 || !state?.clock.running) return;
    if (Date.now() - zeroSentAt.current < 5000) return;
    const current = readSession(params.recipientId);
    if (!current) return;
    zeroSentAt.current = Date.now();
    // Son cevap kutuya girsin, bir kez denensin, sonra süre sinyali gitsin. Yetişmeyen yazı sunucunun penceresine kalır.
    void saveAllUnsaved()
      .then(() => flushAnswerOutbox(current.applicationId))
      .finally(() => {
        postState(`/applications/${current.applicationId}/heartbeat`, current.sessionToken, { events: [] })
          .then(applyState)
          .catch((err: unknown) => {
            if (err instanceof ExamApiError && err.state) applyState(err.state);
          });
      });
  }, [applyState, params.recipientId, remaining, state?.clock.running]);

  useEffect(() => {
    const current = readSession(params.recipientId);
    const item = items[index];
    if (!current || !item?.examQuestionId) return;
    putPosition(current.applicationId, current.sessionToken, params.sectionId, item.examQuestionId).catch(() => undefined);
  }, [index, items, params.recipientId, params.sectionId]);

  // Yeni soruya geçince sayfanın başından başla (uzun okuma metinlerinde kaybolmasın).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  // Alt çubuktaki soru takibinde şu anki soru hep görünür kalsın.
  const navRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index, items.length]);

  const applicationId = state?.applicationId ?? "";
  const records = useSyncExternalStore(
    (onStoreChange) => (applicationId ? getAnswerOutbox(applicationId).subscribe(onStoreChange) : () => undefined),
    () => (applicationId ? getAnswerOutbox(applicationId).getSnapshot() : EMPTY_RECORDS),
    () => EMPTY_RECORDS,
  );

  if (!state || !session || !section) {
    return (
      <div className="student-container py-6">
        <KidLoading label="Opening section…" />
      </div>
    );
  }

  const item = items[index];
  const model: QuestionViewModel | null = item
    ? {
        // Admin önizlemesiyle aynı dönüştürücü (viewBodyOf): gövde alanları her ekranda aynı.
        ...viewBodyOf(item.question.body),
        parts: item.question.parts ?? [],
      }
    : null;
  const phaseOf = (entry?: Item): AnswerPhase => {
    if (!entry) return "empty";
    const ids = [entry.examQuestionId, ...(entry.question.parts ?? []).map((part) => part.id)].filter((id): id is string => !!id);
    const mine = records.filter((row) => ids.includes(row.itemId));
    if (mine.some((row) => !row.hidden && row.state === "failed")) return "failed";
    if (mine.some((row) => !row.hidden && (row.state === "pending" || row.state === "sending"))) return "pending";
    if (mine.some((row) => row.state === "confirmed") || ids.some((id) => state.answeredItemIds.includes(id))) return "confirmed";
    return "empty";
  };
  const isAnswered = (entry?: Item) => phaseOf(entry) !== "empty";
  const answered = isAnswered(item);
  const saving = records.some((row) => !row.hidden && (row.state === "pending" || row.state === "sending"));
  const failedCount = items.filter((entry) => phaseOf(entry) === "failed").length;
  const last = index >= items.length - 1;
  const canNext = !mediaBusy && (section.allowSkip || answered || last);
  /** Geçiş: medya çalarken yok; kaydedilmemiş yazı varsa önce sor. */
  function go(action: () => void) {
    if (mediaBusy) return;
    if (guard.unsaved.size) {
      setPendingNav(() => action);
      return;
    }
    action();
  }
  const goTo = (target: number) => go(() => setIndex(Math.max(0, Math.min(items.length - 1, target))));
  const unanswered = items.filter((entry) => !isAnswered(entry)).length;
  const canJump = (target: number) => !mediaBusy && target !== index && (target < index ? section.allowBack : section.allowSkip);

  const warnMs = (state.clock.timeWarningSeconds ?? 300) * 1000;
  const timeTone = remaining == null ? "calm" : remaining <= 60_000 ? "critical" : remaining <= warnMs ? "warn" : "calm";
  const timeTotal = state.clock.sectionRemainingMs != null ? section.durationMs : null;

  async function act(path: "complete" | "leave") {
    if (!session) return;
    setError(null);
    setBusy(true);
    try {
      await saveAllUnsaved();
      await waitForMediaUploads();
      const answers = takeCloseBatch(session.applicationId);
      const next = await postState(
        `/applications/${session.applicationId}/sections/${params.sectionId}/${path}`,
        session.sessionToken,
        { answers },
      );
      confirmCloseBatch(session.applicationId, answers);
      applyState(next);
    } catch (err) {
      const flow = err instanceof ExamApiError ? err : null;
      if (flow?.state) applyState(flow.state);
      setError(flow?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <LiveExamSessionProvider applicationId={session.applicationId} sessionToken={session.sessionToken}>
      <div className="exam-sitting relative flex min-h-dvh flex-1 flex-col">
        {/* İnce üst çubuk (48px): bölüm, sıra, süre, ara ver. Soru alanına yer kalsın. */}
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
          <div className={cn("flex h-12 items-center justify-between gap-3", STAGE_INSET)}>
            <p className="min-w-0 truncate text-sm font-semibold text-neutral-800">
              {section.title}
              <span className="font-normal text-neutral-500"> · Question {items.length ? index + 1 : 0}/{items.length}</span>
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Sınav geneli kalan süre: bölüm süresinden farklıysa geniş ekranda ayrıca gösterilir. */}
              {examLeft != null && remaining != null && state.clock.sectionRemainingMs != null ? (
                <p className="numeric hidden h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-neutral-500 sm:flex" aria-label={`Time left for the whole test ${formatClock(examLeft)}`}>
                  Test {formatClock(examLeft)}
                </p>
              ) : null}
              {/* Süre sınırı varsa geri sayım; yoksa sayaç hiç gösterilmez (çocuk acele etmesin). */}
              {remaining != null ? (
                <p
                  className={cn(
                    "numeric flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold [&>svg]:size-4",
                    timeTone === "calm" && "bg-primary-50 text-primary-800",
                    timeTone === "warn" && "bg-(--kid-sun-bg) text-(--kid-sun)",
                    timeTone === "critical" && "bg-(--kid-coral-bg) text-(--kid-coral) ring-1 ring-(--kid-coral)",
                  )}
                  role="timer"
                  aria-label={`Time left ${formatClock(remaining)}`}
                >
                  <IconClock aria-hidden />
                  <span className="hidden text-xs font-semibold opacity-80 sm:inline">Time left</span>
                  {formatClock(remaining)}
                  {timeTone !== "calm" ? <span className="hidden font-semibold sm:inline">· hurry up</span> : null}
                </p>
              ) : null}
              {section.allowReturnAfterLeave ? (
                <button
                  type="button"
                  onClick={() => go(() => setConfirm("leave"))}
                  disabled={mediaBusy}
                  aria-label="Take a break"
                  className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 [&>svg]:size-5"
                >
                  <IconPause aria-hidden />
                  <span className="hidden sm:inline">{saving ? "Saving…" : "Break"}</span>
                </button>
              ) : null}
            </div>
          </div>
          {/* Süre çubuğu: bölüm süresinin ne kadarının kaldığını bir bakışta gösterir. */}
          {remaining != null && timeTotal ? (
            <div aria-hidden className="h-1 bg-neutral-100">
              <div
                className={cn(
                  "h-full transition-[width] duration-1000 ease-linear",
                  timeTone === "calm" ? "bg-primary-500" : timeTone === "warn" ? "bg-(--kid-sun-solid)" : "bg-(--kid-coral-solid)",
                )}
                style={{ width: `${Math.max(0, Math.min(100, (remaining / timeTotal) * 100))}%` }}
              />
            </div>
          ) : null}
        </header>

        {/* Soru alanı: laptopta (1920×1080) oklarla birlikte ekranı doldurur. Kart max-width almaz. */}
        <div className={cn("flex w-full flex-1 flex-col py-3", STAGE_INSET)}>
          <div className="relative flex w-full flex-1 flex-col">
            {/* Admin "Öğrenci önizlemesi" (QuestionPreviewShell) ile aynı kap: öğretmenin gördüğü = öğrencinin gördüğü. */}
            <QuestionFrame className={cn("min-h-[calc(100dvh-9.5rem)]", held && "pointer-events-none blur-sm")}>
              {model ? <QuestionView key={`${item?.examQuestionId ?? index}:${resetRound}`} model={model} /> : error ? null : <KidLoading label="Loading questions…" rows={1} />}
            </QuestionFrame>
            {/* Soruyu ilk hâline döndür (yalnız ekran). Kayıtlı cevap, yeni cevap verilene kadar geçerli kalır. */}
            {item && answered && !mediaBusy && !held ? (
              <div className="absolute right-3 bottom-3">
                <KidButton variant="soft" className="min-h-11 text-sm shadow-sm" onClick={() => setConfirmReset(true)}>
                  <IconRefresh aria-hidden />
                  Start again
                </KidButton>
              </div>
            ) : null}
          </div>
          {error ? <div className="mt-3"><KidNotice tone="coral">{error}</KidNotice></div> : null}
        </div>

        {/* Alt çubuk: solda Önceki, ortada soru takibi, sağda Sonraki / Bitir. */}
        <footer className="pb-safe sticky bottom-0 z-30 border-t border-neutral-200 bg-white pt-2">
          {mediaBusy ? (
            <p className={cn("flex items-center justify-center gap-1.5 pb-1.5 text-center text-xs font-semibold text-primary-700 [&>svg]:size-4", STAGE_INSET)} aria-live="polite">
              <IconVolume aria-hidden />
              Please wait. Finish listening, watching or recording first.
            </p>
          ) : saving ? (
            <p className={cn("pb-1.5 text-center text-xs font-semibold text-primary-700", STAGE_INSET)} aria-live="polite">
              Saving your answers…
            </p>
          ) : !canNext ? (
            <p className={cn("pb-1.5 text-center text-xs font-semibold text-(--kid-sun)", STAGE_INSET)}>
              {guard.unsaved.size ? "Save your answer to continue." : "Answer this question to continue."}
            </p>
          ) : section.allowSkip && item && !answered && !guard.unsaved.size ? (
            // "Soru atlayabilir" açık: boş bırakılabildiğini söyle (yoksa çocuk cevaplamak zorunda sanıyor).
            <p className={cn("pb-1.5 text-center text-xs font-semibold text-neutral-500", STAGE_INSET)} aria-live="polite">
              {last ? "You can leave this question blank." : "You can skip this question. Tap Next."}
            </p>
          ) : null}
          <div className={cn("flex w-full items-center gap-2 sm:gap-3", STAGE_INSET)}>
            <KidButton
              variant="soft"
              disabled={!section.allowBack || index === 0 || mediaBusy}
              onClick={() => goTo(index - 1)}
              className={cn(FOOTER_BTN, FOOTER_ICON, "shadow-[0_3px_0_var(--color-primary-200)]", !section.allowBack && "invisible")}
              aria-label="Previous question"
            >
              <IconArrowLeft aria-hidden />
              <span className="hidden sm:inline">Back</span>
            </KidButton>

            <nav aria-label="Questions" className="scrollbar-none min-w-0 flex-1 overflow-x-auto">
              <ol ref={navRef} className="mx-auto flex w-max gap-1 p-1">
                {items.map((entry, position) => {
                  const phase = phaseOf(entry);
                  const current = position === index;
                  const label = phase === "confirmed" ? "saved" : phase === "pending" ? "saving" : phase === "failed" ? "not saved" : "not answered";
                  return (
                    <li key={entry.examQuestionId ?? position}>
                      <button
                        type="button"
                        disabled={!canJump(position)}
                        onClick={() => goTo(position)}
                        aria-current={current ? "step" : undefined}
                        aria-label={`Question ${position + 1}, ${label}`}
                        className={cn(
                          // Dokunma hedefi ≥ 44px (çocuk, tablet).
                          "relative grid size-11 place-items-center rounded-lg text-sm font-bold transition disabled:cursor-default",
                          current && "bg-primary-600 text-white",
                          !current && phase === "confirmed" && "bg-(--kid-mint-bg) text-(--kid-mint)",
                          !current && phase === "failed" && "bg-rose-100 text-rose-700",
                          !current && (phase === "empty" || phase === "pending") && "bg-neutral-100 text-neutral-500",
                          !current && "enabled:hover:ring-2 enabled:hover:ring-primary-300",
                        )}
                      >
                        {position + 1}
                        {phase === "pending" ? <span className="absolute right-1 top-1 size-2 rounded-full bg-primary-500" aria-hidden /> : null}
                        {phase === "failed" ? (
                          <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-rose-600 text-[10px] leading-none font-bold text-white" aria-hidden>
                            !
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {last ? (
              <KidButton variant="sun" className={cn(FOOTER_BTN, "px-3!")} onClick={() => go(() => setConfirm("complete"))} disabled={!items.length || mediaBusy} aria-label="Finish section">
                <IconFlag aria-hidden />
                <span>{saving ? "Saving…" : "Finish"}</span>
              </KidButton>
            ) : (
              <KidButton className={cn(FOOTER_BTN, FOOTER_ICON)} disabled={!canNext} onClick={() => goTo(index + 1)} aria-label="Next question">
                <span className="hidden sm:inline">Next</span>
                <IconArrowRight aria-hidden />
              </KidButton>
            )}
          </div>
        </footer>

        {/* Geniş ekranda gezinme: ekran kenarından 16px, dikeyde ortalı. Soru kartı 96px içeride biter → ok ile kart arası ~24px. */}
        {items.length ? (
          <div className="pointer-events-none fixed inset-x-4 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
            <div className="flex w-full items-center justify-between">
            {section.allowBack ? (
              <SideNav side="left" label="Back" disabled={index === 0 || mediaBusy} onClick={() => goTo(index - 1)} />
            ) : null}
            {last ? (
              <SideNav side="right" label="Finish" tone="sun" disabled={mediaBusy} onClick={() => go(() => setConfirm("complete"))} />
            ) : (
              <SideNav side="right" label="Next" disabled={!canNext} onClick={() => goTo(index + 1)} />
            )}
              {section.allowBack ? null : <span />}
            </div>
          </div>
        ) : null}

        <ReconnectOverlay show={held} />
        {confirmReset && item ? (
          <ResetQuestionDialog
            parts={(item.question.parts ?? []).map((part) => part.id)}
            onDone={() => {
              setConfirmReset(false);
              setResetRound((value) => value + 1);
            }}
            onCancel={() => setConfirmReset(false)}
          />
        ) : null}
        {pendingNav ? (
          <KidDialog
            title="Save your answer?"
            icon={<IconCheck />}
            tone="sun"
            body="You wrote something new but you did not save it. Save it before you go."
            confirmLabel="Save and go"
            cancelLabel="Stay here"
            onConfirm={() => {
              void saveAllUnsaved().then(() => {
                const next = pendingNav;
                setPendingNav(null);
                next();
              });
            }}
            onCancel={() => setPendingNav(null)}
          />
        ) : null}
        {confirm === "complete" ? (
          <KidDialog
            title="Finish this section?"
            icon={<IconFlag />}
            tone={unanswered ? "sun" : "primary"}
            body={
              failedCount
                ? <>{failedCount === 1 ? "One answer" : `${failedCount} answers`} could not be saved. They are marked with !. If they still cannot be saved, this part stays open.</>
                : unanswered
                  ? <>You have <strong>{unanswered} unanswered {unanswered === 1 ? "question" : "questions"}</strong>. After you finish, you cannot go back to this section.</>
                  : "You answered all the questions. After you finish, you cannot go back to this section."
            }
            confirmLabel={saving ? "Saving…" : "Finish"}
            cancelLabel={unanswered ? "Back to questions" : "Cancel"}
            busy={busy}
            busyLabel="Please wait…"
            onConfirm={() => void act("complete")}
            onCancel={() => setConfirm(null)}
          />
        ) : null}
        {confirm === "leave" ? (
          <KidDialog
            title="Take a break?"
            icon={<IconPause />}
            body="You will go back to the sections page and the timer for this section will stop. When you are ready, you can continue from this question."
            confirmLabel={saving ? "Saving…" : "Take a break"}
            cancelLabel="Keep going"
            busy={busy}
            busyLabel="Please wait…"
            onConfirm={() => void act("leave")}
            onCancel={() => setConfirm(null)}
          />
        ) : null}
      </div>
    </LiveExamSessionProvider>
  );
}

type AnswerPhase = "empty" | "pending" | "failed" | "confirmed";

const EMPTY_RECORDS: OutboxRecord[] = [];

/**
 * "Start again" onayı: soru ilk açıldığı hâline döner. Yalnız bu tarayıcıdaki taslak silinir; sunucuya istek yok.
 * Oturum bağlamı gerektiği için sağlayıcının içinde çizilir.
 */
function ResetQuestionDialog({ parts, onDone, onCancel }: { parts: string[]; onDone: () => void; onCancel: () => void }) {
  const session = useExamSession();
  return (
    <KidDialog
      title="Start this question again?"
      icon={<IconRefresh />}
      tone="sun"
      body="The question will look new again. Your last answer stays saved until you give a new one."
      confirmLabel="Start again"
      cancelLabel="Cancel"
      onConfirm={() => {
        for (const id of parts) session?.discardDraft?.(id);
        onDone();
      }}
      onCancel={onCancel}
    />
  );
}

/** Kenar gezinme düğmesi (lg+): yuvarlak ok + altında etiket, sayfa ortasında sabit. */
function SideNav({
  side,
  label,
  tone = "primary",
  disabled,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  tone?: "primary" | "sun";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === "Back" ? "Previous question" : label === "Next" ? "Next question" : "Finish section"}
      className={cn(
        "group pointer-events-auto flex flex-col items-center gap-1.5 disabled:pointer-events-none disabled:opacity-35",
        side === "left" ? "order-first" : "order-last",
      )}
    >
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full shadow-md ring-1 transition group-hover:scale-105 group-active:scale-95 [&>svg]:size-6",
          tone === "sun"
            ? "bg-secondary-400 text-neutral-950 ring-secondary-500"
            : side === "left"
              ? "bg-white text-primary-700 ring-neutral-200 group-hover:ring-primary-300"
              : "bg-primary-600 text-white ring-primary-700",
        )}
      >
        {tone === "sun" ? <IconFlag aria-hidden /> : side === "left" ? <IconArrowLeft aria-hidden /> : <IconArrowRight aria-hidden />}
      </span>
      <span className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)]">{label}</span>
    </button>
  );
}

/**
 * Alt çubuk düğmeleri (lg altı): hepsi aynı genişlik ve yükseklikte, böylece ortadaki soru numaraları tam ortada kalır.
 * Telefonda 44px kare ikon (Finish yazılı); tablette 7.5rem eşit genişlik ikon + metin. lg+ kenar düğmeleri devralır.
 *
 * Soru sahnesi yatay boşluğu.
 * Hedef: sıradan laptop 1920×1080. lg+ kenar oku 16px içeride ve 56px geniş (biter: 72px).
 * Kart 96px içeriden başlar; ok ile beyaz alan arasında ~24px kalır. Max-width yok, ekran dolar.
 * 1366×768 aynı boşlukla dolar. lg altında ok yok; telefon ve dar tablette gutter yeterli.
 */
const STAGE_INSET = "px-4 sm:px-6 lg:px-24";

const FOOTER_BTN = "h-11 shrink-0 sm:w-30 sm:px-3! lg:hidden";
/** Telefonda yalnız ikon: 44px kare. */
const FOOTER_ICON = "w-11 px-0!";
