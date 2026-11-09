"use client";

import { customInstance } from "@/src/api/mutator";
import { AnswerReviewCard } from "@/src/features/grading/AnswerReviewCard";
import { formatGradeScore, type MediaTranscript } from "@/src/features/grading/answerCardModel";
import { usePanel } from "@/src/features/panel/PanelContext";
import {
  CHANGE_CONFIRM_TEXT,
  EVIDENCE_SECTIONS,
  NOTE_REQUIRED,
  RATIONALE_REQUIRED,
  answerLineToCard,
  canPublishCorrections,
  canUphold,
  correctAnswer,
  evidenceCell,
  evidenceColumns,
  fetchEvidence,
  fetchReviewDetail,
  formatDateTime,
  formatScore,
  hasText,
  resolveRequest,
  scoreSourceText,
  statusBadge,
  type EvidenceRow,
  type ReviewDetail,
} from "@/src/features/review/reviewModel";
import { useReviewScopes } from "@/src/features/review/useReviewScopes";
import {
  ActionBar,
  Badge,
  Button,
  ConfirmDialog,
  DefinitionList,
  ErrorState,
  Field,
  FormDialog,
  Input,
  PageHeader,
  SectionHeading,
  Skeleton,
  Tabs,
  Textarea,
  errorMessage,
  notify,
} from "@/src/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Line = NonNullable<ReviewDetail["answers"]>[number];
type Snapshot = NonNullable<ReviewDetail["snapshot"]>;

