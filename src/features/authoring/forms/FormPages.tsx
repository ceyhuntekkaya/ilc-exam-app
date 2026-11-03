"use client";

import { useEffect, useState } from "react";

import {
  authoringApi,
  type BlueprintDeviation,
  type FormSummary,
} from "@/src/features/authoring/shared/client";
import {
  Badge,
  Button,
  DataGrid,
  Field,
  FormCard,
  Input,
  Textarea,
  errorMessage,
  notify,
  type GridColDef,
} from "@/src/ui";

/**
 * K-03 (F2-08 Adım 5 + F2-11/F2-12'nin HTTP yüzeyi): sınavın formlarını listeler, blueprint'ten
 * veya sabit sınavdan form üretir, `BlueprintValidator`'ın dokuz boyutluk TAM raporunu gösterir
 * (yalnız sapanları değil — tolerans null olan boyutlar "tanımlı değil" diye ayrı işaretlenir),
 * formu incelemeye gönderir/onaylar. `ExamPages.tsx`'i şişirmemek için ayrı dosya.
 */
export function ExamFormsTab({ examId }: { examId: string }) {
  const [forms, setForms] = useState<FormSummary[]>([]);
  // K-03/lint taban çizgisi: setLoading(true) burada senkron çağrılmaz (react-hooks/set-state-in-effect) —
  // varsayılan true, ilk yükleme bitince (veya yeniden yüklenince) finally() false'a çeker.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ forFormId: string | null; rows: BlueprintDeviation[] } | null>(null);
  const [busy, setBusy] = useState(false);

  // Blueprint'ten üretim formu — alan girdisi şimdilik düz metin (blueprint/madde seçici ekranı
  // bu paketin kapsamında değil, F2-07/F2-08'in kendi ekranları ayrı bir iştir).
  const [blueprintId, setBlueprintId] = useState("");
  const [candidateIds, setCandidateIds] = useState("");
  const [targetSize, setTargetSize] = useState(10);
  const [pilotIds, setPilotIds] = useState("");
  const [anchorIds, setAnchorIds] = useState("");

  function load() {
    authoringApi
      .listForms(examId)
      .then((rows) => {
        setError(null);
        setForms(rows);
      })
      .catch((err: unknown) => setError(errorMessage(err, "Formlar alınamadı")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  function splitIds(raw: string): string[] {
    return raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function generateFromFixed() {
    setBusy(true);
    try {
      await authoringApi.generateFormFromFixedExam(examId);
      notify.success("Form üretildi");
      load();
    } catch (err) {
      notify.error(errorMessage(err, "Form üretilemedi"));
    } finally {
      setBusy(false);
    }
  }

  async function generateFromBlueprint() {
    if (!blueprintId.trim()) {
      notify.error("Blueprint kimliği gerekli");
      return;
    }
    setBusy(true);
    setReport(null);
    try {
      const result = await authoringApi.generateFormFromBlueprint(examId, {
        blueprintId: blueprintId.trim(),
        candidateVersionIds: splitIds(candidateIds),
        targetSize,
        pilotVersionIds: splitIds(pilotIds),
        requiredAnchorVersionIds: splitIds(anchorIds),
      });
      notify.success(`Form #${result.form.formNo} üretildi`);
      setReport({ forFormId: result.form.id, rows: result.report });
      load();
    } catch (err) {
      // K-03: üretilemedi — BlueprintMismatchException'ın raporu hata gövdesinde (err.body.deviations).
      const body = (err as { body?: { deviations?: BlueprintDeviation[] } } | undefined)?.body;
      if (body?.deviations) {
        setReport({ forFormId: null, rows: body.deviations });
      }
      notify.error(errorMessage(err, "Form üretilemedi — blueprint'e uymuyor"));
    } finally {
      setBusy(false);
    }
  }

  async function submitReview(formId: string) {
    setBusy(true);
    try {
      await authoringApi.submitFormReview(examId, formId);
      notify.success("İncelemeye gönderildi");
      load();
    } catch (err) {
      notify.error(errorMessage(err, "Gönderilemedi"));
    } finally {
      setBusy(false);
    }
  }

  async function approveReview(formId: string) {
    setBusy(true);
    try {
      await authoringApi.approveFormReview(examId, formId);
      notify.success("Form onaylandı");
      load();
    } catch (err) {
      notify.error(errorMessage(err, "Onaylanamadı"));
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef<FormSummary>[] = [
    { field: "formNo", headerName: "Form", width: 80, renderCell: ({ row }) => `#${row.formNo}` },
    {
      field: "status",
      headerName: "Madde seti",
      width: 110,
      renderCell: ({ row }) => <Badge tone={row.status === "READY" ? "success" : row.status === "RETIRED" ? "neutral" : "warning"}>{row.status}</Badge>,
    },
    {
      field: "reviewStatus",
      headerName: "İnceleme",
      width: 130,
      renderCell: ({ row }) => <Badge tone={row.reviewStatus === "APPROVED" ? "success" : "neutral"}>{row.reviewStatus}</Badge>,
    },
    {
      field: "blueprintId",
      headerName: "Blueprint",
      minWidth: 160,
      renderCell: ({ row }) => (row.blueprintId ? <span className="font-mono text-xs">{row.blueprintId}</span> : "— (sabit sınav)"),
    },
    {
      field: "actions",
      headerName: "",
      minWidth: 220,
      renderCell: ({ row }) => (
        <div className="flex gap-2">
          {row.reviewStatus === "DRAFT" ? (
            <Button type="button" variant="secondary" disabled={busy} onClick={() => submitReview(row.id)}>
              İncelemeye gönder
            </Button>
          ) : null}
          {row.reviewStatus === "IN_REVIEW" ? (
            <Button type="button" disabled={busy} onClick={() => approveReview(row.id)}>
              Onayla
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <FormCard title="Sabit sınavdan form" description="Sınavın mevcut madde setini bire bir bir forma yazar.">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void generateFromFixed()}>
          Formu şimdi üret
        </Button>
      </FormCard>

      <FormCard title="Blueprint'ten form üret" description="Aday madde havuzundan seçim yapar, dokuz boyuta karşı doğrular.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Blueprint kimliği">
            <Input value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)} placeholder="UUID" />
          </Field>
          <Field label="Hedef madde sayısı">
            <Input type="number" min={1} value={targetSize} onChange={(e) => setTargetSize(Number(e.target.value) || 1)} />
          </Field>
          <Field label="Aday madde kimlikleri" hint="Virgül veya boşlukla ayrılmış UUID listesi">
            <Textarea rows={2} value={candidateIds} onChange={(e) => setCandidateIds(e.target.value)} />
          </Field>
          <Field label="Pilot (PRETEST) madde kimlikleri" hint="Opsiyonel — puana girmez">
            <Textarea rows={2} value={pilotIds} onChange={(e) => setPilotIds(e.target.value)} />
          </Field>
          <Field label="Zorunlu anchor madde kimlikleri" hint="Opsiyonel — F2-11">
            <Textarea rows={2} value={anchorIds} onChange={(e) => setAnchorIds(e.target.value)} />
          </Field>
        </div>
        <Button type="button" disabled={busy} onClick={() => void generateFromBlueprint()}>
          Formu üret
        </Button>

        {report ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-fg-subtle">
                <tr>
                  <th className="px-3 py-2">Boyut</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Hedef</th>
                  <th className="px-3 py-2">Gerçek</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.kind} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{row.kind}</td>
                    <td className="px-3 py-2">
                      {!row.toleranceApplied ? (
                        <Badge tone="warning">tolerans tanımlı değil</Badge>
                      ) : row.withinTolerance ? (
                        <Badge tone="success">uygun</Badge>
                      ) : (
                        <Badge tone="danger">sapma</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{JSON.stringify(row.target)}</td>
                    <td className="px-3 py-2 font-mono">{JSON.stringify(row.actual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </FormCard>

      <FormCard title={`Formlar (${forms.length})`} description="Bu sınav için üretilmiş tüm gerçekleşmeler.">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <DataGrid rows={forms} columns={columns} getRowId={(r) => r.id} loading={loading} embedded
          emptyState={{ title: "Henüz form yok", description: "Yukarıdan ilk formu üretin." }} />
      </FormCard>
    </div>
  );
}
