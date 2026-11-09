"use client";

import { useEffect, useState } from "react";

import {
  authoringApi,
  type ExamListItem,
  type FormSummary,
  type QuestionSummary,
} from "@/src/features/authoring/shared/client";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import { ItemHealthTable } from "@/src/features/psychometrics/ItemHealthTable";
import { psychometricsApi, type ItemReport, type ItemHealthWarning, type ReliabilityReport } from "@/src/features/psychometrics/api";
import {
  Badge,
  Button,
  Field,
  FormCard,
  Input,
  PageHeader,
  Select,
  Spinner,
  errorMessage,
} from "@/src/ui";

const WARNING_LABEL: Record<ItemHealthWarning, string> = {
  TOO_EASY: "Çok kolay",
  TOO_HARD: "Çok zor",
  LOW_DISCRIMINATION: "Zayıf ayırt edicilik",
  ANSWER_KEY_SUSPICION: "Anahtar şüphesi",
};

/** F4-02 Adım 5: CTT paneli — madde analizi + form güvenirliği. Canlı/anlık hesaplar. */
export function CttPanelPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="CTT Paneli"
        description="Madde güçlüğü, ayırt edicilik, distraktör dağılımı ve form güvenirliği — canlı hesaplanır, geçmişi saklamaz."
      />
      <PsychometricsTabs />
      <ItemAnalysisCard />
      <ReliabilityCard />
    </div>
  );
}

function ItemAnalysisCard() {
  const { tenant, loading: tenantLoading } = useAuthoringTenant();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuestionSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QuestionSummary | null>(null);
  const [report, setReport] = useState<ItemReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || !tenant) return;
    setSearching(true);
    setSearchError(null);
    try {
      const rows = await authoringApi.listQuestions({ q: query.trim() });
      setResults(rows);
    } catch (e) {
      setSearchError(errorMessage(e, "Arama başarısız"));
    } finally {
      setSearching(false);
    }
  }

  async function select(row: QuestionSummary) {
    setSelected(row);
    setReport(null);
    setLoading(true);
    setError(null);
    try {
      const data = await psychometricsApi.itemReport(row.versionId);
      setReport(data);
    } catch (e) {
      setError(errorMessage(e, "Madde analizi alınamadı"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormCard
      title="Madde Analizi"
      description="Soru bankasından bir madde seçin; p-değeri, ayırt edicilik ve distraktör dağılımı canlı hesaplanır. Yalnız çoktan seçmeli maddeler desteklenir."
    >
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => void search(event)}>
        <Field label="Soru ara" hint="Kod veya metin">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Örn. RD-0142" />
        </Field>
        <Button type="submit" variant="secondary" className="min-h-11" disabled={searching || tenantLoading || !tenant}>
          {searching ? "Aranıyor…" : "Ara"}
        </Button>
      </form>
      {searchError ? <p className="text-sm text-danger">{searchError}</p> : null}
      {results.length > 0 ? (
        <ul className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border p-1">
          {results.map((row) => (
            <li key={row.versionId}>
              <button
                type="button"
                onClick={() => void select(row)}
                className={`min-h-11 w-full rounded-lg px-3 text-left text-sm ${
                  selected?.versionId === row.versionId ? "bg-primary-50 font-semibold text-primary" : "hover:bg-neutral-50"
                }`}
              >
                <span className="font-mono text-xs">{row.code ?? "—"}</span>
                <span className="text-fg-subtle"> · v{row.versionNo}</span>
                {row.primarySkill ? <span className="ml-2 text-fg-subtle">{row.primarySkill}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected ? (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-[13px] font-semibold text-fg">
            {selected.code ?? selected.versionId} — v{selected.versionNo}
          </p>
          {loading ? <Spinner /> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {report ? <ItemReportView report={report} /> : null}
        </div>
      ) : null}
    </FormCard>
  );
}

function ItemReportView({ report }: { report: ItemReport }) {
  const { stats, health } = report;
  if (!health.sufficientData) {
    return (
      <div className="rounded-lg bg-neutral-50 p-3 text-sm text-fg-muted">
        Yetersiz veri (n={stats.n}) — güvenilir bir uyarı için daha fazla uygulama gerekir.
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="n" value={String(stats.n)} />
        <Stat label="p-değeri" value={stats.pValue.toFixed(3)} />
        <Stat label="Ayırt edicilik" value={stats.discrimination.toFixed(3)} />
        <Stat label="Std. sapma" value={stats.stdDev.toFixed(3)} />
      </dl>
      <div className="flex flex-wrap gap-1.5">
        {health.warnings.length > 0 ? (
          health.warnings.map((warning) => (
            <Badge key={warning} tone="warning">
              {WARNING_LABEL[warning] ?? warning}
            </Badge>
          ))
        ) : (
          <Badge tone="success">Uyarı yok</Badge>
        )}
      </div>
      <ItemHealthTable distractors={stats.distractors} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold text-fg">{value}</dd>
    </div>
  );
}

function ReliabilityCard() {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [examId, setExamId] = useState("");
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [formId, setFormId] = useState("");
  const [report, setReport] = useState<ReliabilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render sırasında koşullu düzeltme (React'in önerdiği "adjusting state during render" kalıbı) —
  // react-hooks/set-state-in-effect bir effect gövdesinde arka arkaya senkron setState'e izin vermiyor.
  const [loadedExamId, setLoadedExamId] = useState(examId);
  if (examId !== loadedExamId) {
    setLoadedExamId(examId);
    setForms([]);
    setFormId("");
    setReport(null);
    setError(null);
  }

  useEffect(() => {
    authoringApi
      .listExams()
      .then((page) => setExams(page.items))
      .catch(() => setExams([]));
  }, []);

  useEffect(() => {
    if (!examId) return;
    authoringApi
      .listForms(examId)
      .then(setForms)
      .catch(() => setForms([]));
  }, [examId]);

  async function load(id: string) {
    setFormId(id);
    setReport(null);
    setError(null);
    if (!id) return;
    setLoading(true);
    try {
      const data = await psychometricsApi.reliability(id);
      setReport(data);
    } catch (e) {
      setError(errorMessage(e, "Güvenirlik hesaplanamadı"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormCard
      title="Form Güvenirliği"
      description="Cronbach alpha — formun iç tutarlılığı, maddeleri ortak kullanmış tüm başvurulardan canlı hesaplanır."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sınav">
          <Select value={examId} onChange={(event) => setExamId(event.target.value)}>
            <option value="">Seçin…</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.code} — {exam.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Form">
          <Select value={formId} onChange={(event) => void load(event.target.value)} disabled={!examId || forms.length === 0}>
            <option value="">Seçin…</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                Form #{form.formNo} — {form.status}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {loading ? <Spinner /> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {report ? (
        report.alpha === null ? (
          <p className="text-sm text-fg-muted">
            Yetersiz madde/örneklem (madde: {report.nItems}, öğrenci: {report.nExaminees}) — alpha hesaplanamadı.
          </p>
        ) : (
          <dl className="grid grid-cols-3 gap-3 sm:w-fit">
            <Stat label="Alpha" value={report.alpha.toFixed(3)} />
            <Stat label="Madde" value={String(report.nItems)} />
            <Stat label="Öğrenci" value={String(report.nExaminees)} />
          </dl>
        )
      ) : null}
    </FormCard>
  );
}
