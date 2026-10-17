"use client";

import { ExamFlowProvider, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { stageHref } from "@/src/features/exam-flow/session";
import { KidButton, KidError, KidLoading } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconCheck, IconMonitor } from "@/src/ui/icons";
import { useParams, usePathname } from "next/navigation";
import { Component, Fragment, type ReactNode } from "react";

export default function ExamAttemptLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ recipientId: string }>();
  return (
    <ExamErrorBoundary>
      <ExamFlowProvider recipientId={params.recipientId}>
        <FlowChrome>{children}</FlowChrome>
      </ExamFlowProvider>
    </ExamErrorBoundary>
  );
}

function FlowChrome({ children }: { children: ReactNode }) {
  const { loading, error, conflict, takeOver, reload, state, recipientId, engageFullscreen } = useExamFlow();
  const pathname = usePathname();
  const inQuestion = /\/sections\/[^/]+$/.test(pathname);
  const wrap = (node: ReactNode) => (inQuestion ? <div className="student-container py-6">{node}</div> : node);

  if (conflict) {
    return wrap(
      <section className="mx-auto max-w-xl rounded-3xl border border-indigo-100 bg-white p-7 text-center shadow-xl shadow-indigo-950/5 sm:p-9">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-xs [&>svg]:size-8 [&>svg]:stroke-[2.25]">
          <IconMonitor aria-hidden />
        </span>
        <h1 className="mt-5 font-kid text-2xl leading-tight font-bold text-slate-900">This test is open on another screen</h1>
        <p className="mt-2 text-base text-slate-600">
          Your test is open in another tab or on another device. If you continue here, the other screen will close.
        </p>
        <KidButton
          size="lg"
          className="mt-6"
          onClick={() => {
            void engageFullscreen().catch(() => undefined);
            void takeOver();
          }}
        >
          Continue here
        </KidButton>
      </section>,
    );
  }
  const target = state ? stageHref(recipientId, state.stage, state.currentSectionId) : `/student/exams/${recipientId}`;
  if (loading || pathname !== target) {
    return wrap(<KidLoading label="Getting your test ready…" />);
  }
  if (error) {
    return wrap(<KidError title="The test did not open" message={error} onRetry={reload} />);
  }
  const screen = <ScreenRecovery fallback={wrap(<KidLoading label="Getting your test ready…" />)}>{children}</ScreenRecovery>;
  if (inQuestion) return screen;
  return (
    <div className="space-y-6 sm:space-y-8">
      <ExamSteps />
      {screen}
    </div>
  );
}

const RECOVERY_WINDOW_MS = 20_000;
const RECOVERY_TRIES = 3;

/**
 * Ekran (soru/bölüm sayfası) hata verirse yalnız o ekran sessizce yeniden açılır; sınav kabuğu (tam ekran, oturum,
 * süre) ayakta kalır. Cevaplar kutuda olduğu için ekran kaldığı yerden döner. Kısa sürede tekrar tekrar düşerse
 * hata dış sınıra geçer.
 */
class ScreenRecovery extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean; round: number; fatal: Error | null }> {
  state = { failed: false, round: 0, fatal: null as Error | null };
  private failures: number[] = [];
  private timer = 0;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[exam] screen error, reopening", error);
    const now = Date.now();
    this.failures = [...this.failures.filter((at) => now - at < RECOVERY_WINDOW_MS), now];
    if (this.failures.length > RECOVERY_TRIES) {
      this.setState({ fatal: error });
      return;
    }
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.setState((prev) => ({ failed: false, round: prev.round + 1 })), 250);
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  render() {
    if (this.state.fatal) throw this.state.fatal;
    if (this.state.failed) return this.props.fallback;
    return <Fragment key={this.state.round}>{this.props.children}</Fragment>;
  }
}

