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
    <div lang="en" className="grid gap-4">
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
    return <ErrorState compact error={query.error} title="We could not load certificate details" onRetry={() => void query.refetch()} />;
  }
  const view = toCertificateView(query.data?.data, typeof window !== "undefined" ? window.location.origin : "");

  if (view.kind === "none") {
    // Kapı kapalıyken (K-A10 eşikleri girilmeden) herkes için bu durum beklenendir; hata değildir.
    return (
      <EmptyState
        tone="neutral"
        title="No certificate yet"
        description="No certificate has been issued for this result yet. Your level report is available above; your certificate will appear here once it is issued."
      />
    );
  }

  async function copy() {
    if (view.kind !== "issued") return;
    try {
      await navigator.clipboard.writeText(view.shareUrl);
      setCopied(true);
    } catch {
      notify.error("Could not copy the link");
    }
  }

  return (
    <section aria-label="Certificate" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Certificate</h2>
        <Badge tone={view.expired ? "warning" : "success"} dot>
          {view.expired ? "Expired" : "Valid"}
        </Badge>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-fg-subtle">Certificate code</dt>
          <dd className="font-mono font-semibold break-all text-fg">{view.code}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Issued</dt>
          <dd className="text-fg">{formatDay(view.issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Valid until</dt>
          <dd className="text-fg">{view.validUntil ? formatDay(view.validUntil) : "No expiry"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <a
          href={view.verifyPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg hover:bg-neutral-50"
        >
          Open verification page
        </a>
        <Button variant="secondary" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy verification link"}
        </Button>
      </div>
      <p className="text-xs text-fg-muted">
        Anyone can verify this certificate with this link. The certificate PDF cannot be downloaded in this version.
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
  const statusBox = (
    <section
      aria-label="Review request"
      role="status"
      data-status={view.kind}
      className="grid gap-2 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Your review request</h2>
        <Badge tone={view.kind === "open" ? "warning" : view.kind === "changed" ? "info" : "success"} dot>
          {view.title}
        </Badge>
      </div>
      <p className="text-sm text-fg">{view.body}</p>
      {view.kind === "changed" ? (
        <p className="text-sm text-fg-muted">Your new result is shown on this page; your previous result is no longer valid.</p>
      ) : null}
      {view.note ? (
        <div className="rounded-lg bg-bg px-3.5 py-3">
          <p className="text-xs font-medium text-fg-subtle">Reviewer note</p>
          <p className="text-sm whitespace-pre-wrap text-fg">{view.note}</p>
        </div>
      ) : null}
      <p className="text-xs text-fg-muted">
        Requested: {formatDay(view.requestedAt)}
        {view.resolvedAt ? ` · Resolved: ${formatDay(view.resolvedAt)}` : ""}
      </p>
    </section>
  );
  // Puan güncellendiyse (yeni aktif snapshot) aday yeni sonuca yeniden inceleme isteyebilir; "puan değişmedi" ve açık
  // talepte form gösterilmez. Gönderince durum yeniden çekilir ve en son talep ("İnceleniyor") görünür.
  if (view.kind === "changed") {
    return (
      <div className="grid gap-3">
        {statusBox}
        <ReviewRequestCard applicationResultId={applicationResultId} followUp onSent={() => void query.refetch()} />
      </div>
    );
  }
  return statusBox;
}

export function ReviewRequestCard({
  applicationResultId,
  followUp = false,
  onSent,
}: {
  applicationResultId: string;
  /** Puanı güncellenmiş sonuç için ikinci talep: açıklama metni buna göre. */
  followUp?: boolean;
  onSent?: () => void;
}) {
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
      onSent?.();
    } catch (err) {
      // 409: itiraz süresi doldu ya da bu sonuç için zaten talep var — sunucu mesajı olduğu gibi.
      setError(reviewRequestFailureMessage(err));
    }
  }

  if (sentAt) {
    return (
      <section aria-label="Review request" className="rounded-xl border border-success/30 bg-success-bg p-4 text-sm text-success" role="status">
        Your review request was received ({formatDay(sentAt)}). A human reviewer will re-examine the result, and you will be notified of any updates.
      </section>
    );
  }

  return (
    <section aria-label="Review request" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-fg">{followUp ? "Request a review of the new result" : "Appeal / request a review"}</h2>
          <p className="text-xs text-fg-muted">
            {followUp
              ? "You can ask for the updated result to be reviewed again. Requests have a deadline, and only one request can be made per result."
              : "You can ask for your result to be reviewed. Requests have a deadline, and only one request can be made for the same result."}
          </p>
        </div>
        {expanded ? null : (
          <Button variant="secondary" size="sm" onClick={() => setExpanded(true)}>
            Request a review
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
            Your reason
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
              Send request
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
