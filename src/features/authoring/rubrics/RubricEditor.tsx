"use client";

import { newId } from "@/src/features/authoring/blocks/ids";
import { asInlineHtmlObj, InlineHtmlField } from "@/src/features/authoring/blocks/InlineHtmlField";
import { authoringApi } from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormCard,
  Input,
  PageHeader,
  Select,
  errorMessage,
  notify,
  Textarea,
} from "@/src/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

export type RubricItemKind = "CHECK" | "SCALE" | "PENALTY";

type ScaleLevel = {
  id: string;
  label: { html: string };
  points: number;
};

type RubricItem = {
  kind: RubricItemKind;
  id: string;
  description: string;
  section: string;
  points?: number;
  levels?: ScaleLevel[];
};

type RubricRow = {
  id: string;
  code: string;
  name: string;
  skill: string;
  currentVersionId?: string | null;
};

type RubricDetail = {
  id: string;
  code: string;
  name: string;
  skill: string;
  versionId: string;
  versionNo: number;
  status: string;
  definition?: { items?: unknown[] };
  maxRawScore?: number;
};

const TARGET_TOTAL = 100;

const RUBRIC_SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING"] as const;

function asObj(value: HtmlValue | unknown): { html: string } {
  if (value && typeof value === "object" && "html" in (value as object)) {
    const h = String((value as { html: string }).html);
    return { html: h };
  }
  if (typeof value === "string") return { html: value };
  return { html: "" };
}

/** Eski HTML / { html } veya düz string açıklamayı düz metne çevirir. */
function plainDescription(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.includes("<")) return trimmed;
    return htmlOf(asObj(value))
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (value && typeof value === "object" && "html" in (value as object)) {
    return plainDescription(htmlOf(asObj(value)));
  }
  return "";
}

function normalizeItem(raw: Record<string, unknown>): RubricItem {
  const kind = String(raw.kind || raw.type || "CHECK").toUpperCase() as RubricItemKind;
  const base = {
    id: String(raw.id || newId("item")),
    description: plainDescription(raw.description),
    section: String(raw.section || "Main"),
  };
  if (kind === "SCALE") {
    const levelsRaw = Array.isArray(raw.levels) ? raw.levels : [];
    const levels: ScaleLevel[] = levelsRaw.map((l, i) => {
      const row = (l ?? {}) as Record<string, unknown>;
      return {
        id: String(row.id || `lv${i + 1}`),
        label: asInlineHtmlObj(asObj(row.label)),
        points: Number(row.points ?? 0),
      };
    });
    while (levels.length < 2) {
      levels.push({
        id: newId("lv"),
        label: { html: levels.length === 0 ? "Zayıf" : "Güçlü" },
        points: levels.length === 0 ? 0 : 1,
      });
    }
    return { kind: "SCALE", ...base, levels };
  }
  return {
    kind: kind === "PENALTY" ? "PENALTY" : "CHECK",
    ...base,
    points: Number(raw.points ?? 1),
  };
}

function itemMax(item: RubricItem): number {
  if (item.kind === "PENALTY") return 0;
  if (item.kind === "CHECK") return Number(item.points ?? 0);
  const pts = (item.levels ?? []).map((l) => Number(l.points ?? 0));
  return pts.length ? Math.max(...pts) : 0;
}

function totalMax(items: RubricItem[]): number {
  return items.reduce((sum, item) => sum + itemMax(item), 0);
}

function toPayload(items: RubricItem[]): { items: RubricItem[] } {
  return {
    items: items.map((item) => {
      if (item.kind === "SCALE") {
        return {
          kind: "SCALE",
          id: item.id,
          description: item.description.trim(),
          section: item.section || "Main",
          levels: (item.levels ?? []).map((l) => ({
            id: l.id,
            label: { html: htmlOf(l.label) || "" },
            points: Number(l.points ?? 0),
          })),
        };
      }
      return {
        kind: item.kind,
        id: item.id,
        description: item.description.trim(),
        section: item.section || "Main",
        points: Number(item.points ?? 0),
      };
    }),
  };
}

