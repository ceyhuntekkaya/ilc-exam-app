"use client";

import { authoringApi } from "@/src/features/authoring/shared/client";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { HtmlInline } from "@/src/features/exam-player/html";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { useEffect, useMemo, useState } from "react";

type RubricItem = {
  kind?: string;
  type?: string;
  id: string;
  description?: HtmlValue | string;
  section?: string;
  points?: number;
  levels?: Array<{ id?: string; label?: HtmlValue; points?: number }>;
};

type RubricDetail = {
  id: string;
  name: string;
  code: string;
  skill: string;
  versionNo: number;
  status: string;
  maxRawScore?: number;
  definition?: { items?: RubricItem[] };
};

export type PreviewRubricPart = {
  partId: string;
  position: number;
  interactionType: string;
  rubricVersionId?: string | null;
  answerKey?: Record<string, unknown> | null;
};

function itemKind(item: RubricItem): string {
  return String(item.kind || item.type || "").toUpperCase();
}

function descriptionText(value: RubricItem["description"]): string {
  if (typeof value === "string") {
    const t = value.trim();
    if (!t.includes("<")) return t || "—";
    return htmlOf(value)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "—";
  }
  if (value && typeof value === "object") {
    return descriptionText(htmlOf(value));
  }
  return "—";
}

function RubricItems({ items }: { items: RubricItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-fg-muted">Rubrik maddesi yok.</p>;
  }

  const bySection = new Map<string, RubricItem[]>();
  for (const item of items) {
    const section = item.section?.trim() || "Genel";
    const list = bySection.get(section) ?? [];
    list.push(item);
    bySection.set(section, list);
  }

  return (
    <div className="space-y-4">
      {[...bySection.entries()].map(([section, sectionItems]) => (
        <div key={section} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{section}</p>
          <ul className="space-y-2">
            {sectionItems.map((item) => {
              const kind = itemKind(item);
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-fg-muted uppercase">
                      {kind || "ITEM"}
                    </span>
                    <code className="text-[11px] text-fg-muted">{item.id}</code>
                    {kind === "CHECK" || kind === "PENALTY" ? (
                      <span className="text-xs text-fg-muted">
                        {kind === "PENALTY" ? "−" : "+"}
                        {item.points ?? 0} puan
                      </span>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-fg">{descriptionText(item.description)}</p>
                  {kind === "SCALE" && item.levels?.length ? (
                    <ul className="mt-2 space-y-1 border-t border-border pt-2">
                      {item.levels.map((level, i) => (
                        <li key={level.id || i} className="flex items-center justify-between gap-2 text-xs">
                          <span>
                            <HtmlInline value={level.label} fallback={level.id || `Seviye ${i + 1}`} />
                          </span>
                          <span className="tabular-nums text-fg-muted">{level.points ?? 0} puan</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ManualHints({ answerKey }: { answerKey?: Record<string, unknown> | null }) {
  if (!answerKey) return null;
  const samples = (answerKey.sampleAnswers as Array<HtmlValue | string>) || [];
  const notes = String(answerKey.raterNotes ?? "");
  if (!samples.length && !notes) return null;
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      {samples.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-fg-muted">Örnek cevaplar</p>
          <ul className="list-disc space-y-1 pl-4">
            {samples.map((s, i) => (
              <li key={i}>
                {typeof s === "string" ? s : htmlOf(s) || "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {notes ? (
        <p>
          <span className="text-xs font-semibold text-fg-muted">Değerlendirici notu: </span>
          {notes}
        </p>
      ) : null}
    </div>
  );
}

export function PreviewRubricPanel({
  parts,
  rubricCatalog,
}: {
  parts: PreviewRubricPart[];
  rubricCatalog: Array<{ id: string; name: string; currentVersionId?: string | null }>;
}) {
  const manualParts = useMemo(
    () => parts.filter((p) => getTemplate(p.interactionType)?.autoGradable === false),
    [parts],
  );

  const [details, setDetails] = useState<Record<string, RubricDetail | null>>({});
  const [loading, setLoading] = useState(false);

  const versionToRubricId = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rubricCatalog) {
      if (r.currentVersionId) map.set(r.currentVersionId, r.id);
    }
    return map;
  }, [rubricCatalog]);

  useEffect(() => {
    const versionIds = [
      ...new Set(
        manualParts
          .map((p) => p.rubricVersionId)
          .filter((id): id is string => !!id),
      ),
    ];
    if (!versionIds.length) {
      setDetails({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const next: Record<string, RubricDetail | null> = {};
      await Promise.all(
        versionIds.map(async (versionId) => {
          const rubricId = versionToRubricId.get(versionId);
          if (!rubricId) {
            next[versionId] = null;
            return;
          }
          try {
            const detail = await authoringApi.getRubric(rubricId);
            next[versionId] = detail as RubricDetail;
          } catch {
            next[versionId] = null;
          }
        }),
      );
      if (!cancelled) {
        setDetails(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [manualParts, versionToRubricId]);

  if (!manualParts.length) return null;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-fg">Rubrik önizlemesi</h3>
        <p className="text-xs text-fg-muted">
          Otomatik puanlanamayan şablonlar için — sınav oturumundan bağımsız, salt görünüm
        </p>
      </div>

      {loading ? <p className="text-sm text-fg-muted">Rubrik yükleniyor…</p> : null}

      <div className="space-y-4">
        {manualParts.map((part) => {
          const detail = part.rubricVersionId ? details[part.rubricVersionId] : null;
          const items = detail?.definition?.items ?? [];
          return (
            <div key={part.partId} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-fg">
                  Part {part.position} · {getTemplate(part.interactionType)?.label || part.interactionType}
                </p>
                {detail ? (
                  <p className="text-xs text-fg-muted">
                    {detail.name} ({detail.code}) · v{detail.versionNo}
                    {detail.maxRawScore != null ? ` · ${detail.maxRawScore}/100` : ""}
                  </p>
                ) : null}
              </div>

              {!part.rubricVersionId ? (
                <p className="text-sm text-amber-700">Rubrik seçilmemiş.</p>
              ) : detail ? (
                <RubricItems items={items} />
              ) : loading ? null : (
                <p className="text-sm text-fg-muted">Rubrik yüklenemedi veya bulunamadı.</p>
              )}

              <ManualHints answerKey={part.answerKey} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
