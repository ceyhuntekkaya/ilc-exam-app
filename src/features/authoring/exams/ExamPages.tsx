"use client";

import { Perm } from "@/src/lib/permissions";

import {
  authoringApi,
  type ExamDetail,
  type ExamListItem,
  type QuestionSummary,
} from "@/src/features/authoring/shared/client";
import { FormGroup, SettingToggle } from "@/src/features/authoring/shared/FormGroup";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { QuestionPreviewLoader } from "@/src/features/authoring/questions/QuestionPreviewLoader";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { LicensedExamsSection } from "@/src/features/assignments/LicensedExamsSection";
import { useCan, useContentBasePath, usePanelCompanyId, usePanelRole } from "@/src/features/panel/PanelContext";
import {
  Badge,
  Button,
  ButtonLink,
  ConfirmDialog,
  DataGrid,
  ErrorState,
  Field,
  FilterTabs,
  FormCard,
  Input,
  PageHeader,
  Select,
  Skeleton,
  SkeletonStatus,
  Textarea,
  errorMessage,
  notify,
  type GridColDef,
  IconArrowDown,
  IconArrowUp,
  IconX,
  IconPlus,
  EmptyState,
} from "@/src/ui";
import { ExamGrantsTab, ExamPreviewTab } from "@/src/features/authoring/exams/ExamExtraTabs";
import { HoverPreview } from "@/src/ui/composites/HoverPreview";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

const PURPOSES = [
  { value: "ACHIEVEMENT", label: "Başarı", hint: "Dönem/ünite sonu: öğrenilenleri ölçer." },
  { value: "PLACEMENT", label: "Seviye tespit", hint: "Öğrenciyi doğru sınıfa / seviyeye yerleştirir." },
  { value: "DIAGNOSTIC", label: "Tanılama", hint: "Güçlü ve zayıf alanları ayrıntılı gösterir." },
  { value: "PRACTICE", label: "Alıştırma", hint: "Not etkisi yok; deneme ve tekrar için." },
];

const START_MODES = [
  { value: "blank", label: "Boş sınav", hint: "Bölümleri ve soruları sıfırdan kurun." },
  { value: "format", label: "Formattan", hint: "Hazır iskelet: bölüm, süre ve puanlar gelir." },
  { value: "copy", label: "Mevcut sınavdan kopya", hint: "Var olan bir sınavı çoğaltıp düzenleyin." },
] as const;

const WIZARD_STEPS = [
  { title: "Temel bilgiler", hint: "Kod, başlık, amaç, seviye" },
  { title: "Başlangıç noktası", hint: "Boş, formattan veya kopya" },
  { title: "Öğrenci metinleri", hint: "Karşılama ve açıklama" },
];

export function purposeLabel(value?: string | null) {
  return PURPOSES.find((p) => p.value === value)?.label ?? value ?? "—";
}

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

export function ExamListPage() {
  const canCreate = useCan(Perm.examCreate);
  const canReadExams = useCan(Perm.examRead);
  const canReview = useCan(Perm.contentReviewManage, Perm.questionEditOwn, Perm.questionEditAll);
  const canGrants = useCan(Perm.assignmentManage, Perm.examGrantManage);
  const role = usePanelRole();
  const companyId = usePanelCompanyId();
  const basePath = useContentBasePath("exams");
  const reviewPath = useContentBasePath("review");
  const router = useRouter();
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<ExamListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!canReadExams) {
      setLoading(false);
      return;
    }
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
  }, [tenant, canReadExams]);

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
          <div className="min-w-0">
            <Link href={`${basePath}/${row.id}`} className="font-medium text-fg hover:text-primary">
              {row.title}
            </Link>
            <span className="block font-mono text-xs text-fg-subtle">
              {row.code} · v{row.versionNumber}
            </span>
          </div>
        ),
      },
      {
        field: "purpose",
        headerName: "Amaç",
        width: 140,
        renderCell: ({ row }) =>
          row.purpose ? (
            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-fg-muted">{purposeLabel(row.purpose)}</span>
          ) : (
            "—"
          ),
      },
      {
        field: "minLevel",
        headerName: "Seviye",
        width: 110,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-(--accent-plum)">
            {row.minLevel}–{row.maxLevel}
          </span>
        ),
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

  const showLicensed = role === "STAFF" && Boolean(companyId) && canGrants;
  const showReview = role === "STAFF" && canReview;

  return (
    <div className="space-y-8">
      {canReadExams ? (
        <div className="space-y-4">
          <PageHeader
            title="Sınavlar"
            description="Sınav oluşturucu ve yayın kontrolü."
            count={rows.length}
            actions={
              canCreate || showReview ? (
                <>
                  {showReview ? (
                    <ButtonLink href={`${reviewPath}?type=Sınav`} variant="secondary">
                      İnceleme kuyruğu
                    </ButtonLink>
                  ) : null}
                  {canCreate ? <ButtonLink href={`${basePath}/new`}>Yeni sınav</ButtonLink> : null}
                </>
              ) : undefined
            }
          />
          <div className="rounded-xl border border-border bg-surface shadow-sm">
            {error ? (
              <div className="p-4">
                <ErrorState title="Sınavlar alınamadı" message={error} onRetry={() => void load()} compact />
              </div>
            ) : (
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(r) => r.id}
                loading={loading}
                embedded
                onRowClick={({ row }) => router.push(`${basePath}/${row.id}`)}
                emptyState={{
                  title: "Henüz sınav yok",
                  description: "Hazır formattan veya boş şablondan başlayın.",
                  action: canCreate ? <ButtonLink href={`${basePath}/new`}>Yeni sınav</ButtonLink> : undefined,
                }}
              />
            )}
          </div>
        </div>
      ) : showLicensed ? (
        <PageHeader
          title="Sınavlar"
          description="Kurumunuza tanınan sınav hakları. Bir sınavı sınıfa ya da öğrenciye atamak için Atama aç’ı kullanın."
        />
      ) : null}
      {showLicensed && companyId ? (
        <section id="lisansli" className="scroll-mt-24 space-y-3">
          {canReadExams ? (
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-fg">Lisanslı sınavlar</h2>
              <p className="mt-1 max-w-2xl text-sm text-fg-muted">
                Kurumunuza tanınan sınav hakları. Bir sınavı sınıfa ya da öğrenciye atamak için Atama aç’ı kullanın.
              </p>
            </div>
          ) : null}
          <LicensedExamsSection companyId={companyId} />
        </section>
      ) : null}
    </div>
  );
}

