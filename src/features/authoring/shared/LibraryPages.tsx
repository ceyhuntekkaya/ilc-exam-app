"use client";

import { authoringApi, type MediaItem, type ReviewItem } from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { Button, EmptyState, ErrorState, Field, FormCard, Input, PageHeader, Select } from "@/src/ui";
import { useCallback, useEffect, useState } from "react";

export function MediaLibraryPage() {
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<MediaItem[]>([]);
  const [kind, setKind] = useState("IMAGE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      setRows(await authoringApi.listMedia());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    }
  }, [tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload() {
    setBusy(true);
    try {
      const session = await authoringApi.uploadMedia(
        kind,
        kind === "IMAGE" ? "image/png" : kind === "AUDIO" ? "audio/mpeg" : "video/mp4",
        `upload.${kind === "IMAGE" ? "png" : kind === "AUDIO" ? "mp3" : "mp4"}`,
      );
      await authoringApi.completeMedia(session.mediaId, {
        sizeBytes: 2048,
        altText: kind === "IMAGE" ? "Yüklenen görsel" : null,
        transcript: kind !== "IMAGE" ? "Taslak transkript" : null,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Medya kütüphanesi"
        description="Görseller, sesler ve videolar. Aynı medya birden fazla soruda kullanılabilir."
        actions={
          <div className="flex gap-2">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="IMAGE">Görsel</option>
              <option value="AUDIO">Ses</option>
              <option value="VIDEO">Video</option>
            </Select>
            <Button onClick={() => void upload()} disabled={busy || !tenant}>
              {busy ? "Yükleniyor…" : "Medya ekle"}
            </Button>
          </div>
        }
      />
      {error ? <ErrorState title="Medya hatası" message={error} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{m.kind}</p>
              <StatusBadge status={m.status} />
            </div>
            <p className="mt-1 text-xs text-fg-muted">{m.mimeType}</p>
            {m.altText ? <p className="mt-2 text-sm">{m.altText}</p> : null}
            {m.widthPx ? (
              <p className="mt-1 text-xs text-fg-muted">
                {m.widthPx}×{m.heightPx}
              </p>
            ) : null}
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

export function RubricsPage() {
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<Array<{ id: string; code: string; name: string; skill: string }>>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    setRows(await authoringApi.listRubrics());
  }, [tenant]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [load]);

  async function create() {
    try {
      await authoringApi.createRubric({
        code: code || `RB-${Date.now().toString(36)}`,
        name: name || "Yeni rubrik",
        skill: "WRITING",
      });
      setCode("");
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oluşturulamadı");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Rubrikler" description="Writing / Speaking puanlama ölçütleri." />
      {error ? <ErrorState title="Hata" message={error} /> : null}
      <FormCard title="Yeni rubrik">
        <div className="flex flex-wrap gap-2">
          <Field label="Kod">
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Ad">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button className="self-end" onClick={() => void create()}>
            Ekle
          </Button>
        </div>
      </FormCard>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3 text-sm">
            <span className="font-medium">{r.name}</span>{" "}
            <span className="text-fg-muted">
              ({r.code} · {r.skill})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FormatsPage() {
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<Array<{ id: string; code: string; name: string; description?: string }>>([]);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oluşturulamadı");
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
          <li key={f.id} className="px-4 py-3">
            <p className="font-medium">{f.name}</p>
            <p className="text-sm text-fg-muted">
              {f.code}
              {f.description ? ` · ${f.description}` : ""}
            </p>
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
    await authoringApi.createTag(tagName);
    setTagName("");
    await load();
  }

  async function addOutcome() {
    await authoringApi.createOutcome({
      framework: "ILC",
      code: `CAN-${Date.now().toString(36).toUpperCase()}`,
      description: "Can understand short simple texts",
      skill: "READING",
      cefrLevel: "A1",
    });
    await load();
  }

  async function runImport() {
    try {
      const rows = JSON.parse(importJson) as Array<Record<string, unknown>>;
      const result = await authoringApi.importQuestions(rows);
      const ok = result.rows.filter((r) => r.ok).length;
      setMessage(`${ok}/${result.rows.length} satır taslak olarak içe aktarıldı.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import başarısız");
    }
  }

  async function ttsDemo() {
    const r = await authoringApi.tts("Listen and choose the correct picture.");
    setMessage(r.message);
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
              void authoringApi.stt("00000000-0000-0000-0000-000000000001").then((r) => setMessage(r.message))
            }
          >
            STT dene
          </Button>
        </div>
      </FormCard>
    </div>
  );
}
