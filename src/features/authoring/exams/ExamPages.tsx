"use client";

import {
  authoringApi,
  type ExamDetail,
  type ExamListItem,
  type QuestionSummary,
} from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import {
  Button,
  ButtonLink,
  Checkbox,
  DataGrid,
  ErrorState,
  Field,
  FormCard,
  Input,
  PageHeader,
  Select,
  Textarea,
  errorMessage,
  notify,
  type GridColDef,
} from "@/src/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CEFR = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const SKILL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "READING", label: "Okuma" },
  { value: "LISTENING", label: "Dinleme" },
  { value: "WRITING", label: "Yazma" },
  { value: "SPEAKING", label: "Konuşma" },
  { value: "GRAMMAR", label: "Dilbilgisi" },
  { value: "VOCABULARY", label: "Kelime" },
  { value: "USE_OF_ENGLISH", label: "Use of English" },
];

function skillLabel(skill?: string | null) {
  return SKILL_OPTIONS.find((s) => s.value === skill)?.label ?? skill ?? "—";
}

function formatPoints(n: number) {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function questionPointsTotal(exam: ExamDetail) {
  let sum = 0;
  for (const section of exam.sections) {
    for (const sub of section.subSections) {
      const scored = sub.questions.filter((q) => q.role === "SCORED");
      if (sub.selectionMode === "RANDOM_SUBSET") {
        const n = Math.min(sub.selectionCount ?? 0, scored.length);
        sum += (Number(scored[0]?.points) || 0) * n;
      } else if (sub.selectionMode === "BANK_QUERY") {
        const criteria = (sub.bankCriteria ?? {}) as { count?: number; pointsPerQuestion?: number };
        sum += (Number(criteria.pointsPerQuestion) || 0) * (Number(criteria.count) || 0);
      } else {
        sum += scored.reduce((acc, q) => acc + (Number(q.points) || 0), 0);
      }
    }
  }
  return Math.round(sum * 100) / 100;
}

export function ExamListPage({ basePath }: { basePath: string }) {
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<ExamListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      setRows(await authoringApi.listExams());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<GridColDef<ExamListItem>[]>(
    () => [
      {
        field: "title",
        headerName: "Sınav",
        minWidth: 220,
        renderCell: ({ row }) => (
          <Link href={`${basePath}/${row.id}`} className="font-medium text-primary hover:underline">
            {row.title}
            <span className="block text-xs text-fg-muted">
              {row.code} · v{row.versionNumber}
            </span>
          </Link>
        ),
      },
      { field: "purpose", headerName: "Amaç", width: 140 },
      {
        field: "minLevel",
        headerName: "Seviye",
        width: 100,
        renderCell: ({ row }) => `${row.minLevel}–${row.maxLevel}`,
      },
      {
        field: "status",
        headerName: "Durum",
        width: 120,
        renderCell: ({ row }) => <StatusBadge status={row.status} />,
      },
    ],
    [basePath],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sınavlar"
        description="Sınav oluşturucu ve yayın kontrolü."
        count={rows.length}
        actions={<ButtonLink href={`${basePath}/new`}>Yeni sınav</ButtonLink>}
      />
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="p-8 text-sm text-fg-muted">Yükleniyor…</div>
        ) : error ? (
          <div className="p-4">
            <ErrorState title="Sınavlar alınamadı" message={error} />
          </div>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            emptyState={{
              title: "Henüz sınav yok",
              description: "Hazır formattan veya boş şablondan başlayın.",
              action: <ButtonLink href={`${basePath}/new`}>Yeni sınav</ButtonLink>,
            }}
          />
        )}
      </div>
    </div>
  );
}

