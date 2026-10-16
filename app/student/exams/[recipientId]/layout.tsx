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
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-neutral-200 sm:p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-(--kid-sun-bg) text-(--kid-sun) [&>svg]:size-6">
          <IconMonitor aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold text-neutral-900">This test is open on another screen</h1>
        <p className="mt-2 text-base text-neutral-700">
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
    <div className="space-y-5">
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
    <nav aria-label="Test steps" className="rounded-xl bg-white px-3 ring-1 ring-neutral-200 sm:px-4">
      {/* Tek satır, ~44px: [● Hazırlık] ——— [● Bölümler] ——— [● Bitti]. Çizgiler ayrı esnek öğe; konumlandırma yok, üst üste binmez. */}
      <ol className="flex h-11 items-center">
        {steps.map((step, index) => {
          const done = index < current || (stage === "FINISHED" && index === current);
          const active = index === current && !done;
          return (
            <Fragment key={step.key}>
              {index > 0 ? (
                <li aria-hidden className={cn("mx-2 h-0.5 min-w-3 flex-1 rounded-full sm:mx-3", index <= current ? "bg-(--kid-mint-solid)" : "bg-neutral-200")} />
              ) : null}
              <li className="flex shrink-0 items-center gap-1.5" aria-current={active ? "step" : undefined}>
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold [&>svg]:size-3.5",
                    done && "bg-(--kid-mint-solid) text-white",
                    active && "bg-primary-600 text-white",
                    !done && !active && "bg-neutral-100 text-neutral-500",
                  )}
                >
                  {done ? <IconCheck aria-hidden /> : index + 1}
                </span>
                <span className={cn("text-xs font-semibold whitespace-nowrap sm:text-sm", active ? "text-primary-700" : done ? "text-neutral-700" : "text-neutral-500", !active && "max-[379px]:sr-only")}>
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