function blankItem(kind: RubricItemKind, existingIds: string[]): RubricItem {
  const id = newId(kind === "CHECK" ? "c" : kind === "SCALE" ? "s" : "p");
  const used = new Set(existingIds);
  let safe = id;
  let n = 1;
  while (used.has(safe)) {
    safe = `${id}${n}`;
    n += 1;
  }
  if (kind === "SCALE") {
    return {
      kind: "SCALE",
      id: safe,
      description: "Ölçek maddesi",
      section: "Main",
      levels: [
        { id: newId("lv"), label: { html: "Zayıf" }, points: 0 },
        { id: newId("lv"), label: { html: "Orta" }, points: 5 },
        { id: newId("lv"), label: { html: "Güçlü" }, points: 10 },
      ],
    };
  }
  if (kind === "PENALTY") {
    return {
      kind: "PENALTY",
      id: safe,
      description: "Ceza",
      section: "Penalties",
      points: 5,
    };
  }
  return {
    kind: "CHECK",
    id: safe,
    description: "Kriter",
    section: "Main",
    points: 10,
  };
}

function defaultStarterItems(): RubricItem[] {
  return [
    {
      kind: "CHECK",
      id: "c1",
      description: "Temel kriter",
      section: "Main",
      points: 40,
    },
    {
      kind: "SCALE",
      id: "s1",
      description: "Kalite",
      section: "Main",
      levels: [
        { id: "lv_weak", label: { html: "Zayıf" }, points: 0 },
        { id: "lv_ok", label: { html: "Orta" }, points: 30 },
        { id: "lv_strong", label: { html: "Güçlü" }, points: 60 },
      ],
    },
    {
      kind: "PENALTY",
      id: "p1",
      description: "Konu dışı",
      section: "Penalties",
      points: 10,
    },
  ];
}

