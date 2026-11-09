"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMappingQueryKey,
  useAncestors,
  useMap,
  useMapping,
  useSetParent,
  useTree,
  useUnmap,
} from "@/src/api/generated/kazanım-ağacı/kazanım-ağacı";
import type { OutcomeNode, TreeFramework } from "@/src/api/generated/models";
import { authoringApi } from "@/src/features/authoring/shared/client";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { useCan } from "@/src/features/panel/PanelContext";
import { formatWhen, useCentralRequest } from "@/src/features/psychometrics/central";
import {
  FRAMEWORK_LABEL,
  MAPPING_TYPE_LABEL,
  filterTree,
  flattenTree,
  nodeLabel,
  parentCandidates,
  toMapRequest,
  validateMappingForm,
  type MappingFormState,
} from "@/src/features/outcome-tree/treeModel";
import { Perm } from "@/src/lib/permissions";
import { cn } from "@/src/lib/utils/cn";
import { Badge, Button, ConfirmDialog, DefinitionList, EmptyState, ErrorState, Field, FilterTabs, FormCard, Input, PageHeader, Select, Spinner, errorMessage, notify } from "@/src/ui";

const TREE_KEY = "/authoring/outcome-tree";

/** R-15 (E-38): kazanım ağacı — hiyerarşi görünümü, üst kazanım atama ve merkezî çerçeve eşlemesi. */
export function OutcomeTreePage() {
  const { ready, request } = useCentralRequest();
  const [framework, setFramework] = useState<TreeFramework | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useTree(framework ? { framework } : undefined, { query: { enabled: ready }, request });
  const tree = query.data?.data ?? [];
  const all = flattenTree(tree);
  const selected = all.find((n) => n.id === selectedId) ?? null;
  const shown = filterTree(tree, search);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kazanım Ağacı"
        description="Kurumunuzun kazanımlarının hiyerarşisi. Üst kazanım atayabilir ve kazanımı merkezî çerçevedeki (ILC Content) bir kazanıma eşleyebilirsiniz."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm" aria-label="Kazanım ağacı">
          <div className="border-b border-border">
            <FilterTabs
              label="Çerçeve"
              value={framework}
              onChange={(value) => setFramework(value as TreeFramework | null)}
              items={[{ label: "Tümü", value: null }, ...Object.entries(FRAMEWORK_LABEL).map(([value, label]) => ({ label, value }))]}
            />
          </div>
          <div className="border-b border-border p-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kod veya metin ara" aria-label="Kazanım ara" />
          </div>
          <div className="max-h-[70vh] overflow-auto p-2">
            {query.isLoading || !ready ? <Spinner /> : null}
            {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
            {query.isSuccess && tree.length === 0 ? (
              <EmptyState embedded tone="neutral" title="Kazanım yok" description="Bu çerçevede kazanım tanımlı değil. Kazanımlar “Ayarlar” ekranından eklenir." />
            ) : null}
            {query.isSuccess && tree.length > 0 && shown.length === 0 ? <p className="p-3 text-sm text-fg-muted">Aramayla eşleşen kazanım yok.</p> : null}
            <TreeList nodes={shown} selectedId={selectedId} onSelect={setSelectedId} defaultOpen={search.trim() !== ""} />
          </div>
        </section>
        <div>{selected ? <OutcomeDetail key={selected.id} node={selected} tree={tree} onSelect={setSelectedId} /> : <EmptyState tone="neutral" title="Bir kazanım seçin" description="Ayrıntıyı, üst kazanımı ve merkezî eşlemeyi görmek için ağaçtan seçin." />}</div>
      </div>
    </div>
  );
}

function TreeList({ nodes, selectedId, onSelect, defaultOpen, depth = 0 }: { nodes: readonly OutcomeNode[]; selectedId: string | null; onSelect: (id: string) => void; defaultOpen: boolean; depth?: number }) {
  return (
    <ul role={depth === 0 ? "tree" : "group"} className="grid gap-0.5">
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} defaultOpen={defaultOpen} depth={depth} />
      ))}
    </ul>
  );
}