/** Nerede olduğunu gösteren adım çubuğu: Hazırlık → (Cihaz kontrolü) → Bölümler → Bitti. */
function ExamSteps() {
  const { state } = useExamFlow();
  const needsCheck = Boolean(state?.requiresMicrophone || state?.requiresCamera);
  const steps: { key: string; label: string; short?: string }[] = [
    { key: "WELCOME", label: "Get ready" },
    ...(needsCheck ? [{ key: "DEVICE_CHECK", label: "Device check", short: "Device" }] : []),
    { key: "SECTION_LIST", label: "Parts" },
    { key: "FINISHED", label: "Done" },
  ];
  const stage = state?.stage === "IN_SECTION" ? "SECTION_LIST" : state?.stage ?? "WELCOME";
  const current = Math.max(0, steps.findIndex((step) => step.key === stage));

  return (
    <nav aria-label="Test steps" className="rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-1 shadow-2xs backdrop-blur-xs sm:px-6">
      <ol className="flex h-13 items-center">
        {steps.map((step, index) => {
          const done = index < current || (stage === "FINISHED" && index === current);
          const active = index === current && !done;
          return (
            <Fragment key={step.key}>
              {index > 0 ? (
                <li
                  aria-hidden
                  className={cn(
                    "mx-2.5 h-1 min-w-3 flex-1 rounded-full transition-colors duration-200 sm:mx-4",
                    index <= current ? "bg-gradient-to-r from-indigo-600 to-indigo-500" : "bg-slate-100",
                  )}
                />
              ) : null}
              <li className="flex shrink-0 items-center gap-2.5" aria-current={active ? "step" : undefined}>
                <span
                  className={cn(
                    "sb-display grid size-7.5 shrink-0 place-items-center rounded-xl text-xs font-bold transition-all duration-200 [&>svg]:size-4 [&>svg]:stroke-[2.75]",
                    done && "bg-emerald-500 text-white shadow-xs",
                    active && "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/30 ring-3 ring-indigo-100",
                    !done && !active && "bg-slate-100 text-slate-400",
                  )}
                >
                  {done ? <IconCheck aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    "font-kid text-sm whitespace-nowrap sm:text-[15px]",
                    active ? "font-bold text-slate-900" : done ? "font-semibold text-slate-700" : "font-medium text-slate-400",
                    !active && "max-[379px]:sr-only",
                  )}
                >
                  <span className="sm:hidden">{step.short ?? step.label}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

const AUTO_RELOAD_KEY = "ilc-exam-auto-reload";
const AUTO_RELOAD_GAP_MS = 30_000;

/**
 * Son çare: sınav kabuğu çöktü. Sayfa kendiliğinden bir kez yenilenir (cevaplar kutuda, sınav kaldığı yerden açılır;
 * tam ekran öğrencinin ilk dokunuşunda geri gelir). Kısa sürede yine çökerse döngüye girmemek için düğme gösterilir.
 */
class ExamErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; manual: boolean }> {
  state = { failed: false, manual: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[exam] flow error", error);
    try {
      const last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY)) || 0;
      if (Date.now() - last > AUTO_RELOAD_GAP_MS) {
        sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
        window.location.reload();
        return;
      }
    } catch {
      // depolama kapalı: düğmeye düş
    }
    this.setState({ manual: true });
  }

  render() {
    if (this.state.failed) return <CrashNotice manual={this.state.manual} />;
    return this.props.children;
  }
}

function CrashNotice({ manual }: { manual: boolean }) {
  const pathname = usePathname();
  const inQuestion = /\/sections\/[^/]+$/.test(pathname);
  return (
    <div className={inQuestion ? "student-container py-6" : undefined}>
      {manual ? (
        <KidError
          title="Something went wrong"
          message="Your answers are saved. Tap the button to continue your test."
          onRetry={() => window.location.reload()}
          retryLabel="Continue the test"
        />
      ) : (
        <KidLoading label="Getting your test ready…" />
      )}
    </div>
  );
}
