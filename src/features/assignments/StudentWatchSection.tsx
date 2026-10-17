"use client";

import { customInstance } from "@/src/api/mutator";
import { istanbulInstant } from "@/src/features/assignments/istanbulTime";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, Button, ConfirmDialog, ErrorState, Field, FormDialog, Input, PageHeader, Skeleton, errorMessage, notify } from "@/src/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type WatchQuestion = {
  label: string;
  answered: boolean;
  finishedAt?: string | null;
  current: boolean;
};

type WatchSubSection = {
  id?: string | null;
  title: string;
  questions: WatchQuestion[];
};

type WatchSection = {
  id: string;
  title: string;
  status?: string | null;
  finishedAt?: string | null;
  current: boolean;
  subSections: WatchSubSection[];
};

type WatchView = {
  studentName: string;
  examTitle: string;
  finishedAt?: string | null;
  applicationId?: string | null;
  applicationStatus?: string | null;
  sections: WatchSection[];
};

/** İzleme geri linki yalnızca atama listesine ve filtre query'sine döner. */
export function rosterReturnHref(from: string | null, fallback: string) {
  if (!from || from.includes("://") || from.includes("\\") || from.startsWith("//")) return fallback;
  if (from !== fallback && !from.startsWith(`${fallback}?`)) return fallback;
  return from;
}

