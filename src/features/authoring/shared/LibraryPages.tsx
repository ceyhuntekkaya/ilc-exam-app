"use client";

import { authoringApi, type MediaItem, type ReviewItem } from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { useContentBasePath } from "@/src/features/panel/PanelContext";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FormCard,
  Input,
  PageHeader,
  Select,
  Textarea,
  errorMessage,
  notify,
} from "@/src/ui";
import { useCallback, useEffect, useState } from "react";

export function MediaLibraryPage() {
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<MediaItem[]>([]);
  const [kind, setKind] = useState("IMAGE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [altText, setAltText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [license, setLicense] = useState("");

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      setRows(await authoringApi.listMedia(kind || undefined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    }
  }, [tenant, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    try {
      const detected =
        kind ||
        (file.type.startsWith("audio") ? "AUDIO" : file.type.startsWith("video") ? "VIDEO" : "IMAGE");
      await authoringApi.uploadMedia(detected, file, {
        altText: altText || (detected === "IMAGE" ? file.name : null),
        transcript: transcript || null,
        license: license || null,
      });
      setAltText("");
      setTranscript("");
      setLicense("");
      await load();
      notify.success("Medya yüklendi");
    } catch (e) {
      const message = errorMessage(e, "Yüklenemedi");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Medya kütüphanesi"
        description="Dosyalar sunucuya yazılır; soru editöründeki MediaPicker buradan seçer."
      />
      {error ? <ErrorState title="Medya hatası" message={error} /> : null}
      <FormCard title="Yükle">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Tür">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="IMAGE">Görsel</option>
              <option value="AUDIO">Ses</option>
              <option value="VIDEO">Video</option>
            </Select>
          </Field>
          <Field label="Alt metin"><Input value={altText} onChange={(e) => setAltText(e.target.value)} /></Field>
          <Field label="Transkript"><Input value={transcript} onChange={(e) => setTranscript(e.target.value)} /></Field>
          <Field label="Lisans"><Input value={license} onChange={(e) => setLicense(e.target.value)} /></Field>
        </div>
        <label className="mt-2 inline-flex cursor-pointer">
          <span className="rounded-lg bg-primary px-3 py-2 text-sm text-white">{busy ? "Yükleniyor…" : "Dosya seç ve yükle"}</span>
          <input
            type="file"
            className="hidden"
            disabled={busy || !tenant}
            accept={
              kind === "IMAGE"
                ? "image/jpeg,image/png,image/webp,image/gif"
                : kind === "AUDIO"
                  ? "audio/*"
                  : "video/*"
            }
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </FormCard>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{m.kind}</p>
              <StatusBadge status={m.status} />
            </div>
            {m.kind === "IMAGE" && m.status === "READY" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/backend/media/${m.id}/content`}
                alt={m.altText || m.originalFilename || ""}
                className="mt-2 max-h-40 w-full rounded-lg object-contain bg-bg"
              />
            ) : null}
            {m.kind === "AUDIO" && m.status === "READY" ? (
              <audio controls src={`/api/backend/media/${m.id}/content`} className="mt-2 w-full" />
            ) : null}
            {m.kind === "VIDEO" && m.status === "READY" ? (
              <video controls src={`/api/backend/media/${m.id}/content`} className="mt-2 max-h-40 w-full rounded-lg" />
            ) : null}
            <p className="mt-1 text-xs text-fg-muted">{m.originalFilename || m.mimeType}</p>
            <p className="mt-1 font-mono text-[10px] text-fg-muted">{m.id}</p>
            {m.altText ? <p className="mt-2 text-sm">{m.altText}</p> : null}
            {m.transcript ? <p className="mt-1 text-xs text-fg-muted">{m.transcript}</p> : null}
          </div>
        ))}
      </div>
      {rows.length === 0 && !error ? (
        <EmptyState title="Medya yok" description="Soru editöründe kullanmak için yükleyin." />
      ) : null}
    </div>
  );
}

export function ReviewQueuePage() {
  const questionBasePath = useContentBasePath("questions");
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    void authoringApi
      .listReviews()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [tenant]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="İnceleme kuyruğu"
        description="Hakeme atanan sorular ve sınavlar. Yazar kendi içeriğini onaylayamaz."
      />
      {error ? <ErrorState title="Kuyruk alınamadı" message={error} /> : null}
      <div className="rounded-xl border border-border bg-surface shadow-sm divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">
                {r.targetType} · {r.targetId.slice(0, 8)}…
              </p>
              <p className="text-xs text-fg-muted">
                {new Date(r.submittedAt).toLocaleString("tr-TR")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              {r.targetType === "QUESTION_VERSION" ? (
                <a className="text-sm text-primary hover:underline" href={`${questionBasePath}/${r.targetId}`}>
                  Aç
                </a>
              ) : null}
            </div>
          </div>
        ))}
        {rows.length === 0 && !error ? (
          <div className="p-6">
            <EmptyState title="Kuyruk boş" description="İncelemeye gönderilen içerik burada listelenir." />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { RubricsPage } from "@/src/features/authoring/rubrics/RubricEditor";


export function FormatsPage() {
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<Array<{ id: string; code: string; name: string; description?: string; skeleton?: unknown }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    void authoringApi
      .listFormats()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [tenant]);

  async function seedStarter() {
    try {
      await authoringApi.createFormat({
        code: `yle-starters-${Date.now().toString(36)}`,
        name: "YLE Starters benzeri",
        description: "Reading + Listening iskeleti",
        purpose: "ACHIEVEMENT",
        minLevel: "PRE_A1",
        maxLevel: "A1",
        skeleton: {
          sections: [
            {
              title: "Reading and Writing",
              skill: "READING",
              subSections: [
                { title: "Part 1", taskType: "MCQ", blueprint: { count: 5, cefrLevel: "PRE_A1" } },
                { title: "Part 2", taskType: "MATCHING", blueprint: { count: 5, cefrLevel: "A1" } },
              ],
            },
            {
              title: "Listening",
              skill: "LISTENING",
              subSections: [
                { title: "Part 1", taskType: "MCQ", blueprint: { count: 5, cefrLevel: "PRE_A1" } },
              ],
            },
          ],
        },
      });
      setRows(await authoringApi.listFormats());
      notify.success("Format eklendi");
    } catch (e) {
      const message = errorMessage(e, "Oluşturulamadı");
      setError(message);
      notify.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sınav formatları"
        description="Hazır iskeletler: bölüm, kısım ve blueprint."
        actions={
          <Button onClick={() => void seedStarter()} disabled={!tenant}>
            YLE Starters ekle
          </Button>
        }
      />
      {error ? <ErrorState title="Hata" message={error} /> : null}
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.map((f) => (
          <li key={f.id} className="space-y-2 px-4 py-3">
            <p className="font-medium">{f.name}</p>
            <p className="text-sm text-fg-muted">
              {f.code}
              {f.description ? ` · ${f.description}` : ""}
            </p>
            <details>
              <summary className="cursor-pointer text-xs text-primary">Skeleton düzenle</summary>
              <FormatSkeletonEditor id={f.id} skeleton={f.skeleton} onSaved={async () => setRows(await authoringApi.listFormats())} />
            </details>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="p-6">
            <EmptyState title="Format yok" description="Sihirbazda kullanmak için bir iskelet ekleyin." />
          </li>
        ) : null}
      </ul>
    </div>
  );
}

const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY", "USE_OF_ENGLISH"] as const;
const SKILL_LABEL: Record<(typeof SKILLS)[number], string> = {
  READING: "Okuma",
  LISTENING: "Dinleme",
  WRITING: "Yazma",
  SPEAKING: "Konuşma",
  GRAMMAR: "Dilbilgisi",
  VOCABULARY: "Kelime",
  USE_OF_ENGLISH: "Use of English",
};
const CEFR = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
const FRAMEWORKS = ["ILC", "CEFR", "MEB"] as const;

type OutcomeRow = {
  id: string;
  code: string;
  description: string;
  framework?: string;
  skill?: string | null;
  cefrLevel?: string | null;
  gradeLevel?: number | null;
};

type AgeBandRow = { id: string; code: string; label: string; sortOrder: number; ownerOrgId: string };

type PendingDelete = { kind: "tag" | "age" | "outcome"; id: string; label: string };

const emptyOutcome = {
  framework: "ILC",
  code: "",
  description: "",
  skill: "READING",
  cefrLevel: "A1",
  gradeLevel: "",
};

export function SettingsDictionariesPage() {
  const { tenant } = useAuthoringTenant();
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [ageBands, setAgeBands] = useState<AgeBandRow[]>([]);
  const [tagName, setTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [ageCode, setAgeCode] = useState("");
  const [ageLabel, setAgeLabel] = useState("");
  const [ageSort, setAgeSort] = useState("");
  const [editingAgeId, setEditingAgeId] = useState<string | null>(null);
  const [editingAge, setEditingAge] = useState({ code: "", label: "", sortOrder: "" });
  const [outcomeDraft, setOutcomeDraft] = useState(emptyOutcome);
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingOutcome, setEditingOutcome] = useState(emptyOutcome);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importJson, setImportJson] = useState(
    '[{"interactionType":"MULTIPLE_CHOICE","skill":"READING","cefrLevel":"A1","ageBand":"10-12"}]',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    const [t, o, a] = await Promise.all([
      authoringApi.listTags(),
      authoringApi.listOutcomes(),
      authoringApi.listAgeBands(),
    ]);
    setTags(t);
    setOutcomes(o);
    setAgeBands(a);
  }, [tenant]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [load]);

  function fail(e: unknown, fallback: string) {
    notify.error(errorMessage(e, fallback));
  }

  async function addTag() {
    try {
      await authoringApi.createTag(tagName);
      setTagName("");
      await load();
      notify.success("Etiket eklendi");
    } catch (e) {
      fail(e, "Etiket eklenemedi");
    }
  }

  async function saveTag(id: string) {
    try {
      await authoringApi.updateTag(id, editingTagName);
      setEditingTagId(null);
      await load();
      notify.success("Etiket güncellendi");
    } catch (e) {
      fail(e, "Etiket güncellenemedi");
    }
  }

  async function addAgeBand() {
    try {
      await authoringApi.createAgeBand({
        code: ageCode.trim(),
        label: ageLabel.trim(),
        sortOrder: ageSort.trim() === "" ? ageBands.length + 1 : Number(ageSort),
      });
      setAgeCode("");
      setAgeLabel("");
      setAgeSort("");
      await load();
      notify.success("Yaş bandı eklendi");
    } catch (e) {
      fail(e, "Yaş bandı eklenemedi");
    }
  }

  async function saveAgeBand(id: string) {
    try {
      await authoringApi.updateAgeBand(id, {
        code: editingAge.code.trim(),
        label: editingAge.label.trim(),
        sortOrder: editingAge.sortOrder.trim() === "" ? 0 : Number(editingAge.sortOrder),
      });
      setEditingAgeId(null);
      await load();
      notify.success("Yaş bandı güncellendi");
    } catch (e) {
      fail(e, "Yaş bandı güncellenemedi");
    }
  }

  function outcomePayload(draft: typeof emptyOutcome) {
    const grade = draft.gradeLevel.trim();
    return {
      framework: draft.framework,
      code: draft.code.trim(),
      description: draft.description.trim(),
      skill: draft.skill,
      cefrLevel: draft.cefrLevel,
      gradeLevel: grade === "" ? null : Number(grade),
    };
  }

  async function addOutcome() {
    try {
      await authoringApi.createOutcome(outcomePayload(outcomeDraft));
      setOutcomeDraft(emptyOutcome);
      await load();
      notify.success("Kazanım eklendi");
    } catch (e) {
      fail(e, "Kazanım eklenemedi");
    }
  }

  async function saveOutcome(id: string) {
    try {
      const payload = outcomePayload(editingOutcome);
      await authoringApi.updateOutcome(id, {
        description: payload.description,
        skill: payload.skill,
        cefrLevel: payload.cefrLevel,
        gradeLevel: payload.gradeLevel,
      });
      setEditingOutcomeId(null);
      await load();
      notify.success("Kazanım güncellendi");
    } catch (e) {
      fail(e, "Kazanım güncellenemedi");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === "tag") await authoringApi.deleteTag(pendingDelete.id);
      else if (pendingDelete.kind === "age") await authoringApi.deleteAgeBand(pendingDelete.id);
      else await authoringApi.deleteOutcome(pendingDelete.id);
      if (pendingDelete.kind === "tag" && editingTagId === pendingDelete.id) setEditingTagId(null);
      if (pendingDelete.kind === "age" && editingAgeId === pendingDelete.id) setEditingAgeId(null);
      if (pendingDelete.kind === "outcome" && editingOutcomeId === pendingDelete.id) setEditingOutcomeId(null);
      setPendingDelete(null);
      await load();
      notify.success("Silindi");
    } catch (e) {
      fail(e, "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  async function runImport() {
    try {
      const rows = JSON.parse(importJson) as Array<Record<string, unknown>>;
      const result = await authoringApi.importQuestions(rows);
      const ok = result.rows.filter((r) => r.ok).length;
      const msg = `${ok}/${result.rows.length} satır taslak olarak içe aktarıldı.`;
      setMessage(msg);
      notify.success(msg);
    } catch (e) {
      const message = errorMessage(e, "Import başarısız");
      setError(message);
      notify.error(message);
    }
  }

  async function ttsDemo() {
    try {
      const r = await authoringApi.tts("Listen and choose the correct picture.");
      setMessage(r.message);
      notify.info(r.message);
    } catch (e) {
      notify.error(errorMessage(e, "TTS başarısız"));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ayarlar / Sözlükler"
        description="Etiketler, yaş bantları, can-do kazanımları, toplu içe aktarma ve TTS/STT yardımcıları."
      />
      {error ? <ErrorState title="Hata" message={error} /> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <FormCard title="Etiketler">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Yeni etiket">
            <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="family" />
          </Field>
          <Button onClick={() => void addTag()} disabled={!tagName.trim()}>
            Ekle
          </Button>
        </div>
        {tags.length === 0 ? (
          <p className="text-sm text-fg-muted">Etiket yok.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {tags.map((tag) => (
              <li key={tag.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                {editingTagId === tag.id ? (
                  <>
                    <Input
                      className="min-w-0 flex-1"
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                    />
                    <Button size="sm" onClick={() => void saveTag(tag.id)} disabled={!editingTagName.trim()}>
                      Kaydet
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTagId(null)}>
                      Vazgeç
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 text-sm">{tag.name}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingTagId(tag.id);
                        setEditingTagName(tag.name);
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setPendingDelete({ kind: "tag", id: tag.id, label: tag.name })}
                    >
                      Sil
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </FormCard>

      <FormCard title="Yaş bantları" description="Soru sınıflandırmasındaki yaş bandı listesi.">
        <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_5.5rem_auto]">
          <Field label="Kod">
            <Input value={ageCode} onChange={(e) => setAgeCode(e.target.value)} placeholder="10-12" />
          </Field>
          <Field label="Etiket">
            <Input value={ageLabel} onChange={(e) => setAgeLabel(e.target.value)} placeholder="10–12 yaş" />
          </Field>
          <Field label="Sıra">
            <Input type="number" value={ageSort} onChange={(e) => setAgeSort(e.target.value)} placeholder="1" />
          </Field>
          <Button onClick={() => void addAgeBand()} disabled={!ageCode.trim() || !ageLabel.trim()}>
            Ekle
          </Button>
        </div>
        {ageBands.length === 0 ? (
          <p className="text-sm text-fg-muted">Yaş bandı yok. Boşsa HQ varsayılanları kullanılır.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {ageBands.map((band) => {
              const owned = band.ownerOrgId === tenant?.id;
              return (
              <li key={band.id} className="px-3 py-2">
                {editingAgeId === band.id ? (
                  <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_5.5rem_auto_auto]">
                    <Field label="Kod">
                      <Input value={editingAge.code} onChange={(e) => setEditingAge({ ...editingAge, code: e.target.value })} />
                    </Field>
                    <Field label="Etiket">
                      <Input value={editingAge.label} onChange={(e) => setEditingAge({ ...editingAge, label: e.target.value })} />
                    </Field>
                    <Field label="Sıra">
                      <Input
                        type="number"
                        value={editingAge.sortOrder}
                        onChange={(e) => setEditingAge({ ...editingAge, sortOrder: e.target.value })}
                      />
                    </Field>
                    <Button size="sm" onClick={() => void saveAgeBand(band.id)} disabled={!editingAge.code.trim() || !editingAge.label.trim()}>
                      Kaydet
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingAgeId(null)}>
                      Vazgeç
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-mono text-xs">{band.code}</span>
                      {" — "}
                      {band.label}
                      <span className="text-fg-muted"> · sıra {band.sortOrder}</span>
                    </span>
                    {owned ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingAgeId(band.id);
                            setEditingAge({ code: band.code, label: band.label, sortOrder: String(band.sortOrder) });
                          }}
                        >
                          Düzenle
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setPendingDelete({ kind: "age", id: band.id, label: band.label })}
                        >
                          Sil
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-fg-muted">HQ varsayılanı</span>
                    )}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </FormCard>

      <FormCard title="Kazanımlar" description="Soru editöründeki öğrenme çıktıları bu listeden seçilir. Kod ve çerçeve sonradan değişmez.">
        <OutcomeFields
          draft={outcomeDraft}
          onChange={setOutcomeDraft}
          onSubmit={() => void addOutcome()}
          submitLabel="Ekle"
        />
        {outcomes.length === 0 ? (
          <p className="text-sm text-fg-muted">Kazanım yok.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {outcomes.map((outcome) => (
              <li key={outcome.id} className="px-3 py-2">
                {editingOutcomeId === outcome.id ? (
                  <OutcomeFields
                    draft={editingOutcome}
                    lockIdentity
                    onChange={setEditingOutcome}
                    onSubmit={() => void saveOutcome(outcome.id)}
                    onCancel={() => setEditingOutcomeId(null)}
                    submitLabel="Kaydet"
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-mono text-xs">{outcome.code}</span>
                        {" — "}
                        {outcome.description}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {[outcome.framework, outcome.skill ? SKILL_LABEL[outcome.skill as keyof typeof SKILL_LABEL] ?? outcome.skill : null, outcome.cefrLevel]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingOutcomeId(outcome.id);
                        setEditingOutcome({
                          framework: outcome.framework ?? "ILC",
                          code: outcome.code,
                          description: outcome.description,
                          skill: outcome.skill ?? "READING",
                          cefrLevel: outcome.cefrLevel ?? "A1",
                          gradeLevel: outcome.gradeLevel != null ? String(outcome.gradeLevel) : "",
                        });
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setPendingDelete({ kind: "outcome", id: outcome.id, label: outcome.code })}
                    >
                      Sil
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </FormCard>

      <FormCard title="Toplu içe aktarma (JSON satırları)">
        <textarea
          className="min-h-28 w-full rounded-md border border-border bg-bg p-2 font-mono text-xs"
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
        />
        <Button className="mt-2" onClick={() => void runImport()}>
          İçe aktar
        </Button>
      </FormCard>

      <FormCard title="TTS / STT yardımcıları">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void ttsDemo()}>
            TTS dene
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void notify
                .run(authoringApi.stt("00000000-0000-0000-0000-000000000001"), {
                  error: "STT başarısız",
                })
                .then((r) => {
                  setMessage(r.message);
                  notify.info(r.message);
                })
                .catch(() => undefined)
            }
          >
            STT dene
          </Button>
        </div>
      </FormCard>
      <ConfirmDialog
        open={pendingDelete != null}
        title={
          pendingDelete?.kind === "tag"
            ? "Etiketi sil"
            : pendingDelete?.kind === "age"
              ? "Yaş bandını kaldır"
              : "Kazanımı kaldır"
        }
        description={
          pendingDelete?.kind === "tag"
            ? `“${pendingDelete.label}” kalıcı silinir. Soru veya sınavda kullanılıyorsa silinemez.`
            : pendingDelete?.kind === "age"
              ? `“${pendingDelete.label}” listeden kalkar. Sorularda kayıtlı kod değişmez.`
              : `“${pendingDelete?.label ?? ""}” seçiciden kalkar. Bağlı sorulardaki kayıt kalır.`
        }
        confirmLabel="Sil"
        pending={deleting}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function OutcomeFields({
  draft,
  lockIdentity,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  draft: typeof emptyOutcome;
  lockIdentity?: boolean;
  onChange: (next: typeof emptyOutcome) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-4">
        <Field label="Çerçeve">
          <Select
            value={draft.framework}
            disabled={lockIdentity}
            onChange={(e) => onChange({ ...draft, framework: e.target.value })}
          >
            {FRAMEWORKS.map((framework) => (
              <option key={framework} value={framework}>{framework}</option>
            ))}
          </Select>
        </Field>
        <Field label="Kod">
          <Input
            value={draft.code}
            disabled={lockIdentity}
            onChange={(e) => onChange({ ...draft, code: e.target.value })}
            placeholder="CAN-READ-A1-01"
          />
        </Field>
        <Field label="Beceri">
          <Select value={draft.skill} onChange={(e) => onChange({ ...draft, skill: e.target.value })}>
            {SKILLS.map((skill) => (
              <option key={skill} value={skill}>{SKILL_LABEL[skill]}</option>
            ))}
          </Select>
        </Field>
        <Field label="CEFR">
          <Select value={draft.cefrLevel} onChange={(e) => onChange({ ...draft, cefrLevel: e.target.value })}>
            {CEFR.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto]">
        <Field label="Açıklama">
          <Textarea
            rows={2}
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            placeholder="Can understand short simple texts"
          />
        </Field>
        <Field label="MEB sınıf" hint="Boş bırakılabilir">
          <Input
            type="number"
            value={draft.gradeLevel}
            onChange={(e) => onChange({ ...draft, gradeLevel: e.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSubmit} disabled={!draft.code.trim() || !draft.description.trim()}>
            {submitLabel}
          </Button>
          {onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Vazgeç
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}


function FormatSkeletonEditor({
  id,
  skeleton,
  onSaved,
}: {
  id: string;
  skeleton?: unknown;
  onSaved: () => Promise<void>;
}) {
  const [json, setJson] = useState(JSON.stringify(skeleton ?? { sections: [] }, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mt-2 space-y-2">
      <textarea
        className="min-h-32 w-full rounded-md border border-border bg-bg p-2 font-mono text-xs"
        value={json}
        onChange={(e) => setJson(e.target.value)}
      />
      {err ? <p className="text-xs text-danger">{err}</p> : null}
      <Button
        size="sm"
        onClick={() => {
          try {
            const skeleton = JSON.parse(json);
            void notify
              .run(authoringApi.updateFormat(id, { skeleton }), {
                success: "Kaydedildi",
                error: "Kaydedilemedi",
              })
              .then(() => onSaved())
              .catch((e) => setErr(errorMessage(e, "Kaydedilemedi")));
          } catch {
            setErr("Geçersiz JSON");
            notify.error("Geçersiz JSON");
          }
        }}
      >
        Kaydet
      </Button>
    </div>
  );
}
