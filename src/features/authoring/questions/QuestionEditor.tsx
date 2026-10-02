"use client";

import { authoringApi, type QuestionDetail } from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import {
  Button,
  Field,
  FormCard,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/src/ui";
import { useCallback, useEffect, useState } from "react";

const TYPES = [
  { id: "MULTIPLE_CHOICE", label: "Çoktan seçmeli", hint: "Tek doğru cevap" },
  { id: "TRUE_FALSE", label: "Doğru / Yanlış", hint: "İfade doğrulama" },
  { id: "FILL_IN_THE_BLANKS", label: "Boşluk doldurma", hint: "Açılır liste / kelime" },
  { id: "SHORT_ANSWER", label: "Kısa cevap", hint: "Yazarak cevap" },
  { id: "MATCHING", label: "Eşleştirme", hint: "Sol-sağ eşleme" },
  { id: "ORDERING", label: "Sıralama", hint: "Doğru sıra" },
  { id: "OPEN_ENDED", label: "Writing görevi", hint: "Rubrik gerekir" },
  { id: "AUDIO_RESPONSE", label: "Speaking görevi", hint: "Sesli cevap" },
] as const;

export function QuestionTypePicker({ basePath }: { basePath: string }) {
  const { tenant } = useAuthoringTenant();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(type: string) {
    if (!tenant) return;
    setBusy(type);
    setError(null);
    try {
      const skill =
        type === "OPEN_ENDED" ? "WRITING" : type === "AUDIO_RESPONSE" ? "SPEAKING" : "READING";
      const q = await authoringApi.createQuestion({ interactionType: type, skill });
      window.location.href = `${basePath}/${q.versionId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oluşturulamadı");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Soru tipi seç"
        description="Tip formu belirler. Sonradan değiştirmek veri kaybettirir."
        back={{ href: basePath, label: "Soru bankası" }}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!tenant || busy === t.id}
            onClick={() => void start(t.id)}
            className="rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition hover:border-primary"
          >
            <p className="font-medium text-fg">{t.label}</p>
            <p className="mt-1 text-sm text-fg-muted">{t.hint}</p>
            {busy === t.id ? <p className="mt-2 text-xs text-fg-muted">Oluşturuluyor…</p> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuestionEditorPage({
  basePath,
  versionId,
}: {
  basePath: string;
  versionId: string;
}) {
  const { tenant } = useAuthoringTenant();
  const [q, setQ] = useState<QuestionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [violations, setViolations] = useState<Array<{ path: string; message: string }>>([]);
  const [impact, setImpact] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState(2);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet">("desktop");
  const [cefr, setCefr] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [instruction, setInstruction] = useState("");
  const [ageBands, setAgeBands] = useState<Array<{ code: string; label: string }>>([]);

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      const data = await authoringApi.getQuestion(versionId);
      setQ(data);
      setCefr(data.cefrLevel ?? "");
      setAgeBand(data.ageBand ?? "");
      const body = data.body as { instruction?: { html?: string } } | null;
      setInstruction(body?.instruction?.html ?? "");
      const imp = await authoringApi.impact(data.questionId);
      setImpact(
        imp.examCount > 0
          ? `Bu soru ${imp.examCount} sınavda kullanılıyor (${imp.publishedExamCount} yayında).`
          : "Bu soru henüz hiçbir sınavda kullanılmıyor.",
      );
      const bands = await authoringApi.listAgeBands();
      setAgeBands(bands);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    }
  }, [tenant, versionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMeta() {
    if (!q) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await authoringApi.updateMetadata(q.versionId, {
        cefrLevel: cefr || null,
        ageBand: ageBand || null,
        changeNote: "metadata update",
      });
      setQ(updated);
      if (instruction !== undefined) {
        await authoringApi.updateBody(q.versionId, {
          instruction: instruction ? { html: instruction } : null,
          instructionAudio: null,
          mainAudio: null,
          stimulus: [],
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function validate(publish = false) {
    if (!q) return;
    const v = await authoringApi.validateQuestion(q.versionId, publish);
    setViolations(v);
  }

  async function submit() {
    if (!q) return;
    setSaving(true);
    try {
      await saveMeta();
      const updated = await authoringApi.submitQuestion(q.versionId);
      setQ(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!q) return;
    setSaving(true);
    try {
      const updated = await authoringApi.approveQuestion(q.versionId);
      setQ(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onaylanamadı");
    } finally {
      setSaving(false);
    }
  }

  if (!q && !error) {
    return <div className="p-6 text-sm text-fg-muted">Yükleniyor…</div>;
  }
  if (error && !q) {
    return <div className="p-6 text-sm text-danger">{error}</div>;
  }
  if (!q) return null;

  const part = q.parts[0];

  return (
    <div className="space-y-4">
      <PageHeader
        title={q.code || "Soru"}
        description={`Sürüm v${q.versionNo} · ${part?.interactionType?.replaceAll("_", " ") ?? ""}`}
        back={{ href: basePath, label: "Soru bankası" }}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={q.status} />
            <Button variant="secondary" onClick={() => void validate(true)} disabled={saving}>
              Kontrol et
            </Button>
            {q.editable ? (
              <Button onClick={() => void saveMeta()} disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            ) : null}
            {q.status === "DRAFT" ? (
              <Button variant="secondary" onClick={() => void submit()} disabled={saving}>
                İncelemeye gönder
              </Button>
            ) : null}
            {q.status === "IN_REVIEW" ? (
              <Button onClick={() => void approve()} disabled={saving}>
                Onayla
              </Button>
            ) : null}
          </div>
        }
      />

      {impact ? (
        <div className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm text-fg">{impact}</div>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {violations.length > 0 ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-medium">Doğrulama</p>
          <ul className="mt-1 list-disc pl-5">
            {violations.map((v, i) => (
              <li key={i}>
                {v.path}: {v.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <Panel
            title="1. Soru tipi"
            summary={part?.interactionType?.replaceAll("_", " ") ?? "—"}
            open={openPanel === 1}
            onToggle={() => setOpenPanel(openPanel === 1 ? 0 : 1)}
            done
          >
            <p className="text-sm text-fg-muted">
              Tip oluştururken seçildi. Değiştirmek için yeni soru açın veya klonlayın.
            </p>
          </Panel>

          <Panel
            title="2. Sınıflandırma"
            summary={[cefr || "seviye yok", ageBand || "yaş yok"].join(" · ")}
            open={openPanel === 2}
            onToggle={() => setOpenPanel(openPanel === 2 ? 0 : 2)}
            done={!!cefr || !!ageBand}
          >
            <FormCard title="Metadata">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="CEFR">
                  <Select value={cefr} onChange={(e) => setCefr(e.target.value)} disabled={!q.editable}>
                    <option value="">Seçin</option>
                    {["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                      <option key={l} value={l}>
                        {l.replace("_", "-")}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Yaş bandı">
                  <Select
                    value={ageBand}
                    onChange={(e) => setAgeBand(e.target.value)}
                    disabled={!q.editable}
                  >
                    <option value="">Seçin</option>
                    {ageBands.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </FormCard>
          </Panel>

          <Panel
            title="3–5. Uyaran, içerik, cevap"
            summary={`${q.parts.length} alt soru`}
            open={openPanel === 3}
            onToggle={() => setOpenPanel(openPanel === 3 ? 0 : 3)}
            done={q.parts.length > 0}
          >
            <FormCard title="Yönerge">
              <Field label="Öğrenci yönergesi">
                <Textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  disabled={!q.editable}
                  rows={3}
                />
              </Field>
            </FormCard>
            <FormCard title="Alt sorular">
              <ul className="space-y-2 text-sm">
                {q.parts.map((p) => (
                  <li key={p.id} className="rounded-md border border-border px-3 py-2">
                    <span className="font-medium">#{p.position}</span> {p.interactionType} ·{" "}
                    {p.skill ?? "—"} · {p.maxScore} puan
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-fg-muted">
                Şablon alanları JSON modelinde; gelişmiş düzenleme sonraki panellerde genişletilir.
              </p>
            </FormCard>
          </Panel>

          <Panel
            title="6–7. Gerekçe / Kaydet"
            summary={q.status}
            open={openPanel === 7}
            onToggle={() => setOpenPanel(openPanel === 7 ? 0 : 7)}
            done={q.status !== "DRAFT"}
          >
            <p className="text-sm text-fg-muted">
              Taslak her zaman kaydedilebilir. İnceleme / onay / yayın geçişleri kilitlidir.
            </p>
            {q.calibrationStatus ? (
              <p className="mt-2 text-sm">
                Kalibrasyon: <StatusBadge status={q.calibrationStatus} /> · maruziyet{" "}
                {q.exposureCount ?? 0}
                {q.irtA != null ? ` · a=${q.irtA}` : ""}
                {q.irtB != null ? ` · b=${q.irtB}` : ""}
              </p>
            ) : null}
          </Panel>
        </div>

        <aside className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-fg">Öğrenci önizleme</p>
            <Select
              value={previewMode}
              onChange={(e) => setPreviewMode(e.target.value as "desktop" | "tablet")}
            >
              <option value="desktop">Masaüstü</option>
              <option value="tablet">Tablet</option>
            </Select>
          </div>
          <div
            className={`mx-auto rounded-lg border border-border bg-bg p-4 ${
              previewMode === "tablet" ? "max-w-[320px]" : "w-full"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-fg-muted">Yönerge</p>
            <p className="mt-1 text-sm text-fg">{instruction || "—"}</p>
            <hr className="my-3 border-border" />
            <p className="text-sm font-medium">{part?.interactionType?.replaceAll("_", " ")}</p>
            <p className="mt-2 text-xs text-fg-muted">Canlı önizleme — öğrenci görünümü</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  summary,
  open,
  onToggle,
  done,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-medium text-fg">
          {done ? "✓ " : "○ "}
          {title}
        </span>
        {!open ? <span className="truncate text-sm text-fg-muted">{summary}</span> : null}
      </button>
      {open ? <div className="space-y-3 border-t border-border px-4 py-4">{children}</div> : null}
    </div>
  );
}
