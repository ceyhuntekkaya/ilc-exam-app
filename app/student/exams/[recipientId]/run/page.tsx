"use client";

import { customInstance } from "@/src/api/mutator";
import { QuestionView } from "@/src/features/exam-player";
import { LiveExamSessionProvider } from "@/src/features/exam-player/session/LiveExamSessionProvider";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Item = { question: { body?: QuestionViewModel; parts: QuestionViewModel["parts"] }; role?: string };
type Session = { applicationId: string; sessionToken: string };

export default function ExamRunPage() {
  const params = useParams<{ recipientId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [review, setReview] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [focusLoss, setFocusLoss] = useState(0);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const raw = sessionStorage.getItem(`ilc-session:${params.recipientId}`);
    if (!raw) {
      router.replace(`/student/exams/${params.recipientId}`);
      return;
    }
    const parsed = JSON.parse(raw) as Session;
    setSession(parsed);
    const headers = { "X-Session-Token": parsed.sessionToken };
    customInstance<{ data: { currentSectionId?: string; deadlineAt?: string } }>(
      `/applications/${parsed.applicationId}/resume`,
      { headers },
    )
      .then(async (resume) => {
        const sid = resume.data.currentSectionId;
        setDeadline(resume.data.deadlineAt ?? null);
        if (!sid) return;
        setSectionId(sid);
        const content = await customInstance<{ data: { items: Item[] } }>(
          `/applications/${parsed.applicationId}/sections/${sid}/content`,
          { headers },
        );
        setItems(content.data.items ?? []);
      })
      .catch((err: { status?: number }) => {
        if (err.status === 409) setConflict(true);
      });
  }, [params.recipientId, router]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session) return;
    const send = (type: string) =>
      customInstance(`/applications/${session.applicationId}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": session.sessionToken },
        body: JSON.stringify({ events: [{ type, payload: {} }] }),
      }).catch((err: { status?: number }) => {
        if (err.status === 409) setConflict(true);
      });
    const onHide = () => {
      if (document.hidden) {
        setFocusLoss((n) => n + 1);
        void send("FOCUS_LOST");
      }
    };
    const block = (event: Event) => event.preventDefault();
    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    const beat = window.setInterval(() => void send("HEARTBEAT"), 20000);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      window.clearInterval(beat);
    };
  }, [session]);

  const remaining = useMemo(() => {
    if (!deadline) return null;
    const ms = new Date(deadline).getTime() - now;
    if (Number.isNaN(ms)) return null;
    const sec = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }, [deadline, now]);

  async function submit() {
    if (!session) return;
    if (sectionId) {
      await customInstance(`/applications/${session.applicationId}/sections/${sectionId}/complete`, {
        method: "POST",
        headers: { "X-Session-Token": session.sessionToken },
      }).catch(() => undefined);
    }
    await customInstance(`/applications/${session.applicationId}/submit`, {
      method: "POST",
      headers: { "X-Session-Token": session.sessionToken },
    });
    router.push("/student/exams");
  }

  if (conflict) {
    return (
      <section className="rounded-3xl bg-white p-6">
        <h2 className="text-xl font-semibold text-ilc-navy">Oturum başka cihazdan açıldı</h2>
      </section>
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

  return (
    <LiveExamSessionProvider applicationId={session?.applicationId ?? ""} sessionToken={session?.sessionToken ?? ""}>
      <div className="flex min-h-[70vh] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ilc-line">
          <p className="text-sm font-medium text-ilc-navy">
            Soru {items.length ? index + 1 : 0} / {items.length}
          </p>
          <p className="text-sm text-ilc-navy">{remaining ?? "Süresiz"}</p>
          {focusLoss > 0 ? <p className="text-sm text-amber-700">Odak kaybı: {focusLoss}</p> : null}
        </header>
        {review ? (
          <section className="rounded-2xl bg-white p-4 ring-1 ring-ilc-line">
            <h2 className="text-lg font-semibold text-ilc-navy">Gözden geçir</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {items.map((_, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-sm"
                    onClick={() => {
                      setIndex(i);
                      setReview(false);
                    }}
                  >
                    Soru {i + 1}
                    <span>{flagged[i] ? "İşaretli" : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : model ? (
          <QuestionView model={model} />
        ) : (
          <p className="text-sm text-ilc-navy/70">Sorular yükleniyor.</p>
        )}
        <footer className="mt-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" className="min-h-11 rounded-xl bg-white ring-1 ring-ilc-line" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
            Önceki
          </button>
          <button type="button" className="min-h-11 rounded-xl bg-white ring-1 ring-ilc-line" onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}>
            Sonraki
          </button>
          <button type="button" className="min-h-11 rounded-xl bg-white ring-1 ring-ilc-line" onClick={() => setFlagged((f) => ({ ...f, [index]: !f[index] }))}>
            İşaretle
          </button>
          <button type="button" className="min-h-11 rounded-xl bg-ilc-navy text-white" onClick={() => (review ? submit() : setReview(true))}>
            {review ? "Teslim et" : "Gözden geçir"}
          </button>
        </footer>
      </div>
    </LiveExamSessionProvider>
  );
}
