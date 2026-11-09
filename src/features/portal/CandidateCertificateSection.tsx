"use client";

import { useMyCertificate, useMyReviewRequest, useOpenReviewRequest } from "@/src/api/generated/candidate-portal-controller/candidate-portal-controller";
import { useMyHistory } from "@/src/api/generated/report-controller/report-controller";
import { formatDay, reviewRequestFailureMessage, toCertificateView, validateReviewReason } from "@/src/features/portal/certificateModel";
import { toReviewStatusView } from "@/src/features/portal/reviewStatusModel";
import { Badge, Button, EmptyState, ErrorState, Skeleton, Textarea, notify } from "@/src/ui";
import { useState } from "react";

/**
 * R-19 (F6-08): sonuç sayfasının sertifika + inceleme talebi bölümü.
 * `applicationResultId`, seviye raporu bölümündeki gibi `useMyHistory` ile `applicationId`'den eşlenir (yeni uç icat edilmedi).
 * Adayın kendi sonucuna erişimi yönetici erişimi değildir (D31) — erişim kaydı tutulmaz.
 */
export function CandidateCertificateSection({ applicationId }: { applicationId: string }) {
  const historyQ = useMyHistory();
  if (historyQ.isLoading) return <Skeleton className="h-28 rounded-xl" />;
  const resultId = historyQ.data?.data.find((r) => r.applicationId === applicationId)?.applicationResultId;
  // Sonuç henüz yayınlanmadıysa (geçmişte yok) sertifika/talep gösterilmez.
  if (!resultId) return null;
  return (
    <div lang="tr" className="grid gap-4">
      <CertificateCard applicationResultId={resultId} />
      <ReviewRequestSection applicationResultId={resultId} />
    </div>
  );
}