function formatStamp(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Bir öğrencinin sınavındaki yer: bölüm, alt bölüm, soru.
 * Cevap metni yok. Biten kaydın bitiş anı tarih ve saat olarak yazılır.
 */
export function StudentWatchSection({ assignmentId, studentId }: { assignmentId: string; studentId: string }) {
  const hrefs = useOpsHref();
  const backHref = rosterReturnHref(useSearchParams().get("from"), hrefs.assignments);
  const query = useQuery({
    queryKey: ["assignment-watch", assignmentId, studentId],
    queryFn: () =>
      customInstance<{ data: WatchView }>(
        `/assignments/${assignmentId}/watch?studentId=${encodeURIComponent(studentId)}`,
      ),
  });
  const view = query.data?.data;
  const [extendOpen, setExtendOpen] = useState(false);
  const [invalidateOpen, setInvalidateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const live = view?.applicationStatus === "IN_PROGRESS";
  const canInvalidate = Boolean(view?.applicationId) && view?.applicationStatus !== "SUBMITTED"
    && view?.applicationStatus !== "AUTO_SUBMITTED" && view?.applicationStatus !== "INVALIDATED";
  const extendTime = useMutation({
    mutationFn: (deadlineAt: string) =>
      customInstance(`/applications/${view?.applicationId}/extend-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlineAt }),
      }),
    onSuccess: () => {
      notify.success("Süre uzatıldı");
      setExtendOpen(false);
      void query.refetch();
    },
    onError: (err) => {
      const message = errorMessage(err, "Süre uzatılamadı");
      setFormError(message);
      notify.error(message);
    },
  });
  const invalidate = useMutation({
    mutationFn: (reason: string) =>
      customInstance(`/applications/${view?.applicationId}/invalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      notify.success("Deneme geçersiz kılındı");
      setInvalidateOpen(false);
      void query.refetch();
    },
    onError: (err) => notify.error(errorMessage(err, "Deneme geçersiz kılınamadı")),
  });

  const header = (
    <PageHeader
      title={view?.studentName || "İzleme"}
      description={
        view?.examTitle
          ? `${view.examTitle}. Bu öğrencinin yaptığı ve yapmadığı yerler. Cevap metni görünmez.`
          : "Bu öğrencinin yaptığı ve yapmadığı yerler. Cevap metni görünmez."
      }
      back={{ href: backHref, label: "Atamalar" }}
      actions={
        <div className="flex flex-wrap justify-end gap-2">
          {live ? (
            <Button type="button" size="sm" className="min-h-11" onClick={() => { setFormError(null); setExtendOpen(true); }}>
              Süre uzat
            </Button>
          ) : null}
          {canInvalidate ? (
            <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => setInvalidateOpen(true)}>
              Geçersiz kıl
            </Button>
          ) : null}
          <Button type="button" variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
            Güncelle
          </Button>
        </div>
      }
    />
  );

  if (query.isError && !view) {
    return (
      <div>
        {header}
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      </div>
    );
  }

  if (query.isLoading || !view) {
    return (
      <div className="grid gap-4">
        {header}
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const examFinished = formatStamp(view.finishedAt);

  return (
    <div>
      {header}
      {examFinished ? (
        <p className="mb-4 text-sm text-fg-muted">
          Sınav bitti · <time dateTime={view.finishedAt ?? undefined} className="numeric font-medium text-fg">{examFinished}</time>
        </p>
      ) : null}
      {view.sections.length === 0 ? (
        <p className="text-sm text-fg-muted">Bu öğrencinin sınav kâğıdı henüz oluşmadı.</p>
      ) : (
        <div className="grid gap-4">
          {view.sections.map((section) => (
            <section key={section.id} className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <h2 className="min-w-0 text-[15px] font-semibold text-fg">{section.title}</h2>
                <StatusStamp label={section.status} current={section.current} finishedAt={section.finishedAt} doneLabel="Tamamlandı" />
              </header>
              <div className="grid gap-4 p-4">
                {section.subSections.map((sub, index) => (
                  <div key={sub.id ?? `${section.id}-${index}`} className="min-w-0">
                    <h3 className="text-sm font-semibold text-fg-muted">{sub.title}</h3>
                    <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                      {sub.questions.length === 0 ? (
                        <li className="px-3 py-2.5 text-sm text-fg-subtle">Soru yok</li>
                      ) : (
                        sub.questions.map((question) => (
                          <li key={question.label} className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <span className="text-sm font-medium text-fg">{question.label}</span>
                            <StatusStamp
                              label={question.answered ? "Cevaplandı" : null}
                              current={question.current}
                              finishedAt={question.finishedAt}
                              doneLabel="Cevaplandı"
                            />
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <FormDialog
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        title="Süre uzat"
        description="Yeni bitiş, öğrencinin açık denemesine yazılır. Saat dilimi İstanbul."
        submitLabel="Uzat"
        pending={extendTime.isPending}
        error={formError}
        onSubmit={async (fd) => {
          const deadlineAt = istanbulInstant(String(fd.get("deadlineAt") || ""));
          if (!deadlineAt) {
            setFormError("Bitiş gerekli.");
            return;
          }
          try {
            await extendTime.mutateAsync(deadlineAt);
          } catch {
            return;
          }
        }}
      >
        <Field label="Yeni bitiş" required hint="Saat dilimi İstanbul.">
          <Input name="deadlineAt" type="datetime-local" required />
        </Field>
      </FormDialog>
      <ConfirmDialog
        open={invalidateOpen}
        onClose={() => setInvalidateOpen(false)}
        title="Deneme geçersiz kılınsın mı?"
        confirmLabel="Geçersiz kıl"
        reasonRequired
        reasonLabel="Gerekçe"
        pending={invalidate.isPending}
        description="Bu deneme puana girmez. Öğrencinin kalan hakkı ayrıdır."
        onConfirm={({ reason }) => invalidate.mutate(reason)}
      />
    </div>
  );
}

function StatusStamp({
  label,
  current,
  finishedAt,
  doneLabel,
}: {
  label?: string | null;
  current: boolean;
  finishedAt?: string | null;
  doneLabel: string;
}) {
  const stamp = label === doneLabel ? formatStamp(finishedAt) : "";
  if (!label && !current) return null;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      {label ? (
        <Badge tone={label === doneLabel ? "success" : "info"} dot>
          {label}
        </Badge>
      ) : null}
      {current ? (
        <Badge tone="info" dot>
          Şu an
        </Badge>
      ) : null}
      {stamp ? (
        <time dateTime={finishedAt ?? undefined} className="numeric text-xs text-fg-muted">
          {stamp}
        </time>
      ) : null}
    </span>
  );
}
