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
import { PlaybackPolicyFields, withShownPlayback, type PlaybackPolicy } from "@/src/features/authoring/blocks/PlaybackPolicyFields";
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
import { FormGroup } from "@/src/features/authoring/shared/FormGroup";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { useContentBasePath } from "@/src/features/panel/PanelContext";
import {
  QuestionPreviewShell,
  type ContentBlock as PlayerContentBlock,
  type QuestionViewModel,
} from "@/src/features/exam-player";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FormCard,
  Input,
  MultiPicker,
  PageHeader,
  Select,
  Skeleton,
  SkeletonStatus,
  errorMessage,
  notify,
  IconChevronLeft,
  IconChevronRight,
} from "@/src/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SKILLS: Skill[] = [
  "READING",
  "LISTENING",
  "WRITING",
  "SPEAKING",
  "GRAMMAR",
  "VOCABULARY",
  "USE_OF_ENGLISH",
];

export const SKILL_LABEL: Record<Skill, string> = {
  READING: "Okuma",
  LISTENING: "Dinleme",
  WRITING: "Yazma",
  SPEAKING: "Konuşma",
  GRAMMAR: "Dilbilgisi",
  VOCABULARY: "Kelime",
  USE_OF_ENGLISH: "Use of English",
};

const CEFR = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

const SCORING_LABEL: Record<string, string> = {
  ALL_OR_NOTHING: "Tam puan / sıfır",
  PARTIAL: "Kısmi puan",
  PARTIAL_WITH_PENALTY: "Kısmi puan (yanlış cezalı)",
  RUBRIC: "Rubrikle",
};


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

