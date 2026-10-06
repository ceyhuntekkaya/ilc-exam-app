"use client";

import { customInstance } from "@/src/api/mutator";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { Button, EmptyState, ErrorState, Field, Skeleton, Textarea, errorMessage, notify } from "@/src/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export type PrerequisiteItem = {
  key: string;
  questionKey: string;
  mediaId: string;
  kind: string;
  location: string;
  locationLabel: string;
  sectionTitle?: string | null;
  subSectionTitle?: string | null;
  questionOrder: number;
  partPosition?: number | null;
  interactionType?: string | null;
  questionInteractions?: string | null;
  filename?: string | null;
  text?: string | null;
  textReady: boolean;
  fileReady: boolean;
};

export type PrerequisiteReport = {
  items: PrerequisiteItem[];
  missingCount: number;
  contentReady: boolean;
};

export function prerequisiteQueryKey(companyId: string, examVersionId: string) {
  return ["grading-prerequisites", companyId, examVersionId] as const;
}

const KIND_LABEL: Record<string, string> = {
  AUDIO: "Ses",
  IMAGE: "Görsel",
  VIDEO: "Video",
};

function mediaSrc(mediaId: string) {
  return `/api/backend/media/${mediaId}/content`;
}

function interactionLabels(raw: string | null | undefined) {
  return (raw ?? "")
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean)
    .map((type) => getTemplate(type)?.label ?? type)
    .join(", ");
}

function placeOf(item: PrerequisiteItem) {
  const kind = KIND_LABEL[item.kind] ?? item.kind;
  const part = item.partPosition != null ? ` · Part ${item.partPosition}` : "";
  return `${item.locationLabel}${part} · ${kind}`;
}

