"use client";

import { asHtmlObj, BlockHtmlField } from "@/src/features/authoring/blocks/BlockHtmlField";
import {
  ContentBlockList,
  contentBlocksToWire,
  normalizeContentBlocks,
  type ContentBlock,
} from "@/src/features/authoring/blocks/ContentBlockList";
import { htmlOf } from "@/src/features/exam-player/types";
import { MediaPicker } from "@/src/features/authoring/blocks/MediaPicker";
import { PlaybackPolicyFields, type PlaybackPolicy } from "@/src/features/authoring/blocks/PlaybackPolicyFields";
import { AnswerKeyForm, InteractionForm } from "@/src/features/authoring/templates/InteractionForms";
import { TEMPLATE_REGISTRY, getTemplate } from "@/src/features/authoring/templates/registry";
import {
  describeQuestionViolation,
  focusForViolation,
  type QuestionViolation,
} from "@/src/features/authoring/questions/violationCopy";
import {
  authoringApi,
  type QuestionDetail,
  type QuestionPart,
  type Skill,
} from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import {
  QuestionPreviewShell,
  type ContentBlock as PlayerContentBlock,
  type QuestionViewModel,
} from "@/src/features/exam-player";
import {
  Button,
  Field,
  FormCard,
  Input,
  MultiPicker,
  PageHeader,
  Select,
  errorMessage,
  notify,
} from "@/src/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

const SKILLS: Skill[] = [
  "READING",
  "LISTENING",
  "WRITING",
  "SPEAKING",
  "GRAMMAR",
  "VOCABULARY",
  "USE_OF_ENGLISH",
];

const SKILL_LABEL: Record<Skill, string> = {
  READING: "Okuma",
  LISTENING: "Dinleme",
  WRITING: "Yazma",
  SPEAKING: "Konuşma",
  GRAMMAR: "Dilbilgisi",
  VOCABULARY: "Kelime",
  USE_OF_ENGLISH: "Use of English",
};

const CEFR = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