export function ExamWizardPage() {
  const basePath = useContentBasePath("exams");
  const router = useRouter();
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
      router.push(`${basePath}/${exam.id}`);
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

  const levelError = CEFR.indexOf(minLevel) > CEFR.indexOf(maxLevel) ? "En düşük seviye, en yüksek seviyeden büyük olamaz." : undefined;
  const ageError = minAge !== "" && maxAge !== "" && Number(minAge) > Number(maxAge) ? "En küçük yaş, en büyük yaştan büyük olamaz." : undefined;
  const titleError = !title.trim() ? "Sınav başlığı gerekli." : undefined;
  const modeError =
    mode === "format" && !formatId ? "Bir format seçin." : mode === "copy" && !copyFromId ? "Kopyalanacak sınavı seçin." : undefined;
  const stepValid = step === 1 ? !levelError && !ageError && !titleError && !existingWithCode : step === 2 ? !modeError : true;
  const minutes = durationSeconds === "" ? "" : String(Number(durationSeconds) / 60);

  return (
    <div className="@container space-y-5">
      <PageHeader
        title="Yeni sınav"
        description="Üç adımda sınavın kimliğini, başlangıç noktasını ve öğrenciye görünen giriş metnini belirleyin. Bölüm ve soruları sonraki ekranda eklersiniz."
        back={{ href: basePath, label: "Sınavlar" }}
      />

      <ol className="grid gap-2 sm:grid-cols-3" aria-label="Adımlar">
        {WIZARD_STEPS.map((s, i) => {
          const n = i + 1;
          const state = n === step ? "current" : n < step ? "done" : "todo";
          return (
            <li
              key={s.title}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                state === "current" ? "border-primary-200 bg-primary-50/60" : "border-border bg-surface"
              }`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === "done" ? "bg-success text-white" : state === "current" ? "bg-primary text-white" : "bg-neutral-100 text-fg-subtle"
                }`}
              >
                {state === "done" ? "✓" : n}
              </span>
              <span className="min-w-0">
                <span className={`block text-[13px] font-semibold ${state === "todo" ? "text-fg-muted" : "text-fg"}`}>{s.title}</span>
                <span className="block text-xs text-fg-subtle">{s.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          <p>{error}</p>
          {existingWithCode ? (
            <Link href={`${basePath}/${existingWithCode.id}`} className="mt-1 inline-flex items-center font-medium underline">
              Mevcut sınavı aç →
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid items-start gap-5 @min-[60rem]:grid-cols-[minmax(0,1fr)_19rem] @min-[80rem]:grid-cols-[minmax(0,1fr)_22rem]">
      <FormCard
        className="@container/form"
        title={WIZARD_STEPS[step - 1].title}
        description={WIZARD_STEPS[step - 1].hint}
        footer={
          <>
            <Button type="button" variant="ghost" className="sm:mr-auto" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
              ← Geri
            </Button>
            {step < 3 ? (
              <Button type="button" disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
                Devam et →
              </Button>
            ) : (
              <Button type="button" loading={busy} disabled={busy || !tenant} onClick={() => void create()}>
                Sınavı oluştur
              </Button>
            )}
          </>
        }
      >
        {step === 1 ? (
          <>
            <FormGroup title="Kimlik">
              <div className="grid gap-3 @min-[30rem]/form:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Field
                  label="Sınav kodu"
                  hint={existingWithCode ? undefined : "Boş bırakılırsa otomatik üretilir."}
                  error={existingWithCode ? "Bu kod kullanılıyor." : undefined}
                >
                  <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EX-A1-READ" className="font-mono" />
                </Field>
                <Field label="Sınav başlığı" required error={title === "" ? undefined : titleError}>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ör. A1 Okuma Ara Sınavı" />
                </Field>
              </div>
            </FormGroup>
            <FormGroup title="Sınav amacı" hint="Sonuç raporunun biçimini ve puan bantlarının yorumunu belirler.">
              <div className="grid gap-2 @min-[28rem]/form:grid-cols-2" role="radiogroup" aria-label="Sınav amacı">
                {PURPOSES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={purpose === p.value}
                    onClick={() => setPurpose(p.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      purpose === p.value ? "border-primary bg-primary-50/60 ring-1 ring-primary-200" : "border-border hover:border-border-strong hover:bg-neutral-50"
                    }`}
                  >
                    <span className="block text-[13px] font-semibold text-fg">{p.label}</span>
                    <span className="block text-xs text-fg-muted">{p.hint}</span>
                  </button>
                ))}
              </div>
            </FormGroup>
            <FormGroup title="Hedef kitle">
              <div className="grid gap-3 @min-[28rem]/form:grid-cols-2 @min-[46rem]/form:grid-cols-4">
                <Field label="En düşük seviye" error={levelError}>
                  <Select value={minLevel} onChange={(e) => setMinLevel(e.target.value)}>{CEFR.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
                </Field>
                <Field label="En yüksek seviye">
                  <Select value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)}>{CEFR.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
                </Field>
                <Field label="En küçük yaş" error={ageError}>
                  <Input type="number" min={3} inputMode="numeric" placeholder="—" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
                </Field>
                <Field label="En büyük yaş">
                  <Input type="number" min={3} inputMode="numeric" placeholder="—" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
                </Field>
              </div>
            </FormGroup>
            <FormGroup title="Puan ve süre">
              <div className="grid gap-3 @min-[28rem]/form:grid-cols-2">
                <Field label="Toplam puan" hint="Soru puanlarının toplamı yayından önce buna eşit olmalı.">
                  <Input type="number" min={1} value={totalPoints} onChange={(e) => setTotalPoints(e.target.value)} />
                </Field>
                <Field label="Süre" hint="Boş = süresiz. Bölüm bazlı süre sonradan verilebilir.">
                  <Input suffix="dk"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="Süresiz"
                    value={minutes}
                    onChange={(e) => setDurationSeconds(e.target.value === "" ? "" : String(Math.round(Number(e.target.value) * 60)))}
                  />
                </Field>
              </div>
            </FormGroup>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="grid gap-2 @min-[36rem]/form:grid-cols-3" role="radiogroup" aria-label="Başlangıç noktası">
              {START_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  onClick={() => setMode(m.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    mode === m.value ? "border-primary bg-primary-50/60 ring-1 ring-primary-200" : "border-border hover:border-border-strong hover:bg-neutral-50"
                  }`}
                >
                  <span className="block text-[13px] font-semibold text-fg">{m.label}</span>
                  <span className="block text-xs text-fg-muted">{m.hint}</span>
                </button>
              ))}
            </div>
            {mode === "format" ? (
              <Field label="Sınav formatı" error={modeError} hint={formats.length ? undefined : "Henüz format yok; Sınav Formatları sayfasından oluşturabilirsiniz."}>
                <Select value={formatId} onChange={(e) => setFormatId(e.target.value)}>
                  <option value="">Format seçin…</option>
                  {formats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
            ) : null}
            {mode === "copy" ? (
              <Field label="Kopyalanacak sınav" error={modeError} hint="Bölümler, alt bölümler, soru bağlantıları ve ayarlar kopyalanır.">
                <Select value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)}>
                  <option value="">Sınav seçin…</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.code})</option>)}
                </Select>
              </Field>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field label="Karşılama metni" hint="Öğrenci sınava başlamadan önce görür. HTML desteklenir.">
              <Textarea rows={4} value={welcomeHtml} onChange={(e) => setWelcomeHtml(e.target.value)} placeholder="Hoş geldiniz! Bu sınav 3 bölümden oluşur…" />
            </Field>
            <Field label="Sınav açıklaması" hint="Katalogda ve lisans ekranında görünür. HTML desteklenir.">
              <Textarea rows={4} value={descriptionHtml} onChange={(e) => setDescriptionHtml(e.target.value)} />
            </Field>
          </>
        ) : null}
      </FormCard>

      {/* Canlı özet: girilen değerler her adımda görünür; dar alanda formun altına iner. */}
      <aside aria-label="Sınav özeti" className="rounded-xl border border-border bg-surface shadow-sm @min-[60rem]:sticky @min-[60rem]:top-20">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold text-fg">Sınav özeti</h2>
          <p className="text-xs text-fg-subtle">Oluşturunca sınav kurucuya geçersiniz.</p>
        </header>
        <dl className="divide-y divide-border text-[13px]">
          {[
            { k: "Başlık", v: title || "—" },
            { k: "Kod", v: code || "otomatik", mono: true },
            { k: "Amaç", v: PURPOSES.find((p) => p.value === purpose)?.label ?? "—" },
            { k: "Seviye", v: `${minLevel}–${maxLevel}`, mono: true },
            { k: "Yaş", v: minAge || maxAge ? `${minAge || "?"}–${maxAge || "?"}` : "—" },
            { k: "Puan / süre", v: `${totalPoints || "—"} puan · ${minutes ? `${minutes} dk` : "süresiz"}` },
            { k: "Başlangıç", v: START_MODES.find((m) => m.value === mode)?.label ?? "—" },
          ].map((row) => (
            <div key={row.k} className="flex items-baseline justify-between gap-3 px-4 py-2">
              <dt className="shrink-0 text-fg-subtle">{row.k}</dt>
              <dd className={`min-w-0 truncate text-right font-medium text-fg ${row.mono ? "font-mono" : ""}`}>{row.v}</dd>
            </div>
          ))}
        </dl>
      </aside>
      </div>
    </div>
  );
}


type Sel =
  | { kind: "exam" }
  | { kind: "section"; sectionId: string }
  | { kind: "sub"; sectionId: string; subId: string }
  | { kind: "question"; sectionId: string; subId: string; linkId: string };