function SnapshotCard({ title, snapshot }: { title: string; snapshot: Snapshot }) {
  const total = snapshot.examTotal ?? snapshot.maxScore;
  return (
    <section aria-label={title} className="grid min-w-0 gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {snapshot.cancelledAt ? (
          <Badge tone="danger" dot>
            İptal edildi
          </Badge>
        ) : snapshot.active ? (
          <Badge tone="success" dot>
            Geçerli sonuç
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Eski sonuç
          </Badge>
        )}
      </div>
      <DefinitionList
        items={[
          { term: "Toplam puan", description: `${formatScore(snapshot.totalScore)}${total != null ? ` / ${formatGradeScore(total)}` : ""}` },
          { term: "CEFR", description: snapshot.cefrLevel ?? "—" },
          { term: "Sonuç", description: snapshot.passed == null ? "—" : snapshot.passed ? "Geçti" : "Kaldı" },
          { term: "Yayın tarihi", description: formatDateTime(snapshot.publishedAt) },
        ]}
      />
      {snapshot.sections && snapshot.sections.length > 0 ? (
        <ul className="grid gap-1 text-sm" aria-label="Bölüm puanları">
          {snapshot.sections.map((section, i) => (
            <li key={`${section.title}-${i}`} className="flex items-center justify-between gap-3 border-t border-border pt-1">
              <span className="min-w-0 truncate text-fg-muted">{section.title || section.skill || "Bölüm"}</span>
              <span className="numeric shrink-0 font-medium text-fg">
                {formatScore(section.earned)} / {formatScore(section.available)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function CorrectionTrail({ answerId, detail }: { answerId: string; detail: ReviewDetail }) {
  const rows = (detail.corrections ?? []).filter((c) => c.answerId === answerId);
  if (rows.length === 0) return null;
  return (
    <div className="grid gap-1 rounded-lg bg-warning-bg px-3.5 py-2.5 text-sm" data-testid={`correction-trail-${answerId}`}>
      <p className="font-medium text-warning">Düzeltme izi</p>
      <ul className="grid gap-0.5 text-fg-muted">
        {rows.map((row, i) => (
          <li key={`${row.correctedAt}-${i}`}>
            {formatDateTime(row.correctedAt)} · önceki kaynak: {row.previousSource ? scoreSourceText({ scoreSource: row.previousSource }) : "—"}
            {row.previousScore != null ? ` · önceki puan (banka ölçeği): ${formatGradeScore(row.previousScore)}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CorrectionDialog({
  line,
  companyId,
  requestId,
  onClose,
  onDone,
}: {
  line: Line | null;
  companyId: string;
  requestId: string;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = line?.examPoints ?? null;

  async function submit(data: FormData) {
    if (!line?.answerId) return;
    const scoreText = String(data.get("score") ?? "").trim();
    const rationale = String(data.get("rationale") ?? "");
    const feedback = String(data.get("feedback") ?? "").trim();
    if (scoreText === "" || Number.isNaN(Number(scoreText))) return void setError("Sınav puanı sayı olmalı.");
    const finalScore = Number(scoreText);
    if (finalScore < 0 || (max != null && finalScore > max)) {
      return void setError(`Puan 0 ile ${max != null ? formatGradeScore(max) : "—"} arasında olmalı.`);
    }
    if (!hasText(rationale)) return void setError(RATIONALE_REQUIRED);
    setError(null);
    setPending(true);
    try {
      // Sınav ölçeğinde gönderilir; yanıttaki puan banka ölçeğindedir, ekranda kullanılmaz.
      await correctAnswer(companyId, requestId, line.answerId, {
        finalScore,
        rationale: rationale.trim(),
        ...(feedback ? { feedback } : {}),
      });
      notify.success("Puan düzeltildi. Sonuç, düzeltmeler yayınlanınca değişir.");
      await onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Puan düzeltilemedi"));
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDialog
      open={line != null}
      title="Puanı düzelt"
      description="Yeni puan sınav ölçeğindedir. Sonuç bu adımda değişmez; “Düzeltmeleri yayınla” ile işlenir."
      submitLabel="Düzeltmeyi kaydet"
      pending={pending}
      error={error}
      onClose={() => {
        setError(null);
        onClose();
      }}
      onSubmit={(data) => void submit(data)}
    >
      <Field label="Yeni puan" required hint={max != null ? `Bu sınavda soru ${formatGradeScore(max)} puan.` : undefined}>
        <Input name="score" type="number" step="any" suffix="puan" defaultValue={line?.finalScore ?? ""} />
      </Field>
      <Field label="Gerekçe" required hint="Zorunlu. Denetim izinde saklanır.">
        <Textarea name="rationale" rows={3} />
      </Field>
      <Field label="Geri bildirim" hint="İsteğe bağlı.">
        <Textarea name="feedback" rows={2} defaultValue={line?.feedback ?? ""} />
      </Field>
    </FormDialog>
  );
}

function EvidenceTable({ title, rows }: { title: string; rows: EvidenceRow[] }) {
  const columns = evidenceColumns(rows);
  return (
    <section aria-label={title} className="grid gap-2">
      <SectionHeading title={title} as="h2" />
      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted">Kayıt yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-neutral-50">
                {columns.map((column) => (
                  <th key={column} className="px-3 py-2 font-medium whitespace-nowrap text-fg-subtle">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((column) => (
                    <td key={column} className="max-w-xs px-3 py-2 align-top break-words text-fg">
                      {evidenceCell(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Kanıt paketi sekmesi (salt okunur): itiraz açıldığı andaki anlık görüntü. Sekme açılınca yüklenir. */
export function EvidencePanel({ companyId, appealId }: { companyId: string; appealId: string }) {
  const query = useQuery({
    queryKey: ["review-evidence", companyId, appealId],
    queryFn: () => fetchEvidence(companyId, appealId),
  });
  if (query.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (query.isError) return <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />;
  const view = query.data;
  return (
    <div className="grid gap-5" data-testid="evidence-panel">
      <p className="text-sm text-fg-muted">
        Kanıt paketi itiraz açıldığı anda toplanır ve sonradan değişmez. Toplanma: {formatDateTime(view?.collectedAt)}.
      </p>
      {EVIDENCE_SECTIONS.map((section) => (
        <EvidenceTable key={section.key} title={section.title} rows={view?.[section.key] ?? []} />
      ))}
    </div>
  );
}

/**
 * R-32 adım 2: talep ayrıntısı. Üstte neden + snapshot özeti; cevaplar ortak `AnswerReviewCard` ile; her maddede
 * "Puanı düzelt"; altta "Puan değişmedi — sonuçlandır" (uphold) ve "Düzeltmeleri yayınla" (change). Sekme: Cevaplar / Kanıt paketi.
 */
export function ReviewRequestDetail({ id, companyHint }: { id: string; companyHint?: string | null }) {
  const { basePath } = usePanel();
  const queryClient = useQueryClient();
  const { scopes, loading: scopesLoading, error: scopesError, retry } = useReviewScopes();
  const scope = scopes.find((s) => s.companyId === companyHint) ?? scopes[0];
  const companyId = scope?.companyId ?? "";

  const query = useQuery({
    queryKey: ["review-request", companyId, id],
    enabled: companyId !== "",
    queryFn: () => fetchReviewDetail(companyId, id),
  });
  const [correcting, setCorrecting] = useState<Line | null>(null);
  const [resolving, setResolving] = useState<"uphold" | "change" | null>(null);
  const [resolveError, setResolveError] = useState<string | undefined>();
  const [resolvePending, setResolvePending] = useState(false);
  const [transcripts, setTranscripts] = useState<Record<string, MediaTranscript>>({});
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);

  const refreshDetail = () => queryClient.invalidateQueries({ queryKey: ["review-request", companyId, id] });

  async function transcribe(applicationId: string, mediaId: string) {
    if (activeMediaId) return;
    setActiveMediaId(mediaId);
    try {
      const result = await customInstance<{ data: MediaTranscript }>(
        `/companies/${companyId}/applications/${applicationId}/media/${mediaId}/transcript`,
        { method: "POST" },
      );
      if (result.data?.mediaId) setTranscripts((cur) => ({ ...cur, [result.data.mediaId]: result.data }));
    } catch (err) {
      setTranscripts((cur) => ({ ...cur, [mediaId]: { mediaId, status: "FAILED", error: errorMessage(err, "Metne çevrilemedi") } }));
    } finally {
      setActiveMediaId(null);
    }
  }

  async function resolve(action: "uphold" | "change", note: string) {
    if (!hasText(note)) return void setResolveError(NOTE_REQUIRED);
    setResolveError(undefined);
    setResolvePending(true);
    try {
      await resolveRequest(companyId, id, action, note.trim());
      notify.success(action === "uphold" ? "Talep sonuçlandı: puan değişmedi" : "Düzeltmeler yayınlandı");
      setResolving(null);
      await Promise.all([
        refreshDetail(),
        queryClient.invalidateQueries({ queryKey: ["review-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["review-open-total"] }),
      ]);
    } catch (err) {
      setResolveError(errorMessage(err, "İşlem tamamlanamadı"));
    } finally {
      setResolvePending(false);
    }
  }

  const back = { href: `${basePath}/review-requests`, label: "İnceleme talepleri" };
  if (scopesError) return <ErrorState compact error={scopesError} onRetry={retry} />;
  if (scopesLoading || query.isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!scope) return <ErrorState compact error={new Error("Kurum bilgisi bulunamadı")} />;
  if (query.isError) return <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />;
  const detail = query.data;
  if (!detail) return null;

  const open = detail.status === "OPEN";
  const badge = statusBadge(detail);
  const corrections = detail.corrections ?? [];
  const appealId = detail.appeal?.appealCaseId;

  const answers = (
    <div className="grid gap-4">
      {(detail.answers ?? []).length === 0 ? <p className="text-sm text-fg-muted">Bu denemede cevap yok.</p> : null}
      {(detail.answers ?? []).map((line, index) => {
        const card = { ...answerLineToCard(line, detail), published: true };
        const audioMedia = card.interactionType === "AUDIO_RESPONSE" && line.mediaId ? line.mediaId : null;
        return (
          <AnswerReviewCard
            key={line.answerId}
            item={card}
            index={index}
            companyId={companyId}
            transcripts={transcripts}
            activeMediaId={activeMediaId}
            notice={
              <p className="text-sm text-fg-muted">
                Puan kaynağı: <span className="font-medium text-fg">{scoreSourceText(line)}</span>
                {line.aiScore != null ? ` · AI puanı: ${formatGradeScore(line.aiScore)}` : ""}
                {line.correctedInThisRequest ? " · Bu talepte düzeltildi" : ""}
              </p>
            }
            extra={
              <div className="grid gap-3">
                {line.rationale || line.feedback ? (
                  <div className="grid gap-2 rounded-lg bg-bg px-3.5 py-3 text-sm">
                    {line.rationale ? (
                      <p>
                        <span className="block text-xs font-medium text-fg-subtle">AI / değerlendirici gerekçesi</span>
                        <span className="whitespace-pre-wrap text-fg">{line.rationale}</span>
                      </p>
                    ) : null}
                    {line.feedback ? (
                      <p>
                        <span className="block text-xs font-medium text-fg-subtle">Geri bildirim</span>
                        <span className="whitespace-pre-wrap text-fg">{line.feedback}</span>
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <CorrectionTrail answerId={line.answerId ?? ""} detail={detail} />
                <div className="flex flex-wrap justify-end gap-2">
                  {audioMedia ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      loading={activeMediaId === audioMedia}
                      disabled={activeMediaId != null}
                      onClick={() => void transcribe(detail.applicationId ?? "", audioMedia)}
                    >
                      Sesi metne çevir
                    </Button>
                  ) : null}
                  {open && detail.canCorrect ? (
                    <Button type="button" className="min-h-11" onClick={() => setCorrecting(line)}>
                      Puanı düzelt
                    </Button>
                  ) : null}
                </div>
              </div>
            }
          />
        );
      })}
    </div>
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        back={back}
        title={`İnceleme talebi — ${detail.candidateName?.trim() || "Aday"}`}
        description={detail.examTitle || undefined}
        actions={
          <Badge tone={badge.tone} dot>
            {badge.label}
          </Badge>
        }
      />
      <section aria-label="Talep" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
        <DefinitionList
          items={[
            { term: "Talep nedeni", description: detail.reason || "—", wide: true },
            { term: "Talep tarihi", description: formatDateTime(detail.requestedAt) },
            { term: "Durum", description: open ? "Açık" : badge.label },
            ...(open
              ? []
              : [
                  { term: "Sonuçlanma", description: formatDateTime(detail.resolvedAt) },
                  { term: "Personel notu", description: detail.resolutionNote || "—", wide: true },
                ]),
          ]}
        />
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {detail.snapshot ? <SnapshotCard title="Yayınlanmış sonuç" snapshot={detail.snapshot} /> : null}
        {detail.resultingSnapshot ? <SnapshotCard title="Yeni sonuç" snapshot={detail.resultingSnapshot} /> : null}
      </div>
      <Tabs
        items={[
          { id: "answers", label: "Cevaplar", panel: answers },
          ...(appealId
            ? [{ id: "evidence", label: "Kanıt paketi", panel: <EvidencePanel companyId={companyId} appealId={appealId} /> }]
            : []),
        ]}
      />
      {open ? (
        <section aria-label="Talebi sonuçlandır" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-fg-muted">
            {corrections.length === 0
              ? "Hiçbir cevapta düzeltme yapılmadı. Puanlar doğruysa talebi sonuçlandırın; aday notunuzu görür."
              : `${corrections.length} düzeltme var. Yayınlayınca sonuç yeniden hesaplanır ve aday yeni sonucu görür.`}
          </p>
          <ActionBar>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={!canUphold(detail)}
              onClick={() => setResolving("uphold")}
            >
              Puan değişmedi — sonuçlandır
            </Button>
            <Button type="button" className="min-h-11" disabled={!canPublishCorrections(detail)} onClick={() => setResolving("change")}>
              Düzeltmeleri yayınla
            </Button>
          </ActionBar>
        </section>
      ) : (
        <p role="status" className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">Bu talep sonuçlandı; puan düzeltilemez.</p>
      )}
      <CorrectionDialog
        line={correcting}
        companyId={companyId}
        requestId={id}
        onClose={() => setCorrecting(null)}
        onDone={refreshDetail}
      />
      <ConfirmDialog
        open={resolving === "uphold"}
        tone="primary"
        title="Puan değişmedi — sonuçlandır"
        description="Talep, puanlar değişmeden kapatılır. Aşağıdaki not adaya gösterilir."
        confirmLabel="Sonuçlandır"
        reasonRequired
        reasonLabel="Aday notu"
        reasonHint="Adayın göreceği açıklama. Zorunlu."
        pending={resolvePending}
        error={resolveError}
        onClose={() => {
          setResolving(null);
          setResolveError(undefined);
        }}
        onConfirm={({ reason }) => void resolve("uphold", reason)}
      />
      <ConfirmDialog
        open={resolving === "change"}
        tone="primary"
        title="Düzeltmeleri yayınla"
        description={CHANGE_CONFIRM_TEXT}
        confirmLabel="Yayınla"
        reasonRequired
        reasonLabel="Aday notu"
        reasonHint="Adayın göreceği açıklama. Zorunlu."
        pending={resolvePending}
        error={resolveError}
        onClose={() => {
          setResolving(null);
          setResolveError(undefined);
        }}
        onConfirm={({ reason }) => void resolve("change", reason)}
      />
    </div>
  );
}