/** Saklanan kod: anasınıfı -2/-1/0, sonra 1–12. sınıf. */
const MEB_GRADES: Array<{ value: string; label: string }> = [
  { value: "-2", label: "Anasınıfı 3 Yaş" },
  { value: "-1", label: "Anasınıfı 4 Yaş" },
  { value: "0", label: "Anasınıfı 5 Yaş" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}. Sınıf`,
  })),
];
const PANELS = [
  "Tip",
  "Sınıflandırma",
  "Uyaran",
  "İçerik",
  "Cevap / puan",
  "Gerekçe",
  "Kaydet / İnceleme",
] as const;

function partContent(part: QuestionPart): { stem: ContentBlock[]; interaction: Record<string, unknown> } {
  const c = (part.content || {}) as { stem?: ContentBlock[]; interaction?: Record<string, unknown> };
  return {
    stem: normalizeContentBlocks(c.stem),
    interaction: (c.interaction || { type: part.interactionType }) as Record<string, unknown>,
  };
}

export function QuestionTypePicker({ basePath }: { basePath: string }) {
  const { tenant } = useAuthoringTenant();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(type: string) {
    if (!tenant) return;
    setBusy(type);
    setError(null);
    try {
      const spec = getTemplate(type);
      const q = await authoringApi.createQuestion({
        interactionType: type,
        skill: spec?.defaultSkill ?? "READING",
      });
      window.location.href = `${basePath}/${q.versionId}`;
    } catch (e) {
      const message = errorMessage(e, "Oluşturulamadı");
      setError(message);
      notify.error(message);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Soru tipi seç"
        description="14 şablon — tip formu ve cevap anahtarını belirler. Değiştirmek veri kaybettirir."
        back={{ href: basePath, label: "Soru bankası" }}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_REGISTRY.map((t) => (
          <button
            key={t.type}
            type="button"
            disabled={!tenant || busy === t.type}
            onClick={() => void start(t.type)}
            className="rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition hover:border-primary"
          >
            <p className="font-medium text-fg">{t.label}</p>
            <p className="mt-1 text-sm text-fg-muted">{t.hint}</p>
            {busy === t.type ? <p className="mt-2 text-xs text-fg-muted">Oluşturuluyor…</p> : null}
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
  const [violations, setViolations] = useState<QuestionViolation[]>([]);
  const [impact, setImpact] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ action: string; summary: string; createdAt: string }>>([]);
  const [enemies, setEnemies] = useState<string[]>([]);
  const [enemyInput, setEnemyInput] = useState("");
  const [openPanel, setOpenPanel] = useState(1);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [addingPart, setAddingPart] = useState(false);

  const [cefr, setCefr] = useState("");
  const [mebGrade, setMebGrade] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [estimatedTimeSec, setEstimatedTimeSec] = useState("");
  const [timeLimitSec, setTimeLimitSec] = useState("");
  const [securityLevel, setSecurityLevel] = useState("STANDARD");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [ageBands, setAgeBands] = useState<Array<{ code: string; label: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [outcomes, setOutcomes] = useState<Array<{ id: string; code: string; description: string }>>([]);
  const [rubrics, setRubrics] = useState<
    Array<{ id: string; name: string; skill?: string; currentVersionId?: string | null }>
  >([]);

  const [instruction, setInstruction] = useState<{ html: string }>({ html: "" });
  const [instructionAudioId, setInstructionAudioId] = useState<string | null>(null);
  const [instructionPlayback, setInstructionPlayback] = useState<PlaybackPolicy>({
    maxPlays: null,
    autoplay: false,
    seekable: true,
  });
  const [mainAudioId, setMainAudioId] = useState<string | null>(null);
  const [mainPlayback, setMainPlayback] = useState<PlaybackPolicy>({ maxPlays: 3, autoplay: false, seekable: false });
  const [stimulus, setStimulus] = useState<ContentBlock[]>([]);

  const [partDraft, setPartDraft] = useState<{
    skill: string;
    maxScore: string;
    difficulty: string;
    scoringMode: string;
    outcomeIds: string[];
    rubricVersionId: string;
    stem: ContentBlock[];
    interaction: Record<string, unknown>;
    answerKey: Record<string, unknown>;
  } | null>(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      const data = await authoringApi.getQuestion(versionId);
      setQ(data);
      setCefr(data.cefrLevel ?? "");
      setMebGrade(data.mebGrade != null ? String(data.mebGrade) : "");
      setAgeBand(data.ageBand ?? "");
      setEstimatedTimeSec(data.estimatedTimeSec != null ? String(data.estimatedTimeSec) : "");
      setTimeLimitSec(data.timeLimitSec != null ? String(data.timeLimitSec) : "");
      setSecurityLevel(data.securityLevel ?? "STANDARD");
      setTagIds(data.tagIds ?? []);
      const body = data.body || {};
      setInstruction(asHtmlObj(body.instruction));
      setInstructionAudioId(body.instructionAudio?.mediaId ?? null);
      setInstructionPlayback(
        (body.instructionAudio?.playback as typeof instructionPlayback) ?? {
          maxPlays: null,
          autoplay: false,
          seekable: true,
        },
      );
      setMainAudioId(body.mainAudio?.mediaId ?? null);
      setMainPlayback(
        (body.mainAudio?.playback as typeof mainPlayback) ?? {
          maxPlays: 3,
          autoplay: false,
          seekable: false,
        },
      );
      setStimulus(normalizeContentBlocks(body.stimulus as ContentBlock[]));
      const first = data.parts[0];
      setSelectedPartId((prev) => prev ?? first?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    }
  }, [tenant, versionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!tenant) return;
    void Promise.all([
      authoringApi.listAgeBands().catch(() => []),
      authoringApi.listTags().catch(() => []),
      authoringApi.listOutcomes().catch(() => []),
      authoringApi.listRubrics().catch(() => []),
    ]).then(([ab, tg, oc, rb]) => {
      setAgeBands(ab);
      setTags(tg);
      setOutcomes(oc);
      setRubrics(rb);
    });
  }, [tenant]);

  const selectedPart = useMemo(
    () => q?.parts.find((p) => p.id === selectedPartId) ?? q?.parts[0] ?? null,
    [q, selectedPartId],
  );

  useEffect(() => {
    if (!selectedPart) {
      setPartDraft(null);
      return;
    }
    const { stem, interaction } = partContent(selectedPart);
    setPartDraft({
      skill: selectedPart.skill ?? "READING",
      maxScore: String(selectedPart.maxScore ?? 1),
      difficulty: selectedPart.difficulty != null ? String(selectedPart.difficulty) : "",
      scoringMode: selectedPart.scoringMode ?? "ALL_OR_NOTHING",
      outcomeIds: selectedPart.outcomeIds ?? [],
      rubricVersionId: selectedPart.rubricVersionId ?? "",
      stem,
      interaction: { ...interaction, type: selectedPart.interactionType },
      answerKey: (selectedPart.answerKey as Record<string, unknown>) ?? { type: selectedPart.interactionType },
    });
  }, [selectedPart?.id, selectedPart?.content, selectedPart?.answerKey]);

  const editable = !!q?.editable;
  const template = getTemplate(selectedPart?.interactionType);

  const previewModel: QuestionViewModel = useMemo(() => {
    const parts =
      q?.parts.map((p) => {
        const isLive = p.id === selectedPart?.id && partDraft;
        const { stem, interaction } = isLive
          ? { stem: partDraft.stem, interaction: partDraft.interaction }
          : partContent(p);
        return {
          id: p.id,
          position: p.position,
          interactionType: p.interactionType,
          stem: stem as PlayerContentBlock[],
          interaction: { ...interaction, type: p.interactionType },
          answerKey: (isLive
            ? partDraft.answerKey
            : ((p.answerKey as Record<string, unknown>) ?? { type: p.interactionType })) as Record<
            string,
            unknown
          >,
          rubricVersionId: isLive ? partDraft.rubricVersionId || null : (p.rubricVersionId ?? null),
        };
      }) ?? [];

    return {
      instruction,
      instructionAudio: instructionAudioId
        ? {
            mediaId: instructionAudioId,
            playback: { maxPlays: null, autoplay: false, seekable: true },
          }
        : null,
      mainAudio: mainAudioId
        ? { mediaId: mainAudioId, playback: mainPlayback }
        : null,
      stimulus: stimulus as PlayerContentBlock[],
      parts,
    };
  }, [
    q?.parts,
    selectedPart?.id,
    partDraft,
    instruction,
    instructionAudioId,
    mainAudioId,
    mainPlayback,
    stimulus,
  ]);

  const previewRubricParts = useMemo(
    () =>
      (previewModel.parts ?? []).map((p) => ({
        partId: p.id,
        position: p.position,
        interactionType: p.interactionType,
        rubricVersionId: p.rubricVersionId,
        answerKey: p.answerKey,
      })),
    [previewModel.parts],
  );

  async function saveMetadata() {
    if (!q) return;
    setSaving(true);
    try {
      let next = await authoringApi.updateMetadata(q.versionId, {
        cefrLevel: cefr || null,
        mebGrade: mebGrade === "" ? null : Number(mebGrade),
        ageBand: ageBand || null,
        estimatedTimeSec: estimatedTimeSec === "" ? null : Number(estimatedTimeSec),
        timeLimitSec: timeLimitSec === "" ? null : Number(timeLimitSec),
        securityLevel,
        tagIds,
      });
      if (selectedPart && partDraft && (selectedPart.skill ?? "") !== partDraft.skill) {
        next = await authoringApi.updatePart(q.versionId, selectedPart.id, { skill: partDraft.skill });
      }
      setQ(next);
      notify.success("Kaydedildi");
    } catch (e) {
      const message = errorMessage(e, "Kaydedilemedi");
      setError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function saveBody() {
    if (!q) return;
    setSaving(true);
    try {
      const existing = q.body || {};
      const body = {
        // Canonical wire is a plain string; backend also accepts {html}.
        instruction: htmlOf(instruction),
        instructionAudio: instructionAudioId
          ? {
              mediaId: instructionAudioId,
              playback: { maxPlays: null, autoplay: false, seekable: true },
            }
          : existing.instructionAudio ?? null,
        mainAudio: mainAudioId
          ? {
              type: "AUDIO",
              id: existing.mainAudio?.id ?? "main_audio",
              mediaId: mainAudioId,
              playback: mainPlayback,
            }
          : existing.mainAudio ?? null,
        stimulus: contentBlocksToWire(stimulus),
      };
      const next = await authoringApi.updateBody(q.versionId, body);
      setQ(next);
      notify.success("Kaydedildi");
    } catch (e) {
      const message = errorMessage(e, "Kaydedilemedi");
      setError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function savePart() {
    if (!q || !selectedPart || !partDraft) return;
    setSaving(true);
    try {
      const next = await authoringApi.updatePart(q.versionId, selectedPart.id, {
        content: {
          stem: contentBlocksToWire(partDraft.stem),
          interaction: { ...partDraft.interaction, type: selectedPart.interactionType },
        },
        skill: partDraft.skill,
        maxScore: Number(partDraft.maxScore || 1),
        difficulty: partDraft.difficulty === "" ? null : Number(partDraft.difficulty),
        scoringMode: partDraft.scoringMode,
        outcomeIds: partDraft.outcomeIds,
        rubricVersionId: partDraft.rubricVersionId || null,
        answerKey: partDraft.answerKey,
      });
      setQ(next);
      notify.success("Kaydedildi");
    } catch (e) {
      const message = errorMessage(e, "Part kaydedilemedi");
      setError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function changeType(type: string) {
    if (!q || !selectedPart) return;
    if (!confirm("Tip değişince part içeriği sıfırlanır. Devam?")) return;
    setSaving(true);
    try {
      await authoringApi.removePart(q.versionId, selectedPart.id).catch(() => null);
      const next = await authoringApi.addPart(q.versionId, {
        interactionType: type,
        skill: getTemplate(type)?.defaultSkill,
      });
      // if remove failed because last part, just create new and keep old — better: create then remove
      setQ(next);
      setSelectedPartId(next.parts[next.parts.length - 1]?.id ?? null);
      notify.success("Tip değiştirildi");
    } catch (e) {
      // fallback: add new part with type
      try {
        const next = await authoringApi.addPart(q.versionId, {
          interactionType: type,
          skill: getTemplate(type)?.defaultSkill,
        });
        setQ(next);
        setSelectedPartId(next.parts[next.parts.length - 1]?.id ?? null);
        notify.success("Tip değiştirildi");
      } catch (err) {
        const message = errorMessage(err, "Tip değiştirilemedi");
        setError(message);
        notify.error(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function runValidate(publish = false) {
    if (!q) return;
    try {
      const v = await authoringApi.validateQuestion(q.versionId, publish);
      setViolations(v);
      if (v.length === 0) notify.success(publish ? "Yayına hazır" : "Eksik yok");
      else notify.error(publish ? `Yayın için ${v.length} eksik var` : `${v.length} eksik var`);
    } catch (e) {
      notify.error(errorMessage(e, "Doğrulama başarısız"));
    }
  }

  async function loadSide() {
    if (!q) return;
    const [imp, hist, en] = await Promise.all([
      authoringApi.impact(q.questionId).catch(() => null),
      authoringApi.history(q.questionId).catch(() => []),
      authoringApi.enemies(q.questionId).catch(() => []),
    ]);
    if (imp) setImpact(`${imp.examCount} sınav (${imp.publishedExamCount} yayınlı)`);
    setHistory(hist);
    setEnemies(en);
  }

  useEffect(() => {
    if (openPanel === 6 && q) void loadSide();
  }, [openPanel, q?.questionId]);

  if (!tenant) {
    return <p className="text-sm text-fg-muted">Kurum seçin.</p>;
  }
  if (!q) {
    return error ? <p className="text-sm text-danger">{error}</p> : <p className="text-sm text-fg-muted">Yükleniyor…</p>;
  }

  const rubricOptions = rubrics
    .filter((r) => r.currentVersionId && (!partDraft?.skill || !r.skill || r.skill === partDraft.skill))
    .map((r) => ({ id: r.currentVersionId as string, label: `${r.name} · ${r.skill ?? ""}` }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={q.code}
        description={`v${q.versionNo} · ${selectedPart?.interactionType ?? ""}`}
        back={{ href: basePath, label: "Soru bankası" }}
        actions={<StatusBadge status={q.status} />}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {PANELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setOpenPanel(i)}
            className={`rounded-full px-3 py-1 text-sm ${
              openPanel === i ? "bg-primary text-white" : "bg-bg text-fg-muted"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {openPanel === 0 ? (
          <FormCard title="Soru tipi">
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATE_REGISTRY.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  disabled={!editable}
                  onClick={() => void changeType(t.type)}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    selectedPart?.interactionType === t.type ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-fg-muted">{t.hint}</p>
                </button>
              ))}
            </div>
          </FormCard>
        ) : null}

          {openPanel === 1 ? (
            <FormCard title="Sınıflandırma">
              <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-6">
                <Field label="CEFR">
                  <Select value={cefr} disabled={!editable} onChange={(e) => setCefr(e.target.value)}>
                    <option value="">—</option>
                    {CEFR.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Beceri"
                >
                  <Select
                    value={partDraft?.skill ?? ""}
                    disabled={!editable || !partDraft}
                    onChange={(e) =>
                      setPartDraft((prev) => (prev ? { ...prev, skill: e.target.value } : prev))
                    }
                  >
                    {SKILLS.map((s) => (
                      <option key={s} value={s}>{SKILL_LABEL[s]}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="MEB sınıf">
                  <Select value={mebGrade} disabled={!editable} onChange={(e) => setMebGrade(e.target.value)}>
                    <option value="">—</option>
                    {MEB_GRADES.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Yaş bandı">
                  <Select value={ageBand} disabled={!editable} onChange={(e) => setAgeBand(e.target.value)}>
                    <option value="">—</option>
                    {ageBands.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Güvenlik">
                  <Select value={securityLevel} disabled={!editable} onChange={(e) => setSecurityLevel(e.target.value)}>
                    <option value="STANDARD">STANDARD</option>
                    <option value="SECURE">SECURE</option>
                    <option value="HIGH_STAKES">HIGH_STAKES</option>
                  </Select>
                </Field>
                <Field label="Tahmini süre (sn)">
                  <Input type="number" value={estimatedTimeSec} disabled={!editable} onChange={(e) => setEstimatedTimeSec(e.target.value)} />
                </Field>
                <Field label="Süre limiti (sn)">
                  <Input type="number" value={timeLimitSec} disabled={!editable} onChange={(e) => setTimeLimitSec(e.target.value)} />
                </Field>
              </div>
              <Field label="Etiketler">
                <MultiPicker
                  label="Etiketler"
                  layout="chips"
                  collapsible
                  options={tags.map((t) => ({ value: t.id, label: t.name }))}
                  value={tagIds}
                  onChange={setTagIds}
                />
              </Field>
              <Button disabled={!editable || saving} onClick={() => void saveMetadata()}>
                Sınıflandırmayı kaydet
              </Button>
            </FormCard>
          ) : null}

          {openPanel === 2 ? (
            <FormCard title="Uyaran (QuestionBody)">
              <BlockHtmlField label="Yönerge" value={instruction} onChange={setInstruction} disabled={!editable} />
              <div className="grid items-start gap-4 md:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <MediaPicker
                    kind="AUDIO"
                    label="Yönerge sesi"
                    value={instructionAudioId}
                    onChange={(id) => {
                      setInstructionAudioId(id);
                      if (id) {
                        setInstructionPlayback({ maxPlays: null, autoplay: false, seekable: true });
                      }
                    }}
                    disabled={!editable}
                  />
                  {instructionAudioId ? (
                    <p className="text-xs text-fg-muted">Yönerge sesi sınırsız dinlenebilir; oynatma limiti yok.</p>
                  ) : null}
                </div>
                <div className="min-w-0 space-y-2">
                  <MediaPicker kind="AUDIO" label="Ana dinleme sesi" value={mainAudioId} onChange={setMainAudioId} disabled={!editable} />
                  {mainAudioId ? (
                    <PlaybackPolicyFields value={mainPlayback} onChange={setMainPlayback} disabled={!editable} />
                  ) : null}
                </div>
              </div>
              <ContentBlockList value={stimulus} onChange={setStimulus} disabled={!editable} title="Stimulus" />
              <Button disabled={!editable || saving} onClick={() => void saveBody()}>
                Uyaranı kaydet
              </Button>
            </FormCard>
          ) : null}

          {openPanel === 3 || openPanel === 4 || openPanel === 5 ? (
            <FormCard title={openPanel === 3 ? "İçerik" : openPanel === 4 ? "Cevap / puan" : "Gerekçe"}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {q.parts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPartId(p.id)}
                    className={`rounded-lg px-2 py-1 text-xs ${
                      selectedPart?.id === p.id ? "bg-primary text-white" : "bg-bg"
                    }`}
                  >
                    Part {p.position + 1}: {p.interactionType}
                  </button>
                ))}
                <div className="relative">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!editable || saving}
                    onClick={() => setAddingPart((open) => !open)}
                  >
                    Part ekle
                  </Button>
                  {addingPart ? (
                    <div className="absolute left-0 top-full z-20 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-border bg-surface p-2 shadow-lg sm:w-80">
                      <p className="mb-2 px-1 text-xs font-medium text-fg-muted">
                        Yeni part tipi seçin — tipler karışabilir
                      </p>
                      <div className="grid max-h-72 gap-1 overflow-auto">
                        {TEMPLATE_REGISTRY.map((t) => (
                          <button
                            key={t.type}
                            type="button"
                            disabled={saving}
                            className="min-h-11 rounded-lg px-3 py-2 text-left transition hover:bg-bg"
                            onClick={() => {
                              setSaving(true);
                              setError(null);
                              void notify
                                .run(
                                  authoringApi.addPart(q.versionId, {
                                    interactionType: t.type,
                                    skill: t.defaultSkill,
                                  }),
                                  { success: "Part eklendi", error: "Part eklenemedi" },
                                )
                                .then((next) => {
                                  setQ(next);
                                  setSelectedPartId(next.parts[next.parts.length - 1]?.id ?? null);
                                  setAddingPart(false);
                                })
                                .catch((e) => setError(errorMessage(e, "Part eklenemedi")))
                                .finally(() => setSaving(false));
                            }}
                          >
                            <span className="block text-sm font-medium text-fg">{t.label}</span>
                            <span className="block text-xs text-fg-muted">{t.hint}</span>
                          </button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-1 w-full"
                        onClick={() => setAddingPart(false)}
                      >
                        İptal
                      </Button>
                    </div>
                  ) : null}
                </div>
                {selectedPart && q.parts.length > 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!editable}
                    onClick={() =>
                      void notify
                        .run(authoringApi.removePart(q.versionId, selectedPart.id), {
                          success: "Part silindi",
                          error: "Part silinemedi",
                        })
                        .then((next) => {
                          setQ(next);
                          setSelectedPartId(next.parts[0]?.id ?? null);
                        })
                        .catch(() => undefined)
                    }
                  >
                    Part sil
                  </Button>
                ) : null}
                {selectedPart ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!editable}
                      onClick={() =>
                        void notify
                          .run(
                            authoringApi.movePart(
                              q.versionId,
                              selectedPart.id,
                              Math.max(0, selectedPart.position - 1),
                            ),
                            { error: "Sıralama güncellenemedi" },
                          )
                          .then(setQ)
                          .catch(() => undefined)
                      }
                    >
                      ←
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!editable}
                      onClick={() =>
                        void notify
                          .run(
                            authoringApi.movePart(
                              q.versionId,
                              selectedPart.id,
                              selectedPart.position + 1,
                            ),
                            { error: "Sıralama güncellenemedi" },
                          )
                          .then(setQ)
                          .catch(() => undefined)
                      }
                    >
                      →
                    </Button>
                  </>
                ) : null}
              </div>

              {partDraft && selectedPart ? (
                <div className="space-y-4">
                  {openPanel === 3 ? (
                    <>
                      <ContentBlockList
                        value={partDraft.stem}
                        onChange={(stem) => setPartDraft({ ...partDraft, stem })}
                        disabled={!editable}
                        title="Stem"
                      />
                      <InteractionForm
                        type={selectedPart.interactionType}
                        value={partDraft.interaction}
                        onChange={(interaction) =>
                          setPartDraft((prev) =>
                            prev
                              ? { ...prev, interaction: interaction as Record<string, unknown> }
                              : prev,
                          )
                        }
                        answerKey={partDraft.answerKey}
                        onAnswerKeyChange={(answerKey) =>
                          setPartDraft((prev) =>
                            prev
                              ? { ...prev, answerKey: answerKey as Record<string, unknown> }
                              : prev,
                          )
                        }
                        disabled={!editable}
                      />
                    </>
                  ) : null}
                  {openPanel === 4 ? (
                    <>
                      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-4">
                        <Field label="Beceri">
                          <Select
                            value={partDraft.skill}
                            disabled={!editable}
                            onChange={(e) => setPartDraft({ ...partDraft, skill: e.target.value })}
                          >
                            {SKILLS.map((s) => (
                              <option key={s} value={s}>{SKILL_LABEL[s]}</option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Max puan">
                          <Input
                            type="number"
                            value={partDraft.maxScore}
                            disabled={!editable}
                            onChange={(e) => setPartDraft({ ...partDraft, maxScore: e.target.value })}
                          />
                        </Field>
                        <Field label="Zorluk (1–5)">
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={partDraft.difficulty}
                            disabled={!editable}
                            onChange={(e) => setPartDraft({ ...partDraft, difficulty: e.target.value })}
                          />
                        </Field>
                        <Field label="Skorlama">
                          <Select
                            value={partDraft.scoringMode}
                            disabled={!editable}
                            onChange={(e) => setPartDraft({ ...partDraft, scoringMode: e.target.value })}
                          >
                            {(template?.scoringModes ?? ["ALL_OR_NOTHING"]).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                      <Field label="Öğrenme çıktıları">
                        <MultiPicker
                          label="Öğrenme çıktıları"
                          options={outcomes.map((o) => ({ value: o.id, label: `${o.code} — ${o.description}` }))}
                          value={partDraft.outcomeIds}
                          onChange={(outcomeIds) => setPartDraft({ ...partDraft, outcomeIds })}
                        />
                      </Field>
                      {template?.requiresRubric ? (
                        <Field
                          label="Rubrik grubu"
                          hint="Part becerisiyle aynı onaylı grup (/100). Listening için şablon Sesli cevap olsun; kayıt AI'ya gider."
                        >
                          <Select
                            value={partDraft.rubricVersionId}
                            disabled={!editable}
                            onChange={(e) => setPartDraft({ ...partDraft, rubricVersionId: e.target.value })}
                          >
                            <option value="">—</option>
                            {rubricOptions.map((r) => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                          </Select>
                        </Field>
                      ) : null}
                      <AnswerKeyForm
                        type={selectedPart.interactionType}
                        interaction={partDraft.interaction}
                        value={partDraft.answerKey}
                        onChange={(answerKey) =>
                          setPartDraft({ ...partDraft, answerKey: answerKey as Record<string, unknown> })
                        }
                        disabled={!editable}
                      />
                    </>
                  ) : null}
                  {openPanel === 5 ? (
                    template?.autoGradable ? (
                      <p className="rounded-lg border border-dashed border-border bg-bg/40 px-3 py-2 text-sm text-fg-muted">
                        Bu şablon otomatik puanlanır. Örnek cevap ve değerlendirici notu gerekmez.
                      </p>
                    ) : (
                      <AnswerKeyForm
                        type={selectedPart.interactionType}
                        interaction={partDraft.interaction}
                        value={partDraft.answerKey}
                        onChange={(answerKey) =>
                          setPartDraft({ ...partDraft, answerKey: answerKey as Record<string, unknown> })
                        }
                        disabled={!editable}
                      />
                    )
                  ) : null}
                  <Button disabled={!editable || saving} onClick={() => void savePart()}>
                    Part kaydet
                  </Button>
                </div>
              ) : null}
            </FormCard>
          ) : null}

          {openPanel === 6 ? (
            <FormCard title="Kaydet / İnceleme">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void runValidate(false)}>Doğrula</Button>
                <Button variant="secondary" onClick={() => void runValidate(true)}>Yayın doğrula</Button>
                <Button
                  disabled={!editable}
                  onClick={() =>
                    void notify
                      .run(authoringApi.submitQuestion(q.versionId), {
                        success: "İncelemeye gönderildi",
                        error: "Gönderilemedi",
                      })
                      .then(setQ)
                      .catch(() => undefined)
                  }
                >
                  İncelemeye gönder
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void notify
                      .run(authoringApi.approveQuestion(q.versionId), {
                        success: "Onaylandı",
                        error: "Onaylanamadı",
                      })
                      .then(setQ)
                      .catch(() => undefined)
                  }
                >
                  Onayla
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void notify
                      .run(authoringApi.returnDraft(q.versionId), {
                        success: "Taslağa döndürüldü",
                        error: "İşlem başarısız",
                      })
                      .then(setQ)
                      .catch(() => undefined)
                  }
                >
                  Taslağa döndür
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void notify
                      .run(authoringApi.cloneQuestion(q.questionId), {
                        success: "Klonlandı",
                        error: "Klonlanamadı",
                      })
                      .then((n) => {
                        window.location.href = `${basePath}/${n.versionId}`;
                      })
                      .catch(() => undefined)
                  }
                >
                  Klonla
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void notify
                      .run(authoringApi.newVersion(q.questionId), {
                        success: "Yeni sürüm oluşturuldu",
                        error: "Sürüm oluşturulamadı",
                      })
                      .then((n) => {
                        window.location.href = `${basePath}/${n.versionId}`;
                      })
                      .catch(() => undefined)
                  }
                >
                  Yeni sürüm
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    void notify
                      .run(authoringApi.archiveQuestion(q.questionId), {
                        success: "Arşivlendi",
                        error: "Arşivlenemedi",
                      })
                      .then(() => {
                        window.location.href = basePath;
                      })
                      .catch(() => undefined)
                  }
                >
                  Arşivle
                </Button>
              </div>
              <div className="mt-3 grid items-start gap-3 md:grid-cols-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium text-fg-muted">Eksikler{impact ? ` · Etki: ${impact}` : ""}</p>
                  {violations.length ? (
                    <ul className="max-h-72 space-y-2 overflow-y-auto">
                      {violations.map((v, i) => {
                        const view = describeQuestionViolation(v, q.parts);
                        return (
                          <li key={`${v.path}-${i}`}>
                            <button
                              type="button"
                              className="flex min-h-11 w-full flex-col items-start justify-center rounded-lg bg-bg px-3 py-2 text-left"
                              onClick={() => {
                                const focus = focusForViolation(v.path);
                                if (focus.partIndex != null) {
                                  const part = q.parts[focus.partIndex];
                                  if (part) setSelectedPartId(part.id);
                                }
                                setOpenPanel(focus.panel);
                              }}
                            >
                              <span className="text-xs font-medium text-fg">{view.where}</span>
                              <span className="mt-0.5 text-sm leading-snug text-danger">{view.text}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-fg-muted">Son kontrolde eksik yok.</p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-fg-muted">Geçmiş</p>
                  <p className="text-xs leading-relaxed text-fg-muted">
                    {history.length
                      ? history.map((h) => `${h.action}: ${h.summary}`).join(" · ")
                      : "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-fg-muted">Düşman sorular</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Input
                      className="min-w-[8rem] flex-1"
                      value={enemyInput}
                      onChange={(e) => setEnemyInput(e.target.value)}
                      placeholder="questionId"
                    />
                    <Button
                      size="sm"
                      disabled={!editable}
                      onClick={() =>
                        void notify
                          .run(authoringApi.addEnemy(q.questionId, enemyInput), {
                            success: "Düşman eklendi",
                            error: "Eklenemedi",
                          })
                          .then(() => {
                            setEnemyInput("");
                            return loadSide();
                          })
                          .catch(() => undefined)
                      }
                    >
                      Ekle
                    </Button>
                    {enemies.map((id) => (
                      <span key={id} className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-bg px-2 text-xs">
                        <code className="max-w-40 truncate">{id}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void notify
                              .run(authoringApi.removeEnemy(q.questionId, id), {
                                success: "Düşman silindi",
                                error: "Silinemedi",
                              })
                              .then(loadSide)
                              .catch(() => undefined)
                          }
                        >
                          Sil
                        </Button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </FormCard>
          ) : null}

        <QuestionPreviewShell
          model={previewModel}
          rubricParts={previewRubricParts}
          rubricCatalog={rubrics}
        />
      </div>
    </div>
  );
}
