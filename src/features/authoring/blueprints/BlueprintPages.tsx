"use client";

import { useEffect, useState } from "react";

import {
  authoringApi,
  BLUEPRINT_DIMENSION_KINDS,
  type BlueprintDetail,
  type BlueprintDimensionDetail,
  type BlueprintDimensionKind,
} from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormCard,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
  errorMessage,
  notify,
  IconSearch,
} from "@/src/ui";

/**
 * H-02: `Blueprint`/`BlueprintDimension`'ın (F2-07) ilk yazarlık yüzeyi — `BlueprintAuthoringService`'in
 * HTTP karşılığı. Dokuz boyutun tanımı (hangi kind hangi anlama gelir) görev dosyasının
 * Dokunulmayacaklar'ında — bu yüzden her boyutun "hedef"i burada serbest JSON metin olarak
 * düzenlenir, kind'a özel bir form İCAT EDİLMEDİ.
 *
 * Toleransın dürüst hali (görev dosyası, birebir): akademik ekip sayı vermedi diye bu yüzey
 * tolerans alanına VARSAYILAN bir değer YAZMAZ — boş kalır, "tanımlı değil" diye gösterilir.
 */

const KIND_LABELS: Record<BlueprintDimensionKind, string> = {
  SKILL_DISTRIBUTION: "Beceri dağılımı",
  CEFR_TARGET: "CEFR hedefi",
  ITEM_TYPE_MIX: "Madde tipi karışımı",
  DIFFICULTY_DISTRIBUTION: "Zorluk dağılımı",
  CONTENT_AREA_BALANCE: "İçerik alanı dengesi",
  DURATION: "Süre",
  EXPOSURE_CONSTRAINT: "Maruziyet kısıtı",
  CONTEXT_DIMENSION: "Bağlam boyutu",
  DIAGNOSTIC_SUBDOMAIN_MIN_ITEMS: "Tanısal alt alan minimum madde sayısı",
};

type DimensionDraft = { targetText: string; tolerance: string };

function blankDraft(): DimensionDraft {
  return { targetText: "{}", tolerance: "" };
}

export function draftsFromDetail(detail: BlueprintDetail | null): Record<BlueprintDimensionKind, DimensionDraft> {
  const byKind = new Map<BlueprintDimensionKind, BlueprintDimensionDetail>(
    (detail?.dimensions ?? []).map((d) => [d.kind, d]),
  );
  const result = {} as Record<BlueprintDimensionKind, DimensionDraft>;
  for (const kind of BLUEPRINT_DIMENSION_KINDS) {
    const existing = byKind.get(kind);
    result[kind] = existing
      ? { targetText: JSON.stringify(existing.target, null, 2), tolerance: existing.tolerance != null ? String(existing.tolerance) : "" }
      : blankDraft();
  }
  return result;
}

