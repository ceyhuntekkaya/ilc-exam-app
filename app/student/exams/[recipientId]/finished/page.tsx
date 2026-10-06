"use client";

import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { sectionTone } from "@/src/features/student/status";
import { KidButtonLink, StatusPill } from "@/src/features/student/ui";
import { IconCheck, IconClock, IconHome } from "@/src/ui/icons";

export default function FinishedPage() {
  const { state } = useExamFlow();
  if (!state) return null;
  const proctor = state.finishedReason === "PROCTOR_LIMIT";
  const timeUp = state.finishedReason === "EXAM_TIME_UP" || state.finishedReason === "WINDOW_CLOSED";
  const title = timeUp ? "Süre doldu" : "Tebrikler, sınavını bitirdin!";
  const line = proctor
    ? "Sınav ekranından çok kez ayrıldığın için sınavın otomatik olarak teslim edildi. Verdiğin cevaplar kaydedildi."
    : state.finishedReason === "EXAM_TIME_UP"
    ? "Süre bittiği için sınavın otomatik olarak teslim edildi. Verdiğin cevaplar kaydedildi."
    : state.finishedReason === "WINDOW_CLOSED"
      ? "Sınavın açık olduğu zaman doldu. Verdiğin cevaplar kaydedildi."
      : "Cevapların öğretmenine ulaştı. Sonuçların hazır olunca ana sayfanda göreceksin.";

  return (
    <section className="mx-auto max-w-2xl space-y-6 text-center">
      <div className="relative overflow-hidden rounded-4xl bg-white px-5 py-8 shadow-sm ring-1 ring-neutral-200">
        <span aria-hidden className="absolute -top-8 -left-8 size-28 rounded-full bg-secondary-200" />
        <span aria-hidden className="absolute -right-6 -bottom-10 size-32 rounded-full bg-primary-100" />
        <span className={`relative mx-auto grid size-16 place-items-center rounded-full text-white [&>svg]:size-8 ${timeUp ? "bg-secondary-500" : "bg-(--kid-mint-solid)"}`}>
          {timeUp ? <IconClock aria-hidden /> : <IconCheck aria-hidden />}
        </span>
        <h1 className="relative mt-5 text-2xl font-bold text-neutral-900">{title}</h1>
        <p className="relative mx-auto mt-3 max-w-md text-base text-neutral-700">{line}</p>
      </div>
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-3xl bg-white text-left ring-1 ring-neutral-200">
        {state.sections.map((section) => {
          const tone = sectionTone(section.status);
          return (
            <li key={section.sectionId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <span className="font-kid text-base font-bold text-neutral-900">{section.title}</span>
              <span className="flex items-center gap-3 text-neutral-600">
                {section.questionCount} soru
                <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
              </span>
            </li>
          );
        })}
      </ul>
      <KidButtonLink href="/student" size="lg">
        <IconHome aria-hidden />
        Ana sayfaya dön
      </KidButtonLink>
    </section>
  );
}
