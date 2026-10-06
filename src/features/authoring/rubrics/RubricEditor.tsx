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
  IconArrowDown,
  IconArrowUp,
  IconSearch,
  IconTrash,
  IconX,
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

  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  // Sunucudaki (son açılan / kaydedilen) tanım — kaydedilmemiş değişiklik takibi.
  const savedSnapshot = useMemo(
    () => (detail ? JSON.stringify(toPayload(((detail.definition?.items ?? []) as Record<string, unknown>[]).map((r) => normalizeItem(r)))) : ""),
    [detail],
  );
  const dirty = detail != null && JSON.stringify(toPayload(items)) !== savedSnapshot;

  function guardedOpen(id: string) {
    if (dirty && !confirm("Kaydedilmemiş değişiklikler var. Kaydetmeden başka gruba geçilsin mi?")) return;
    void open(id);
  }

  if (!tenant) {
    return <EmptyState title="İçerik kiracısı seçilmedi" description="Rubrikleri yönetmek için önce kurum / içerik kiracısı seçilmelidir." />;
  }

  const term = query.trim().toLocaleLowerCase("tr-TR");
  const shownRows = rows.filter((r) => !term || `${r.name} ${r.code}`.toLocaleLowerCase("tr-TR").includes(term));
  const remaining = TARGET_TOTAL - total;
  const pct = Math.min(100, Math.max(0, (total / TARGET_TOTAL) * 100));
  const sections = Array.from(new Set(items.map((i) => i.section || "Main")));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rubrik grupları"
        description="Yazma ve konuşma gibi açık uçlu cevapları puanlamak için ölçütler. Her grup tam 100 puan üzerinden kurulur; onaylanınca soru editöründe seçilebilir."
        count={rows.length}
        actions={
          <Button variant={showCreate ? "ghost" : "primary"} onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Vazgeç" : "+ Yeni rubrik grubu"}
          </Button>
        }
      />
      {error ? <ErrorState title="İşlem başarısız" message={error} compact /> : null}

      {showCreate ? (
        <FormCard
          title="Yeni rubrik grubu"
          description="Başlangıç maddeleriyle oluşturulur (kriter 40 + ölçek 60 + bir ceza); sonra düzenlersiniz."
          footer={
            <Button loading={busy} disabled={busy || !name.trim()} onClick={() => void create().then(() => setShowCreate(false))}>
              Oluştur ve aç
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,10rem)]">
            <Field label="Kod" hint="Boş = otomatik">
              <Input className="font-mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="A2-SPEAKING" />
            </Field>
            <Field label="Grup adı" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. A2 Konuşma Rubriği" />
            </Field>
            <Field label="Beceri" hint="Yalnız bu beceriye ait part'larda seçilir">
              <Select value={skill} onChange={(e) => setSkill(e.target.value)}>
                {RUBRIC_SKILLS.map((s) => <option key={s} value={s}>{SKILL_TR[s]}</option>)}
              </Select>
            </Field>
          </div>
        </FormCard>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <nav aria-label="Rubrik grupları" className="rounded-xl border border-border bg-surface shadow-sm lg:sticky lg:top-20">
          <div className="border-b border-border p-2.5">
            <Input type="search" icon={<IconSearch />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad veya kod ara" aria-label="Rubrik ara" />
          </div>
          {shownRows.length === 0 ? (
            <EmptyState embedded compact tone={rows.length ? "neutral" : "primary"} title={rows.length ? "Eşleşen grup yok" : "Henüz rubrik grubu yok"} description={rows.length ? "Aramayı değiştirin." : "Yazma ve konuşma soruları rubrikle puanlanır. Yukarıdan ilk grubu oluşturun."} />
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {shownRows.map((r) => {
                const active = detail?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => guardedOpen(r.id)}
                      className={`flex w-full items-start justify-between gap-2 px-3.5 py-2.5 text-left ${active ? "bg-primary-50/70" : "hover:bg-neutral-50"}`}
                    >
                      <span className="min-w-0">
                        <span className={`block truncate text-[13px] font-medium ${active ? "text-primary" : "text-fg"}`}>{r.name}</span>
                        <span className="block font-mono text-[11px] text-fg-subtle">{r.code}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10.5px] text-fg-muted">{SKILL_TR[r.skill] ?? r.skill}</span>
                        {r.currentVersionId ? <span className="text-[10.5px] font-semibold text-success">✓ Onaylı</span> : <span className="text-[10.5px] text-fg-subtle">Taslak</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {detail ? (
          <FormCard
            title={detail.name}
            description={`${detail.code} · ${SKILL_TR[detail.skill] ?? detail.skill} · Sürüm ${detail.versionNo}`}
            aside={
              <span className="flex items-center gap-2">
                {dirty ? <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-semibold text-warning">Kaydedilmedi</span> : null}
                <StatusBadge status={detail.status} />
              </span>
            }
            footer={
              <>
                <span className="text-xs text-fg-subtle sm:mr-auto">
                  {editable ? (totalOk ? "Toplam 100 — onaylanabilir." : `Onay için toplam tam ${TARGET_TOTAL} olmalı.`) : "Onaylı sürüm salt okunur."}
                </span>
                <Button variant="secondary" disabled={!editable || busy || !dirty} onClick={() => void saveDef()}>
                  Maddeleri kaydet
                </Button>
                <Button
                  disabled={!canApprove || busy || !totalOk}
                  onClick={() => confirm("Rubrik onaylansın mı? Onaylanan sürüm soru editöründe seçilebilir ve artık düzenlenemez.") && void approve()}
                >
                  Onayla
                </Button>
              </>
            }
          >
            {!editable ? (
              <p className="rounded-lg bg-info-bg px-3.5 py-2.5 text-[13px] text-info">
                Bu sürüm {detail.status === "IN_REVIEW" ? "incelemede" : "onaylı"}; maddeler değiştirilemez. Değişiklik için yeni sürüm gerekir.
              </p>
            ) : null}

            {/* Toplam göstergesi */}
            <div className="grid gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] text-fg">
                  Toplam puan{" "}
                  <span className={`text-lg font-semibold tabular-nums ${totalOk ? "text-success" : remaining < 0 ? "text-danger" : "text-fg"}`}>{total}</span>
                  <span className="text-fg-subtle"> / {TARGET_TOTAL}</span>
                </p>
                <p className={`text-xs font-medium ${totalOk ? "text-success" : remaining < 0 ? "text-danger" : "text-warning"}`}>
                  {totalOk ? "✓ Tam" : remaining > 0 ? `${remaining} puan eksik` : `${-remaining} puan fazla`}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={total} aria-valuemin={0} aria-valuemax={TARGET_TOTAL} aria-label="Toplam puan">
                <div className={`h-full rounded-full transition-all ${totalOk ? "bg-success" : remaining < 0 ? "bg-danger" : "bg-primary"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-fg-subtle">Kriter puanı + her ölçeğin en yüksek seviyesi toplanır. Cezalar toplamdan düşülür, 100’e dahil değildir.</p>
            </div>

            {items.length === 0 ? (
              <EmptyState title="Madde yok" description="Aşağıdan en az bir kriter veya ölçek maddesi ekleyin." />
            ) : (
              <div className="grid gap-4">
                {sections.map((sec) => (
                  <div key={sec} className="grid gap-2.5">
                    {sections.length > 1 ? <p className="text-[11.5px] font-semibold tracking-wide text-fg-subtle">{sec === "Main" ? "ANA ÖLÇÜTLER" : sec === "Penalties" ? "CEZALAR" : sec.toLocaleUpperCase("tr-TR")}</p> : null}
                    {items.map((item, index) =>
                      (item.section || "Main") !== sec ? null : (
                        <RubricItemCard
                          key={`${item.id}-${index}`}
                          item={item}
                          index={index}
                          disabled={!editable || busy}
                          onChange={(next) => updateItem(index, next)}
                          onMove={(dir) => moveItem(index, dir)}
                          onRemove={() => confirm(`“${item.description || ITEM_KIND[item.kind].label}” maddesi silinsin mi?`) && removeItem(index)}
                          canUp={index > 0}
                          canDown={index < items.length - 1}
                        />
                      ),
                    )}
                  </div>
                ))}
              </div>
            )}

            {editable ? (
              <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Madde ekle">
                {(Object.keys(ITEM_KIND) as RubricItemKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={busy}
                    onClick={() => addItem(k)}
                    className="rounded-lg border border-dashed border-border-strong p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40 disabled:opacity-50"
                  >
                    <span className={`block text-[13px] font-semibold ${ITEM_KIND[k].tone}`}>+ {ITEM_KIND[k].label}</span>
                    <span className="block text-xs text-fg-muted">{ITEM_KIND[k].hint}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </FormCard>
        ) : (
          <div>
            <EmptyState
              tone="neutral"
              title="Bir rubrik grubu seçin"
              description="Soldaki listeden bir grubu açın ya da “Yeni rubrik grubu” ile oluşturun. Onaylı gruplar soru editörünün Cevap ve puanlama adımında seçilir."
            />
          </div>
        )}
      </div>
    </div>
  );
}

const SKILL_TR: Record<string, string> = { READING: "Okuma", LISTENING: "Dinleme", WRITING: "Yazma", SPEAKING: "Konuşma" };

const ITEM_KIND: Record<RubricItemKind, { label: string; hint: string; tone: string; badge: string }> = {
  CHECK: {
    label: "Kriter",
    hint: "Var / yok: karşılanırsa puanın tamamı verilir.",
    tone: "text-primary",
    badge: "bg-primary-50 text-primary",
  },
  SCALE: {
    label: "Ölçek",
    hint: "Seviyeli: Zayıf / Orta / Güçlü gibi kademelerden biri seçilir.",
    tone: "text-(--accent-plum)",
    badge: "bg-(--accent-plum-bg) text-(--accent-plum)",
  },
  PENALTY: {
    label: "Ceza",
    hint: "Durum görülürse puan düşülür (ör. konu dışı, eksik kelime).",
    tone: "text-danger",
    badge: "bg-danger-bg text-danger",
  },
};

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
  const meta = ITEM_KIND[item.kind];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-neutral-50 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs tabular-nums text-fg-subtle">{index + 1}.</span>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${meta.badge}`} title={meta.hint}>{meta.label}</span>
          <span className={`text-xs font-semibold tabular-nums ${item.kind === "PENALTY" ? "text-danger" : "text-fg"}`}>
            {item.kind === "PENALTY" ? `−${item.points ?? 0}` : `en çok ${itemMax(item)}`} puan
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" disabled={disabled || !canUp} onClick={() => onMove(-1)} aria-label="Yukarı taşı" title="Yukarı taşı">
            <IconArrowUp className="size-3.5" aria-hidden />
          </Button>
          <Button size="sm" variant="ghost" disabled={disabled || !canDown} onClick={() => onMove(1)} aria-label="Aşağı taşı" title="Aşağı taşı">
            <IconArrowDown className="size-3.5" aria-hidden />
          </Button>
          <Button size="sm" variant="ghost" disabled={disabled} onClick={onRemove} aria-label="Maddeyi sil" title="Sil">
            <IconTrash className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 p-3">
        <div className={`grid gap-3 ${item.kind === "SCALE" ? "" : "sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)]"}`}>
          <Field label="Ölçüt açıklaması" hint="Puanlayıcı ve yapay zekâ bu metne göre değerlendirir; somut yazın.">
            <Textarea
              rows={2}
              disabled={disabled}
              value={item.description}
              placeholder={item.kind === "PENALTY" ? "ör. Cevap konu dışı" : "ör. Görevdeki üç noktaya da değiniyor"}
              onChange={(e) => onChange({ ...item, description: e.target.value })}
            />
          </Field>
          {item.kind !== "SCALE" ? (
            <Field label={item.kind === "PENALTY" ? "Düşülecek puan" : "Puan"}>
              <Input type="number" min={0} step={1} suffix="puan" value={item.points ?? 0} disabled={disabled} onChange={(e) => onChange({ ...item, points: Number(e.target.value) })} />
            </Field>
          ) : null}
        </div>

        {item.kind === "SCALE" ? (
          <div className="grid gap-2">
            <p className="text-xs font-semibold text-fg-muted">Seviyeler <span className="font-normal text-fg-subtle">— düşükten yükseğe; en az 2</span></p>
            <ol className="grid gap-1.5">
              {(item.levels ?? []).map((level, li) => (
                <li key={level.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_7.5rem_auto] items-center gap-2">
                  <span className="text-right text-xs tabular-nums text-fg-subtle">{li + 1}</span>
                  <InlineHtmlField
                    value={level.label}
                    placeholder="Seviye adı, ör. Güçlü"
                    disabled={disabled}
                    onChange={(label) => {
                      const levels = [...(item.levels ?? [])];
                      levels[li] = { ...level, label };
                      onChange({ ...item, levels });
                    }}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    suffix="puan"
                    aria-label={`${li + 1}. seviye puanı`}
                    value={level.points}
                    disabled={disabled}
                    onChange={(e) => {
                      const levels = [...(item.levels ?? [])];
                      levels[li] = { ...level, points: Number(e.target.value) };
                      onChange({ ...item, levels });
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${li + 1}. seviyeyi sil`}
                    title={(item.levels?.length ?? 0) <= 2 ? "En az 2 seviye gerekli" : "Sil"}
                    disabled={disabled || (item.levels?.length ?? 0) <= 2}
                    onClick={() => onChange({ ...item, levels: (item.levels ?? []).filter((_, i) => i !== li) })}
                  >
                    <IconX className="size-3.5" aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
            <Button
              size="sm"
              variant="secondary"
              className="w-fit"
              disabled={disabled}
              onClick={() => onChange({ ...item, levels: [...(item.levels ?? []), { id: newId("lv"), label: { html: "Yeni seviye" }, points: 0 }] })}
            >
              + Seviye ekle
            </Button>
          </div>
        ) : null}

        <details className="text-xs">
          <summary className="cursor-pointer text-fg-subtle hover:text-fg">Gelişmiş: madde kimliği ve gruplama</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field label="Madde kimliği" hint="Puanlama kayıtlarında kullanılır; onaydan sonra değiştirmeyin.">
              <Input className="font-mono" value={item.id} disabled={disabled} onChange={(e) => onChange({ ...item, id: e.target.value })} />
            </Field>
            <Field label="Grup" hint="Main = ana ölçütler, Penalties = cezalar">
              <Input value={item.section} disabled={disabled} onChange={(e) => onChange({ ...item, section: e.target.value })} />
            </Field>
          </div>
        </details>
      </div>
    </div>
  );
}
