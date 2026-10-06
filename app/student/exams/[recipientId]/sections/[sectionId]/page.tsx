"use client";

import { ExamApiError, postState, putPosition, sectionContent } from "@/src/features/exam-flow/api";
import { useExamClock, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { ReconnectOverlay } from "@/src/features/exam-flow/ReconnectOverlay";
import { formatClock } from "@/src/features/exam-flow/format";
import { QuestionView } from "@/src/features/exam-player";
import { LiveExamSessionProvider } from "@/src/features/exam-player/session/LiveExamSessionProvider";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { readSession } from "@/src/features/exam-flow/session";
import { KidButton, KidDialog, KidLoading, KidNotice } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowLeft, IconArrowRight, IconClock, IconFlag, IconPause } from "@/src/ui/icons";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = { examQuestionId?: string; question: { body?: QuestionViewModel; parts: QuestionViewModel["parts"] } };

export default function SectionQuestionPage() {
  const params = useParams<{ recipientId: string; sectionId: string }>();
  const { state, applyState, held } = useExamFlow();
  const remaining = useExamClock(held, state?.clock ?? null);
  // Sınavın geneli için ayrı sayaç (bölüm süresi yok sayılır).
  const clock = state?.clock ?? null;
  const examOnlyClock = useMemo(() => (clock ? { ...clock, sectionRemainingMs: null } : null), [clock]);
  const examLeft = useExamClock(held, examOnlyClock);
  const elapsedApp = readSession(params.recipientId)?.applicationId;
  const elapsed = useElapsed(held, elapsedApp ? `${elapsedApp}:${params.sectionId}` : null);
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"complete" | "leave" | null>(null);
  const [busy, setBusy] = useState(false);
  // Bu oturumda cevap verilen sorular: sunucunun answeredItemIds listesi heartbeat ile (5 sn) gelir;
  // beklemeden "Next" açılsın ve numara yeşile dönsün.
  const [localAnswered, setLocalAnswered] = useState<ReadonlySet<string>>(() => new Set());
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

  // Yeni soruya geçince sayfanın başından başla (uzun okuma metinlerinde kaybolmasın).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  // Alt çubuktaki soru takibinde şu anki soru hep görünür kalsın.
  const navRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index, items.length]);

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
        instruction: item.question.body?.instruction,
        stimulus: item.question.body?.stimulus ?? [],
        mainAudio: item.question.body?.mainAudio,
        parts: item.question.parts ?? [],
      }
    : null;
  const isAnswered = (entry?: Item) =>
    entry?.examQuestionId ? state.answeredItemIds.includes(entry.examQuestionId) || localAnswered.has(entry.examQuestionId) : false;
  // Kayıt part kimliğiyle gelir (gecikmeli kayıt soru değiştikten sonra da düşebilir); hangi soruya ait olduğu buradan bulunur.
  function markAnswered(partId: string) {
    const owner = items.find((entry) => entry.question.parts?.some((part) => part.id === partId))?.examQuestionId;
    if (!owner) return;
    setLocalAnswered((prev) => (prev.has(owner) ? prev : new Set(prev).add(owner)));
  }
  const answered = isAnswered(item);
  const last = index >= items.length - 1;
  const canNext = section.allowSkip || answered || last;
  const unanswered = items.filter((entry) => !isAnswered(entry)).length;
  const canJump = (target: number) => target !== index && (target < index ? section.allowBack : section.allowSkip);

  const warnMs = (state.clock.timeWarningSeconds ?? 300) * 1000;
  const timeTone = remaining == null ? "calm" : remaining <= 60_000 ? "critical" : remaining <= warnMs ? "warn" : "calm";
  const timeTotal = state.clock.sectionRemainingMs != null ? section.durationMs : null;

  async function act(path: "complete" | "leave") {
    setError(null);
    setBusy(true);
    try {
      applyState(await postState(`/applications/${session!.applicationId}/sections/${params.sectionId}/${path}`, session!.sessionToken));
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
    <LiveExamSessionProvider applicationId={session.applicationId} sessionToken={session.sessionToken} onSaved={markAnswered}>
      <div className="relative flex min-h-dvh flex-1 flex-col">
        {/* İnce üst çubuk (48px): bölüm, sıra, süre, ara ver. Soru alanına yer kalsın. */}
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
          <div className="student-container flex h-12 items-center justify-between gap-3">
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
              <p
                className={cn(
                  "numeric flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold [&>svg]:size-4",
                  timeTone === "calm" && "bg-primary-50 text-primary-800",
                  timeTone === "warn" && "bg-(--kid-sun-bg) text-(--kid-sun)",
                  timeTone === "critical" && "bg-(--kid-coral-bg) text-(--kid-coral) ring-1 ring-(--kid-coral)",
                )}
                role="timer"
                aria-label={remaining != null ? `Time left ${formatClock(remaining)}` : `Time spent ${formatClock(elapsed)}`}
              >
                <IconClock aria-hidden />
                <span className="hidden text-xs font-semibold opacity-80 sm:inline">{remaining != null ? "Time left" : "Time"}</span>
                {formatClock(remaining ?? elapsed)}
                {timeTone !== "calm" ? <span className="hidden font-semibold sm:inline">· hurry up</span> : null}
              </p>
              {section.allowReturnAfterLeave ? (
                <button
                  type="button"
                  onClick={() => setConfirm("leave")}
                  aria-label="Take a break"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 [&>svg]:size-4"
                >
                  <IconPause aria-hidden />
                  <span className="hidden sm:inline">Break</span>
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

        {/* Soru alanı: ekranın büyük kısmı. */}
        <div className="student-container flex-1 py-3 sm:py-4 lg:px-24 xl:px-28">
          {/* Admin "Öğrenci önizlemesi" (QuestionPreviewShell) ile aynı kap: öğretmenin gördüğü = öğrencinin gördüğü. */}
          <div className={cn("w-full overflow-hidden rounded-lg border border-exam-slate-200 bg-white shadow-sm", held && "pointer-events-none blur-sm")}>
            <div className="px-4 py-4 sm:px-6">
              {model ? <QuestionView model={model} /> : error ? null : <KidLoading label="Loading questions…" rows={1} />}
            </div>
          </div>
          {error ? <div className="mt-3"><KidNotice tone="coral">{error}</KidNotice></div> : null}
        </div>

        {/* Alt çubuk: solda Önceki, ortada soru takibi, sağda Sonraki / Bitir. */}
        <footer className="pb-safe sticky bottom-0 z-30 border-t border-neutral-200 bg-white/95 pt-2 backdrop-blur">
          {!canNext ? <p className="student-container pb-1.5 text-center text-xs font-semibold text-(--kid-sun)">Answer this question to continue.</p> : null}
          <div className="student-container flex items-center gap-2 sm:gap-3">
            <KidButton
              variant="soft"
              disabled={!section.allowBack || index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className={cn(FOOTER_BTN, FOOTER_ICON, "shadow-[0_3px_0_var(--color-primary-200)]", !section.allowBack && "invisible")}
              aria-label="Previous question"
            >
              <IconArrowLeft aria-hidden />
              <span className="hidden sm:inline">Back</span>
            </KidButton>

            <nav aria-label="Questions" className="scrollbar-none min-w-0 flex-1 overflow-x-auto">
              <ol ref={navRef} className="mx-auto flex w-max gap-1 p-1">
                {items.map((entry, position) => {
                  const done = isAnswered(entry);
                  const current = position === index;
                  return (
                    <li key={entry.examQuestionId ?? position}>
                      <button
                        type="button"
                        disabled={!canJump(position)}
                        onClick={() => setIndex(position)}
                        aria-current={current ? "step" : undefined}
                        aria-label={`Question ${position + 1}${done ? ", answered" : ", not answered"}`}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg text-[13px] font-bold transition disabled:cursor-default",
                          current && "bg-primary-600 text-white",
                          !current && done && "bg-(--kid-mint-bg) text-(--kid-mint)",
                          !current && !done && "bg-neutral-100 text-neutral-500",
                          !current && "enabled:hover:ring-2 enabled:hover:ring-primary-300",
                        )}
                      >
                        {position + 1}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {last ? (
              <KidButton variant="sun" className={cn(FOOTER_BTN, "px-3!")} onClick={() => setConfirm("complete")} disabled={!items.length} aria-label="Finish section">
                <IconFlag aria-hidden />
                <span>Finish</span>
              </KidButton>
            ) : (
              <KidButton className={cn(FOOTER_BTN, FOOTER_ICON)} disabled={!canNext} onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))} aria-label="Next question">
                <span className="hidden sm:inline">Next</span>
                <IconArrowRight aria-hidden />
              </KidButton>
            )}
          </div>
        </footer>

        {/* Geniş ekranda gezinme: sayfanın sol/sağ kenarında, dikeyde ortalı ve sabit. Telefonda alt çubukta. */}
        {items.length ? (
          <div className="pointer-events-none fixed inset-x-0 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
            <div className="student-container flex items-center justify-between">
            {section.allowBack ? (
              <SideNav side="left" label="Back" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))} />
            ) : null}
            {last ? (
              <SideNav side="right" label="Finish" tone="sun" onClick={() => setConfirm("complete")} />
            ) : (
              <SideNav side="right" label="Next" disabled={!canNext} onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))} />
            )}
              {section.allowBack ? null : <span />}
            </div>
          </div>
        ) : null}

        <ReconnectOverlay show={held} />
        {confirm === "complete" ? (
          <KidDialog
            title="Finish this section?"
            icon={<IconFlag />}
            tone={unanswered ? "sun" : "primary"}
            body={
              unanswered
                ? <>You have <strong>{unanswered} unanswered {unanswered === 1 ? "question" : "questions"}</strong>. After you finish, you cannot go back to this section.</>
                : "You answered all the questions. After you finish, you cannot go back to this section."
            }
            confirmLabel="Finish"
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
            confirmLabel="Take a break"
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

/** Süre sınırı olmayan bölümde "geçen süre" (bağlantı beklenirken durur). */
/**
 * Süre sınırı olmayan bölümde "geçen süre". Backend saatinde geçen süre alanı yok; bu yüzden sekme oturumunda
 * (sessionStorage, uygulama + bölüm anahtarı) tutulur: sayfa yenilenince sıfırlanmaz, bağlantı beklenirken durur.
 */
function useElapsed(held: boolean, key: string | null) {
  const storageKey = key ? `ilc-elapsed:${key}` : null;
  const [elapsed, setElapsed] = useState(() => readElapsed(storageKey));
  useEffect(() => {
    if (held) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => {
        const next = value + 1000;
        if (storageKey) {
          try {
            sessionStorage.setItem(storageKey, String(next));
          } catch {
            // depolama kapalıysa sayaç yalnız bu sayfa açıkken sayar
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [held, storageKey]);
  return elapsed;
}

function readElapsed(storageKey: string | null) {
  if (!storageKey || typeof window === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(storageKey)) || 0;
  } catch {
    return 0;
  }
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
      <span className="text-xs font-semibold text-neutral-600">{label}</span>
    </button>
  );
}

/**
 * Alt çubuk düğmeleri (lg altı): hepsi aynı genişlik ve yükseklikte, böylece ortadaki soru numaraları tam ortada kalır.
 * Telefonda 44px kare ikon (Finish yazılı); tablette 7.5rem eşit genişlik ikon + metin. lg+ kenar düğmeleri devralır.
 */
const FOOTER_BTN = "h-11 shrink-0 sm:w-30 sm:px-3! lg:hidden";
/** Telefonda yalnız ikon: 44px kare. */
const FOOTER_ICON = "w-11 px-0!";
