"use client";

import { ExamFlowProvider, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { stageHref } from "@/src/features/exam-flow/session";
import { useParams, usePathname } from "next/navigation";
import { Component, type ReactNode } from "react";

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
  if (conflict) {
    return (
      <section className="rounded-3xl bg-white p-6 ring-1 ring-ilc-line">
        <h2 className="text-xl font-semibold text-ilc-navy">Bu sınav başka bir sekmede açık</h2>
        <p className="mt-2 text-sm text-ilc-navy/70">Burada devam ederseniz diğer sekme kapanır.</p>
        <button
          type="button"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white"
          onClick={() => void takeOver()}
        >
          Burada devam et
        </button>
      </section>
    );
  }
  if (loading) {
    return <p className="text-sm text-ilc-navy/70">Sınav hazırlanıyor…</p>;
  }
  const target = state ? stageHref(recipientId, state.stage, state.currentSectionId) : `/student/exams/${recipientId}`;
  if (pathname !== target) {
    return <p className="text-sm text-ilc-navy/70">Sınav hazırlanıyor…</p>;
  }
  if (error) {
    return (
      <section className="rounded-3xl bg-white p-6 ring-1 ring-ilc-line">
        <h2 className="text-xl font-semibold text-ilc-navy">Sınav açılamadı</h2>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button type="button" className="mt-4 min-h-11 rounded-xl bg-ilc-navy px-4 text-sm text-white" onClick={reload}>
          Yeniden dene
        </button>
      </section>
    );
  }
  return children;
}

class ExamErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "Beklenmeyen bir hata oluştu" };
  }

  render() {
    if (this.state.message) {
      return (
        <section className="rounded-3xl bg-white p-6 ring-1 ring-ilc-line">
          <h2 className="text-xl font-semibold text-ilc-navy">Sayfa yenilenmeli</h2>
          <p className="mt-2 text-sm text-ilc-navy/80">{this.state.message}</p>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-xl bg-ilc-navy px-4 text-sm text-white"
            onClick={() => window.location.reload()}
          >
            Yenile
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