export function ExamWizardPage({ basePath }: { basePath: string }) {
  const { tenant } = useAuthoringTenant();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("ACHIEVEMENT");
  const [minLevel, setMinLevel] = useState("A1");
  const [maxLevel, setMaxLevel] = useState("A2");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [totalPoints, setTotalPoints] = useState("100");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [welcomeHtml, setWelcomeHtml] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [formats, setFormats] = useState<Array<{ id: string; name: string }>>([]);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [formatId, setFormatId] = useState("");
  const [copyFromId, setCopyFromId] = useState("");
  const [mode, setMode] = useState<"blank" | "format" | "copy">("blank");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creating = useRef(false);

  const existingWithCode = useMemo(
    () => exams.find((e) => e.code === code.trim() && e.versionNumber === 1) ?? null,
    [exams, code],
  );

  useEffect(() => {
    if (!tenant) return;
    void authoringApi.listFormats().then((f) => setFormats(f)).catch(() => setFormats([]));
    void authoringApi.listExams().then(setExams).catch(() => setExams([]));
  }, [tenant]);

  async function create() {
    if (creating.current) return;
    const normalized = code.trim();
    if (normalized && existingWithCode) {
      const message = `“${normalized}” kodu bu kurumda zaten kullanılıyor. Farklı bir kod girin.`;
      setError(message);
      notify.error(message);
      setStep(1);
      return;
    }
    creating.current = true;
    setBusy(true);
    setError(null);
    try {
      const exam = await authoringApi.createExam({
        code: normalized || `EX-${Date.now().toString(36).toUpperCase()}`,
        title: title || "Yeni sınav",
        purpose,
        minLevel,
        maxLevel,
        totalPoints: Number(totalPoints || 100),
        minAge: minAge === "" ? null : Number(minAge),
        maxAge: maxAge === "" ? null : Number(maxAge),
        formatId: mode === "format" && formatId ? formatId : null,
        copyFromId: mode === "copy" && copyFromId ? copyFromId : null,
      });
      if (welcomeHtml || descriptionHtml || durationSeconds) {
        await authoringApi.updateExam(exam.id, {
          title: exam.title,
          purpose,
          minLevel,
          maxLevel,
          totalPoints: Number(totalPoints || 100),
          durationSeconds: durationSeconds === "" ? null : Number(durationSeconds),
          minAge: minAge === "" ? null : Number(minAge),
          maxAge: maxAge === "" ? null : Number(maxAge),
          welcomeHtml: welcomeHtml || null,
          descriptionHtml: descriptionHtml || null,
        });
      }
      window.location.href = `${basePath}/${exam.id}`;
    } catch (e) {
      const message = errorMessage(e, "Oluşturulamadı");
      setError(message);
      notify.error(message);
      if (message.includes("sınav kodu") || message.includes("kodu bu kurumda")) setStep(1);
      setBusy(false);
    } finally {
      creating.current = false;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Yeni sınav" back={{ href: basePath, label: "Sınavlar" }} />
      {error ? (
        <div className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          <p>{error}</p>
          {existingWithCode ? (
            <Link
              href={`${basePath}/${existingWithCode.id}`}
              className="mt-2 inline-flex min-h-11 items-center font-medium underline"
            >
              Mevcut sınavı aç
            </Link>
          ) : null}
        </div>
      ) : null}
      <FormCard title={`Adım ${step}`}>
        {step === 1 ? (
          <div className="space-y-3">
            <Field label="Kod"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EX-A1-READ" /></Field>
            <Field label="Başlık"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Amaç">
              <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                <option value="ACHIEVEMENT">ACHIEVEMENT</option>
                <option value="PLACEMENT">PLACEMENT</option>
                <option value="DIAGNOSTIC">DIAGNOSTIC</option>
                <option value="PRACTICE">PRACTICE</option>
              </Select>
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Min CEFR"><Select value={minLevel} onChange={(e) => setMinLevel(e.target.value)}>{CEFR.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
              <Field label="Max CEFR"><Select value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)}>{CEFR.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
              <Field label="Min yaş"><Input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} /></Field>
              <Field label="Max yaş"><Input type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} /></Field>
              <Field label="Toplam puan"><Input type="number" value={totalPoints} onChange={(e) => setTotalPoints(e.target.value)} /></Field>
              <Field label="Süre (sn)"><Input type="number" value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} /></Field>
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["blank", "format", "copy"] as const).map((m) => (
                <Button key={m} type="button" size="sm" variant={mode === m ? "primary" : "secondary"} onClick={() => setMode(m)}>
                  {m === "blank" ? "Boş" : m === "format" ? "Formattan" : "Kopyala"}
                </Button>
              ))}
            </div>
            {mode === "format" ? (
              <Field label="Format">
                <Select value={formatId} onChange={(e) => setFormatId(e.target.value)}>
                  <option value="">Seçin</option>
                  {formats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
            ) : null}
            {mode === "copy" ? (
              <Field label="Kaynak sınav">
                <Select value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)}>
                  <option value="">Seçin</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.code})</option>)}
                </Select>
              </Field>
            ) : null}
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-3">
            <Field label="Hoş geldin HTML"><Textarea rows={4} value={welcomeHtml} onChange={(e) => setWelcomeHtml(e.target.value)} /></Field>
            <Field label="Açıklama HTML"><Textarea rows={4} value={descriptionHtml} onChange={(e) => setDescriptionHtml(e.target.value)} /></Field>
          </div>
        ) : null}
        <div className="mt-4 flex justify-between">
          <Button type="button" variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>Geri</Button>
          {step < 3 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>İleri</Button>
          ) : (
            <Button type="button" disabled={busy || !tenant} onClick={() => void create()}>{busy ? "Oluşturuluyor…" : "Oluştur"}</Button>
          )}
        </div>
      </FormCard>
    </div>
  );
}

type Sel =
  | { kind: "exam" }
  | { kind: "section"; sectionId: string }
  | { kind: "sub"; sectionId: string; subId: string }
  | { kind: "question"; sectionId: string; subId: string; linkId: string };