export function RubricsPage() {
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<RubricRow[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [skill, setSkill] = useState("WRITING");
  const [detail, setDetail] = useState<RubricDetail | null>(null);
  const [items, setItems] = useState<RubricItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => totalMax(items), [items]);
  const totalOk = Math.abs(total - TARGET_TOTAL) < 0.001;
  const editable = detail?.status === "DRAFT";
  const canApprove = detail?.status === "DRAFT" || detail?.status === "IN_REVIEW";

  const load = useCallback(async () => {
    if (!tenant) return;
    setRows(await authoringApi.listRubrics());
  }, [tenant]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [load]);

  async function create() {
    setBusy(true);
    try {
      const starter = defaultStarterItems();
      const created = (await authoringApi.createRubric({
        code: code || `RB-${Date.now().toString(36)}`,
        name: name || "Yeni rubrik grubu",
        skill,
        definition: toPayload(starter),
      })) as RubricDetail;
      setCode("");
      setName("");
      await load();
      setDetail(created);
      const rawItems = (created.definition?.items ?? starter) as Record<string, unknown>[];
      setItems(rawItems.map((r) => normalizeItem(r)));
      notify.success("Rubrik grubu eklendi");
      setError(null);
    } catch (e) {
      const message = errorMessage(e, "Oluşturulamadı");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setBusy(true);
    try {
      const next = (await authoringApi.getRubric(id)) as RubricDetail;
      setDetail(next);
      const raw = (next.definition?.items ?? []) as Record<string, unknown>[];
      setItems(raw.map((r) => normalizeItem(r)));
      setError(null);
    } catch (e) {
      const message = errorMessage(e, "Açılamadı");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  function updateItem(index: number, next: RubricItem) {
    setItems((prev) => prev.map((it, i) => (i === index ? next : it)));
  }

  function moveItem(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem(kind: RubricItemKind) {
    setItems((prev) => [...prev, blankItem(kind, prev.map((p) => p.id))]);
  }

  async function saveDef() {
    if (!detail?.versionId) return;
    setBusy(true);
    try {
      const next = (await authoringApi.updateRubricDefinition(
        detail.versionId,
        toPayload(items),
      )) as RubricDetail;
      setDetail(next);
      const raw = (next.definition?.items ?? []) as Record<string, unknown>[];
      setItems(raw.map((r) => normalizeItem(r)));
      notify.success("Maddeler kaydedildi");
      setError(null);
    } catch (e) {
      const message = errorMessage(e, "Kayıt hatası");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!detail?.versionId) return;
    if (!totalOk) {
      notify.error(`Toplam puan ${TARGET_TOTAL} olmalı (şu an: ${total})`);
      return;
    }
    setBusy(true);
    try {
      await authoringApi.updateRubricDefinition(detail.versionId, toPayload(items));
      const next = (await authoringApi.approveRubric(detail.versionId)) as RubricDetail;
      setDetail(next);
      await load();
      notify.success("Rubrik grubu onaylandı");
      setError(null);
    } catch (e) {
      const message = errorMessage(e, "Onay hatası");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  if (!tenant) {
    return <p className="text-sm text-fg-muted">Kurum seçin.</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rubrik grupları"
        description="Grup /100 üzerinden CHECK, SCALE ve PENALTY maddeleri; onay sonrası soruya grup olarak bağlanır."
      />
      {error ? <ErrorState title="Hata" message={error} /> : null}

      <FormCard title="Yeni rubrik grubu">
        <div className="flex flex-wrap gap-2">
          <Field label="Kod">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="A2-SPEAKING" />
          </Field>
          <Field label="Ad">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A2 Speaking Rubriği"
            />
          </Field>
          <Field label="Beceri">
            <Select value={skill} onChange={(e) => setSkill(e.target.value)}>
              {RUBRIC_SKILLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Button className="min-h-11 self-end" disabled={busy} onClick={() => void create()}>
            Ekle
          </Button>
        </div>
      </FormCard>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {rows.length === 0 ? (
            <li className="p-4">
              <EmptyState title="Rubrik grubu yok" description="Yukarıdan yeni bir grup ekleyin." />
            </li>
          ) : (
            rows.map((r) => {
              const active = detail?.id === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => void open(r.id)}
                    className={`flex min-h-11 w-full items-start justify-between gap-2 px-4 py-3 text-left text-sm ${
                      active ? "bg-primary/10" : "hover:bg-bg"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{r.name}</span>
                      <span className="text-xs text-fg-muted">
                        {r.code} · {r.skill}
                        {r.currentVersionId ? " · onaylı" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {detail ? (
          <FormCard
            title={`${detail.name}`}
            description={`Sürüm ${detail.versionNo} · ${detail.code}`}
            aside={<StatusBadge status={detail.status} />}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2">
              <p className="text-sm text-fg">
                Toplam (CHECK + SCALE max):{" "}
                <span className={`font-semibold tabular-nums ${totalOk ? "text-success" : "text-danger"}`}>
                  {total} / {TARGET_TOTAL}
                </span>
              </p>
              <p className="text-xs text-fg-muted">PENALTY toplama dahil değil · part Max puan ayrı ağırlıktır</p>
            </div>

            {!totalOk ? (
              <p className="mb-3 text-sm text-amber-800">
                Onay için toplam kesin {TARGET_TOTAL} olmalıdır. Maddelerin puanlarını ayarlayın.
              </p>
            ) : null}

            <div className="mb-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={!editable || busy} onClick={() => addItem("CHECK")}>
                + CHECK
              </Button>
              <Button size="sm" variant="secondary" disabled={!editable || busy} onClick={() => addItem("SCALE")}>
                + SCALE
              </Button>
              <Button size="sm" variant="secondary" disabled={!editable || busy} onClick={() => addItem("PENALTY")}>
                + PENALTY
              </Button>
            </div>

            <div className="space-y-3">
              {items.length === 0 ? (
                <EmptyState title="Madde yok" description="En az bir CHECK veya SCALE ekleyin." />
              ) : (
                items.map((item, index) => (
                  <RubricItemCard
                    key={`${item.id}-${index}`}
                    item={item}
                    index={index}
                    disabled={!editable || busy}
                    onChange={(next) => updateItem(index, next)}
                    onMove={(dir) => moveItem(index, dir)}
                    onRemove={() => removeItem(index)}
                    canUp={index > 0}
                    canDown={index < items.length - 1}
                  />
                ))
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="min-h-11" disabled={!editable || busy} onClick={() => void saveDef()}>
                Maddeleri kaydet
              </Button>
              <Button
                className="min-h-11"
                variant="secondary"
                disabled={!canApprove || busy || !totalOk}
                onClick={() => void approve()}
              >
                Onayla
              </Button>
            </div>
          </FormCard>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6">
            <EmptyState
              title="Grup seçin"
              description="Soldan bir rubrik grubu açın veya yeni oluşturun. Soru oluştururken bu gruptan seçilir."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RubricItemCard({
  item,
  index,
  disabled,
  onChange,
  onMove,
  onRemove,
  canUp,
  canDown,
}: {
  item: RubricItem;
  index: number;
  disabled?: boolean;
  onChange: (next: RubricItem) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-neutral-100 px-2 py-1 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
            {item.kind}
          </span>
          <span className="text-xs text-fg-muted">#{index + 1}</span>
          {item.kind !== "PENALTY" ? (
            <span className="text-xs tabular-nums text-fg-muted">max +{itemMax(item)}</span>
          ) : (
            <span className="text-xs tabular-nums text-fg-muted">−{item.points ?? 0}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" disabled={disabled || !canUp} onClick={() => onMove(-1)}>
            ↑
          </Button>
          <Button size="sm" variant="ghost" disabled={disabled || !canDown} onClick={() => onMove(1)}>
            ↓
          </Button>
          <Button size="sm" variant="ghost" disabled={disabled} onClick={onRemove}>
            Sil
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Madde id">
          <Input
            value={item.id}
            disabled={disabled}
            onChange={(e) => onChange({ ...item, id: e.target.value })}
          />
        </Field>
        <Field label="Bölüm">
          <Input
            value={item.section}
            disabled={disabled}
            onChange={(e) => onChange({ ...item, section: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Açıklama">
        <Textarea
          rows={2}
          disabled={disabled}
          value={item.description}
          placeholder="AI ve puanlayıcı için düz metin açıklama"
          onChange={(e) => onChange({ ...item, description: e.target.value })}
        />
      </Field>

      {item.kind === "CHECK" || item.kind === "PENALTY" ? (
        <Field label={item.kind === "PENALTY" ? "Ceza puanı" : "Puan"}>
          <Input
            type="number"
            min={0}
            step={1}
            className="max-w-40"
            value={item.points ?? 0}
            disabled={disabled}
            onChange={(e) => onChange({ ...item, points: Number(e.target.value) })}
          />
        </Field>
      ) : null}

      {item.kind === "SCALE" ? (
        <div className="space-y-2 rounded-lg border border-border bg-bg/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-fg-muted">Seviyeler (en az 2)</p>
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...item,
                  levels: [
                    ...(item.levels ?? []),
                    { id: newId("lv"), label: { html: "Yeni seviye" }, points: 0 },
                  ],
                })
              }
            >
              + Seviye
            </Button>
          </div>
          <ul className="space-y-2">
            {(item.levels ?? []).map((level, li) => (
              <li
                key={level.id}
                className="grid gap-2 rounded-md border border-border bg-surface p-2 sm:grid-cols-[minmax(0,1fr)_6rem_auto]"
              >
                <InlineHtmlField
                  label="Etiket"
                  value={level.label}
                  disabled={disabled}
                  onChange={(label) => {
                    const levels = [...(item.levels ?? [])];
                    levels[li] = { ...level, label };
                    onChange({ ...item, levels });
                  }}
                />
                <Field label="Puan">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={level.points}
                    disabled={disabled}
                    onChange={(e) => {
                      const levels = [...(item.levels ?? [])];
                      levels[li] = { ...level, points: Number(e.target.value) };
                      onChange({ ...item, levels });
                    }}
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disabled || (item.levels?.length ?? 0) <= 2}
                    onClick={() => {
                      const levels = (item.levels ?? []).filter((_, i) => i !== li);
                      onChange({ ...item, levels });
                    }}
                  >
                    Sil
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