function TreeItem({ node, selectedId, onSelect, defaultOpen, depth }: { node: OutcomeNode; selectedId: string | null; onSelect: (id: string) => void; defaultOpen: boolean; depth: number }) {
  const [open, setOpen] = useState(defaultOpen || depth === 0);
  const children = node.children ?? [];
  const selected = selectedId === node.id;
  return (
    <li role="treeitem" aria-expanded={children.length ? open : undefined} aria-selected={selected}>
      <div className={cn("flex items-center gap-1 rounded-lg", selected ? "bg-primary-50" : "hover:bg-neutral-50")} style={{ paddingLeft: depth * 16 }}>
        {children.length > 0 ? (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? `${node.code} alt kazanımlarını daralt` : `${node.code} alt kazanımlarını genişlet`} className="flex size-8 shrink-0 items-center justify-center text-fg-muted">
            <span aria-hidden>{open ? "▾" : "▸"}</span>
          </button>
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}
        <button type="button" onClick={() => node.id && onSelect(node.id)} className="min-h-9 min-w-0 flex-1 py-1 pr-2 text-left text-sm">
          <span className="font-mono text-xs font-semibold text-fg">{node.code}</span>
          <span className="ml-2 text-fg-muted">{node.description}</span>
        </button>
        {children.length > 0 ? <span className="numeric pr-2 text-[11px] text-fg-subtle">{children.length}</span> : null}
      </div>
      {open && children.length > 0 ? <TreeList nodes={children} selectedId={selectedId} onSelect={onSelect} defaultOpen={defaultOpen} depth={depth + 1} /> : null}
    </li>
  );
}

function OutcomeDetail({ node, tree, onSelect }: { node: OutcomeNode; tree: readonly OutcomeNode[]; onSelect: (id: string) => void }) {
  const { ready, request } = useCentralRequest();
  const canWrite = useCan(Perm.dictionaryManage);
  const queryClient = useQueryClient();
  const ancestors = useAncestors(node.id!, { query: { enabled: ready }, request });
  const setParent = useSetParent({ request });
  const [parentId, setParentId] = useState(node.parentId ?? "");
  const [error, setError] = useState<string | null>(null);
  const candidates = parentCandidates(tree, node);
  const chain = ancestors.data?.data ?? [];

  async function saveParent() {
    setError(null);
    try {
      await setParent.mutateAsync({ outcomeId: node.id!, data: parentId ? { parentId } : {} });
      await queryClient.invalidateQueries({ queryKey: [TREE_KEY] });
      notify.success(parentId ? "Üst kazanım atandı" : "Kazanım kök yapıldı");
    } catch (e) {
      setError(errorMessage(e, "Üst kazanım atanamadı"));
    }
  }

  return (
    <div className="space-y-4">
      <FormCard title={node.code ?? "Kazanım"} aside={node.framework ? <Badge tone="brand">{FRAMEWORK_LABEL[node.framework] ?? node.framework}</Badge> : null}>
        <p className="text-sm text-fg">{node.description}</p>
        <DefinitionList
          items={[
            { term: "Beceri", description: node.skill ?? "—" },
            { term: "CEFR düzeyi", description: node.cefrLevel ?? "—" },
            { term: "Sınıf düzeyi", description: node.gradeLevel !== undefined ? String(node.gradeLevel) : "—" },
          ]}
        />
        {chain.length > 0 ? (
          <nav aria-label="Üst kazanımlar" className="text-[13px] text-fg-muted">
            <span className="text-fg-subtle">Yol: </span>
            {chain.map((a, i) => (
              <span key={a.id}>
                {i > 0 ? " › " : ""}
                <button type="button" className="underline-offset-2 hover:underline" onClick={() => a.id && onSelect(a.id)}>
                  {a.code}
                </button>
              </span>
            ))}
          </nav>
        ) : null}
      </FormCard>

      <FormCard title="Üst kazanım" description="Aynı çerçevedeki bir kazanım; kendisi ve alt kazanımları seçilemez.">
        <Field label="Üst kazanım">
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)} disabled={!canWrite}>
            <option value="">Yok (kök kazanım)</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {nodeLabel(c)}
              </option>
            ))}
          </Select>
        </Field>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        {canWrite ? (
          <div>
            <Button onClick={() => void saveParent()} loading={setParent.isPending} disabled={parentId === (node.parentId ?? "")}>
              Kaydet
            </Button>
          </div>
        ) : null}
      </FormCard>

      <MappingCard node={node} canWrite={canWrite} />
    </div>
  );
}

