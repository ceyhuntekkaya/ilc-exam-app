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
import { useCallback, useEffect, useMemo, useState } from "react";

const CEFR = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY", "USE_OF_ENGLISH"];

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

  useEffect(() => {
    if (!tenant) return;
    void authoringApi.listFormats().then((f) => setFormats(f)).catch(() => setFormats([]));
    void authoringApi.listExams().then(setExams).catch(() => setExams([]));
  }, [tenant]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const exam = await authoringApi.createExam({
        code: code || `EX-${Date.now().toString(36).toUpperCase()}`,
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
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Yeni sınav" back={{ href: basePath, label: "Sınavlar" }} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={exam.title}
        description={`${exam.code} · v${exam.versionNumber}`}
        back={{ href: basePath, label: "Sınavlar" }}
        actions={<StatusBadge status={exam.status} />}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-3 lg:grid-cols-[240px_1fr_280px]">
        {/* Left tree */}
        <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
          <button type="button" className={`block w-full rounded px-2 py-1 text-left text-sm ${sel.kind === "exam" ? "bg-primary/10 font-medium" : ""}`} onClick={() => setSel({ kind: "exam" })}>
            Sınav
          </button>
          {exam.sections.map((s, si) => (
            <div key={s.id} className="pl-2">
              <div className="flex items-center gap-1">
                <button type="button" className={`block min-w-0 flex-1 rounded px-2 py-1 text-left text-sm ${sel.kind === "section" && sel.sectionId === s.id ? "bg-primary/10 font-medium" : ""}`} onClick={() => setSel({ kind: "section", sectionId: s.id })}>
                  {s.title}
                </button>
                <button
                  type="button"
                  className="text-xs text-fg-muted"
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
                  className="text-xs text-fg-muted"
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
                    className={`ml-3 block w-full rounded px-2 py-1 text-left text-xs ${sel.kind !== "exam" && "subId" in sel && sel.subId === ss.id ? "bg-primary/10 font-medium" : ""}`}
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
                  <Field label="Toplam puan"><Input type="number" value={exam.totalPoints} onChange={(e) => setExam({ ...exam, totalPoints: Number(e.target.value) })} onBlur={() => void saveExamBasics({ totalPoints: exam.totalPoints })} /></Field>
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
                    {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
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

        {/* Right bank */}
        <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
          <p className="text-sm font-medium">Soru bankası</p>
          <Input placeholder="Ara" value={bankQ} onChange={(e) => setBankQ(e.target.value)} />
          <Select value={bankCefr} onChange={(e) => setBankCefr(e.target.value)}>
            <option value="">CEFR</option>
            {CEFR.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={bankSkill} onChange={(e) => setBankSkill(e.target.value)}>
            <option value="">Beceri</option>
            {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <ButtonLink href={`${qBase}/new`}>Yeni soru yaz</ButtonLink>
          <div className="max-h-[480px] space-y-1 overflow-auto">
            {bank.map((q) => (
              <div key={q.versionId} className="rounded border border-border p-2 text-xs">
                <p className="font-medium">{q.code}</p>
                <p className="text-fg-muted">{q.primaryType} · {q.cefrLevel}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={sel.kind !== "sub"}
                  onClick={() => {
                    if (sel.kind !== "sub") return;
                    void notify
                      .run(authoringApi.attachQuestion(exam.id, sel.subId, q.versionId), {
                        success: "Soru eklendi",
                        error: "Soru eklenemedi",
                      })
                      .then(setExam)
                      .catch(() => undefined);
                  }}
                >
                  Ekle
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
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