export function CertificateCard({ applicationResultId }: { applicationResultId: string }) {
  const query = useMyCertificate(applicationResultId);
  const [copied, setCopied] = useState(false);

  if (query.isLoading) return <Skeleton className="h-28 rounded-xl" />;
  if (query.isError) {
    return <ErrorState compact error={query.error} title="Sertifika bilgisi alınamadı" onRetry={() => void query.refetch()} />;
  }
  const view = toCertificateView(query.data?.data, typeof window !== "undefined" ? window.location.origin : "");

  if (view.kind === "none") {
    // Kapı kapalıyken (K-A10 eşikleri girilmeden) herkes için bu durum beklenendir; hata değildir.
    return (
      <EmptyState
        tone="neutral"
        title="Sertifika henüz verilmiyor"
        description="Bu sonuç için henüz sertifika düzenlenmedi. Seviye raporunuz yukarıda hazırdır; sertifika verilmeye başlandığında burada görünecek."
      />
    );
  }

  async function copy() {
    if (view.kind !== "issued") return;
    try {
      await navigator.clipboard.writeText(view.shareUrl);
      setCopied(true);
    } catch {
      notify.error("Bağlantı kopyalanamadı");
    }
  }

  return (
    <section aria-label="Sertifika" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Sertifika</h2>
        <Badge tone={view.expired ? "warning" : "success"} dot>
          {view.expired ? "Süresi doldu" : "Geçerli"}
        </Badge>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-fg-subtle">Sertifika kodu</dt>
          <dd className="font-mono font-semibold break-all text-fg">{view.code}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Düzenlenme</dt>
          <dd className="text-fg">{formatDay(view.issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Geçerlilik</dt>
          <dd className="text-fg">{view.validUntil ? formatDay(view.validUntil) : "Süresiz"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <a
          href={view.verifyPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg hover:bg-neutral-50"
        >
          Doğrulama sayfasını aç
        </a>
        <Button variant="secondary" size="sm" onClick={() => void copy()}>
          {copied ? "Kopyalandı" : "Doğrulama bağlantısını kopyala"}
        </Button>
      </div>
      <p className="text-xs text-fg-muted">
        Sertifikanın geçerliliğini herkes bu bağlantıyla doğrulayabilir. Sertifika PDF&apos;i bu sürümde indirilemez.
      </p>
    </section>
  );
}

/**
 * R-32: talep varsa durumu ("İnceleniyor" / "Sonuçlandı: puan değişmedi" / "Puanınız güncellendi" + personel notu),
 * yoksa R-19 talep açma kutusu. Durum ucu hata verirse talep kutusu yine açılır (akış kilitlenmez).
 */
export function ReviewRequestSection({ applicationResultId }: { applicationResultId: string }) {
  const query = useMyReviewRequest(applicationResultId);
  if (query.isLoading) return <Skeleton className="h-24 rounded-xl" />;
  const view = toReviewStatusView(query.isError ? null : query.data?.data);
  if (view.kind === "none") return <ReviewRequestCard applicationResultId={applicationResultId} />;
  return (
    <section
      aria-label="İnceleme talebi"
      role="status"
      data-status={view.kind}
      className="grid gap-2 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">İnceleme talebiniz</h2>
        <Badge tone={view.kind === "open" ? "warning" : view.kind === "changed" ? "info" : "success"} dot>
          {view.title}
        </Badge>
      </div>
      <p className="text-sm text-fg">{view.body}</p>
      {view.kind === "changed" ? (
        <p className="text-sm text-fg-muted">Yeni sonucunuz bu sayfada gösterilir; önceki sonucunuz geçerli değildir.</p>
      ) : null}
      {view.note ? (
        <div className="rounded-lg bg-bg px-3.5 py-3">
          <p className="text-xs font-medium text-fg-subtle">Değerlendirici notu</p>
          <p className="text-sm whitespace-pre-wrap text-fg">{view.note}</p>
        </div>
      ) : null}
      <p className="text-xs text-fg-muted">
        Talep tarihi: {formatDay(view.requestedAt)}
        {view.resolvedAt ? ` · Sonuçlanma: ${formatDay(view.resolvedAt)}` : ""}
      </p>
    </section>
  );
}

export function ReviewRequestCard({ applicationResultId }: { applicationResultId: string }) {
  const open = useOpenReviewRequest();
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const issue = validateReviewReason(reason);

  async function submit() {
    setTouched(true);
    if (issue) return;
    setError(null);
    try {
      const result = await open.mutateAsync({ applicationResultId, data: { reason: reason.trim() } });
      setSentAt(result.data.requestedAt ?? new Date().toISOString());
    } catch (err) {
      // 409: itiraz süresi doldu ya da bu sonuç için zaten talep var — sunucu mesajı olduğu gibi.
      setError(reviewRequestFailureMessage(err));
    }
  }

  if (sentAt) {
    return (
      <section aria-label="İnceleme talebi" className="rounded-xl border border-success/30 bg-success-bg p-4 text-sm text-success" role="status">
        İnceleme talebiniz alındı ({formatDay(sentAt)}). Sonuç insan değerlendirici tarafından yeniden incelenecek; gelişmeler size bildirilir.
      </section>
    );
  }

  return (
    <section aria-label="İnceleme talebi" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-fg">Sonuca itiraz / inceleme talebi</h2>
          <p className="text-xs text-fg-muted">Sonucun yeniden incelenmesini isteyebilirsiniz. Talep için süre sınırı vardır; aynı sonuç için yalnız bir talep açılabilir.</p>
        </div>
        {expanded ? null : (
          <Button variant="secondary" size="sm" onClick={() => setExpanded(true)}>
            İnceleme talep et
          </Button>
        )}
      </div>
      {expanded ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="review-reason" className="text-sm font-medium text-fg">
            Gerekçeniz
          </label>
          <Textarea id="review-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={touched && issue ? true : undefined} />
          {touched && issue ? <p className="text-xs text-danger">{issue}</p> : null}
          {error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={open.isPending}>
              Talebi gönder
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Vazgeç
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