export function GradingPrerequisites({
  companyId,
  examVersionId,
}: {
  companyId: string;
  examVersionId: string;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: prerequisiteQueryKey(companyId, examVersionId),
    enabled: Boolean(examVersionId),
    queryFn: () =>
      customInstance<{ data: PrerequisiteReport }>(
        `/companies/${companyId}/exam-versions/${examVersionId}/grading-prerequisites`,
      ),
  });
  const report = query.data?.data;
  const items = report?.items ?? [];
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null);

  const serverText = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of items) {
      if (map[item.mediaId] == null) map[item.mediaId] = item.text ?? "";
    }
    return map;
  }, [items]);

  const shared = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.mediaId, (counts.get(item.mediaId) ?? 0) + 1);
    return counts;
  }, [items]);

  const groups = useMemo(() => {
    const rows: { key: string; items: PrerequisiteItem[] }[] = [];
    for (const item of items) {
      const last = rows[rows.length - 1];
      if (last && last.key === item.questionKey) last.items.push(item);
      else rows.push({ key: item.questionKey, items: [item] });
    }
    return rows;
  }, [items]);

  const audioIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (item.kind !== "AUDIO" || !item.fileReady || seen.has(item.mediaId)) continue;
      seen.add(item.mediaId);
      ids.push(item.mediaId);
    }
    return ids;
  }, [items]);

  function textOf(mediaId: string) {
    return Object.prototype.hasOwnProperty.call(drafts, mediaId) ? drafts[mediaId] : (serverText[mediaId] ?? "");
  }

  function clearError(mediaId: string) {
    setErrors((current) => {
      if (!current[mediaId]) return current;
      const next = { ...current };
      delete next[mediaId];
      return next;
    });
  }

  async function identify(ids: string[]) {
    const jobs = [...new Set(ids)];
    if (jobs.length === 0 || progress) return;
    setProgress({ index: 0, total: jobs.length });
    try {
      for (let index = 0; index < jobs.length; index += 1) {
        const mediaId = jobs[index];
        setProgress({ index: index + 1, total: jobs.length });
        setActiveMediaId(mediaId);
        try {
          const result = await customInstance<{ data: { mediaId: string; text?: string | null; textReady: boolean } }>(
            `/companies/${companyId}/exam-versions/${examVersionId}/media/${mediaId}/transcript`,
            { method: "POST" },
          );
          const text = result.data?.text ?? "";
          setDrafts((current) => ({ ...current, [mediaId]: text }));
          if (text.trim()) clearError(mediaId);
          else setErrors((current) => ({ ...current, [mediaId]: "Sesten metin çıkmadı." }));
        } catch (err) {
          const message = errorMessage(err, "Metne çevrilemedi");
          setErrors((current) => ({ ...current, [mediaId]: message }));
          if (message.includes("STT adresi")) {
            notify.error(message);
            break;
          }
        }
      }
    } finally {
      setActiveMediaId(null);
      setProgress(null);
      await queryClient.invalidateQueries({ queryKey: prerequisiteQueryKey(companyId, examVersionId) });
    }
  }

  async function save(mediaId: string) {
    const text = textOf(mediaId).trim();
    if (!text) {
      notify.error("Metin girin");
      return;
    }
    setSavingId(mediaId);
    try {
      await customInstance(`/companies/${companyId}/exam-versions/${examVersionId}/media/${mediaId}/text`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setDrafts((current) => ({ ...current, [mediaId]: text }));
      clearError(mediaId);
      notify.success("Metin kaydedildi");
      await queryClient.invalidateQueries({ queryKey: prerequisiteQueryKey(companyId, examVersionId) });
    } catch (err) {
      notify.error(errorMessage(err, "Kaydedilemedi"));
    } finally {
      setSavingId(null);
    }
  }

  if (query.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!report?.contentReady) {
    return <EmptyState tone="neutral" title="Sınav içeriği bulunamadı" description="Yayınlanmış sınav paketi okunamadı." />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        tone="neutral"
        title="Metin gerektiren materyal yok"
        description="Sesli yanıt ve açık uçlu sorularda ana dinleme, yönerge, okuma veya soru kökünde ses, görsel ya da video yok."
      />
    );
  }

  const missing = report.missingCount ?? 0;
  const identifying = progress != null;

  return (
    <div className="grid min-w-0 gap-4">
      <p className="text-sm text-fg-muted">
        Yalnız sesli yanıt ve açık uçlu sorular. Ana dinleme sesi, yönergedeki ses veya görsel, okuma ve görsel içerik ile soru kökündeki ses, görsel ve video için metin hali gerekir. AI değerlendirmesi bu metni kullanır.
      </p>
      {missing > 0 ? (
        <p className="rounded-lg border border-warning/30 bg-warning-bg px-3.5 py-2.5 text-sm text-warning">
          {missing.toLocaleString("tr-TR")} materyalin metin hali eksik.
        </p>
      ) : (
        <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success">Materyallerin metin hali hazır.</p>
      )}
      {audioIds.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={identifying}
            onClick={() => void identify(audioIds)}
          >
            {identifying && progress ? `Tanımlanıyor ${progress.index}/${progress.total}` : "Tüm sesleri tanımla"}
          </Button>
          {identifying ? (
            <p className="text-xs text-fg-muted" aria-live="polite">
              Sesler sırayla metne çevriliyor.
            </p>
          ) : null}
        </div>
      ) : null}

      {groups.map((group) => {
        const head = group.items[0];
        const where = [head.sectionTitle, head.subSectionTitle].filter(Boolean).join(" · ");
        const types = interactionLabels(head.questionInteractions);
        return (
          <section key={group.key} className="grid min-w-0 gap-3">
            <header className="min-w-0">
              <h3 className="text-sm font-semibold text-fg">
                <span className="numeric">Soru {head.questionOrder}</span>
                {where ? <span className="font-medium text-fg-muted"> · {where}</span> : null}
              </h3>
              {types ? <p className="mt-0.5 text-xs text-fg-muted">{types}</p> : null}
            </header>
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {group.items.map((item) => {
                const value = textOf(item.mediaId);
                const dirty = value.trim() !== (serverText[item.mediaId] ?? "").trim();
                const listening = activeMediaId === item.mediaId;
                const error = errors[item.mediaId];
                const src = mediaSrc(item.mediaId);
                return (
                  <article
                    key={item.key}
                    className={`grid min-w-0 content-start gap-3 rounded-xl border p-4 ${
                      item.textReady ? "border-border" : "border-warning/40 bg-warning-bg/40"
                    }`}
                  >
                    <header className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg">{placeOf(item)}</p>
                        {item.filename ? <p className="truncate text-xs text-fg-muted">{item.filename}</p> : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          item.textReady ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
                        }`}
                      >
                        {item.textReady ? "Metin hazır" : "Metin eksik"}
                      </span>
                    </header>
                    {item.fileReady ? (
                      item.kind === "AUDIO" ? (
                        <audio controls preload="none" src={src} className="w-full" />
                      ) : item.kind === "VIDEO" ? (
                        <video
                          controls
                          preload="metadata"
                          src={src}
                          className="aspect-video max-h-72 w-full rounded-lg bg-black object-contain"
                        />
                      ) : (
                        // Katalog görseli; boyut dosyaya göre değişir.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={item.locationLabel} className="max-h-72 w-full rounded-lg bg-bg object-contain" />
                      )
                    ) : (
                      <p className="text-sm text-fg-muted">Dosya hazır değil, önizleme açılamıyor.</p>
                    )}
                    {listening ? <p className="text-sm text-fg-muted">Dinleniyor…</p> : null}
                    {error ? (
                      <p role="alert" className="text-sm text-danger">
                        {error}
                      </p>
                    ) : null}
                    <Field
                      label="Metin hali"
                      hint={
                        item.kind === "AUDIO"
                          ? "Sesi Tanımla kaydı metne çevirir. Gerekirse düzeltip kaydedin."
                          : item.kind === "VIDEO"
                            ? "Videoda ne olduğunu yazın."
                            : "Görselde ne olduğunu yazın."
                      }
                    >
                      <Textarea
                        rows={4}
                        value={value}
                        placeholder={item.kind === "AUDIO" ? "Sesi Tanımla ile doldurun veya metni yazın" : "Materyalin metnini yazın"}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDrafts((current) => ({ ...current, [item.mediaId]: next }));
                          clearError(item.mediaId);
                        }}
                      />
                    </Field>
                    {(shared.get(item.mediaId) ?? 0) > 1 ? (
                      <p className="text-xs text-fg-muted">Bu dosya birden fazla yerde. Metin hepsi için geçerlidir.</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {item.kind === "AUDIO" ? (
                        <Button
                          type="button"
                          className="min-h-11 flex-1 sm:flex-none"
                          disabled={!item.fileReady || identifying || savingId != null}
                          onClick={() => void identify([item.mediaId])}
                        >
                          {listening ? "Tanımlanıyor…" : "Sesi Tanımla"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant={item.kind === "AUDIO" ? "secondary" : "primary"}
                        className="min-h-11 flex-1 sm:flex-none"
                        loading={savingId === item.mediaId}
                        disabled={savingId != null || identifying || !dirty || value.trim() === ""}
                        onClick={() => void save(item.mediaId)}
                      >
                        Kaydet
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
