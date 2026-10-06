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
  const { loading, error, conflict, takeOver, reload, state, recipientId } = useExamFlow();
  const pathname = usePathname();
  const inQuestion = /\/sections\/[^/]+$/.test(pathname);
  const wrap = (node: ReactNode) => (inQuestion ? <div className="student-container py-6">{node}</div> : node);

  if (conflict) {
    return wrap(
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-neutral-200 sm:p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-(--kid-sun-bg) text-(--kid-sun) [&>svg]:size-6">
          <IconMonitor aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold text-neutral-900">Bu sınav başka bir yerde açık</h1>
        <p className="mt-2 text-base text-neutral-700">
          Sınavın başka bir sekmede ya da cihazda açık görünüyor. Burada devam edersen öteki ekran kapanır.
        </p>
        <KidButton size="lg" className="mt-6" onClick={() => void takeOver()}>
          Burada devam et
        </KidButton>
      </section>,
    );
  }
  const target = state ? stageHref(recipientId, state.stage, state.currentSectionId) : `/student/exams/${recipientId}`;
  if (loading || pathname !== target) {
    return wrap(<KidLoading label="Sınavın hazırlanıyor…" />);
  }
  if (error) {
    return wrap(<KidError title="Sınav açılamadı" message={error} onRetry={reload} />);
  }
  if (inQuestion) return children;
  return (
    <div className="space-y-5">
      <ExamSteps />
      {children}
    </div>
  );
}

/** Nerede olduğunu gösteren adım çubuğu: Hazırlık → (Cihaz kontrolü) → Bölümler → Bitti. */
function ExamSteps() {
  const { state } = useExamFlow();
  const needsCheck = Boolean(state?.requiresMicrophone || state?.requiresCamera);
  const steps: { key: string; label: string; short?: string }[] = [
    { key: "WELCOME", label: "Hazırlık" },
    ...(needsCheck ? [{ key: "DEVICE_CHECK", label: "Cihaz kontrolü", short: "Cihaz" }] : []),
    { key: "SECTION_LIST", label: "Bölümler" },
    { key: "FINISHED", label: "Bitti" },
  ];
  const stage = state?.stage === "IN_SECTION" ? "SECTION_LIST" : state?.stage ?? "WELCOME";
  const current = Math.max(0, steps.findIndex((step) => step.key === stage));

  return (
    <nav aria-label="Sınav adımları" className="rounded-xl bg-white px-3 ring-1 ring-neutral-200 sm:px-4">
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

class ExamErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "Beklenmeyen bir hata oluştu" };
  }

  render() {
    if (this.state.message) {
      return (
        <CrashNotice />
      );
    }
    return this.props.children;
  }
}

function CrashNotice() {
  const pathname = usePathname();
  const inQuestion = /\/sections\/[^/]+$/.test(pathname);
  return (
    <div className={inQuestion ? "student-container py-6" : undefined}>
      <KidError
        title="Sayfanın yenilenmesi gerekiyor"
        message="Sayfayı yenileyince sınavına kaldığın yerden devam edebilirsin."
        onRetry={() => window.location.reload()}
        retryLabel="Sayfayı yenile"
      />
    </div>
  );
}