function MappingCard({ node, canWrite }: { node: OutcomeNode; canWrite: boolean }) {
  const { ready, request } = useCentralRequest();
  const { tenant } = useAuthoringTenant();
  const queryClient = useQueryClient();
  const query = useMapping(node.id!, { query: { enabled: ready }, request });
  const map = useMap({ request });
  const unmap = useUnmap({ request });
  const [form, setForm] = useState<MappingFormState>({ targetOutcomeId: "", mappingType: "", confidence: "" });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const errors = validateMappingForm(form);
  const state = query.data?.data;
  const mapping = state?.mapped ? state.mapping : undefined;
  const isCentral = tenant?.contentHq === true;

  // Hedefin kodu/metni: etiket ucu yetki/kiracı nedeniyle çözemezse kimlik gösterilir.
  const target = useQuery({
    queryKey: ["outcome-label", mapping?.targetOutcomeId],
    enabled: ready && Boolean(mapping?.targetOutcomeId),
    retry: false,
    queryFn: () => authoringApi.outcomeLabels([mapping!.targetOutcomeId!]),
  });
  const targetLabel = target.data?.[0] ? `${target.data[0].code} — ${target.data[0].description}` : mapping?.targetOutcomeId;

  const refresh = () => queryClient.invalidateQueries({ queryKey: getMappingQueryKey(node.id!) });

  async function save() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    setError(null);
    try {
      await map.mutateAsync({ outcomeId: node.id!, data: toMapRequest(form) });
      await refresh();
      notify.success("Merkezî çerçeve eşlemesi kaydedildi");
      setTouched(false);
    } catch (e) {
      // 400 (hedef merkezde değil/pasif) ve 409 (zaten eşlenmiş) backend mesajıyla gösterilir.
      setError(errorMessage(e, "Eşleme kaydedilemedi"));
    }
  }

  async function remove() {
    setError(null);
    try {
      await unmap.mutateAsync({ outcomeId: node.id! });
      await refresh();
      notify.success("Eşleme kaldırıldı");
      setRemoving(false);
    } catch (e) {
      setError(errorMessage(e, "Eşleme kaldırılamadı"));
      setRemoving(false);
    }
  }

  return (
    <FormCard title="Merkezî çerçeve eşlemesi" description="Kazanımın ILC Content çerçevesindeki karşılığı. Her kazanım en fazla bir eşlemeye sahiptir; tahmini eşleme üretilmez.">
      {query.isLoading ? <Spinner /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
      {isCentral ? (
        <p className="text-sm text-fg-muted">Merkez kazanımı kendisi merkezî çerçevedir; eşleme kurum kazanımları içindir.</p>
      ) : state ? (
        mapping ? (
          <div className="grid gap-3">
            <Badge tone="success" dot>
              Eşlendi
            </Badge>
            <DefinitionList
              items={[
                { term: "Merkez kazanım", description: targetLabel, wide: true },
                { term: "Eşleme türü", description: MAPPING_TYPE_LABEL[mapping.mappingType ?? ""] ?? mapping.mappingType },
                { term: "Güven", description: mapping.confidence !== undefined ? String(mapping.confidence) : "Belirtilmedi" },
                { term: "Kayıt", description: formatWhen(mapping.createdAt) },
              ]}
            />
            {canWrite ? (
              <div>
                <Button variant="secondary" onClick={() => setRemoving(true)}>
                  Eşlemeyi kaldır
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3">
            <Badge tone="neutral" dot>
              Eşlenmedi
            </Badge>
            {canWrite ? (
              <>
                <Field label="Merkez kazanım kimliği (UUID)" hint="Merkezî çerçevedeki kazanımın kimliği" required error={touched ? errors.targetOutcomeId : undefined}>
                  <Input value={form.targetOutcomeId} onChange={(e) => setForm({ ...form, targetOutcomeId: e.target.value })} placeholder="00000000-0000-…" />
                </Field>
                <Field label="Eşleme türü" required error={touched ? errors.mappingType : undefined}>
                  <Select value={form.mappingType} onChange={(e) => setForm({ ...form, mappingType: e.target.value })}>
                    <option value="">Seçin</option>
                    {Object.entries(MAPPING_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Güven (0–1)" hint="İsteğe bağlı" error={touched ? errors.confidence : undefined}>
                  <Input inputMode="decimal" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value })} />
                </Field>
                <div>
                  <Button onClick={() => void save()} loading={map.isPending}>
                    Eşle
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-fg-muted">Bu kazanım merkezî çerçeveye eşlenmemiş.</p>
            )}
          </div>
        )
      ) : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <ConfirmDialog
        open={removing}
        title="Eşleme kaldırılsın mı?"
        description="Kazanımın merkezî çerçeve karşılığı silinir; raporlarda bu kazanım merkezî çerçeveye bağlanmaz. Sonradan yeniden eşleyebilirsiniz."
        confirmLabel="Kaldır"
        pending={unmap.isPending}
        onClose={() => setRemoving(false)}
        onConfirm={() => void remove()}
      />
    </FormCard>
  );
}