export function QuestionTypePicker() {
  const basePath = useContentBasePath("questions");
  const router = useRouter();
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
      router.push(`${basePath}/${q.versionId}`);
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

export function QuestionEditorPage({ versionId }: { versionId: string }) {
  const basePath = useContentBasePath("questions");
  const router = useRouter();
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
  const [confirm, setConfirm] = useState<null | "revert" | "unpublish" | "republish" | "archive">(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [addingPart, setAddingPart] = useState(false);

  const [cefr, setCefr] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [questionCode, setQuestionCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const questionCodeRef = useRef("");
  const codeCheckGen = useRef(0);
  const [classErrors, setClassErrors] = useState<{ cefr?: string; skill?: string; ageBand?: string }>({});
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
      setQuestionCode(data.code ?? "");
      questionCodeRef.current = data.code ?? "";
      setCodeError(undefined);
      setCefr(data.cefrLevel ?? "");
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

  function advancePanel() {
    setOpenPanel((current) => Math.min(current + 1, PANELS.length - 1));
  }

  async function evaluateQuestionCode(value: string, savedCode: string, questionId: string): Promise<string | null> {
    const trimmed = value.trim();
    if (!trimmed) return "Soru kodu girin.";
    if (trimmed.length > 32) return "Soru kodu en fazla 32 karakter olabilir.";
    if (trimmed.toLowerCase() === savedCode.trim().toLowerCase()) return null;
    try {
      const result = await authoringApi.questionCodeAvailable(questionId, trimmed);
      return result.available ? null : "Bu kod kullanılıyor.";
    } catch {
      return "Kod kontrol edilemedi. Tekrar deneyin.";
    }
  }

  async function publishCodeCheck(): Promise<string | null> {
    if (!q) return "Soru kodu girin.";
    const gen = ++codeCheckGen.current;
    let snapshot = questionCodeRef.current;
    let problem = await evaluateQuestionCode(snapshot, q.code, q.questionId);
    while (questionCodeRef.current !== snapshot) {
      snapshot = questionCodeRef.current;
      problem = await evaluateQuestionCode(snapshot, q.code, q.questionId);
    }
    if (gen === codeCheckGen.current) {
      setCodeError(problem ?? undefined);
    }
    return problem;
  }

  async function saveMetadata() {
    if (!q) return;
    const nextErrors: { cefr?: string; skill?: string; ageBand?: string } = {};
    if (!cefr) nextErrors.cefr = "CEFR seviyesi seçin.";
    if (!partDraft?.skill) nextErrors.skill = "Beceri seçin.";
    if (!ageBand) nextErrors.ageBand = "Yaş bandı seçin.";
    setClassErrors(nextErrors);
    const codeProblem = await publishCodeCheck();
    if (Object.keys(nextErrors).length > 0 || codeProblem) return;
    const codeToSave = questionCodeRef.current.trim();
    setSaving(true);
    try {
      if (selectedPart && partDraft && (selectedPart.skill ?? "") !== partDraft.skill) {
        await authoringApi.updatePart(q.versionId, selectedPart.id, { skill: partDraft.skill });
      }
      const next = await authoringApi.updateMetadata(q.versionId, {
        cefrLevel: cefr,
        mebGrade: null,
        ageBand,
        estimatedTimeSec: estimatedTimeSec === "" ? null : Number(estimatedTimeSec),
        timeLimitSec: timeLimitSec === "" ? null : Number(timeLimitSec),
        securityLevel,
        tagIds,
        code: codeToSave,
      });
      setQuestionCode(next.code);
      questionCodeRef.current = next.code;
      setQ(next);
      notify.success("Kaydedildi");
      advancePanel();
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
      advancePanel();
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
          interaction: withShownPlayback({ ...partDraft.interaction, type: selectedPart.interactionType }),
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
      advancePanel();
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
    if (!globalThis.confirm("Tip değişince part içeriği sıfırlanır. Devam?")) return;
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
    return <EmptyState title="İçerik kiracısı seçilmedi" description="Soruyu düzenlemek için önce kurum / içerik kiracısı seçilmelidir." />;
  }
  if (!q) {
    return error ? (
      <ErrorState title="Soru açılamadı" message={error} compact />
    ) : (
      <div className="grid gap-4" aria-busy="true">
        <SkeletonStatus label="Soru yükleniyor" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const rubricOptions = rubrics
    .filter((r) => r.currentVersionId && (!partDraft?.skill || !r.skill || r.skill === partDraft.skill))
    .map((r) => ({ id: r.currentVersionId as string, label: `${r.name} · ${r.skill ?? ""}` }));

  return (
    <div className="@container space-y-4">
      <PageHeader
        title={q.code}
        description={`Sürüm ${q.versionNo} · ${q.parts.length} part · ${template?.label ?? selectedPart?.interactionType ?? "Tip seçilmedi"}`}
        back={{ href: basePath, label: "Soru bankası" }}
        actions={
          <span className="flex items-center gap-2">
            {!editable ? <span className="text-xs text-fg-subtle">Salt okunur</span> : null}
            <StatusBadge status={q.status} />
          </span>
        }
      />
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <nav aria-label="Soru düzenleme adımları" className="scrollbar-none overflow-x-auto rounded-xl border border-border bg-surface p-1.5 shadow-sm">
        <ol className="flex min-w-max gap-1">
          {PANELS.map((label, i) => {
            const active = openPanel === i;
            return (
              <li key={label}>
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => setOpenPanel(i)}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                    active ? "bg-primary-50 text-primary ring-1 ring-primary-200" : "text-fg-muted hover:bg-neutral-50 hover:text-fg"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                      active ? "bg-primary text-white" : "bg-neutral-100 text-fg-subtle"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid items-start gap-6 @min-[60rem]:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)] @min-[90rem]:grid-cols-[minmax(0,1fr)_minmax(26rem,38rem)]">
      <div className="@container/form min-w-0 space-y-6">
        {openPanel === 0 ? (
          <FormCard title="Soru tipi" description="Seçili part'ın etkileşim tipi. Tip değişirse part içeriği sıfırlanır.">
            <div className="grid gap-2.5 @min-[28rem]/form:grid-cols-2 @min-[52rem]/form:grid-cols-3">
              {TEMPLATE_REGISTRY.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  disabled={!editable}
                  onClick={() => void changeType(t.type)}
                  aria-pressed={selectedPart?.interactionType === t.type}
                  className={`relative rounded-lg border p-3 pr-9 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    selectedPart?.interactionType === t.type
                      ? "border-primary bg-primary-50/60 ring-1 ring-primary-200"
                      : "border-border hover:border-border-strong hover:bg-neutral-50"
                  }`}
                >
                  <p className="font-medium text-fg">{t.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{t.hint}</p>
                  <span className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-fg-subtle">
                      {t.autoGradable ? "Otomatik puan" : "Elle değerlendirme"}
                    </span>
                    {t.requiresRubric ? (
                      <span className="rounded bg-(--accent-plum-bg) px-1.5 py-0.5 text-[11px] text-(--accent-plum)">Rubrik</span>
                    ) : null}
                  </span>
                  {selectedPart?.interactionType === t.type ? (
                    <span aria-hidden className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-white">
                      ✓
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </FormCard>
        ) : null}

          {openPanel === 1 ? (
            <FormCard
              title="Sınıflandırma"
              description="Soru bankasında arama, filtre ve sınav eşleştirmesi bu alanlarla yapılır."
              footer={
                <Button
                  disabled={!editable || saving || Boolean(codeError)}
                  loading={saving}
                  onClick={() => void saveMetadata()}
                >
                  Sınıflandırmayı kaydet
                </Button>
              }
            >
              <FormGroup title="Soru kodu" hint="Yeni soruda önerilen kod gelir. Değiştirmezseniz bu kalır.">
                <div className="max-w-sm">
                  <Field label="Kod" required error={codeError}>
                    <Input
                      value={questionCode}
                      disabled={!editable}
                      maxLength={32}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="font-mono"
                      onChange={(e) => {
                        questionCodeRef.current = e.target.value;
                        setQuestionCode(e.target.value);
                        setCodeError(undefined);
                      }}
                      onBlur={() => {
                        if (!editable) return;
                        void publishCodeCheck();
                      }}
                    />
                  </Field>
                </div>
              </FormGroup>
              <FormGroup title="Seviye ve beceri">
              <div className="grid gap-3 @min-[28rem]/form:grid-cols-2 @min-[46rem]/form:grid-cols-4">
                <Field label="CEFR seviyesi" required error={classErrors.cefr}>
                  <Select value={cefr} disabled={!editable} onChange={(e) => { setCefr(e.target.value); setClassErrors((prev) => ({ ...prev, cefr: undefined })); }}>
                    <option value="">—</option>
                    {CEFR.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Beceri" required error={classErrors.skill}>
                  <Select
                    value={partDraft?.skill ?? ""}
                    disabled={!editable || !partDraft}
                    onChange={(e) => {
                      setClassErrors((prev) => ({ ...prev, skill: undefined }));
                      setPartDraft((prev) => (prev ? { ...prev, skill: e.target.value } : prev));
                    }}
                  >
                    <option value="">—</option>
                    {SKILLS.map((s) => (
                      <option key={s} value={s}>{SKILL_LABEL[s]}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Yaş bandı" required error={classErrors.ageBand}>
                  <Select value={ageBand} disabled={!editable} onChange={(e) => { setAgeBand(e.target.value); setClassErrors((prev) => ({ ...prev, ageBand: undefined })); }}>
                    <option value="">—</option>
                    {ageBands.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              </FormGroup>
              <FormGroup title="Süre" hint="Süreler saniye cinsindendir; boş bırakılırsa sınav ayarı geçerlidir.">
              <div className="grid gap-3 @min-[28rem]/form:grid-cols-2">
                <Field label="Tahmini süre">
                  <Input suffix="sn" type="number" min={0} inputMode="numeric" placeholder="ör. 60" value={estimatedTimeSec} disabled={!editable} onChange={(e) => setEstimatedTimeSec(e.target.value)} />
                </Field>
                <Field label="Süre limiti">
                  <Input suffix="sn" type="number" min={0} inputMode="numeric" placeholder="Sınırsız" value={timeLimitSec} disabled={!editable} onChange={(e) => setTimeLimitSec(e.target.value)} />
                </Field>
              </div>
              </FormGroup>
              <FormGroup title="Etiketler" hint="Konu, kazanım veya kaynak etiketleri; soru bankasında filtre olarak kullanılır.">
                <MultiPicker
                  label="Etiket"
                  layout="chips"
                  collapsible
                  searchPlaceholder="Etiket ara"
                  emptyText="Henüz etiket seçilmedi."
                  options={tags.map((t) => ({ value: t.id, label: t.name }))}
                  value={tagIds}
                  onChange={setTagIds}
                />
              </FormGroup>
            </FormCard>
          ) : null}

          {openPanel === 2 ? (
            <FormCard
              title="Uyaran"
              description="Tüm part'lar için ortak yönerge, ses ve okuma metni."
              footer={
                <Button disabled={!editable || saving} loading={saving} onClick={() => void saveBody()}>
                  Uyaranı kaydet
                </Button>
              }
            >
              <BlockHtmlField label="Yönerge" value={instruction} onChange={setInstruction} disabled={!editable} />
              <div className="grid items-start gap-4 @min-[36rem]/form:grid-cols-2">
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
              <ContentBlockList value={stimulus} onChange={setStimulus} disabled={!editable} title="Okuma / görsel içerik" />
            </FormCard>
          ) : null}

          {openPanel === 3 || openPanel === 4 || openPanel === 5 ? (
            <FormCard
              title={openPanel === 3 ? "İçerik" : openPanel === 4 ? "Cevap ve puanlama" : "Gerekçe"}
              description={selectedPart ? `Part ${selectedPart.position + 1} · ${getTemplate(selectedPart.interactionType)?.label ?? selectedPart.interactionType}` : undefined}
              footer={
                partDraft && selectedPart ? (
                  <Button disabled={!editable || saving} loading={saving} onClick={() => void savePart()}>
                    {"Part'ı kaydet"}
                  </Button>
                ) : undefined
              }
            >
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 p-1.5 ring-1 ring-border ring-inset">
                <div role="tablist" aria-label="Part'lar" className="flex flex-wrap gap-1">
                {q.parts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedPart?.id === p.id}
                    onClick={() => setSelectedPartId(p.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                      selectedPart?.id === p.id ? "bg-surface text-primary shadow-sm ring-1 ring-primary-200" : "text-fg-muted hover:bg-surface hover:text-fg"
                    }`}
                  >
                    <span className="font-semibold tabular-nums">{p.position + 1}</span>
                    <span>{getTemplate(p.interactionType)?.label ?? p.interactionType}</span>
                  </button>
                ))}
                </div>
                <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
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
                    variant="danger"
                    disabled={!editable}
                    onClick={() =>
                      globalThis.confirm(`Part ${selectedPart.position + 1} silinsin mi? İçeriği ve cevap anahtarı kaybolur.`) &&
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
                      aria-label="Part'ı sola taşı"
                      title="Sola taşı"
                    >
                      <IconChevronLeft className="size-3.5" aria-hidden />
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
                      aria-label="Part'ı sağa taşı"
                      title="Sağa taşı"
                    >
                      <IconChevronRight className="size-3.5" aria-hidden />
                    </Button>
                  </>
                ) : null}
              </div>

              {partDraft && selectedPart ? (
                <div className="space-y-4">
                  {openPanel === 3 ? (
                    <>
                      <p className="rounded-lg bg-info-bg px-3.5 py-2.5 text-[13px] leading-relaxed text-info">
                        Bu adımda öğrencinin <strong>bu part’ta</strong> göreceği soruyu yazarsınız. Tüm part’lar için ortak okuma metni ya da dinleme sesi
                        varsa onu <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setOpenPanel(2)}>3. Uyaran</button> adımına ekleyin.
                      </p>
                      <FormGroup
                        title="1. Soru kökü"
                        hint="Öğrenciye sorulan cümle veya yönerge (ör. “Metne göre yazarın asıl amacı nedir?”). Gerekirse görsel ya da ses bloğu ekleyin."
                      >
                        <ContentBlockList
                          value={partDraft.stem}
                          onChange={(stem) => setPartDraft({ ...partDraft, stem })}
                          disabled={!editable}
                          title="Soru kökü blokları"
                        />
                      </FormGroup>
                      <FormGroup
                        title={`2. ${template?.label ?? "Etkileşim"} ayarları`}
                        hint={`${template?.hint ?? ""} Doğru cevabı burada işaretleyebilirsiniz; puanlama ayrıntıları 5. adımdadır.`.trim()}
                      >
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
                      </FormGroup>
                    </>
                  ) : null}
                  {openPanel === 4 ? (
                    <>
                      <div className="grid gap-3 @min-[28rem]/form:grid-cols-2 @min-[52rem]/form:grid-cols-4">
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
                        <Field label="Maksimum puan">
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
                              <option key={m} value={m}>{SCORING_LABEL[m] ?? m}</option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                      <FormGroup
                        title="Öğrenme çıktıları (kazanımlar)"
                        hint="Bu part'ın ölçtüğü kazanımları işaretleyin. Öğrenci karnesi ve kazanım raporları bu eşleşmeyle hesaplanır; genelde 1–3 kazanım yeterlidir."
                      >
                        <MultiPicker
                          label="Öğrenme çıktısı"
                          codeLabels
                          searchPlaceholder="Kazanım kodu veya açıklama ara"
                          emptyText="Henüz kazanım seçilmedi. Aşağıdaki listeden işaretleyin."
                          noResultText="Aramayla eşleşen kazanım yok."
                          options={outcomes.map((o) => ({ value: o.id, label: o.code, description: o.description }))}
                          value={partDraft.outcomeIds}
                          onChange={(outcomeIds) => setPartDraft({ ...partDraft, outcomeIds })}
                        />
                      </FormGroup>
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
                </div>
              ) : null}
            </FormCard>
          ) : null}

          {openPanel === 6 ? (
            <FormCard title="Kaydet ve inceleme" description="Önce doğrulayın; eksik yoksa incelemeye gönderin.">
              <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-full text-xs font-semibold text-fg-subtle sm:w-24">İş akışı</span>
                <Button variant="secondary" onClick={() => void runValidate(false)}>Eksikleri kontrol et</Button>
                <Button variant="secondary" onClick={() => void runValidate(true)}>Yayına hazır mı?</Button>
                {q.status === "DRAFT" ? (
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
                ) : null}
                {q.status === "IN_REVIEW" ? (
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
                ) : null}
                {q.status === "IN_REVIEW" || q.status === "APPROVED" ? (
                  <Button variant="ghost" onClick={() => setConfirm("revert")}>
                    Taslağa döndür
                  </Button>
                ) : null}
                {q.status === "APPROVED" ? (
                  <Button variant="secondary" onClick={() => setConfirm("unpublish")}>
                    Yayından kaldır
                  </Button>
                ) : null}
                {q.status === "RETIRED" ? (
                  <Button onClick={() => setConfirm("republish")}>
                    Tekrar yayınla
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <span className="w-full text-xs font-semibold text-fg-subtle sm:w-24">Kopya / sürüm</span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void notify
                      .run(authoringApi.cloneQuestion(q.questionId), {
                        success: "Klonlandı",
                        error: "Klonlanamadı",
                      })
                      .then((n) => {
                        router.push(`${basePath}/${n.versionId}`);
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
                        router.push(`${basePath}/${n.versionId}`);
                      })
                      .catch(() => undefined)
                  }
                >
                  Yeni sürüm
                </Button>
                <Button variant="danger" className="sm:ml-auto" onClick={() => setConfirm("archive")}>
                  Arşivle
                </Button>
              </div>
              </div>
              <div className="mt-2 grid items-start gap-5 border-t border-border pt-4 @min-[46rem]/form:grid-cols-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-[13px] font-semibold text-fg">
                    Eksikler{" "}
                    {violations.length ? <span className="rounded-full bg-danger-bg px-1.5 text-[11px] text-danger">{violations.length}</span> : null}
                  </p>
                  {impact ? <p className="text-xs text-fg-subtle">Kullanıldığı yer: {impact}</p> : null}
                  {violations.length ? (
                    <ul className="max-h-72 space-y-2 overflow-y-auto">
                      {violations.map((v, i) => {
                        const view = describeQuestionViolation(v, q.parts);
                        return (
                          <li key={`${v.path}-${i}`}>
                            <button
                              type="button"
                              className="flex min-h-11 w-full flex-col items-start justify-center rounded-lg border border-danger/15 bg-danger-bg/50 px-3 py-2 text-left transition-colors hover:border-danger/40"
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
                    <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">Son kontrolde eksik yok.</p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-fg">Geçmiş</p>
                  {history.length ? (
                    <ol className="mt-2 grid max-h-72 gap-2 overflow-y-auto border-l-2 border-border pl-3">
                      {history.map((h, i) => (
                        <li key={i} className="text-xs leading-relaxed">
                          <span className="font-semibold text-fg">{h.action}</span>
                          <span className="block text-fg-muted">{h.summary}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1 text-xs text-fg-subtle">Kayıt yok.</p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-fg">Düşman sorular</p>
                  <p className="text-xs text-fg-subtle">Aynı sınavda birlikte çıkmaması gereken sorular.</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Input
                      className="min-w-[8rem] flex-1"
                      value={enemyInput}
                      onChange={(e) => setEnemyInput(e.target.value)}
                      placeholder="Soru kimliği (UUID)"
                      aria-label="Düşman soru kimliği"
                    />
                    <Button
                      size="sm"
                      disabled={!editable || !enemyInput.trim()}
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

      </div>
      <ConfirmDialog
        open={confirm != null}
        pending={confirming}
        tone={confirm === "republish" ? "primary" : "danger"}
        title={
          confirm === "unpublish"
            ? "Yayından kaldırılsın mı?"
            : confirm === "republish"
              ? "Tekrar yayınlansın mı?"
              : confirm === "archive"
                ? "Soru arşivlensin mi?"
                : "Taslağa dönülsün mü?"
        }
        description={
          confirm === "unpublish"
            ? "Sürüm yeni sınavlara eklenemez. Yayınlanmış sınavlar bu sürümü kullanmaya devam eder. İstediğinizde tekrar yayınlayabilirsiniz."
            : confirm === "republish"
              ? "Sürüm yeniden onaylı olur ve soru bankasında güncel sürüm olarak görünür."
              : confirm === "archive"
                ? "Arşivlenen soru yeni sınavlara eklenemez. Onaylı sürümü varsa yayından da kalkar."
                : "Sürüm bir sınavda kullanılmıyorsa yerinde taslağa döner. Kullanılıyorsa onaylı sürüm durur ve düzenlemek için yeni bir taslak açılır."
        }
        confirmLabel={
          confirm === "unpublish"
            ? "Yayından kaldır"
            : confirm === "republish"
              ? "Tekrar yayınla"
              : confirm === "archive"
                ? "Arşivle"
                : "Taslağa döndür"
        }
        onClose={() => {
          if (!confirming) setConfirm(null);
        }}
        onConfirm={() => {
          if (!q || !confirm) return;
          const action = confirm;
          setConfirming(true);
          const done = (message: string, next?: QuestionDetail) => {
            notify.success(message);
            setConfirm(null);
            if (next && next.versionId !== q.versionId) {
              router.push(`${basePath}/${next.versionId}`);
              return;
            }
            if (next) setQ(next);
            if (action === "archive") router.push(basePath);
          };
          const fail = (e: unknown) => notify.error(errorMessage(e, "İşlem başarısız"));
          const request =
            action === "unpublish"
              ? authoringApi.unpublishQuestion(q.versionId)
              : action === "republish"
                ? authoringApi.republishQuestion(q.versionId)
                : action === "archive"
                  ? authoringApi.archiveQuestion(q.questionId).then(() => undefined)
                  : authoringApi.returnDraft(q.versionId);
          void request
            .then((next) => {
              if (action === "archive") done("Arşivlendi");
              else if (action === "unpublish") done("Yayından kaldırıldı", next);
              else if (action === "republish") done("Tekrar yayınlandı", next);
              else if (next && next.versionId !== q.versionId) done("Soru sınavlarda kullanıldığı için yeni taslak açıldı.", next);
              else done("Taslağa döndürüldü", next);
            })
            .catch(fail)
            .finally(() => setConfirming(false));
        }}
      />
      <aside aria-label="Öğrenci önizlemesi" className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-sm @min-[60rem]:sticky @min-[60rem]:top-20 @min-[60rem]:max-h-[calc(100dvh-6rem)] @min-[60rem]:overflow-y-auto">
        <QuestionPreviewShell
          model={previewModel}
          rubricParts={previewRubricParts}
          rubricCatalog={rubrics}
        />
      </aside>
      </div>
    </div>
  );
}
