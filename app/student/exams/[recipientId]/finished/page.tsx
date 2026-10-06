"use client";

import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { sectionStatusLabel } from "@/src/features/exam-flow/format";
import Link from "next/link";

export default function FinishedPage() {
  const { state } = useExamFlow();
  if (!state) return null;
  const reason = state.finishedReason === "EXAM_TIME_UP"
    ? "Süre doldu. Sınav otomatik teslim edildi."
    : state.finishedReason === "WINDOW_CLOSED"
      ? "Sınavın açık olduğu süre kapandı."
      : "Sınav teslim edildi.";
  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-ilc-line md:p-6">
      <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">Sınav bitti</h2>
      <p className="text-sm text-ilc-navy/80">{reason} Bölümlere tekrar girilemez.</p>
      <ul className="space-y-2">
        {state.sections.map((section) => (
          <li key={section.sectionId} className="flex items-center justify-between rounded-2xl bg-[#f7f4ef] px-4 py-3 text-sm">
            <span className="font-medium text-ilc-navy">{section.title}</span>
            <span>{sectionStatusLabel(section.status)} · {section.questionCount} soru</span>
          </li>
        ))}
      </ul>
      <Link href="/student/exams" className="inline-flex min-h-11 items-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white">
        Sınavlarıma dön
      </Link>
    </section>
  );
}
