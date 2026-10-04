"use client";

import { authoringApi, type MediaItem, type ReviewItem } from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { Button, EmptyState, ErrorState, Field, FormCard, Input, PageHeader, Select, errorMessage, notify } from "@/src/ui";
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

export function ReviewQueuePage({ questionBasePath }: { questionBasePath: string }) {
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

export function SettingsDictionariesPage() {
  const { tenant } = useAuthoringTenant();
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [outcomes, setOutcomes] = useState<
    Array<{ id: string; code: string; description: string }>
  >([]);
  const [ageBands, setAgeBands] = useState<Array<{ code: string; label: string }>>([]);
  const [tagName, setTagName] = useState("");
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

  async function addTag() {
    try {
      await authoringApi.createTag(tagName);
      setTagName("");
      await load();
      notify.success("Etiket eklendi");
    } catch (e) {
      const message = errorMessage(e, "Etiket eklenemedi");
      setError(message);
      notify.error(message);
    }
  }

  async function addOutcome() {
    try {
      await authoringApi.createOutcome({
        framework: "ILC",
        code: `CAN-${Date.now().toString(36).toUpperCase()}`,
        description: "Can understand short simple texts",
        skill: "READING",
        cefrLevel: "A1",
      });
      await load();
      notify.success("Kazanım eklendi");
    } catch (e) {
      const message = errorMessage(e, "Kazanım eklenemedi");
      setError(message);
      notify.error(message);
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
        <div className="flex gap-2">
          <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="family" />
          <Button onClick={() => void addTag()} disabled={!tagName}>
            Ekle
          </Button>
        </div>
        <p className="mt-2 text-sm text-fg-muted">{tags.map((t) => t.name).join(", ") || "—"}</p>
      </FormCard>

      <FormCard title="Yaş bantları">
        <p className="text-sm text-fg-muted">
          {ageBands.map((a) => a.label).join(" · ") || "HQ varsayılanları kullanılacak"}
        </p>
        <Button
          className="mt-2"
          variant="secondary"
          onClick={() =>
            void notify
              .run(
                authoringApi.createAgeBand({
                  code: `AGE-${Date.now().toString(36)}`,
                  label: "Yeni yaş bandı",
                  sortOrder: ageBands.length + 1,
                }),
                { success: "Yaş bandı eklendi", error: "Yaş bandı eklenemedi" },
              )
              .then(() => load())
              .catch((e) => setError(errorMessage(e, "Yaş bandı eklenemedi")))
          }
        >
          Yaş bandı ekle
        </Button>
      </FormCard>

      <FormCard title="Kazanımlar (can-do)">
        <Button variant="secondary" onClick={() => void addOutcome()}>
          Örnek kazanım ekle
        </Button>
        <ul className="mt-2 space-y-1 text-sm">
          {outcomes.map((o) => (
            <li key={o.id}>
              <span className="font-mono text-xs">{o.code}</span> — {o.description}
            </li>
          ))}
        </ul>
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