export function ExamBuilderPage({ examId }: { examId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = useContentBasePath("exams");
  const qBase = useContentBasePath("questions");
  const { tenant } = useAuthoringTenant();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [sel, setSel] = useState<Sel>({ kind: "exam" });
  const [error, setError] = useState<string | null>(null);
  const [bank, setBank] = useState<QuestionSummary[]>([]);
  const [bankPage, setBankPage] = useState(0);
  const [bankTotal, setBankTotal] = useState(0);
  const [bankQ, setBankQ] = useState("");
  const [bankCefr, setBankCefr] = useState("");
  const [bankSkill, setBankSkill] = useState("");
  const [confirm, setConfirm] = useState<null | { title: string; description: string; confirmLabel: string; run: () => Promise<unknown> }>(null);
  const [confirming, setConfirming] = useState(false);
  const [catalog, setCatalog] = useState<Record<string, QuestionSummary>>({});
  const tabParam = searchParams.get("tab");
  const tab = tabParam === "questions" || tabParam === "preview" || tabParam === "grants" ? tabParam : "detail";
  function selectTab(next: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next || "detail");
    router.replace(`?${params.toString()}`, { scroll: false });
  }
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
      .listQuestionsPage({
        status: "APPROVED",
        currentOnly: true,
        q: bankQ || undefined,
        cefr: bankCefr || undefined,
        skill: bankSkill || undefined,
        page: bankPage,
        size: 20,
      })
      .then((page) => {
        setBank(page.items);
        setBankTotal(page.total);
      })
      .catch(() => {
        setBank([]);
        setBankTotal(0);
      });
  }, [tenant, bankQ, bankCefr, bankSkill, bankPage]);

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
    return error ? (
      <ErrorState title="Sınav açılamadı" message={error} onRetry={() => void load()} compact />
    ) : (
      <div className="grid gap-4" aria-busy="true">
        <SkeletonStatus label="Sınav yükleniyor" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const rawPoints = questionPointsTotal(exam);
  const aggregation = String((exam.scoring as Record<string, unknown> | null | undefined)?.aggregation ?? "SUM_OF_POINTS");
  const pointsMustMatch = aggregation !== "WEIGHTED_BY_SECTION";
  const pointsMismatch = pointsMustMatch && Math.abs(rawPoints - Number(exam.totalPoints)) > 0.001;
  const attachedCount = exam.sections.reduce(
    (n, s) => n + s.subSections.reduce((m, ss) => m + ss.questions.length, 0),
    0,
  );

  function reorder(si: number, dir: -1 | 1) {
    if (!exam) return;
    const ids = exam.sections.map((x) => x.id);
    [ids[si + dir], ids[si]] = [ids[si], ids[si + dir]];
    void notify
      .run(authoringApi.reorderSections(exam.id, ids), { error: "Sıralama güncellenemedi" })
      .then(setExam)
      .catch(() => undefined);
  }

  function ask(title: string, description: string, confirmLabel: string, run: () => Promise<unknown>) {
    setConfirm({ title, description, confirmLabel, run });
  }

  const selCls = (on: boolean) =>
    on ? "bg-primary-50 font-semibold text-primary ring-1 ring-primary-200" : "text-fg hover:bg-neutral-50";

  return (
    <div className="space-y-4">
      <PageHeader
        title={exam.title}
        description={`${exam.code} · Sürüm ${exam.versionNumber} · ${purposeLabel(exam.purpose)} · ${exam.minLevel}–${exam.maxLevel}`}
        back={{ href: basePath, label: "Sınavlar" }}
        actions={
          <span className="flex items-center gap-2">
            {busy ? <span className="text-xs text-fg-subtle" aria-live="polite">Kaydediliyor…</span> : null}
            <StatusBadge status={exam.status} />
          </span>
        }
      />
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirm != null}
        pending={confirming}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        onClose={() => {
          if (!confirming) setConfirm(null);
        }}
        onConfirm={() => {
          if (!confirm) return;
          setConfirming(true);
          void confirm
            .run()
            .catch((e) => notify.error(errorMessage(e, "İşlem başarısız")))
            .finally(() => {
              setConfirming(false);
              setConfirm(null);
            });
        }}
      />
      <PointsMatchBanner
        raw={rawPoints}
        total={Number(exam.totalPoints)}
        mismatch={pointsMismatch}
        weighted={!pointsMustMatch}
        onAlign={() => void saveExamBasics({ totalPoints: rawPoints })}
      />

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <FilterTabs
          label="Sınav düzenleme"
          value={tab}
          onChange={selectTab}
          items={[
            { label: "Yapı ve ayarlar", value: "detail" },
            { label: "Soru ataması", value: "questions", count: attachedCount },
            { label: "Önizleme", value: "preview" },
            { label: "Atamalar", value: "grants" },
          ]}
        />
      </div>

      <div className={tab === "detail" ? "grid items-start gap-4 lg:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)]" : "hidden"}>
        {/* Sol: sınav ağacı */}
        <nav aria-label="Sınav yapısı" className="rounded-xl border border-border bg-surface shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-[13px] font-semibold text-fg">Sınav yapısı</p>
            <p className="text-xs text-fg-subtle">Bölüm → alt bölüm → soru. Düzenlemek için seçin.</p>
          </div>
          <div className="grid gap-1 p-2">
            <button type="button" className={`flex h-9 items-center gap-2 rounded-md px-2.5 text-left text-[13px] ${selCls(sel.kind === "exam")}`} onClick={() => setSel({ kind: "exam" })}>
              <span aria-hidden>⚙</span> Genel ayarlar
            </button>
            {exam.sections.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-fg-subtle">Henüz bölüm yok. Aşağıdan ilk bölümü ekleyin.</p>
            ) : null}
            {exam.sections.map((s, si) => (
              <div key={s.id} className="grid gap-0.5 border-t border-border pt-1">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    className={`flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 text-left text-[13px] ${selCls(sel.kind === "section" && sel.sectionId === s.id)}`}
                    onClick={() => setSel({ kind: "section", sectionId: s.id })}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-neutral-100 text-[11px] font-bold text-fg-muted">{si + 1}</span>
                    <span className="truncate">{s.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-fg-subtle">{skillLabel(s.skill)}</span>
                  </button>
                  <button type="button" className="inline-flex size-7 items-center justify-center rounded text-xs text-fg-subtle hover:bg-neutral-100 disabled:opacity-30" disabled={si === 0} onClick={() => reorder(si, -1)} aria-label={`${s.title} bölümünü yukarı taşı`}><IconArrowUp className="size-3.5" aria-hidden /></button>
                  <button type="button" className="inline-flex size-7 items-center justify-center rounded text-xs text-fg-subtle hover:bg-neutral-100 disabled:opacity-30" disabled={si === exam.sections.length - 1} onClick={() => reorder(si, 1)} aria-label={`${s.title} bölümünü aşağı taşı`}><IconArrowDown className="size-3.5" aria-hidden /></button>
                </div>
                <ul className="ml-4 grid gap-0.5 border-l border-border pl-2">
                  {s.subSections.map((ss) => {
                    const filled = ss.questions.length;
                    const need = Number(ss.selectionCount ?? ss.blueprint?.count ?? 0);
                    const ok = need > 0 ? filled >= need : filled > 0;
                    return (
                      <li key={ss.id}>
                        <button
                          type="button"
                          className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs ${selCls(sel.kind !== "exam" && "subId" in sel && sel.subId === ss.id)}`}
                          onClick={() => setSel({ kind: "sub", sectionId: s.id, subId: ss.id })}
                        >
                          <span className="truncate">{ss.title}</span>
                          <span className={`ml-auto shrink-0 rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums ${ok ? "bg-success-bg text-success" : "bg-warning-bg text-warning"}`} title={need ? `${filled} / ${need} soru` : `${filled} soru`}>
                            {filled}{need ? `/${need}` : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <button
                      type="button"
                      className="flex h-8 w-full items-center rounded-md px-2 text-left text-xs text-fg-subtle hover:bg-neutral-50 hover:text-primary"
                      onClick={() =>
                        void notify
                          .run(authoringApi.addSubSection(exam.id, s.id, `Alt bölüm ${s.subSections.length + 1}`), { success: "Alt bölüm eklendi", error: "Eklenemedi" })
                          .then(setExam)
                          .catch(() => undefined)
                      }
                    >
                      + Alt bölüm ekle
                    </button>
                  </li>
                </ul>
              </div>
            ))}
            <button
              type="button"
              className="mt-1 flex h-9 items-center justify-center rounded-lg border border-dashed border-border-strong text-[13px] font-medium text-fg-muted hover:border-primary-300 hover:bg-primary-50/40 hover:text-primary"
              onClick={() =>
                void notify
                  .run(authoringApi.addSection(exam.id, `Bölüm ${exam.sections.length + 1}`, "READING"), { success: "Bölüm eklendi", error: "Eklenemedi" })
                  .then(setExam)
                  .catch(() => undefined)
              }
            >
              + Bölüm ekle
            </button>
          </div>
        </nav>

        {/* Sağ: seçili öğenin ayarları */}
        <div className="min-w-0 space-y-4">
          {sel.kind === "exam" ? (
            <>
              <FormCard title="Temel bilgiler" description="Alandan çıkınca otomatik kaydedilir.">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Field label="Sınav başlığı"><Input value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} onBlur={() => void saveExamBasics({ title: exam.title })} /></Field>
                  </div>
                  <Field
                    label="Toplam puan"
                    error={pointsMismatch ? `Soru puanları ${formatPoints(rawPoints)}; eşit olmalı.` : undefined}
                    hint={pointsMismatch ? undefined : `Soru puanları: ${formatPoints(rawPoints)}`}
                  >
                    <Input type="number" value={exam.totalPoints} onChange={(e) => setExam({ ...exam, totalPoints: Number(e.target.value) })} onBlur={() => void saveExamBasics({ totalPoints: exam.totalPoints })} />
                  </Field>
                  <Field label="Süre" hint="Boş = süresiz">
                    <Input suffix="dk"
                      type="number"
                      min={1}
                      placeholder="Süresiz"
                      value={exam.durationSeconds == null ? "" : exam.durationSeconds / 60}
                      onChange={(e) => setExam({ ...exam, durationSeconds: e.target.value === "" ? null : Math.round(Number(e.target.value) * 60) })}
                      onBlur={() => void saveExamBasics({ durationSeconds: exam.durationSeconds })}
                    />
                  </Field>
                  <Field label="En küçük yaş"><Input type="number" placeholder="—" value={exam.minAge ?? ""} onChange={(e) => setExam({ ...exam, minAge: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => void saveExamBasics({ minAge: exam.minAge })} /></Field>
                  <Field label="En büyük yaş"><Input type="number" placeholder="—" value={exam.maxAge ?? ""} onChange={(e) => setExam({ ...exam, maxAge: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => void saveExamBasics({ maxAge: exam.maxAge })} /></Field>
                </div>
                <Field label="Karşılama metni" hint="Öğrenci sınava başlamadan önce görür. HTML desteklenir.">
                  <Textarea rows={3} value={exam.welcomeHtml ?? ""} onChange={(e) => setExam({ ...exam, welcomeHtml: e.target.value })} onBlur={() => void saveExamBasics({ welcomeHtml: exam.welcomeHtml })} />
                </Field>
              </FormCard>
              <EmbeddableEditor
                exam={exam}
                onSave={saveSettings}
                onSecurity={(level) =>
                  notify
                    .run(authoringApi.setExamSecurityLevel(exam.id, level), { error: "Güvenlik düzeyi kaydedilemedi" })
                    .then(setExam)
                    .then(() => undefined)
                }
              />
              <ScoreBandsEditor exam={exam} setExam={setExam} ask={ask} />
            </>
          ) : null}

          {sel.kind === "section" && section ? (
            <FormCard
              key={section.id}
              title={`Bölüm: ${section.title}`}
              description={`${section.subSections.length} alt bölüm · ${section.subSections.reduce((n, ss) => n + ss.questions.length, 0)} soru`}
              footer={
                <>
                  <Button
                    variant="danger"
                    className="sm:mr-auto"
                    onClick={() =>
                      ask(
                        "Bölüm silinsin mi?",
                        `"${section.title}" bölümü, alt bölümleri ve soru bağlantılarıyla birlikte silinir. Sorular bankada kalır.`,
                        "Bölümü sil",
                        () =>
                          notify
                            .run(authoringApi.removeSection(exam.id, section.id), { success: "Bölüm silindi", error: "Silinemedi" })
                            .then((e) => {
                              setExam(e);
                              setSel({ kind: "exam" });
                            }),
                      )
                    }
                  >
                    Bölümü sil
                  </Button>
                  <Button
                    onClick={() => {
                      const title = (document.getElementById("sec-title") as HTMLInputElement).value;
                      const skill = selectValue("sec-skill", section.skill);
                      const minutes = numOrNull("sec-dur");
                      const breakMinutes = numOrNull("sec-break");
                      void notify
                        .run(
                          authoringApi.updateSection(exam.id, section.id, {
                            title,
                            skill,
                            durationSeconds: minutes == null ? null : Math.round(minutes * 60),
                            breakAfterSeconds: breakMinutes == null ? null : Math.round(breakMinutes * 60),
                            weightPercent: numOrNull("sec-weight"),
                            minPassingPercent: numOrNull("sec-pass"),
                            instructionsHtml: (document.getElementById("sec-inst") as HTMLTextAreaElement).value,
                          }),
                          { success: "Bölüm kaydedildi", error: "Kaydedilemedi" },
                        )
                        .then(setExam)
                        .catch(() => undefined);
                    }}
                  >
                    Bölümü kaydet
                  </Button>
                </>
              }
            >
              <FormGroup title="Kimlik">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <Field label="Bölüm adı"><Input defaultValue={section.title} id="sec-title" /></Field>
                  <Field label="Beceri">
                    <Select defaultValue={section.skill} id="sec-skill" name="sec-skill">
                      {SKILL_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </Select>
                  </Field>
                </div>
              </FormGroup>
              <FormGroup title="Süre ve puanlama" hint="Boş bırakılan alanlarda sınav geneli ayarı geçerlidir.">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Bölüm süresi"><Input suffix="dk" type="number" min={0} placeholder="Sınav süresi" defaultValue={section.durationSeconds == null ? "" : section.durationSeconds / 60} id="sec-dur" /></Field>
                  <Field label="Sonrasında mola"><Input suffix="dk" type="number" min={0} placeholder="Mola yok" defaultValue={section.breakAfterSeconds == null ? "" : section.breakAfterSeconds / 60} id="sec-break" /></Field>
                  <Field label="Ağırlık" hint="Yalnız ağırlıklı puanlamada"><Input suffix="%" type="number" min={0} max={100} placeholder="—" defaultValue={section.weightPercent ?? ""} id="sec-weight" /></Field>
                  <Field label="Bölüm baraj puanı"><Input suffix="%" type="number" min={0} max={100} placeholder="Baraj yok" defaultValue={section.minPassingPercent ?? ""} id="sec-pass" /></Field>
                </div>
              </FormGroup>
              <Field label="Bölüm yönergesi" hint="Bölüm başında öğrenciye gösterilir.">
                <Textarea rows={3} defaultValue={section.instructionsHtml ?? ""} id="sec-inst" />
              </Field>
            </FormCard>
          ) : null}

          {sel.kind === "sub" && sub && section ? (
            <FormCard
              key={sub.id}
              title={`Alt bölüm: ${sub.title}`}
              description={`${section.title} bölümünde · ${sub.questions.length} soru bağlı`}
              footer={
                <>
                  <Button
                    variant="danger"
                    className="sm:mr-auto"
                    onClick={() =>
                      ask(
                        "Alt bölüm silinsin mi?",
                        `"${sub.title}" alt bölümü ve ${sub.questions.length} soru bağlantısı silinir. Sorular bankada kalır.`,
                        "Alt bölümü sil",
                        () =>
                          notify
                            .run(authoringApi.removeSubSection(exam.id, section.id, sub.id), { success: "Alt bölüm silindi", error: "Silinemedi" })
                            .then((e) => {
                              setExam(e);
                              setSel({ kind: "section", sectionId: section.id });
                            }),
                      )
                    }
                  >
                    Alt bölümü sil
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void notify
                        .run(authoringApi.autoFill(exam.id, sub.id, 5), { success: "Bankadan 5 soru eklendi", error: "Doldurma başarısız" })
                        .then(() => load())
                        .catch(() => undefined)
                    }
                    title="Kriterlere uyan onaylı sorulardan 5 tanesini ekler"
                  >
                    Bankadan otomatik doldur
                  </Button>
                  <Button
                    onClick={() => {
                      const parse = (id: string, name: string) => {
                        const raw = (document.getElementById(id) as HTMLTextAreaElement).value.trim();
                        if (!raw) return { ok: true as const, value: null };
                        try {
                          return { ok: true as const, value: JSON.parse(raw) };
                        } catch {
                          notify.error(`${name} geçerli JSON değil; kaydedilmedi.`);
                          return { ok: false as const, value: null };
                        }
                      };
                      const bp = parse("sub-bp", "Şablon (blueprint)");
                      const bc = parse("sub-bc", "Banka kriterleri");
                      if (!bp.ok || !bc.ok) return;
                      void notify
                        .run(
                          authoringApi.updateSubSection(exam.id, sub.id, {
                            title: (document.getElementById("sub-title") as HTMLInputElement).value,
                            taskType: (document.getElementById("sub-task") as HTMLInputElement).value || null,
                            selectionMode: selectValue("sub-mode", sub.selectionMode),
                            selectionCount: numOrNull("sub-count"),
                            blueprint: bp.value,
                            bankCriteria: bc.value,
                          }),
                          { success: "Alt bölüm kaydedildi", error: "Kaydedilemedi" },
                        )
                        .then(setExam)
                        .catch(() => undefined);
                    }}
                  >
                    Alt bölümü kaydet
                  </Button>
                </>
              }
            >
              <FormGroup title="Kimlik">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Alt bölüm adı"><Input defaultValue={sub.title} id="sub-title" /></Field>
                  <Field label="Görev türü" hint="İsteğe bağlı etiket (ör. Part 1 – Eşleştirme)"><Input defaultValue={sub.taskType ?? ""} id="sub-task" placeholder="—" /></Field>
                </div>
              </FormGroup>
              <FormGroup title="Soru seçimi" hint="Öğrenciye hangi soruların, kaç tane gösterileceği.">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <Field label="Seçim yöntemi">
                    <Select defaultValue={sub.selectionMode} id="sub-mode" name="sub-mode">
                      {SELECTION_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Gösterilecek soru sayısı" hint="Boş = bağlı soruların tümü"><Input type="number" min={1} placeholder="Tümü" defaultValue={sub.selectionCount ?? ""} id="sub-count" /></Field>
                </div>
                <ul className="grid gap-1 rounded-lg bg-neutral-50 p-3 text-xs text-fg-muted ring-1 ring-border ring-inset">
                  {SELECTION_MODES.map((m) => (
                    <li key={m.value}><span className="font-semibold text-fg">{m.label}:</span> {m.hint}</li>
                  ))}
                </ul>
              </FormGroup>
              <details className="group rounded-lg border border-border">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-[13px] font-medium text-fg">
                  Gelişmiş: şablon ve banka kriterleri (JSON)
                  <span aria-hidden className="text-fg-subtle transition group-open:rotate-90">›</span>
                </summary>
                <div className="grid gap-3 border-t border-border p-3 lg:grid-cols-2">
                  <Field label="Şablon (blueprint)" hint='ör. { "count": 5 }'>
                    <Textarea rows={5} className="font-mono text-xs" defaultValue={JSON.stringify(sub.blueprint ?? { count: 5 }, null, 2)} id="sub-bp" />
                  </Field>
                  <Field label="Banka kriterleri" hint='ör. { "count": 5, "pointsPerQuestion": 2, "cefr": "A2" }'>
                    <Textarea rows={5} className="font-mono text-xs" defaultValue={JSON.stringify(sub.bankCriteria ?? {}, null, 2)} id="sub-bc" />
                  </Field>
                </div>
              </details>
              <FormGroup title={`Bağlı sorular (${sub.questions.length})`} hint="Puan ve rolü düzenlemek için soruya tıklayın.">
                {sub.questions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[13px] text-fg-subtle">
                    Soru yok.{" "}
                    <button type="button" className="min-h-11 font-medium text-primary hover:underline" onClick={() => selectTab("questions")}>
                      Soru ataması sekmesinden ekleyin →
                    </button>
                  </p>
                ) : (
                  <ol className="grid gap-1">
                    {sub.questions.map((q, i) => {
                      const known = catalog[q.questionVersionId];
                      return (
                        <li key={q.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left text-[13px] hover:border-primary-300 hover:bg-primary-50/30"
                            onClick={() => setSel({ kind: "question", sectionId: section.id, subId: sub.id, linkId: q.id })}
                          >
                            <span className="w-5 text-right text-xs text-fg-subtle tabular-nums">{i + 1}.</span>
                            <span className="font-mono text-xs font-medium text-fg">{known?.code ?? `${q.questionVersionId.slice(0, 8)}…`}</span>
                            <span className="truncate text-xs text-fg-muted">{known ? getTemplate(known.primaryType)?.label ?? known.primaryType : ""}</span>
                            <span className="ml-auto shrink-0 text-xs text-fg-subtle">{roleLabel(q.role)}</span>
                            <span className="w-14 shrink-0 text-right text-xs font-semibold text-fg tabular-nums">{q.points} p</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </FormGroup>
            </FormCard>
          ) : null}

          {sel.kind === "question" && link ? (
            <FormCard
              key={link.id}
              title={`Soru: ${catalog[link.questionVersionId]?.code ?? link.questionVersionId.slice(0, 8)}`}
              description={`${section?.title ?? ""} › ${sub?.title ?? ""}`}
              aside={
                <Link href={`${qBase}/${link.questionVersionId}`} className="text-[13px] font-medium text-primary hover:underline">
                  Soruyu düzenle →
                </Link>
              }
              footer={
                <Button
                  variant="danger"
                  className="sm:mr-auto"
                  onClick={() =>
                    ask(
                      "Soru kaldırılsın mı?",
                      "Soru bu alt bölümden çıkar. Soru bankadan silinmez.",
                      "Kaldır",
                      () =>
                        notify
                          .run(authoringApi.detachQuestion(exam.id, link.id), { success: "Soru kaldırıldı", error: "Kaldırılamadı" })
                          .then((e) => {
                            setExam(e);
                            setSel({ kind: "sub", sectionId: sel.sectionId, subId: sel.subId });
                          }),
                    )
                  }
                >
                  Sınavdan kaldır
                </Button>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Rol" hint={ROLES.find((r) => r.value === link.role)?.hint}>
                  <Select
                    value={link.role}
                    onChange={(e) =>
                      void notify
                        .run(authoringApi.updateQuestionLink(exam.id, link.id, { role: e.target.value }), { error: "Rol güncellenemedi" })
                        .then(setExam)
                        .catch(() => undefined)
                    }
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                </Field>
                <Field label="Puan" hint="Alandan çıkınca kaydedilir.">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    key={`${link.id}-${link.points}`}
                    defaultValue={link.points}
                    onBlur={(e) =>
                      Number(e.target.value) !== Number(link.points) &&
                      void notify
                        .run(authoringApi.updateQuestionLink(exam.id, link.id, { points: Number(e.target.value) }), { error: "Puan güncellenemedi" })
                        .then(setExam)
                        .catch(() => undefined)
                    }
                  />
                </Field>
              </div>
            </FormCard>
          ) : null}

          <FormCard
            title="Yayın"
            description="Sırayla: doğrula → incelemeye gönder → yayınla. Yayınlanan sınav kurumlara lisanslanabilir."
          >
            <div className="flex flex-wrap items-center gap-2">
              {exam.status === "DRAFT" || exam.status === "IN_REVIEW" ? (
                <>
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    onClick={() =>
                      void notify
                        .run(authoringApi.validateExam(exam.id), { error: "Doğrulama başarısız" })
                        .then((v) => {
                          setViolations(v);
                          const errors = v.filter((x) => x.severity === "ERROR");
                          if (errors.length === 0) notify.success("Eksik yok");
                          else notify.error(`${errors.length} hata bulundu`);
                        })
                        .catch(() => undefined)
                    }
                  >
                    Eksikleri kontrol et
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    disabled={pointsMismatch || exam.status !== "DRAFT"}
                    onClick={() =>
                      void notify
                        .run(authoringApi.submitExam(exam.id), { success: "İncelemeye gönderildi", error: "Gönderilemedi" })
                        .then(setExam)
                        .catch(() => undefined)
                    }
                  >
                    İncelemeye gönder
                  </Button>
                  <Button
                    className="min-h-11"
                    disabled={pointsMismatch}
                    onClick={() =>
                      ask(
                        "Sınav yayınlansın mı?",
                        "Yayınlanan sürüm kurumlara lisanslanabilir. İçerik değişirse sınav taslağa çekilip yeniden yayınlanır ve sürüm numarası artar.",
                        "Yayınla",
                        () => notify.run(authoringApi.publishExam(exam.id), { success: "Yayınlandı", error: "Yayınlanamadı" }).then(setExam),
                      )
                    }
                  >
                    Yayınla
                  </Button>
                </>
              ) : null}
              {exam.status === "PUBLISHED" ? (
                <Button
                  variant="secondary"
                  className="min-h-11"
                  onClick={() =>
                    ask(
                      "Sınav yayından kaldırılsın mı?",
                      "Yeni atama ve yeni oturum açılamaz. Devam eden oturumlar tamamlanabilir.",
                      "Yayından kaldır",
                      () => notify.run(authoringApi.unpublishExam(exam.id), { success: "Yayından kaldırıldı", error: "Kaldırılamadı" }).then(setExam),
                    )
                  }
                >
                  Yayından kaldır
                </Button>
              ) : null}
              {exam.status === "UNPUBLISHED" ? (
                <Button
                  className="min-h-11"
                  onClick={() =>
                    ask(
                      "Sınav tekrar yayınlansın mı?",
                      "İçerik değişmediği için aynı sürüm kullanılır.",
                      "Tekrar yayınla",
                      () => notify.run(authoringApi.republishExam(exam.id), { success: "Yeniden yayınlandı", error: "Yayınlanamadı" }).then(setExam),
                    )
                  }
                >
                  Tekrar yayınla
                </Button>
              ) : null}
              {exam.status === "PUBLISHED" || exam.status === "UNPUBLISHED" ? (
                <Button
                  variant="secondary"
                  className="min-h-11"
                  onClick={() =>
                    ask(
                      "Sınav taslağa çekilsin mi?",
                      "Sınav düzenlenebilir olur ve yayından kalkar. Yeniden yayınlandığında sürüm artar; kurum lisansları yeni sürüme taşınır. Başlamış oturumlar eski sürümde kalır.",
                      "Taslağa çek",
                      () => notify.run(authoringApi.revertExamDraft(exam.id), { success: "Taslağa çekildi", error: "Taslağa çekilemedi" }).then(setExam),
                    )
                  }
                >
                  Taslağa çek
                </Button>
              ) : null}
              {pointsMismatch && (exam.status === "DRAFT" || exam.status === "IN_REVIEW") ? (
                <span className="text-xs text-danger">Puanlar eşitlenmeden gönderilemez.</span>
              ) : null}
            </div>
            {violations.length ? (
              <ul className="grid max-h-72 gap-1.5 overflow-y-auto">
                {violations.map((v, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border px-3 py-2 text-[13px] ${
                      v.severity === "ERROR" ? "border-danger/20 bg-danger-bg/50 text-danger" : "border-warning/20 bg-warning-bg/50 text-warning"
                    }`}
                  >
                    <span className="mr-2 rounded bg-surface px-1.5 py-0.5 text-[10.5px] font-bold">{v.severity === "ERROR" ? "HATA" : "UYARI"}</span>
                    {v.message}
                    <span className="block font-mono text-[11px] opacity-70">{v.path}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </FormCard>
        </div>
      </div>

      <div className={tab === "preview" ? "block" : "hidden"}>
        <ExamPreviewTab examId={exam.id} />
      </div>
      <div className={tab === "grants" ? "block" : "hidden"}>
        <ExamGrantsTab exam={exam} />
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
          bankPage={bankPage}
          bankTotal={bankTotal}
          onSearch={(value) => {
            setBankPage(0);
            setBankQ(value);
          }}
          onCefr={(value) => {
            setBankPage(0);
            setBankCefr(value);
          }}
          onSkill={(value) => {
            setBankPage(0);
            setBankSkill(value);
          }}
          onPage={setBankPage}
          onUpgrade={(linkId) => {
            void notify
              .run(authoringApi.upgradeQuestionVersion(exam.id, linkId), { success: "Sürüm güncellendi", error: "Güncellenemedi" })
              .then(setExam)
              .catch(() => undefined);
          }}
          onPickSub={setAttachSubId}
          onAttach={(versionId) => {
            if (!attachSubId) {
              notify.error("Önce sağdan bir alt bölüm seçin");
              return;
            }
            void notify
              .run(authoringApi.attachQuestion(exam.id, attachSubId, versionId), { success: "Soru eklendi", error: "Soru eklenemedi" })
              .then(setExam)
              .catch(() => undefined);
          }}
          onDetach={(linkId) => {
            ask(
              "Soru kaldırılsın mı?",
              "Soru bu alt bölümden çıkar. Soru bankadan silinmez.",
              "Kaldır",
              () => notify.run(authoringApi.detachQuestion(exam.id, linkId), { success: "Soru kaldırıldı", error: "Kaldırılamadı" }).then(setExam),
            );
          }}
          onPoints={(linkId, points) => {
            void notify
              .run(authoringApi.updateQuestionLink(exam.id, linkId, { points }), { error: "Puan güncellenemedi" })
              .then(setExam)
              .catch(() => undefined);
          }}
        />
      </div>
    </div>
  );
}

const SELECTION_MODES = [
  { value: "FIXED", label: "Sabit liste", hint: "Bağladığınız sorular, bu sırayla herkese gösterilir." },
  { value: "RANDOM_SUBSET", label: "Bağlı sorulardan rastgele", hint: "Bağlı sorular arasından belirtilen sayıda rastgele seçilir." },
  { value: "BANK_QUERY", label: "Bankadan kritere göre", hint: "Banka kriterlerine uyan onaylı sorulardan her öğrenciye ayrı seçilir." },
  { value: "BLUEPRINT", label: "Şablona göre", hint: "Şablondaki dağılıma (beceri, seviye, adet) göre seçilir." },
];

const ROLES = [
  { value: "SCORED", label: "Puanlı", hint: "Sonuca dahil edilir." },
  { value: "EXAMPLE", label: "Örnek", hint: "Öğrenciye çözümlü örnek olarak gösterilir; puanlanmaz." },
  { value: "PRETEST", label: "Deneme (ön test)", hint: "Öğrenci çözer ama puana katılmaz; soru istatistiği toplanır." },
];

function roleLabel(role?: string | null) {
  return ROLES.find((r) => r.value === role)?.label ?? role ?? "—";
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
      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-[13px] text-fg-muted">
        Ağırlıklı puanlama açık: bölüm ağırlıkları kullanılır. Ham soru puanı {formatPoints(raw)}, sınav toplamı {formatPoints(total)}.
      </p>
    );
  }
  return (
    <div
      role={mismatch ? "alert" : "status"}
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        mismatch ? "border-danger/25 bg-danger-bg" : "border-success/20 bg-success-bg/50"
      }`}
    >
      <p className={`text-[13px] ${mismatch ? "text-danger" : "text-success"}`}>
        {mismatch ? "⚠ " : "✓ "}Soru puanları <span className="font-semibold tabular-nums">{formatPoints(raw)}</span>
        {" · "}sınav toplamı <span className="font-semibold tabular-nums">{formatPoints(total)}</span>
        {mismatch ? " — yayından önce eşit olmalı." : " — eşit."}
      </p>
      {mismatch && raw > 0 ? (
        <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={onAlign}>
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
  bankPage,
  bankTotal,
  attachSubId,
  rawPoints,
  pointsMismatch,
  onSearch,
  onCefr,
  onSkill,
  onPage,
  onPickSub,
  onAttach,
  onDetach,
  onPoints,
  onUpgrade,
}: {
  exam: ExamDetail;
  bank: QuestionSummary[];
  catalog: Record<string, QuestionSummary>;
  qBase: string;
  bankQ: string;
  bankCefr: string;
  bankSkill: string;
  bankPage: number;
  bankTotal: number;
  attachSubId: string;
  rawPoints: number;
  pointsMismatch: boolean;
  onSearch: (value: string) => void;
  onCefr: (value: string) => void;
  onSkill: (value: string) => void;
  onPage: (page: number) => void;
  onPickSub: (id: string) => void;
  onAttach: (versionId: string) => void;
  onDetach: (linkId: string) => void;
  onPoints: (linkId: string, points: number) => void;
  onUpgrade: (linkId: string) => void;
}) {
  const [openPreview, setOpenPreview] = useState<string | null>(null);
  const attachedByQuestion = new Map(
    exam.sections.flatMap((section) =>
      section.subSections.flatMap((sub) => sub.questions.map((q) => [q.questionId, q] as const)),
    ),
  );
  const pageCount = Math.max(1, Math.ceil(bankTotal / 20));
  const target = exam.sections.flatMap((s) => s.subSections.map((ss) => ({ s, ss }))).find((x) => x.ss.id === attachSubId);
  const hasTarget = Boolean(target);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <section aria-label="Soru bankası" className="flex min-h-0 flex-col rounded-xl border border-border bg-surface shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)]">
        <div className="grid gap-2.5 border-b border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-semibold text-fg">Soru bankası</h2>
              <p className="text-xs text-fg-subtle">Yalnız güncel onaylı sürüm · {bankTotal} soru</p>
            </div>
            <ButtonLink href={`${qBase}/new`} variant="secondary" size="sm">
              + Yeni soru
            </ButtonLink>
          </div>
          <Input type="search" placeholder="Soru kodu ara…" value={bankQ} onChange={(e) => onSearch(e.target.value)} aria-label="Soru ara" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={bankCefr} onChange={(e) => onCefr(e.target.value)} aria-label="Seviye filtresi">
              <option value="">Tüm seviyeler</option>
              {CEFR.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={bankSkill} onChange={(e) => onSkill(e.target.value)} aria-label="Beceri filtresi">
              <option value="">Tüm beceriler</option>
              {SKILL_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <p className={`rounded-md px-2.5 py-1.5 text-xs ${hasTarget ? "bg-primary-50 text-primary" : "bg-warning-bg text-warning"}`}>
            {hasTarget ? (
              <>Eklenecek yer: <strong>{target?.s.title} › {target?.ss.title}</strong></>
            ) : (
              "Önce Yapı sekmesinden bir alt bölüm ekleyin."
            )}
          </p>
        </div>
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
          {bank.length === 0 ? (
            <li className="px-3 py-8 text-center text-[13px] text-fg-subtle">Bu filtreye uyan onaylı soru yok.</li>
          ) : (
            bank.map((q) => {
              const linked = attachedByQuestion.get(q.questionId);
              const added = Boolean(linked);
              return (
                <li key={q.versionId} className={`flex items-center gap-2 rounded-lg border p-2 ${added ? "border-success/25 bg-success-bg/30" : "border-border"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <HoverPreview label={q.code} preview={<QuestionPreviewLoader versionId={q.versionId} />}>
                        <Link href={`${qBase}/${q.versionId}`} className="truncate font-mono text-[13px] font-medium text-fg hover:text-primary">
                          {q.code} - v{q.versionNo}
                        </Link>
                      </HoverPreview>
                      {q.cefrLevel ? <span className="rounded bg-(--accent-plum-bg) px-1 font-mono text-[10.5px] font-semibold text-(--accent-plum)">{q.cefrLevel}</span> : null}
                    </div>
                    <p className="truncate text-xs text-fg-muted">
                      {getTemplate(q.primaryType)?.label ?? q.primaryType ?? "—"} · {questionSkillText(q)}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant={added ? "ghost" : "primary"} className="shrink-0" disabled={added || !hasTarget} onClick={() => onAttach(q.versionId)}>
                    {added ? `Ekli (v${linked?.versionNo ?? q.versionNo})` : "+ Ekle"}
                  </Button>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <Button type="button" variant="secondary" size="sm" disabled={bankPage <= 0} onClick={() => onPage(bankPage - 1)}>
            Önceki
          </Button>
          <span className="text-xs text-fg-muted tabular-nums">{bankPage + 1} / {pageCount}</span>
          <Button type="button" variant="secondary" size="sm" disabled={bankPage + 1 >= pageCount} onClick={() => onPage(bankPage + 1)}>
            Sonraki
          </Button>
        </div>
      </section>

      <section aria-label="Sınavdaki sorular" className="min-h-0 rounded-xl border border-border bg-surface shadow-sm">
        <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
          <div>
            <h2 className="text-[13px] font-semibold text-fg">Sınavdaki sorular</h2>
            <p className="text-xs text-fg-subtle">Bir alt bölüme tıklayın; bankadan eklenen sorular oraya gider.</p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${pointsMismatch ? "bg-danger-bg text-danger" : "bg-neutral-100 text-fg"}`}>
            {formatPoints(rawPoints)} / {formatPoints(Number(exam.totalPoints))} puan
          </span>
        </div>
        <div className="space-y-5 p-4">
          {exam.sections.length === 0 ? (
            <EmptyState compact title="Henüz bölüm yok" description="Önce Yapı sekmesinden bölüm (ör. Dinleme, Okuma) ekleyin; sorular bölümlere atanır." />
          ) : (
            exam.sections.map((section, si) => (
              <div key={section.id} className="space-y-2">
                <h3 className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                  <span className="flex size-5 items-center justify-center rounded bg-neutral-100 text-[11px] font-bold text-fg-muted">{si + 1}</span>
                  {section.title}
                  <span className="font-normal text-fg-subtle">· {skillLabel(section.skill)}</span>
                </h3>
                {section.subSections.length === 0 ? (
                  <p className="text-xs text-fg-subtle">Alt bölüm yok.</p>
                ) : (
                  section.subSections.map((sub) => {
                    const active = sub.id === attachSubId;
                    return (
                      <div key={sub.id} className={`rounded-lg border ${active ? "border-primary ring-2 ring-primary/15" : "border-border"}`}>
                        <button
                          type="button"
                          aria-expanded={active}
                          className={`flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left ${active ? "rounded-t-lg bg-primary-50/60" : "rounded-lg hover:bg-neutral-50"}`}
                          onClick={() => onPickSub(sub.id)}
                        >
                          <span className="text-[13px] font-medium text-fg">{sub.title} <span className="font-normal text-fg-subtle">({sub.questions.length})</span></span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? "bg-primary text-white" : "bg-neutral-100 text-fg-subtle"}`}>
                            {active ? "Açık" : "Aç"}
                          </span>
                        </button>
                        {active && sub.questions.length === 0 ? (
                          <p className="border-t border-border px-3 py-3 text-xs text-fg-subtle">Bu alt bölümde soru yok. Soldan ekleyebilirsiniz.</p>
                        ) : null}
                        {active && sub.questions.length > 0 ? (
                          <ul className="divide-y divide-border border-t border-border">
                            {sub.questions.map((link, index) => {
                              const known = catalog[link.questionVersionId];
                              const newer = exam.status === "DRAFT" && link.currentVersionNo > link.versionNo;
                              const shown = openPreview === link.id;
                              return (
                                <li key={link.id} className="px-3 py-2">
                                  <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-2">
                                    <span className="text-right text-xs text-fg-subtle tabular-nums">{index + 1}.</span>
                                    <div className="min-w-0">
                                      <p className="truncate font-mono text-[13px] font-medium text-fg">{known?.code ?? "Soru"} - v{link.versionNo}</p>
                                      <p className="truncate text-xs text-fg-muted">
                                        {known ? `${getTemplate(known.primaryType)?.label ?? known.primaryType ?? "—"} · ` : ""}
                                        {roleLabel(link.role)}
                                      </p>
                                    </div>
                                    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
                                      <Input
                                        type="number"
                                        min={0}
                                        step="0.5"
                                        className="w-16 text-right"
                                        key={`${link.id}-${link.points}`}
                                        defaultValue={link.points}
                                        aria-label={`${known?.code ?? "Soru"} puanı`}
                                        onBlur={(e) => Number(e.target.value) !== Number(link.points) && onPoints(link.id, Number(e.target.value))}
                                      />
                                      puan
                                    </label>
                                    <Button type="button" variant="ghost" className="size-11" onClick={() => onDetach(link.id)} aria-label={`${known?.code ?? "Soru"} kaldır`}>
                                      <IconX className="size-3.5" aria-hidden />
                                    </Button>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 pl-6">
                                    <Button type="button" variant="secondary" size="sm" onClick={() => setOpenPreview(shown ? null : link.id)}>
                                      {shown ? "Önizlemeyi gizle" : "Soruyu göster"}
                                    </Button>
                                    {newer ? (
                                      <Button type="button" variant="secondary" size="sm" onClick={() => onUpgrade(link.id)}>
                                        v{link.currentVersionNo} mevcut – Güncelle
                                      </Button>
                                    ) : null}
                                  </div>
                                  {shown ? (
                                    <div className="mt-2 min-w-0">
                                      <QuestionPreviewLoader versionId={link.questionVersionId} />
                                    </div>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
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

/**
 * Admin Select'te `id` görünen butona verilir; değer gizli native <select name>'dedir.
 * `getElementById(id).value` butonun boş değerini okur — bu yüzden `name` ile native select okunur.
 */
function selectValue(name: string, fallback: string) {
  return document.querySelector<HTMLSelectElement>(`select[name="${name}"]`)?.value || fallback;
}

function numOrNull(id: string) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el || el.value === "") return null;
  return Number(el.value);
}

function EmbeddableEditor({
  exam,
  onSave,
  onSecurity,
}: {
  exam: ExamDetail;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onSecurity: (level: string) => Promise<void>;
}) {
  const session = (exam.session || {}) as Record<string, unknown>;
  const navigation = (exam.navigation || {}) as Record<string, unknown>;
  const media = (exam.media || {}) as Record<string, unknown>;
  const randomization = (exam.randomization || {}) as Record<string, unknown>;
  const scoring = (exam.scoring || {}) as Record<string, unknown>;
  const results = (exam.results || {}) as Record<string, unknown>;
  const attemptPolicy = (exam.attemptPolicy || {}) as Record<string, unknown>;
  const level = exam.securityLevel || "STANDARD";
  const rules = level === "OPEN"
    ? ["Kopyalama ve sekme değişimi serbesttir.", "Sekme değişimi yalnızca kayda geçer."]
    : level === "STRICT"
      ? ["Kopyala-yapıştır ve sağ tık kapalıdır.", "Odak kaybında uyarı gösterilir.", "3. odak kaybında sınav otomatik teslim edilir.", "Cihaz destekliyorsa tam ekran istenir."]
      : ["Kopyala-yapıştır ve sağ tık kapalıdır.", "Odak kaybında uyarı gösterilir.", "3. odak kaybında başvuru şüpheli işaretlenir; sınav devam eder."];

  return (
    <FormCard title="Sınav kuralları" description="Değişiklikler anında kaydedilir.">
      <FormGroup title="Oturum ve süre">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Süre uygulaması">
            <Select value={String(session.timingMode ?? "UNTIMED")} onChange={(e) => void onSave({ session: { ...session, timingMode: e.target.value } })}>
              <option value="UNTIMED">Süresiz</option>
              <option value="EXAM_TIMED">Sınav geneli süre</option>
              <option value="SECTION_TIMED">Bölüm bazlı süre</option>
            </Select>
          </Field>
          <Field label="En erken teslim" hint="Bu süreden önce “Bitir” pasif">
            <Input suffix="sn" type="number" min={0} defaultValue={Number(session.minSubmitSeconds ?? 0)} onBlur={(e) => void onSave({ session: { ...session, minSubmitSeconds: Number(e.target.value) } })} />
          </Field>
          <Field label="Deneme hakkı">
            <Input type="number" min={1} defaultValue={Number(attemptPolicy.maxAttempts ?? 1)} onBlur={(e) => void onSave({ attemptPolicy: { ...attemptPolicy, maxAttempts: Number(e.target.value) } })} />
          </Field>
        </div>
      </FormGroup>
      <FormGroup title="Gezinme ve sıralama">
        <div className="grid gap-2 sm:grid-cols-2">
          <SettingToggle label="Önceki soruya dönebilir" description="Kapalıysa öğrenci geçtiği soruya geri dönemez." checked={navigation.allowBack !== false} onChange={(e) => void onSave({ navigation: { ...navigation, allowBack: e.target.checked } })} />
          <SettingToggle label="Soru atlayabilir" description="Cevaplamadan sonraki soruya geçebilir." checked={!!navigation.allowSkip} onChange={(e) => void onSave({ navigation: { ...navigation, allowSkip: e.target.checked } })} />
          <SettingToggle label="Soru işaretleyebilir" description="Sonra dönmek için soruya bayrak koyabilir." checked={navigation.allowFlag !== false} onChange={(e) => void onSave({ navigation: { ...navigation, allowFlag: e.target.checked } })} />
          <SettingToggle label="Bölümler sırayla açılır" description="Öğrenci bir bölümü bitirmeden sonrakine geçemez." checked={navigation.sequentialSections !== false} onChange={(e) => void onSave({ navigation: { ...navigation, sequentialSections: e.target.checked } })} />
          <SettingToggle label="Bitirilen bölüme geri dönülebilir" description="Çıkılan veya bitirilen bölüme tekrar girilebilir." checked={navigation.allowReturnAfterLeave !== false} onChange={(e) => void onSave({ navigation: { ...navigation, allowReturnAfterLeave: e.target.checked } })} />
          <SettingToggle label="Soruları karıştır" description="Her öğrenci soruları farklı sırada görür (bölüm içinde)." checked={!!randomization.shuffleQuestions} onChange={(e) => void onSave({ randomization: { ...randomization, shuffleQuestions: e.target.checked } })} />
          <SettingToggle label="Seçenekleri karıştır" description="Tüm sorularda şık sırası öğrenciye göre değişir; soru ayarı açıksa o geçerli." checked={!!randomization.shuffleOptions} onChange={(e) => void onSave({ randomization: { ...randomization, shuffleOptions: e.target.checked } })} />
        </div>
      </FormGroup>
      <FormGroup title="Puanlama ve sonuç">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Geçme notu" hint="Boş = geçti/kaldı gösterilmez">
            <Input suffix="%" type="number" min={0} max={100} placeholder="—" defaultValue={scoring.passingPercent != null ? String(scoring.passingPercent) : ""} onBlur={(e) => void onSave({ scoring: { ...scoring, passingPercent: e.target.value === "" ? null : Number(e.target.value) } })} />
          </Field>
          <Field label="Ses dinleme hakkı (sınav geneli)" hint="Boş = soru ayarı geçerli">
            <Input type="number" min={1} placeholder="—" defaultValue={media.maxAudioPlays != null ? String(media.maxAudioPlays) : ""} onBlur={(e) => void onSave({ media: { ...media, maxAudioPlays: e.target.value === "" ? null : Number(e.target.value) } })} />
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <SettingToggle label="Yanlış cevap puan düşürür" description="Negatif puanlama; tahmin etmeyi caydırır." checked={!!scoring.negativeMarking} onChange={(e) => void onSave({ scoring: { ...scoring, negativeMarking: e.target.checked } })} />
          <SettingToggle label="Sonuçta CEFR seviyesi göster" description="Puan bandına bağlı seviye öğrenciye gösterilir." checked={results.showCefrLevel !== false} onChange={(e) => void onSave({ results: { ...results, showCefrLevel: e.target.checked } })} />
          <SettingToggle label="Sertifika üret" description="Geçen öğrenciye indirilebilir sertifika." checked={!!results.certificateEnabled} onChange={(e) => void onSave({ results: { ...results, certificateEnabled: e.target.checked } })} />
        </div>
      </FormGroup>
      <FormGroup title="Gözetim">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Güvenlik düzeyi">
          {[
            ["OPEN", "Serbest"],
            ["STANDARD", "Standart"],
            ["STRICT", "Sıkı"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={level === value}
              disabled={exam.status !== "DRAFT"}
              className={`min-h-11 rounded-lg border px-3 text-sm font-medium ${level === value ? "border-primary bg-primary-50 text-primary" : "border-border bg-surface text-fg"}`}
              onClick={() => void onSecurity(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="grid gap-1 text-sm text-fg-muted">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </FormGroup>
    </FormCard>
  );
}

type BandDraft = { minPercent: number; maxPercent: number; label: string; cefrLevel: string | null; passing: boolean };

/** Hazır bant kalıpları — boş sınavda tek tıkla başlangıç. */
const BAND_PRESETS: Array<{ name: string; hint: string; bands: BandDraft[] }> = [
  {
    name: "Geçti / Kaldı",
    hint: "%0–49 Kaldı · %50–100 Geçti",
    bands: [
      { minPercent: 0, maxPercent: 49, label: "Kaldı", cefrLevel: null, passing: false },
      { minPercent: 50, maxPercent: 100, label: "Geçti", cefrLevel: null, passing: true },
    ],
  },
  {
    name: "Dört kademe",
    hint: "Yetersiz · Geliştirilmeli · İyi · Çok iyi",
    bands: [
      { minPercent: 0, maxPercent: 44, label: "Yetersiz", cefrLevel: null, passing: false },
      { minPercent: 45, maxPercent: 64, label: "Geliştirilmeli", cefrLevel: null, passing: true },
      { minPercent: 65, maxPercent: 84, label: "İyi", cefrLevel: null, passing: true },
      { minPercent: 85, maxPercent: 100, label: "Çok iyi", cefrLevel: null, passing: true },
    ],
  },
  {
    name: "CEFR seviyeleri",
    hint: "A1 · A2 · B1 · B2 · C1 (seviye tespit için)",
    bands: [
      { minPercent: 0, maxPercent: 19, label: "A1", cefrLevel: "A1", passing: false },
      { minPercent: 20, maxPercent: 39, label: "A2", cefrLevel: "A2", passing: true },
      { minPercent: 40, maxPercent: 59, label: "B1", cefrLevel: "B1", passing: true },
      { minPercent: 60, maxPercent: 79, label: "B2", cefrLevel: "B2", passing: true },
      { minPercent: 80, maxPercent: 100, label: "C1", cefrLevel: "C1", passing: true },
    ],
  },
];

type Coverage = { gaps: Array<[number, number]>; overlaps: Array<[number, number]> };

/** Tam sayı yüzde aralıkları: [0–49] ve [50–100] bitişik sayılır. */
function bandCoverage(bands: Array<{ minPercent: number; maxPercent: number }>): Coverage {
  const sorted = [...bands].sort((a, b) => a.minPercent - b.minPercent);
  const gaps: Array<[number, number]> = [];
  const overlaps: Array<[number, number]> = [];
  let next = 0; // kapsanması gereken ilk yüzde
  for (const b of sorted) {
    if (b.minPercent > next) gaps.push([next, b.minPercent - 1]);
    if (b.minPercent < next) overlaps.push([b.minPercent, Math.min(next - 1, b.maxPercent)]);
    next = Math.max(next, b.maxPercent + 1);
  }
  if (next <= 100) gaps.push([next, 100]);
  return { gaps, overlaps };
}

function ScoreBandsEditor({
  exam,
  setExam,
  ask,
}: {
  exam: ExamDetail;
  setExam: (e: ExamDetail) => void;
  ask: (title: string, description: string, confirmLabel: string, run: () => Promise<unknown>) => void;
}) {
  const bands = [...(exam.scoreBands || [])]
    .map((b) => ({ ...b, minPercent: Number(b.minPercent), maxPercent: Number(b.maxPercent) }))
    .sort((a, b) => a.minPercent - b.minPercent);
  const { gaps, overlaps } = bandCoverage(bands);
  const firstGap = gaps[0];

  const [minP, setMinP] = useState(firstGap ? String(firstGap[0]) : "");
  const [maxP, setMaxP] = useState(firstGap ? String(firstGap[1]) : "");
  const [label, setLabel] = useState("");
  const [cefr, setCefr] = useState("");
  const [passing, setPassing] = useState(false);
  const [pending, setPending] = useState(false);

  const lo = Number(minP);
  const hi = Number(maxP);
  const clash = bands.find((b) => minP !== "" && maxP !== "" && lo <= b.maxPercent && hi >= b.minPercent);
  const rangeError =
    minP === "" || maxP === ""
      ? "Aralık gerekli."
      : lo < 0 || hi > 100
        ? "0–100 arası olmalı."
        : lo > hi
          ? "Alt sınır üst sınırdan büyük olamaz."
          : clash
            ? `“${clash.label}” bandıyla (%${clash.minPercent}–${clash.maxPercent}) çakışıyor.`
            : undefined;

  function fillGap(gap: [number, number]) {
    setMinP(String(gap[0]));
    setMaxP(String(gap[1]));
  }

  async function add(drafts: BandDraft[], success: string) {
    setPending(true);
    try {
      let latest: ExamDetail | null = null;
      for (const d of drafts) latest = await authoringApi.addScoreBand(exam.id, d);
      if (latest) {
        setExam(latest);
        const nextGap = bandCoverage((latest.scoreBands || []).map((b) => ({ minPercent: Number(b.minPercent), maxPercent: Number(b.maxPercent) }))).gaps[0];
        setMinP(nextGap ? String(nextGap[0]) : "");
        setMaxP(nextGap ? String(nextGap[1]) : "");
      }
      setLabel("");
      setCefr("");
      setPassing(false);
      notify.success(success);
    } catch (e) {
      notify.error(errorMessage(e, "Bant eklenemedi"));
    } finally {
      setPending(false);
    }
  }

  const complete = bands.length > 0 && gaps.length === 0 && overlaps.length === 0;

  return (
    <FormCard
      title="Puan bantları"
      description="Öğrencinin yüzde puanına göre sonuç etiketi, geçti/kaldı ve (isteğe bağlı) CEFR seviyesi. Bantlar %0–100'ü boşluksuz ve çakışmasız kapsamalı."
    >
      {/* Kapsama çubuğu */}
      <div className="grid gap-2">
        <div className="relative h-9 overflow-hidden rounded-lg bg-danger-bg/60 ring-1 ring-border ring-inset" role="img" aria-label="Puan bantlarının 0–100 kapsaması">
          {bands.map((b, i) => (
            <div
              key={b.id}
              title={`%${b.minPercent}–${b.maxPercent} · ${b.label}${b.cefrLevel ? ` · ${b.cefrLevel}` : ""} · ${b.passing ? "Geçti" : "Kaldı"}`}
              className={`absolute inset-y-0 flex items-center justify-center overflow-hidden border-r-2 border-surface px-1 text-[11px] font-semibold whitespace-nowrap ${
                b.passing ? (i % 2 ? "bg-success-200 text-success-800" : "bg-success-100 text-success-800") : i % 2 ? "bg-neutral-300 text-fg" : "bg-neutral-200 text-fg"
              }`}
              style={{ left: `${b.minPercent}%`, width: `${Math.max(1, b.maxPercent - b.minPercent + 1)}%` }}
            >
              <span className="truncate">{b.label}</span>
            </div>
          ))}
          {overlaps.map(([a, z], i) => (
            <div key={`o${i}`} aria-hidden className="absolute inset-y-0 bg-[repeating-linear-gradient(45deg,var(--color-warning-400)_0_4px,transparent_4px_8px)] opacity-80" style={{ left: `${a}%`, width: `${Math.max(1, z - a + 1)}%` }} />
          ))}
        </div>
        <div className="flex justify-between font-mono text-[10.5px] text-fg-subtle" aria-hidden>
          {[0, 25, 50, 75, 100].map((t) => <span key={t}>%{t}</span>)}
        </div>
        {bands.length === 0 ? null : complete ? (
          <p className="text-[13px] text-success">✓ Bantlar %0–100’ü eksiksiz kapsıyor.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            {gaps.map(([a, z]) => (
              <button
                key={`g${a}`}
                type="button"
                onClick={() => fillGap([a, z])}
                className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger ring-1 ring-danger/20 hover:ring-danger/50"
                title="Bu aralığı yeni bant formuna doldur"
              >
                Boşluk %{a}–{z} → doldur
              </button>
            ))}
            {overlaps.map(([a, z]) => (
              <span key={`ov${a}`} className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning ring-1 ring-warning/25">
                Çakışma %{a}–{z}
              </span>
            ))}
          </div>
        )}
      </div>

      {bands.length === 0 ? (
        <FormGroup title="Hazır kalıpla başla" hint="Tek tıkla eklenir; sonra etiketleri ve aralıkları düzenleyebilirsiniz.">
          <div className="grid gap-2 sm:grid-cols-3">
            {BAND_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                disabled={pending}
                onClick={() => void add(p.bands, `“${p.name}” kalıbı eklendi`)}
                className="rounded-lg border border-border p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40 disabled:opacity-50"
              >
                <span className="block text-[13px] font-semibold text-fg">{p.name}</span>
                <span className="block text-xs text-fg-muted">{p.hint}</span>
              </button>
            ))}
          </div>
        </FormGroup>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11.5px] tracking-wide text-fg-subtle">
                <th className="px-3 py-2 font-semibold">Aralık</th>
                <th className="px-3 py-2 font-semibold">Sonuç etiketi</th>
                <th className="px-3 py-2 font-semibold">CEFR</th>
                <th className="px-3 py-2 font-semibold">Durum</th>
                <th className="px-3 py-2"><span className="sr-only">İşlem</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bands.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-50/60">
                  <td className="px-3 py-2 font-mono tabular-nums text-fg">
                    %{b.minPercent} – {b.maxPercent}
                  </td>
                  <td className="px-3 py-2 font-medium text-fg">{b.label}</td>
                  <td className="px-3 py-2">
                    {b.cefrLevel ? <span className="rounded bg-(--accent-plum-bg) px-1.5 py-0.5 font-mono text-[11px] font-semibold text-(--accent-plum)">{b.cefrLevel}</span> : <span className="text-fg-subtle">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={b.passing ? "success" : "neutral"} dot>{b.passing ? "Geçti" : "Kaldı"}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`${b.label} bandını sil`}
                      title="Sil"
                      onClick={() =>
                        ask(
                          "Puan bandı silinsin mi?",
                          `“${b.label}” bandı (%${b.minPercent}–${b.maxPercent}) silinir.`,
                          "Bandı sil",
                          () => notify.run(authoringApi.removeScoreBand(exam.id, b.id), { success: "Puan bandı silindi", error: "Silinemedi" }).then(setExam),
                        )
                      }
                    >
                      <IconX className="size-3.5" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormGroup title="Yeni bant ekle" hint={firstGap ? `Aralık ilk boşluğa göre önerildi (%${firstGap[0]}–${firstGap[1]}).` : "Tüm aralık kapsanıyor; yeni bant eklemek için önce bir bandı silin ya da daraltın."}>
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,7rem)_minmax(0,7rem)_minmax(0,1fr)_minmax(0,8rem)]">
          <Field label="Alt sınır" error={rangeError}>
            <Input type="number" suffix="%" min={0} max={100} value={minP} onChange={(e) => setMinP(e.target.value)} />
          </Field>
          <Field label="Üst sınır">
            <Input type="number" suffix="%" min={0} max={100} value={maxP} onChange={(e) => setMaxP(e.target.value)} />
          </Field>
          <Field label="Sonuç etiketi" required hint="Öğrenci karnesinde görünür">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ör. Başarılı" />
          </Field>
          <Field label="CEFR seviyesi" hint="İsteğe bağlı">
            <Select value={cefr} onChange={(e) => setCefr(e.target.value)}>
              <option value="">—</option>
              {CEFR.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="radiogroup" aria-label="Bu bant" className="inline-flex rounded-lg bg-neutral-100 p-0.5 ring-1 ring-border ring-inset">
            {[
              { v: false, label: "Kaldı sayılır" },
              { v: true, label: "Geçti sayılır" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={passing === o.v}
                onClick={() => setPassing(o.v)}
                className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
                  passing === o.v ? (o.v ? "bg-success text-white shadow-sm" : "bg-surface text-fg shadow-sm ring-1 ring-border") : "text-fg-muted hover:text-fg"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            loading={pending}
            disabled={pending || Boolean(rangeError) || !label.trim()}
            onClick={() => void add([{ minPercent: lo, maxPercent: hi, label: label.trim(), cefrLevel: cefr || null, passing }], "Puan bandı eklendi")}
          >
            <IconPlus className="size-3.5" aria-hidden /> Bandı ekle
          </Button>
        </div>
      </FormGroup>
    </FormCard>
  );
}
