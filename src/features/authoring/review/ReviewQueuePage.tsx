"use client";

import { previewModelFromDetail } from "@/src/features/authoring/questions/previewModel";
import { authoringApi, type QuestionDetail, type ReviewItem, type Skill } from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { QuestionPreviewShell } from "@/src/features/exam-player";
import { useCan, useContentBasePath } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Button, ErrorState, FilterTabs, PageHeader, Select, Skeleton, notify } from "@/src/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

const REVIEW_TARGET: Record<string, string> = { QUESTION_VERSION: "Soru", EXAM: "Sınav" };
const OPEN_REVIEW = new Set(["PENDING", "IN_PROGRESS"]);
const PAGE_SIZE = 50;

const SKILL_LABEL: Record<Skill, string> = {
  READING: "Okuma",
  LISTENING: "Dinleme",
  WRITING: "Yazma",
  SPEAKING: "Konuşma",
  GRAMMAR: "Dilbilgisi",
  VOCABULARY: "Kelime",
  USE_OF_ENGLISH: "Use of English",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))} dk önce`;
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} gün önce` : new Date(iso).toLocaleDateString("tr-TR");
}

function formatSeconds(s?: number | null) {
  if (!s) return null;
  return s < 60 ? `${s} sn` : `${Math.floor(s / 60)} dk${s % 60 ? ` ${s % 60} sn` : ""}`;
}

function uniq<T>(values: (T | null | undefined)[]): T[] {
  return [...new Set(values.filter((v): v is T => v != null))];
}