export function ExamBuilderPage({
  basePath,
  examId,
  questionBasePath,
}: {
  basePath: string;
  examId: string;
  questionBasePath?: string;
}) {
  const qBase = questionBasePath ?? basePath.replace(/\/exams$/, "/questions");
  const { tenant } = useAuthoringTenant();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [sel, setSel] = useState<Sel>({ kind: "exam" });
  const [error, setError] = useState<string | null>(null);
  const [bank, setBank] = useState<QuestionSummary[]>([]);
  const [bankQ, setBankQ] = useState("");
  const [bankCefr, setBankCefr] = useState("");
  const [bankSkill, setBankSkill] = useState("");
  const [catalog, setCatalog] = useState<Record<string, QuestionSummary>>({});
  const [tab, setTab] = useState<"detail" | "questions">("detail");
  const [attachSubId, setAttachSubId] = useState("");
  const [violations, setViolations] = useState<Array<{ severity: string; path: string; message: string }>>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      setExam(await authoringApi.getExam(examId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    }
  }, [tenant, examId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!tenant) return;
    void authoringApi
      .listQuestions({ status: "APPROVED", q: bankQ || undefined, cefr: bankCefr || undefined, skill: bankSkill || undefined })
      .then(setBank)
      .catch(() => setBank([]));
  }, [tenant, bankQ, bankCefr, bankSkill]);

  useEffect(() => {
    if (bank.length === 0) return;
    setCatalog((prev) => {
      const next = { ...prev };
      for (const q of bank) next[q.versionId] = q;
      return next;
    });
  }, [bank]);

  useEffect(() => {
    if (!exam) return;
    const ids = exam.sections.flatMap((s) => s.subSections.map((ss) => ss.id));
    if (!attachSubId || !ids.includes(attachSubId)) setAttachSubId(ids[0] ?? "");
  }, [exam, attachSubId]);

  const section = exam?.sections.find((s) => sel.kind !== "exam" && "sectionId" in sel && s.id === sel.sectionId);
  const sub =
    section && (sel.kind === "sub" || sel.kind === "question")
      ? section.subSections.find((ss) => ss.id === sel.subId)
      : null;
  const link =
    sub && sel.kind === "question" ? sub.questions.find((q) => q.id === sel.linkId) : null;

  async function saveExamBasics(patch: Record<string, unknown>) {
    if (!exam) return;
    setBusy(true);
    try {
      setExam(await authoringApi.updateExam(exam.id, {
        title: exam.title,
        purpose: exam.purpose,
        minLevel: exam.minLevel,
        maxLevel: exam.maxLevel,
        totalPoints: exam.totalPoints,
        durationSeconds: exam.durationSeconds,
        minAge: exam.minAge,
        maxAge: exam.maxAge,
        welcomeHtml: exam.welcomeHtml,
        descriptionHtml: exam.descriptionHtml,
        ...patch,
      }));
      // onBlur: yalnız hata toast (sık tetiklenir)
    } catch (e) {
      const message = errorMessage(e, "Kaydedilemedi");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(patch: Record<string, unknown>) {
    if (!exam) return;
    setBusy(true);
    try {
      setExam(await authoringApi.updateExamSettings(exam.id, {
        session: exam.session,
        navigation: exam.navigation,
        media: exam.media,
        randomization: exam.randomization,
        scoring: exam.scoring,
        results: exam.results,
        attemptPolicy: exam.attemptPolicy,
        proctoring: exam.proctoring,
        ...patch,
      }));
      // onBlur/checkbox: sadece hata toast (sık tetiklenir)
    } catch (e) {
      const message = errorMessage(e, "Ayar kaydı başarısız");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  if (!exam) {
    return error ? <p className="text-sm text-danger">{error}</p> : <p className="text-sm text-fg-muted">Yükleniyor…</p>;
  }

  const rawPoints = questionPointsTotal(exam);
  const aggregation = String((exam.scoring as Record<string, unknown> | null | undefined)?.aggregation ?? "SUM_OF_POINTS");
  const pointsMustMatch = aggregation !== "WEIGHTED_BY_SECTION";
  const pointsMismatch = pointsMustMatch && Math.abs(rawPoints - Number(exam.totalPoints)) > 0.001;
  const attachedCount = exam.sections.reduce(
    (n, section) => n + section.subSections.reduce((m, sub) => m + sub.questions.length, 0),
    0,
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={exam.title}
        description={`${exam.code} · v${exam.versionNumber}`}
        back={{ href: basePath, label: "Sınavlar" }}
        actions={<StatusBadge status={exam.status} />}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <PointsMatchBanner
        raw={rawPoints}
        total={Number(exam.totalPoints)}
        mismatch={pointsMismatch}
        weighted={!pointsMustMatch}
        onAlign={() => void saveExamBasics({ totalPoints: rawPoints })}
      />
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {(
          [
            ["detail", "Detay"],
            ["questions", `Sorular (${attachedCount})`],
          ] as const
        ).map(([id, label]) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`min-h-11 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ${
                selected ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className={tab === "detail" ? "grid gap-3 md:grid-cols-[minmax(14rem,16rem)_minmax(0,1fr)]" : "hidden"}>
        {/* Left tree */}
        <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
          <button type="button" className={`flex min-h-11 w-full items-center rounded px-2 text-left text-sm ${sel.kind === "exam" ? "bg-primary/10 font-medium" : ""}`} onClick={() => setSel({ kind: "exam" })}>
            Sınav
          </button>
          {exam.sections.map((s, si) => (
            <div key={s.id} className="pl-2">
              <div className="flex items-center gap-1">
                <button type="button" className={`flex min-h-11 min-w-0 flex-1 items-center rounded px-2 text-left text-sm ${sel.kind === "section" && sel.sectionId === s.id ? "bg-primary/10 font-medium" : ""}`} onClick={() => setSel({ kind: "section", sectionId: s.id })}>
                  {s.title}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-fg-muted"
                  disabled={si === 0}
                  onClick={() => {
                    const ids = exam.sections.map((x) => x.id);
                    [ids[si - 1], ids[si]] = [ids[si], ids[si - 1]];
                    void notify
                      .run(authoringApi.reorderSections(exam.id, ids), {
                        error: "Sıralama güncellenemedi",
                      })
                      .then(setExam)
                      .catch(() => undefined);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-fg-muted"
                  disabled={si === exam.sections.length - 1}
                  onClick={() => {
                    const ids = exam.sections.map((x) => x.id);
                    [ids[si + 1], ids[si]] = [ids[si], ids[si + 1]];
                    void notify
                      .run(authoringApi.reorderSections(exam.id, ids), {
                        error: "Sıralama güncellenemedi",
                      })
                      .then(setExam)
                      .catch(() => undefined);
                  }}
                >
                  ↓
                </button>
              </div>
              {s.subSections.map((ss) => {
                const filled = ss.questions.length;
                const need = ss.selectionCount ?? ss.blueprint?.count ?? "—";
                return (
                  <button
                    key={ss.id}
                    type="button"
                    className={`ml-3 flex min-h-11 w-full items-center rounded px-2 text-left text-xs ${sel.kind !== "exam" && "subId" in sel && sel.subId === ss.id ? "bg-primary/10 font-medium" : ""}`}
                    onClick={() => setSel({ kind: "sub", sectionId: s.id, subId: ss.id })}
                  >
                    {ss.title}{" "}
                    <span className="text-fg-muted">
                      {filled}/{String(need)}
                    </span>
                  </button>
                );
              })}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-3"
                onClick={() =>
                  void notify
                    .run(
                      authoringApi.addSubSection(
                        exam.id,
                        s.id,
                        `Part ${s.subSections.length + 1}`,
                      ),
                      { success: "Alt bölüm eklendi", error: "Eklenemedi" },
                    )
                    .then(setExam)
                    .catch(() => undefined)
                }
              >
                + Alt
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              void notify
                .run(
                  authoringApi.addSection(
                    exam.id,
                    `Section ${exam.sections.length + 1}`,
                    "READING",
                  ),
                  { success: "Bölüm eklendi", error: "Eklenemedi" },
                )
                .then(setExam)
                .catch(() => undefined)
            }
          >
            + Bölüm
          </Button>
        </div>

        {/* Center settings */}
        <div className="space-y-3">
          {sel.kind === "exam" ? (
            <>
              <FormCard title="Temel">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Başlık"><Input value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} onBlur={() => void saveExamBasics({ title: exam.title })} /></Field>
                  <Field
                    label="Toplam puan"
                    error={pointsMismatch ? `Soru puanları toplamı ${formatPoints(rawPoints)}. İkisi eşit olmalı.` : undefined}
                    hint={pointsMismatch ? undefined : `Soru puanları: ${formatPoints(rawPoints)}`}
                  >
                    <Input type="number" value={exam.totalPoints} onChange={(e) => setExam({ ...exam, totalPoints: Number(e.target.value) })} onBlur={() => void saveExamBasics({ totalPoints: exam.totalPoints })} />
                  </Field>
                  <Field label="Min yaş"><Input type="number" value={exam.minAge ?? ""} onChange={(e) => setExam({ ...exam, minAge: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => void saveExamBasics({ minAge: exam.minAge })} /></Field>
                  <Field label="Max yaş"><Input type="number" value={exam.maxAge ?? ""} onChange={(e) => setExam({ ...exam, maxAge: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => void saveExamBasics({ maxAge: exam.maxAge })} /></Field>
                </div>
                <Field label="Welcome HTML"><Textarea rows={3} value={exam.welcomeHtml ?? ""} onChange={(e) => setExam({ ...exam, welcomeHtml: e.target.value })} onBlur={() => void saveExamBasics({ welcomeHtml: exam.welcomeHtml })} /></Field>
              </FormCard>
              <EmbeddableEditor exam={exam} onSave={saveSettings} busy={busy} />
              <ScoreBandsEditor exam={exam} setExam={setExam} />
            </>
          ) : null}

          {sel.kind === "section" && section ? (
            <FormCard title="Bölüm ayarları">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Başlık"><Input defaultValue={section.title} id="sec-title" /></Field>
                <Field label="Beceri">
                  <Select defaultValue={section.skill} id="sec-skill">
                    {SKILL_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </Field>
                <Field label="Süre (sn)"><Input type="number" defaultValue={section.durationSeconds ?? ""} id="sec-dur" /></Field>
                <Field label="Mola (sn)"><Input type="number" defaultValue={section.breakAfterSeconds ?? ""} id="sec-break" /></Field>
                <Field label="Ağırlık %"><Input type="number" defaultValue={section.weightPercent ?? ""} id="sec-weight" /></Field>
                <Field label="Min geçme %"><Input type="number" defaultValue={section.minPassingPercent ?? ""} id="sec-pass" /></Field>
              </div>
              <Field label="Yönerge"><Textarea rows={3} defaultValue={section.instructionsHtml ?? ""} id="sec-inst" /></Field>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const title = (document.getElementById("sec-title") as HTMLInputElement).value;
                    const skill = (document.getElementById("sec-skill") as HTMLSelectElement).value;
                    const durationSeconds = numOrNull("sec-dur");
                    const breakAfterSeconds = numOrNull("sec-break");
                    const weightPercent = numOrNull("sec-weight");
                    const minPassingPercent = numOrNull("sec-pass");
                    const instructionsHtml = (document.getElementById("sec-inst") as HTMLTextAreaElement).value;
                    void notify
                      .run(
                        authoringApi.updateSection(exam.id, section.id, {
                          title,
                          skill,
                          durationSeconds,
                          breakAfterSeconds,
                          weightPercent,
                          minPassingPercent,
                          instructionsHtml,
                        }),
                        { success: "Kaydedildi", error: "Kaydedilemedi" },
                      )
                      .then(setExam)
                      .catch(() => undefined);
                  }}
                >
                  Kaydet
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    void notify
                      .run(authoringApi.removeSection(exam.id, section.id), {
                        success: "Bölüm silindi",
                        error: "Silinemedi",
                      })
                      .then((e) => {
                        setExam(e);
                        setSel({ kind: "exam" });
                      })
                      .catch(() => undefined)
                  }
                >
                  Sil
                </Button>
              </div>
            </FormCard>
          ) : null}

          {sel.kind === "sub" && sub && section ? (
            <FormCard title="Alt bölüm">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Başlık"><Input defaultValue={sub.title} id="sub-title" /></Field>
                <Field label="Task type"><Input defaultValue={sub.taskType ?? ""} id="sub-task" /></Field>
                <Field label="Selection mode">
                  <Select defaultValue={sub.selectionMode} id="sub-mode">
                    <option value="FIXED">FIXED</option>
                    <option value="BANK_QUERY">BANK_QUERY</option>
                    <option value="BLUEPRINT">BLUEPRINT</option>
                  </Select>
                </Field>
                <Field label="Selection count"><Input type="number" defaultValue={sub.selectionCount ?? ""} id="sub-count" /></Field>
              </div>
              <Field label="Blueprint JSON">
                <Textarea rows={4} defaultValue={JSON.stringify(sub.blueprint ?? { count: 5 }, null, 2)} id="sub-bp" />
              </Field>
              <Field label="Bank criteria JSON">
                <Textarea rows={3} defaultValue={JSON.stringify(sub.bankCriteria ?? {}, null, 2)} id="sub-bc" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    let blueprint = null;
                    let bankCriteria = null;
                    try { blueprint = JSON.parse((document.getElementById("sub-bp") as HTMLTextAreaElement).value); } catch { /* */ }
                    try { bankCriteria = JSON.parse((document.getElementById("sub-bc") as HTMLTextAreaElement).value); } catch { /* */ }
                    void notify
                      .run(
                        authoringApi.updateSubSection(exam.id, sub.id, {
                          title: (document.getElementById("sub-title") as HTMLInputElement).value,
                          taskType: (document.getElementById("sub-task") as HTMLInputElement).value || null,
                          selectionMode: (document.getElementById("sub-mode") as HTMLSelectElement).value,
                          selectionCount: numOrNull("sub-count"),
                          blueprint,
                          bankCriteria,
                        }),
                        { success: "Kaydedildi", error: "Kaydedilemedi" },
                      )
                      .then(setExam)
                      .catch(() => undefined);
                  }}
                >
                  Kaydet
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void notify
                      .run(authoringApi.autoFill(exam.id, sub.id, 5), {
                        success: "Otomatik dolduruldu",
                        error: "Doldurma başarısız",
                      })
                      .then(() => load())
                      .catch(() => undefined)
                  }
                >
                  Otomatik doldur
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    void notify
                      .run(authoringApi.removeSubSection(exam.id, section.id, sub.id), {
                        success: "Alt bölüm silindi",
                        error: "Silinemedi",
                      })
                      .then((e) => {
                        setExam(e);
                        setSel({ kind: "section", sectionId: section.id });
                      })
                      .catch(() => undefined)
                  }
                >
                  Sil
                </Button>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium">Bağlı sorular</p>
                {sub.questions.map((q) => (
                  <button key={q.id} type="button" className="block w-full rounded border border-border px-2 py-1 text-left text-xs" onClick={() => setSel({ kind: "question", sectionId: section.id, subId: sub.id, linkId: q.id })}>
                    {q.questionVersionId.slice(0, 8)}… · {q.role} · {q.points}p
                  </button>
                ))}
              </div>
            </FormCard>
          ) : null}

          {sel.kind === "question" && link ? (
            <FormCard title="Soru bağlantısı">
              <Field label="Rol">
                <Select
                  value={link.role}
                  onChange={(e) =>
                    void notify
                      .run(authoringApi.updateQuestionLink(exam.id, link.id, { role: e.target.value }), {
                        error: "Rol güncellenemedi",
                      })
                      .then(setExam)
                      .catch(() => undefined)
                  }
                >
                  <option value="SCORED">SCORED</option>
                  <option value="EXAMPLE">EXAMPLE</option>
                  <option value="PRETEST">PRETEST</option>
                </Select>
              </Field>
              <Field label="Puan">
                <Input
                  type="number"
                  defaultValue={link.points}
                  onBlur={(e) =>
                    void notify
                      .run(
                        authoringApi.updateQuestionLink(exam.id, link.id, {
                          points: Number(e.target.value),
                        }),
                        { error: "Puan güncellenemedi" },
                      )
                      .then(setExam)
                      .catch(() => undefined)
                  }
                />
              </Field>
              <Button
                variant="danger"
                onClick={() =>
                  void notify
                    .run(authoringApi.detachQuestion(exam.id, link.id), {
                      success: "Soru kaldırıldı",
                      error: "Kaldırılamadı",
                    })
                    .then((e) => {
                      setExam(e);
                      setSel({ kind: "sub", sectionId: sel.sectionId, subId: sel.subId });
                    })
                    .catch(() => undefined)
                }
              >
                Kaldır
              </Button>
            </FormCard>
          ) : null}

          <FormCard title="Yayın">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  void notify
                    .run(authoringApi.validateExam(exam.id), { error: "Doğrulama başarısız" })
                    .then((v) => {
                      setViolations(v);
                      const errors = v.filter((x) => x.severity === "ERROR");
                      if (errors.length === 0) notify.success("Doğrulama tamam");
                      else notify.error(`${errors.length} doğrulama hatası`);
                    })
                    .catch(() => undefined)
                }
              >
                Doğrula
              </Button>
              <Button
                disabled={pointsMismatch}
                onClick={() =>
                  void notify
                    .run(authoringApi.submitExam(exam.id), {
                      success: "İncelemeye gönderildi",
                      error: "Gönderilemedi",
                    })
                    .then(setExam)
                    .catch(() => undefined)
                }
              >
                İncelemeye gönder
              </Button>
              <Button
                disabled={pointsMismatch}
                onClick={() =>
                  void notify
                    .run(authoringApi.publishExam(exam.id), {
                      success: "Yayınlandı",
                      error: "Yayınlanamadı",
                    })
                    .then(setExam)
                    .catch(() => undefined)
                }
              >
                Yayınla
              </Button>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {violations.map((v, i) => (
                <li key={i} className={v.severity === "ERROR" ? "text-danger" : "text-fg-muted"}>
                  [{v.severity}] {v.path}: {v.message}
                </li>
              ))}
            </ul>
          </FormCard>
        </div>
      </div>

      <div className={tab === "questions" ? "block" : "hidden"}>
        <QuestionAssignPanel
          exam={exam}
          bank={bank}
          catalog={catalog}
          qBase={qBase}
          bankQ={bankQ}
          bankCefr={bankCefr}
          bankSkill={bankSkill}
          attachSubId={attachSubId}
          rawPoints={rawPoints}
          pointsMismatch={pointsMismatch}
          onSearch={setBankQ}
          onCefr={setBankCefr}
          onSkill={setBankSkill}
          onPickSub={setAttachSubId}
          onAttach={(versionId) => {
            if (!attachSubId) {
              notify.error("Önce sağdan bir alt bölüm seçin");
              return;
            }
            void notify
              .run(authoringApi.attachQuestion(exam.id, attachSubId, versionId), {
                success: "Soru eklendi",
                error: "Soru eklenemedi",
              })
              .then(setExam)
              .catch(() => undefined);
          }}
          onDetach={(linkId) => {
            void notify
              .run(authoringApi.detachQuestion(exam.id, linkId), {
                success: "Soru kaldırıldı",
                error: "Kaldırılamadı",
              })
              .then(setExam)
              .catch(() => undefined);
          }}
          onPoints={(linkId, points) => {
            void notify
              .run(authoringApi.updateQuestionLink(exam.id, linkId, { points }), {
                error: "Puan güncellenemedi",
              })
              .then(setExam)
              .catch(() => undefined);
          }}
        />
      </div>
    </div>
  );
}

function questionSkillText(q: QuestionSummary) {
  const list = q.skills?.length ? q.skills : q.primarySkill ? [q.primarySkill] : [];
  return list.length ? list.map((s) => skillLabel(s)).join(", ") : "Beceri yok";
}

function PointsMatchBanner({
  raw,
  total,
  mismatch,
  weighted,
  onAlign,
}: {
  raw: number;
  total: number;
  mismatch: boolean;
  weighted: boolean;
  onAlign: () => void;
}) {
  if (weighted) {
    return (
      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg-muted">
        Ağırlıklı puanlama açık. Ham soru puanı {formatPoints(raw)}, sınav toplamı {formatPoints(total)}.
      </p>
    );
  }
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        mismatch ? "border-danger bg-danger-bg text-danger" : "border-border bg-surface text-fg"
      }`}
    >
      <p className="text-sm">
        Soru puanları toplamı <span className="font-semibold tabular-nums">{formatPoints(raw)}</span>
        {" · "}
        sınav toplamı <span className="font-semibold tabular-nums">{formatPoints(total)}</span>
        {mismatch ? ". Yayınlamadan önce ikisi eşit olmalı." : "."}
      </p>
      {mismatch && raw > 0 ? (
        <Button type="button" variant="secondary" className="min-h-11 shrink-0" onClick={onAlign}>
          Toplamı {formatPoints(raw)} yap
        </Button>
      ) : null}
    </div>
  );
}

function QuestionAssignPanel({
  exam,
  bank,
  catalog,
  qBase,
  bankQ,
  bankCefr,
  bankSkill,
  attachSubId,
  rawPoints,
  pointsMismatch,
  onSearch,
  onCefr,
  onSkill,
  onPickSub,
  onAttach,
  onDetach,
  onPoints,
}: {
  exam: ExamDetail;
  bank: QuestionSummary[];
  catalog: Record<string, QuestionSummary>;
  qBase: string;
  bankQ: string;
  bankCefr: string;
  bankSkill: string;
  attachSubId: string;
  rawPoints: number;
  pointsMismatch: boolean;
  onSearch: (value: string) => void;
  onCefr: (value: string) => void;
  onSkill: (value: string) => void;
  onPickSub: (id: string) => void;
  onAttach: (versionId: string) => void;
  onDetach: (linkId: string) => void;
  onPoints: (linkId: string, points: number) => void;
}) {
  const attachedIds = new Set(
    exam.sections.flatMap((section) => section.subSections.flatMap((sub) => sub.questions.map((q) => q.questionId))),
  );
  const hasTarget = exam.sections.some((section) => section.subSections.some((sub) => sub.id === attachSubId));

  return (
    <div className="grid items-start gap-3 md:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col rounded-xl border border-border bg-surface md:sticky md:top-3 md:max-h-[calc(100dvh-12rem)]">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-fg">Soru bankası</h2>
            <ButtonLink href={`${qBase}/new`} variant="secondary" size="sm">
              Yeni soru
            </ButtonLink>
          </div>
          <Input placeholder="Kod ara" value={bankQ} onChange={(e) => onSearch(e.target.value)} aria-label="Soru ara" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={bankCefr} onChange={(e) => onCefr(e.target.value)} aria-label="CEFR filtresi">
              <option value="">CEFR</option>
              {CEFR.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Select value={bankSkill} onChange={(e) => onSkill(e.target.value)} aria-label="Beceri filtresi">
              <option value="">Beceri</option>
              {SKILL_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-fg-muted">
            Beceri, sorunun part alanına yazılır. Sınıflandırma ve Cevap / puan adımlarında.
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
          {bank.length === 0 ? (
            <p className="text-sm text-fg-muted">Bu filtreye uyan onaylı soru yok.</p>
          ) : (
            bank.map((q) => {
              const added = attachedIds.has(q.questionId);
              return (
                <article key={q.versionId} className="rounded-lg border border-border bg-bg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{q.code}</p>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        {q.primaryType ?? "—"} · {q.cefrLevel ?? "CEFR yok"} · {questionSkillText(q)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={added ? "ghost" : "secondary"}
                      className="min-h-11 shrink-0"
                      disabled={added || !hasTarget}
                      onClick={() => onAttach(q.versionId)}
                    >
                      {added ? "Eklendi" : "Ekle"}
                    </Button>
                  </div>
                  <Link href={`${qBase}/${q.versionId}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-primary hover:underline">
                    Soruyu düzenle
                  </Link>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="min-h-0 rounded-xl border border-border bg-surface md:max-h-[calc(100dvh-12rem)] md:overflow-auto">
        <div className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">Seçilen sorular</h2>
          <p className={`mt-1 text-xs ${pointsMismatch ? "text-danger" : "text-fg-muted"}`}>
            Toplam {formatPoints(rawPoints)} puan
            {hasTarget ? " · Ekle, vurgulanan alt bölüme gider." : " · Önce Detay’dan bir alt bölüm ekleyin."}
          </p>
        </div>
        <div className="space-y-4 p-3">
          {exam.sections.length === 0 ? (
            <p className="text-sm text-fg-muted">Henüz bölüm yok. Detay sekmesinden bölüm ekleyin.</p>
          ) : (
            exam.sections.map((section) => (
              <div key={section.id} className="space-y-2">
                <h3 className="text-sm font-semibold text-fg">
                  {section.title}
                  <span className="ml-2 font-normal text-fg-muted">{skillLabel(section.skill)}</span>
                </h3>
                {section.subSections.length === 0 ? (
                  <p className="text-xs text-fg-muted">Alt bölüm yok.</p>
                ) : (
                  section.subSections.map((sub) => {
                    const active = sub.id === attachSubId;
                    return (
                      <div
                        key={sub.id}
                        className={`rounded-lg border p-3 ${active ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                      >
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
                          onClick={() => onPickSub(sub.id)}
                        >
                          <span className="text-sm font-medium text-fg">{sub.title}</span>
                          <span className="text-xs text-fg-muted">{active ? "Eklenecek yer" : "Seç"}</span>
                        </button>
                        {sub.questions.length === 0 ? (
                          <p className="mt-2 text-xs text-fg-muted">Bu alt bölümde soru yok.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {sub.questions.map((link, index) => {
                              const known = catalog[link.questionVersionId];
                              return (
                                <li key={link.id} className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3 sm:flex-row sm:items-center">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-fg">
                                      {index + 1}. {known?.code ?? `${link.questionVersionId.slice(0, 8)}…`}
                                    </p>
                                    <p className="text-xs text-fg-muted">
                                      {known ? `${known.primaryType ?? "—"} · ${questionSkillText(known)} · ` : ""}
                                      {link.role}
                                    </p>
                                  </div>
                                  <label className="flex items-center gap-2 text-xs text-fg-muted">
                                    Puan
                                    <Input
                                      type="number"
                                      className="w-20"
                                      key={`${link.id}-${link.points}`}
                                      defaultValue={link.points}
                                      aria-label="Soru puanı"
                                      onBlur={(e) => onPoints(link.id, Number(e.target.value))}
                                    />
                                  </label>
                                  <Button type="button" variant="danger" size="sm" className="min-h-11" onClick={() => onDetach(link.id)}>
                                    Kaldır
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function numOrNull(id: string) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el || el.value === "") return null;
  return Number(el.value);
}

function EmbeddableEditor({
  exam,
  onSave,
  busy,
}: {
  exam: ExamDetail;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const session = (exam.session || {}) as Record<string, unknown>;
  const navigation = (exam.navigation || {}) as Record<string, unknown>;
  const media = (exam.media || {}) as Record<string, unknown>;
  const randomization = (exam.randomization || {}) as Record<string, unknown>;
  const scoring = (exam.scoring || {}) as Record<string, unknown>;
  const results = (exam.results || {}) as Record<string, unknown>;
  const attemptPolicy = (exam.attemptPolicy || {}) as Record<string, unknown>;
  const proctoring = (exam.proctoring || {}) as Record<string, unknown>;

  return (
    <FormCard title="Oturum / gezinme / medya / skor / gözetim">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Timing mode">
          <Select
            value={String(session.timingMode ?? "UNTIMED")}
            onChange={(e) => void onSave({ session: { ...session, timingMode: e.target.value } })}
          >
            <option value="UNTIMED">UNTIMED</option>
            <option value="EXAM_TIMED">EXAM_TIMED</option>
            <option value="SECTION_TIMED">SECTION_TIMED</option>
          </Select>
        </Field>
        <Field label="Min submit (sn)">
          <Input type="number" defaultValue={Number(session.minSubmitSeconds ?? 0)} onBlur={(e) => void onSave({ session: { ...session, minSubmitSeconds: Number(e.target.value) } })} />
        </Field>
        <Checkbox label="Geri git" checked={navigation.allowBack !== false} onChange={(e) => void onSave({ navigation: { ...navigation, allowBack: e.target.checked } })} />
        <Checkbox label="Atla" checked={!!navigation.allowSkip} onChange={(e) => void onSave({ navigation: { ...navigation, allowSkip: e.target.checked } })} />
        <Checkbox label="İşaretle" checked={navigation.allowFlag !== false} onChange={(e) => void onSave({ navigation: { ...navigation, allowFlag: e.target.checked } })} />
        <Checkbox label="Soruları karıştır" checked={!!randomization.shuffleQuestions} onChange={(e) => void onSave({ randomization: { ...randomization, shuffleQuestions: e.target.checked } })} />
        <Checkbox label="Seçenekleri karıştır" checked={!!randomization.shuffleOptions} onChange={(e) => void onSave({ randomization: { ...randomization, shuffleOptions: e.target.checked } })} />
        <Field label="Max audio plays"><Input type="number" defaultValue={media.maxAudioPlays != null ? String(media.maxAudioPlays) : ""} onBlur={(e) => void onSave({ media: { ...media, maxAudioPlays: e.target.value === "" ? null : Number(e.target.value) } })} /></Field>
        <Field label="Geçme %"><Input type="number" defaultValue={scoring.passingPercent != null ? String(scoring.passingPercent) : ""} onBlur={(e) => void onSave({ scoring: { ...scoring, passingPercent: e.target.value === "" ? null : Number(e.target.value) } })} /></Field>
        <Checkbox label="Negatif puan" checked={!!scoring.negativeMarking} onChange={(e) => void onSave({ scoring: { ...scoring, negativeMarking: e.target.checked } })} />
        <Checkbox label="CEFR göster" checked={results.showCefrLevel !== false} onChange={(e) => void onSave({ results: { ...results, showCefrLevel: e.target.checked } })} />
        <Checkbox label="Sertifika" checked={!!results.certificateEnabled} onChange={(e) => void onSave({ results: { ...results, certificateEnabled: e.target.checked } })} />
        <Field label="Max deneme"><Input type="number" defaultValue={Number(attemptPolicy.maxAttempts ?? 1)} onBlur={(e) => void onSave({ attemptPolicy: { ...attemptPolicy, maxAttempts: Number(e.target.value) } })} /></Field>
        <Checkbox label="Tam ekran zorunlu" checked={!!proctoring.requireFullscreen} onChange={(e) => void onSave({ proctoring: { ...proctoring, requireFullscreen: e.target.checked } })} />
        <Checkbox label="Odak kaybı kaydet" checked={!!proctoring.detectFocusLoss} onChange={(e) => void onSave({ proctoring: { ...proctoring, detectFocusLoss: e.target.checked } })} />
        <Checkbox label="Kopyala-yapıştır engelle" checked={!!proctoring.blockCopyPaste} onChange={(e) => void onSave({ proctoring: { ...proctoring, blockCopyPaste: e.target.checked } })} />
      </div>
      {busy ? <p className="text-xs text-fg-muted">Kaydediliyor…</p> : null}
    </FormCard>
  );
}

function ScoreBandsEditor({ exam, setExam }: { exam: ExamDetail; setExam: (e: ExamDetail) => void }) {
  const [minP, setMinP] = useState("0");
  const [maxP, setMaxP] = useState("50");
  const [label, setLabel] = useState("Fail");
  const [cefr, setCefr] = useState("");
  const [passing, setPassing] = useState(false);

  return (
    <FormCard title="Score bands">
      <div className="space-y-1">
        {(exam.scoreBands || []).map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {b.minPercent}–{b.maxPercent}% · {b.label} {b.cefrLevel ? `· ${b.cefrLevel}` : ""} {b.passing ? "✓" : ""}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void notify
                  .run(authoringApi.removeScoreBand(exam.id, b.id), {
                    success: "Puan bandı silindi",
                    error: "Silinemedi",
                  })
                  .then(setExam)
                  .catch(() => undefined)
              }
            >
              Sil
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <Input type="number" value={minP} onChange={(e) => setMinP(e.target.value)} placeholder="min%" />
        <Input type="number" value={maxP} onChange={(e) => setMaxP(e.target.value)} placeholder="max%" />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="etiket" />
        <Select value={cefr} onChange={(e) => setCefr(e.target.value)}>
          <option value="">CEFR</option>
          {CEFR.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <Checkbox label="Geçti bandı" checked={passing} onChange={(e) => setPassing(e.target.checked)} />
      <Button
        size="sm"
        onClick={() =>
          void notify
            .run(
              authoringApi.addScoreBand(exam.id, {
                minPercent: Number(minP),
                maxPercent: Number(maxP),
                label,
                cefrLevel: cefr || null,
                passing,
              }),
              { success: "Puan bandı eklendi", error: "Eklenemedi" },
            )
            .then(setExam)
            .catch(() => undefined)
        }
      >
        Band ekle
      </Button>
    </FormCard>
  );
}