export function BlueprintsPage() {
  const canManage = useCan(Perm.questionCreate, Perm.questionEditOwn, Perm.questionEditAll);
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<BlueprintDetail[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState<BlueprintDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<BlueprintDimensionKind, DimensionDraft>>(draftsFromDetail(null));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function load() {
    const result = tenant ? authoringApi.listBlueprints() : Promise.resolve([]);
    result
      .then((rows) => {
        setError(null);
        setRows(rows);
      })
      .catch((err: unknown) => setError(errorMessage(err, "Blueprint’ler alınamadı")))
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  function openDetail(next: BlueprintDetail) {
    setDetail(next);
    setDrafts(draftsFromDetail(next));
  }

  async function open(id: string) {
    setBusy(true);
    try {
      openDetail(await authoringApi.getBlueprint(id));
      setError(null);
    } catch (e) {
      const message = errorMessage(e, "Açılamadı");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const created = await authoringApi.createBlueprint(newTitle.trim());
      setNewTitle("");
      setShowCreate(false);
      await load();
      openDetail(created);
      notify.success("Blueprint oluşturuldu");
      setError(null);
    } catch (e) {
      const message = errorMessage(e, "Oluşturulamadı");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function saveDimension(kind: BlueprintDimensionKind) {
    if (!detail) return;
    const draft = drafts[kind];
    let target: Record<string, unknown>;
    try {
      target = JSON.parse(draft.targetText || "{}");
    } catch {
      notify.error("Hedef geçerli bir JSON olmalı");
      return;
    }
    let tolerance: number | null = null;
    if (draft.tolerance.trim() !== "") {
      const n = Number(draft.tolerance);
      if (!Number.isFinite(n)) {
        notify.error("Tolerans sayısal olmalı (boş = tanımsız)");
        return;
      }
      tolerance = n;
    }
    setBusy(true);
    try {
      const next = await authoringApi.setBlueprintDimension(detail.id, kind, target, tolerance);
      setDetail(next);
      setDrafts((prev) => ({ ...prev, [kind]: draftsFromDetail(next)[kind] }));
      notify.success(`${KIND_LABELS[kind]} kaydedildi`);
      setError(null);
    } catch (e) {
      notify.error(errorMessage(e, "Kaydedilemedi"));
    } finally {
      setBusy(false);
    }
  }

  async function removeDimension(kind: BlueprintDimensionKind) {
    if (!detail) return;
    if (!confirm(`${KIND_LABELS[kind]} boyutu kaldırılsın mı?`)) return;
    setBusy(true);
    try {
      const next = await authoringApi.removeBlueprintDimension(detail.id, kind);
      setDetail(next);
      setDrafts((prev) => ({ ...prev, [kind]: draftsFromDetail(next)[kind] }));
      notify.success(`${KIND_LABELS[kind]} kaldırıldı`);
    } catch (e) {
      notify.error(errorMessage(e, "Kaldırılamadı"));
    } finally {
      setBusy(false);
    }
  }

  async function runLifecycle(action: () => Promise<BlueprintDetail>, successMessage: string) {
    setBusy(true);
    try {
      const next = await action();
      setDetail(next);
      setDrafts(draftsFromDetail(next));
      await load();
      notify.success(successMessage);
      setError(null);
    } catch (e) {
      notify.error(errorMessage(e, "İşlem başarısız"));
    } finally {
      setBusy(false);
    }
  }

  if (!tenant) {
    return <EmptyState title="İçerik kiracısı seçilmedi" description="Blueprint'leri yönetmek için önce kurum / içerik kiracısı seçilmelidir." />;
  }

  const term = query.trim().toLocaleLowerCase("tr-TR");
  const shownRows = rows.filter((r) => !term || r.title.toLocaleLowerCase("tr-TR").includes(term));
  const editable = detail?.status === "DRAFT";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Blueprint'ler"
        description="Karşılaştırılabilir form üretmenin ön şartı: dokuz boyutun (hedef + opsiyonel tolerans) taşıyıcısı. Form üretimi (from-blueprint) bu listeden bir blueprint seçer."
        count={rows.length}
        actions={canManage ? (
          <Button variant={showCreate ? "ghost" : "primary"} onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Vazgeç" : "+ Yeni blueprint"}
          </Button>
        ) : undefined}
      />
      {error ? <ErrorState title="İşlem başarısız" message={error} compact /> : null}

      {canManage && showCreate ? (
        <FormCard
          title="Yeni blueprint"
          description="Boş bir taslak olarak oluşturulur; boyutları aşağıdan eklersiniz."
          footer={
            <Button loading={busy} disabled={busy || !newTitle.trim()} onClick={() => void create()}>
              Oluştur ve aç
            </Button>
          }
        >
          <Field label="Başlık" required>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="ör. B1 Achievement" />
          </Field>
        </FormCard>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <nav aria-label="Blueprint'ler" className="rounded-xl border border-border bg-surface shadow-sm lg:sticky lg:top-20">
          <div className="border-b border-border p-2.5">
            <Input type="search" icon={<IconSearch />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Başlık ara" aria-label="Blueprint ara" />
          </div>
          {!loaded ? (
            <Skeleton className="m-3 h-24 rounded-lg" />
          ) : shownRows.length === 0 ? (
            <EmptyState
              embedded
              compact
              tone={rows.length ? "neutral" : "primary"}
              title={rows.length ? "Eşleşen blueprint yok" : "Henüz blueprint yok"}
              description={rows.length ? "Aramayı değiştirin." : "Yukarıdan ilk blueprint'i oluşturun."}
            />
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {shownRows.map((r) => {
                const active = detail?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => void open(r.id)}
                      className={`flex w-full items-start justify-between gap-2 px-3.5 py-2.5 text-left ${active ? "bg-primary-50/70" : "hover:bg-neutral-50"}`}
                    >
                      <span className="min-w-0">
                        <span className={`block truncate text-[13px] font-medium ${active ? "text-primary" : "text-fg"}`}>{r.title}</span>
                        <span className="block text-[11px] text-fg-subtle">{r.dimensions.length} / 9 boyut</span>
                      </span>
                      <StatusBadge status={r.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {detail ? (
          <FormCard
            title={detail.title}
            description={`Oluşturan: ${detail.createdBy}`}
            aside={<StatusBadge status={detail.status} />}
            footer={
              canManage ? (
                <>
                  {detail.status === "DRAFT" ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void runLifecycle(() => authoringApi.submitBlueprintReview(detail.id), "İncelemeye gönderildi")}
                    >
                      İncelemeye gönder
                    </Button>
                  ) : null}
                  {detail.status === "IN_REVIEW" ? (
                    <>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void runLifecycle(() => authoringApi.returnBlueprintToDraft(detail.id), "Taslağa geri gönderildi")}
                      >
                        Taslağa geri gönder
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => void runLifecycle(() => authoringApi.approveBlueprint(detail.id), "Blueprint onaylandı")}
                      >
                        Onayla
                      </Button>
                    </>
                  ) : null}
                  {detail.status === "APPROVED" ? (
                    <>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void runLifecycle(() => authoringApi.returnBlueprintToDraft(detail.id), "Taslağa döndü")}
                      >
                        Taslağa döndür
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void runLifecycle(() => authoringApi.retireBlueprint(detail.id), "Emekliye ayrıldı")}
                      >
                        Emekliye ayır
                      </Button>
                    </>
                  ) : null}
                  {detail.status === "RETIRED" ? (
                    <Button
                      disabled={busy}
                      onClick={() => void runLifecycle(() => authoringApi.republishBlueprint(detail.id), "Yeniden yayınlandı")}
                    >
                      Yeniden yayınla
                    </Button>
                  ) : null}
                </>
              ) : undefined
            }
          >
            {!editable ? (
              <p className="rounded-lg bg-info-bg px-3.5 py-2.5 text-[13px] text-info">
                Bu blueprint {detail.status === "IN_REVIEW" ? "incelemede" : detail.status === "APPROVED" ? "onaylı" : "emekli"}; boyutlar yalnız DRAFT’ta düzenlenir.
              </p>
            ) : null}

            <div className="grid gap-3">
              {BLUEPRINT_DIMENSION_KINDS.map((kind) => {
                const saved = detail.dimensions.find((d) => d.kind === kind);
                const draft = drafts[kind];
                return (
                  <div key={kind} className="rounded-lg border border-border p-3.5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-fg">{KIND_LABELS[kind]}</p>
                      {!saved ? (
                        <span className="text-[11px] text-fg-subtle">Tanımlı değil</span>
                      ) : saved.tolerance == null ? (
                        <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-semibold text-warning">
                          Tolerans tanımlı değil — sıkı sadakat uygulanıyor
                        </span>
                      ) : (
                        <span className="text-[11px] text-fg-subtle">Tolerans ±{saved.tolerance}</span>
                      )}
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_auto]">
                      <Field label="Hedef (JSON)">
                        <Textarea
                          rows={2}
                          className="font-mono text-xs"
                          disabled={!editable || busy}
                          value={draft.targetText}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [kind]: { ...prev[kind], targetText: e.target.value } }))}
                        />
                      </Field>
                      <Field label="Tolerans" hint="Boş = tanımsız">
                        <Input
                          type="number"
                          step="any"
                          disabled={!editable || busy}
                          value={draft.tolerance}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [kind]: { ...prev[kind], tolerance: e.target.value } }))}
                        />
                      </Field>
                      <div className="flex items-end gap-2">
                        <Button type="button" variant="secondary" disabled={!editable || busy} onClick={() => void saveDimension(kind)}>
                          Kaydet
                        </Button>
                        {saved ? (
                          <Button type="button" variant="ghost" disabled={!editable || busy} onClick={() => void removeDimension(kind)}>
                            Kaldır
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </FormCard>
        ) : (
          <EmptyState
            tone="neutral"
            title="Bir blueprint seçin"
            description="Soldaki listeden bir blueprint açın ya da “+ Yeni blueprint” ile oluşturun."
          />
        )}
      </div>
    </div>
  );
}
