"use client";

import { authoringApi, type ExamDetail, type ExamListItem, type QuestionSummary } from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import {
  Button,
  ButtonLink,
  DataGrid,
  ErrorState,
  Field,
  FormCard,
  Input,
  PageHeader,
  Select,
  type GridColDef,
} from "@/src/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [formats, setFormats] = useState<Array<{ id: string; name: string }>>([]);
  const [formatId, setFormatId] = useState("");
  const [mode, setMode] = useState<"blank" | "format" | "copy">("blank");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    void authoringApi.listFormats().then((f) => setFormats(f)).catch(() => setFormats([]));
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
        totalPoints: 100,
        formatId: mode === "format" && formatId ? formatId : null,
      });
      window.location.href = `${basePath}/${exam.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oluşturulamadı");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Yeni sınav" back={{ href: basePath, label: "Sınavlar" }} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {step === 1 ? (
        <FormCard title="1. Temel bilgiler">
          <div className="grid gap-3">
            <Field label="Sınav adı">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Kod">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Otomatik üretilebilir" />
            </Field>
            <Field label="Amaç">
              <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                <option value="PLACEMENT">Seviye belirleme</option>
                <option value="ACHIEVEMENT">Başarı</option>
                <option value="DIAGNOSTIC">Tanılayıcı</option>
                <option value="PRACTICE">Alıştırma</option>
                <option value="MOCK">Deneme</option>
                <option value="CERTIFICATION">Sertifika</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min seviye">
                <Select value={minLevel} onChange={(e) => setMinLevel(e.target.value)}>
                  {["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Max seviye">
                <Select value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)}>
                  {["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button onClick={() => setStep(2)}>İleri</Button>
          </div>
        </FormCard>
      ) : (
        <FormCard title="2. Başlangıç noktası">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === "blank"} onChange={() => setMode("blank")} />
              Boş başla
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === "format"} onChange={() => setMode("format")} />
              Hazır formattan başla
            </label>
            {mode === "format" ? (
              <Select value={formatId} onChange={(e) => setFormatId(e.target.value)}>
                <option value="">Format seçin</option>
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Geri
              </Button>
              <Button onClick={() => void create()} disabled={busy}>
                {busy ? "Oluşturuluyor…" : "Oluştur"}
              </Button>
            </div>
          </div>
        </FormCard>
      )}
    </div>
  );
}

export function ExamBuilderPage({ basePath, examId }: { basePath: string; examId: string }) {
  const { tenant } = useAuthoringTenant();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [bank, setBank] = useState<QuestionSummary[]>([]);
  const [issues, setIssues] = useState<Array<{ severity: string; path: string; message: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    const data = await authoringApi.getExam(examId);
    setExam(data);
    if (!selectedSubId) {
      const first = data.sections[0]?.subSections[0]?.id ?? null;
      setSelectedSubId(first);
    }
    const questions = await authoringApi.listQuestions({ status: "APPROVED" });
    setBank(questions);
  }, [tenant, examId, selectedSubId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [load]);

  const selected = exam?.sections
    .flatMap((s) => s.subSections.map((sub) => ({ section: s, sub })))
    .find((x) => x.sub.id === selectedSubId);

  async function attach(versionId: string) {
    if (!selectedSubId) return;
    setBusy(true);
    try {
      setExam(await authoringApi.attachQuestion(examId, selectedSubId, versionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function autoFill() {
    if (!selectedSubId) return;
    setBusy(true);
    try {
      await authoringApi.autoFill(examId, selectedSubId, 5);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Doldurulamadı");
    } finally {
      setBusy(false);
    }
  }

  async function setBlueprint() {
    if (!selectedSubId || !exam) return;
    const cefr = exam.minLevel;
    setExam(
      await authoringApi.updateSubSection(examId, selectedSubId, {
        blueprint: { count: 5, cefrLevel: cefr, interactionType: "MULTIPLE_CHOICE" },
      }),
    );
  }

  async function validate() {
    setIssues(await authoringApi.validateExam(examId));
  }

  async function publish() {
    setBusy(true);
    try {
      setExam(await authoringApi.publishExam(examId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yayınlanamadı");
    } finally {
      setBusy(false);
    }
  }

  if (!exam && !error) return <div className="p-6 text-sm text-fg-muted">Yükleniyor…</div>;
  if (error && !exam) return <div className="p-6 text-sm text-danger">{error}</div>;
  if (!exam) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={exam.title}
        description={`${exam.code} · ${exam.minLevel}–${exam.maxLevel}`}
        back={{ href: basePath, label: "Sınavlar" }}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={exam.status} />
            <Button variant="secondary" onClick={() => void validate()}>
              Yayına hazırlık
            </Button>
            <Button onClick={() => void publish()} disabled={busy}>
              Yayınla
            </Button>
          </div>
        }
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {issues.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-3 text-sm">
          <p className="font-medium">Kontrol listesi</p>
          <ul className="mt-1 list-disc pl-5">
            {issues.map((i, idx) => (
              <li key={idx} className={i.severity === "ERROR" ? "text-danger" : "text-warning"}>
                [{i.severity}] {i.path}: {i.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[240px_1fr_280px]">
        <aside className="rounded-xl border border-border bg-surface p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-fg-muted">Yapı</p>
          <ul className="space-y-2 text-sm">
            {exam.sections.map((s) => (
              <li key={s.id}>
                <p className="font-medium text-fg">
                  {s.title}{" "}
                  <span className="text-xs text-fg-muted">{s.skill}</span>
                </p>
                <ul className="ml-2 mt-1 space-y-1">
                  {s.subSections.map((sub) => (
                    <li key={sub.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedSubId(sub.id)}
                        className={`w-full rounded px-2 py-1 text-left ${
                          selectedSubId === sub.id ? "bg-primary/10 text-primary" : "hover:bg-bg"
                        }`}
                      >
                        {sub.title}{" "}
                        <span className="text-xs text-fg-muted">
                          {sub.questions.length}
                          {sub.blueprint && typeof sub.blueprint.count === "number"
                            ? `/${sub.blueprint.count}`
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            size="sm"
            onClick={() =>
              void authoringApi
                .addSection(examId, "Listening", "LISTENING")
                .then(setExam)
                .catch((e) => setError(e.message))
            }
          >
            Bölüm ekle
          </Button>
        </aside>

        <main className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          {selected ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                {selected.section.title} / {selected.sub.title}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => void setBlueprint()}>
                  Blueprint: 5 MCQ
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void autoFill()} disabled={busy}>
                  Uygun sorularla doldur
                </Button>
                <ButtonLink
                  href={`${basePath.replace("/exams", "/questions")}/new?examId=${examId}&subId=${selectedSubId}`}
                  variant="secondary"
                  size="sm"
                >
                  Yeni soru yaz
                </ButtonLink>
              </div>
              <ul className="space-y-2 text-sm">
                {selected.sub.questions.map((q) => (
                  <li key={q.id} className="rounded border border-border px-3 py-2">
                    Soru {q.questionId.slice(0, 8)}… · {q.points} puan · {q.role}
                  </li>
                ))}
                {selected.sub.questions.length === 0 ? (
                  <li className="text-fg-muted">Bu kısımda henüz soru yok.</li>
                ) : null}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-fg-muted">Soldan bir kısım seçin.</p>
          )}
        </main>

        <aside className="rounded-xl border border-border bg-surface p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-fg-muted">Soru bankası</p>
          <ul className="max-h-[480px] space-y-2 overflow-auto text-sm">
            {bank.map((q) => (
              <li key={q.versionId} className="rounded border border-border p-2">
                <p className="font-medium">{q.code}</p>
                <p className="text-xs text-fg-muted">
                  {q.primaryType} · {q.cefrLevel}
                </p>
                <Button
                  className="mt-2"
                  size="sm"
                  variant="secondary"
                  disabled={busy || !selectedSubId}
                  onClick={() => void attach(q.versionId)}
                >
                  Ekle
                </Button>
              </li>
            ))}
            {bank.length === 0 ? (
              <li className="text-fg-muted">Onaylı soru yok.</li>
            ) : null}
          </ul>
        </aside>
      </div>
    </div>
  );
}