export function ReviewQueuePage() {
  const questionBasePath = useContentBasePath("questions");
  const examBasePath = useContentBasePath("exams");
  const canApprove = useCan(Perm.questionEditAll, Perm.contentReviewManage);
  const requestedType = useSearchParams().get("type");
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<ReviewItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>("OPEN");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState(requestedType === "Soru" || requestedType === "Sınav" ? requestedType : "");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    if (!tenant) {
      setRows([]);
      setLoaded(true);
      return;
    }
    try {
      const result = await authoringApi.listReviews(
        status && status !== "OPEN" && status !== "ALL" ? status : undefined,
        page,
        PAGE_SIZE,
        status === "ALL",
      );
      setRows(result.items);
      setTotal(result.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoaded(true);
    }
  }, [tenant, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(
    () => rows.filter((r) => !type || (REVIEW_TARGET[r.targetType] ?? r.targetType) === type),
    [rows, type],
  );
  const selected = shown.find((r) => r.id === selectedId) ?? shown[0] ?? null;

  /** Onaydan sonra listede bir sonraki kayda geç; açık filtrede onaylanan satır listeden düşer. */
  const afterApprove = (approved: ReviewItem) => {
    const idx = shown.findIndex((r) => r.id === approved.id);
    const next = shown[idx + 1] ?? shown[idx - 1] ?? null;
    setSelectedId(next?.id ?? null);
    void load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="İnceleme kuyruğu"
        description="Açık işler en eski gönderim üstte durur. Dört göz kuralı yalnız genel merkez sorusunda yazarın kendi onayını kapatır. Okulda yönetici kendi sorusunu onaylayabilir."
        count={loaded ? total : undefined}
      />
      <section className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col-reverse gap-2 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <FilterTabs
            label="İnceleme durumu"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
              setSelectedId(null);
            }}
            items={[
              { label: "Açık", value: "OPEN" },
              { label: "Bekliyor", value: "PENDING" },
              { label: "İnceleniyor", value: "IN_PROGRESS" },
              { label: "Onaylı", value: "APPROVED" },
              { label: "İade", value: "RETURNED" },
              { label: "Tümü", value: "ALL" },
            ]}
          />
          <div className="px-3 pt-3 sm:w-44 sm:py-2">
            <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="İçerik türü">
              <option value="">Tüm içerik</option>
              <option value="Soru">Sorular</option>
              <option value="Sınav">Sınavlar</option>
            </Select>
          </div>
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState title="Kuyruk alınamadı" message={error} onRetry={() => void load()} compact />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            {/* Sol: kuyruk listesi */}
            <div className="border-b border-border lg:border-b-0 lg:border-r">
              {!loaded ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : shown.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm font-medium text-fg">{rows.length ? "Filtreye uyan kayıt yok" : "Kuyruk boş"}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {rows.length ? "Filtreleri değiştirin." : "İncelemeye gönderilen içerik burada listelenir."}
                  </p>
                </div>
              ) : (
                <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto lg:max-h-[calc(100vh-16rem)]">
                  {shown.map((r) => {
                    const active = r.id === selected?.id;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          aria-current={active ? "true" : undefined}
                          className={`flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                            active ? "bg-primary-50 shadow-[inset_3px_0_0_var(--color-primary,currentColor)]" : "hover:bg-neutral-50"
                          }`}
                        >
                          <span className="grid min-w-0 flex-1 gap-1">
                            <span className={`truncate text-[13px] font-medium ${active ? "text-primary" : "text-fg"}`}>
                              {r.label || "Adsız"}
                            </span>
                            <span className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                              <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium">
                                {REVIEW_TARGET[r.targetType] ?? r.targetType}
                              </span>
                              <span title={new Date(r.submittedAt).toLocaleString("tr-TR")}>{timeAgo(r.submittedAt)}</span>
                            </span>
                          </span>
                          <StatusBadge status={r.status} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {total > PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
                  <p className="text-xs text-fg-muted">
                    {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} / {total}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="min-h-11" disabled={page === 0} onClick={() => { setPage((p) => Math.max(0, p - 1)); setSelectedId(null); }}>
                      Önceki
                    </Button>
                    <Button type="button" variant="secondary" className="min-h-11" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => { setPage((p) => p + 1); setSelectedId(null); }}>
                      Sonraki
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Sağ: önizleme ve bilgiler */}
            <div className="min-w-0">
              {selected ? (
                selected.targetType === "QUESTION_VERSION" ? (
                  <QuestionReviewPanel
                    key={selected.id}
                    review={selected}
                    canApprove={canApprove}
                    detailHref={`${questionBasePath}/${selected.targetId}`}
                    onApproved={() => afterApprove(selected)}
                  />
                ) : (
                  <OtherReviewPanel
                    review={selected}
                    detailHref={selected.targetType.startsWith("EXAM") ? `${examBasePath}/${selected.targetId}` : null}
                  />
                )
              ) : loaded ? (
                <p className="p-6 text-sm text-fg-muted">Önizleme için soldan bir kayıt seçin.</p>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium text-fg-subtle">{k}</dt>
          <dd className="mt-0.5 break-words text-[13px] text-fg">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function PanelHeader({ title, actions }: { title: string; actions: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
      <h2 className="min-w-0 truncate text-sm font-semibold text-fg">{title}</h2>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

function QuestionReviewPanel({
  review,
  canApprove,
  detailHref,
  onApproved,
}: {
  review: ReviewItem;
  canApprove: boolean;
  detailHref: string;
  onApproved: () => void;
}) {
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Panel her kayıt için `key` ile yeniden kurulur; durum sıfırlamaya gerek yok.
    let cancel = false;
    authoringApi
      .getQuestion(review.targetId)
      .then((d) => {
        if (!cancel) setDetail(d);
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : "Soru yüklenemedi.");
      });
    return () => {
      cancel = true;
    };
  }, [review.targetId]);

  const model = useMemo(() => (detail ? previewModelFromDetail(detail) : null), [detail]);
  const approvable = canApprove && OPEN_REVIEW.has(review.status) && detail?.status === "IN_REVIEW";

  const approve = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await notify.run(authoringApi.approveQuestion(detail.versionId), { success: "Onaylandı", error: "Onaylanamadı" });
      onApproved();
    } catch {
      /* notify hatayı gösterdi */
    } finally {
      setBusy(false);
    }
  };

  const parts = detail?.parts ?? [];
  const skills = uniq(parts.map((p) => p.skill)).map((s) => SKILL_LABEL[s] ?? s);
  const types = uniq(parts.map((p) => p.interactionType)).map((t) => getTemplate(t)?.label ?? t);
  const maxScore = parts.reduce((sum, p) => sum + (p.maxScore ?? 0), 0);

  return (
    <div>
      <PanelHeader
        title={review.label || detail?.code || "Soru"}
        actions={
          <>
            <Link
              href={detailHref}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-xs font-medium text-fg-muted hover:text-primary"
            >
              Detayda aç →
            </Link>
            {approvable ? (
              <Button onClick={() => void approve()} disabled={busy} className="min-h-11">
                {busy ? "Onaylanıyor…" : "Onayla"}
              </Button>
            ) : null}
          </>
        }
      />
      <div className="space-y-5 p-4">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !model || !detail ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-bg/40 p-4">
              <QuestionPreviewShell model={model} />
            </div>
            {review.resolutionNote || detail.reviewNote ? (
              <p className="rounded-lg bg-warning-bg px-3 py-2 text-[13px] text-fg">
                Not: {review.resolutionNote || detail.reviewNote}
              </p>
            ) : null}
            <InfoGrid
              items={[
                ["Kod", detail.code],
                ["Sürüm", `v${detail.versionNo}`],
                ["Soru durumu", <StatusBadge key="qs" status={detail.status} />],
                ["İnceleme durumu", <StatusBadge key="rs" status={review.status} />],
                ["Gönderilme", new Date(review.submittedAt).toLocaleString("tr-TR")],
                ["CEFR", detail.cefrLevel?.replace("_", " ") ?? null],
                ["Beceri", skills.join(", ") || null],
                ["Soru tipi", types.join(", ") || null],
                ["Bölüm sayısı", parts.length],
                ["Toplam puan", maxScore || null],
                ["Tahmini süre", formatSeconds(detail.estimatedTimeSec)],
                ["Süre sınırı", formatSeconds(detail.timeLimitSec)],
                ["Yaş grubu", detail.ageBand ?? null],
                ["MEB sınıfı", detail.mebGrade ? `${detail.mebGrade}. sınıf` : null],
                ["Güvenlik seviyesi", detail.securityLevel ?? null],
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

function OtherReviewPanel({ review, detailHref }: { review: ReviewItem; detailHref: string | null }) {
  return (
    <div>
      <PanelHeader
        title={review.label || "Adsız"}
        actions={
          detailHref ? (
            <Link
              href={detailHref}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-xs font-medium text-fg hover:border-primary-300 hover:text-primary"
            >
              İncele →
            </Link>
          ) : null
        }
      />
      <div className="space-y-4 p-4">
        <p className="text-[13px] text-fg-muted">
          Sınavlar yayın kontrolleriyle birlikte detay sayfasından yayınlanır.
        </p>
        {review.resolutionNote ? (
          <p className="rounded-lg bg-warning-bg px-3 py-2 text-[13px] text-fg">Not: {review.resolutionNote}</p>
        ) : null}
        <InfoGrid
          items={[
            ["Tür", REVIEW_TARGET[review.targetType] ?? review.targetType],
            ["İnceleme durumu", <StatusBadge key="rs" status={review.status} />],
            ["Gönderilme", new Date(review.submittedAt).toLocaleString("tr-TR")],
          ]}
        />
      </div>
    </div>
  );
}
