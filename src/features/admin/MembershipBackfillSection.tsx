"use client";

import { useState } from "react";
import { useList8 as useListCompanies } from "@/src/api/generated/admin-companies/admin-companies";
import { useBackfill, useIncomplete } from "@/src/api/generated/membership-admin/membership-admin";
import type { BackfillReport } from "@/src/api/generated/models";
import {
  BACKFILL_PHRASE,
  INCOMPLETE_PAGE_SIZE,
  backfillFailureMessage,
  backfillGate,
  dryRunBody,
  executeBody,
  isDryRunReport,
  missingLabels,
} from "@/src/features/admin/membershipModel";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, FormCard, SectionTable, SectionToolbar, Select, notify } from "@/src/ui";

function CompanySelect({
  value,
  onChange,
  allowAll,
  label,
  hint,
}: {
  value: string;
  onChange: (id: string) => void;
  allowAll: boolean;
  label: string;
  hint?: string;
}) {
  const companies = useListCompanies({ size: 100 });
  if (companies.isError) return <ErrorState error={companies.error} onRetry={() => void companies.refetch()} compact />;
  const rows = (companies.data?.data.content ?? []).filter((c) => c.id);
  return (
    <div className="max-w-md">
      <Field label={label} hint={companies.isLoading ? "Kurumlar yükleniyor…" : hint}>
        <Select searchable searchPlaceholder="Kurum ara" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{allowAll ? "Tüm kurumlar" : "Kurum seçin"}</option>
          {rows.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.name} (${c.code})` : c.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

/**
 * B-47: üyelik geri doldurma (merkez, `staff:manage_roles`). KURU KOŞUM varsayılandır ve belirgindir; gerçek koşum
 * yalnız aynı kapsamda bu oturumda kuru koşum yapıldıysa açılır ve "ÇALIŞTIR" yazdırılan onay ister. Backfill bir
 * BAŞLANGIÇ NOKTASIDIR: STAFF hesapları TEACHER yapılır, birim ve sezon boş kalır; roller elle gözden geçirilmelidir.
 */
export function MembershipBackfillSection() {
  const canManage = useCan(Perm.staffManageRoles);
  return (
    <div className="grid gap-6">
      <BackfillCard canManage={canManage} />
      <IncompleteCard />
    </div>
  );
}

function BackfillCard({ canManage }: { canManage: boolean }) {
  const backfill = useBackfill();
  const [companyId, setCompanyId] = useState("");
  const [report, setReport] = useState<BackfillReport | null>(null);
  const [dryRunScope, setDryRunScope] = useState<string | null>(null);
  const [confirmReal, setConfirmReal] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const gate = backfillGate({ dryRunScope, scope: companyId });

  async function dry() {
    try {
      const result = await backfill.mutateAsync({ data: dryRunBody(companyId) });
      setReport(result.data);
      setDryRunScope(companyId.trim());
      notify.success("Kuru koşum tamamlandı; hiçbir üyelik yazılmadı");
    } catch (err) {
      notify.error(backfillFailureMessage(err));
    }
  }

  async function real() {
    setError(undefined);
    try {
      const result = await backfill.mutateAsync({ data: executeBody(companyId) });
      setReport(result.data);
      setConfirmReal(false);
      setDryRunScope(null);
      notify.success("Gerçek koşum tamamlandı");
    } catch (err) {
      setError(backfillFailureMessage(err));
    }
  }

  return (
    <FormCard
      title="Üyelik geri doldurma"
      description="Mevcut hesaplar için kimlik ve üyelik kayıtlarını üretir. Kuru koşum yalnız ne üretileceğini SAYAR; hiçbir şey yazmaz. Önce kuru koşumla doğrulayın."
    >
      <div role="note" className="rounded-lg border border-warning/40 bg-warning-bg px-3 py-2 text-[13px] text-warning">
        <p className="font-semibold">Bu bir başlangıç noktasıdır, son durum değil.</p>
        <p>
          Personel hesapları TEACHER üyeliği olarak açılır; birim ve sezon boş kalır. Koşumdan sonra roller elle gözden geçirilmeli ve birimler atanmalıdır.
        </p>
      </div>

      {canManage ? (
        <div className="grid gap-4">
          <CompanySelect label="Kapsam" allowAll value={companyId} onChange={setCompanyId} hint="Boş = tüm kurumlar. Pilot için tek kurum seçilebilir." />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void dry()} loading={backfill.isPending && !confirmReal}>
              Kuru koşum yap
            </Button>
            <span className="text-xs text-fg-muted">Varsayılan işlem. Hiçbir şey yazmaz.</span>
          </div>

          <div className="grid gap-2 rounded-lg border border-danger/30 bg-danger-bg/40 p-3">
            <p className="text-sm font-semibold text-danger">Gerçek koşum — üyelik kayıtları yazılır</p>
            <p className="text-[13px] text-fg-muted">
              Tek işlemde çalışır ve tekrar çalıştırmak aynı kayıtları çoğaltmaz (idempotent); yine de üretilen üyelikleri geri almak için ayrı bir uç yoktur.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="danger" disabled={!gate.allowed || backfill.isPending} onClick={() => { setError(undefined); setConfirmReal(true); }}>
                Gerçek koşumu başlat…
              </Button>
              {gate.reason ? (
                <span role="note" className="text-xs font-medium text-danger">
                  {gate.reason}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Koşum yetkiniz yok.</p>
      )}

      {report ? <ReportView report={report} /> : null}

      <ConfirmDialog
        open={confirmReal}
        title="Gerçek koşum başlatılsın mı?"
        description={
          <>
            <p>
              Üyelik kayıtları {companyId.trim() ? "seçili kurum için" : "TÜM kurumlar için"} GERÇEKTEN yazılacak. Personel hesapları TEACHER olur,
              birim ve sezon boş kalır.
            </p>
            <p className="mt-2">Kuru koşum sonucunu ve uyarıları incelediğinizden emin olun. Koşumdan sonra roller elle gözden geçirilmelidir.</p>
          </>
        }
        confirmLabel="Evet, çalıştır"
        confirmPhrase={BACKFILL_PHRASE}
        pending={backfill.isPending}
        error={error}
        onClose={() => setConfirmReal(false)}
        onConfirm={() => void real()}
      />
    </FormCard>
  );
}

const COUNT_ROWS: { key: keyof BackfillReport; label: string }[] = [
  { key: "usersScanned", label: "Taranan kullanıcı" },
  { key: "identitiesLinked", label: "Bağlanan kimlik" },
  { key: "membershipsCreated", label: "Üretilen üyelik" },
  { key: "membershipsInactive", label: "Pasif üyelik" },
  { key: "membershipsIncomplete", label: "Eksik alanlı üyelik" },
  { key: "membershipsMissingOrgUnit", label: "Birimi eksik" },
  { key: "membershipsMissingAcademicYear", label: "Sezonu eksik" },
];

function ReportView({ report }: { report: BackfillReport }) {
  const dry = isDryRunReport(report);
  const warnings = report.warnings ?? [];
  const byRole = Object.entries(report.createdByRole ?? {});
  const companies = report.companies ?? [];
  return (
    <div className="mt-4 grid gap-3" data-testid="backfill-report">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={dry ? "info" : "danger"} dot>
          {dry ? "Kuru koşum — hiçbir şey yazılmadı" : "Gerçek koşum yapıldı"}
        </Badge>
        <span className="text-xs text-fg-muted">{report.companyId ? `Kurum ${report.companyId.slice(0, 8)}` : "Tüm kurumlar"}</span>
      </div>

      {warnings.length > 0 ? (
        <div role="alert" data-testid="backfill-warnings" className="rounded-lg border-2 border-warning bg-warning-bg px-4 py-3 text-sm text-warning">
          <p className="font-semibold">Uyarılar — roller elle gözden geçirilmeli</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] font-semibold text-fg-subtle">
              <th scope="col" className="px-3 py-2">Ölçü</th>
              <th scope="col" className="px-3 py-2 text-right">{dry ? "Üretilecek / sayılan" : "Sonuç"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {COUNT_ROWS.map((r) => (
              <tr key={r.key} data-testid={`count-${r.key}`}>
                <td className="px-3 py-2">{r.label}</td>
                <td className="numeric px-3 py-2 text-right">{(report[r.key] as number | undefined) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {byRole.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px]" data-testid="created-by-role">
          <span className="text-fg-muted">Role göre üretilen:</span>
          {byRole.map(([role, n]) => (
            <Badge key={role} tone="neutral">{`${role}: ${n}`}</Badge>
          ))}
        </div>
      ) : null}

      {companies.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11.5px] font-semibold text-fg-subtle">
                <th scope="col" className="px-3 py-2">Kurum</th>
                <th scope="col" className="px-3 py-2 text-right">Bağlanan kimlik</th>
                <th scope="col" className="px-3 py-2 text-right">Üyelik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((c, i) => (
                <tr key={`${c.companyId}-${i}`}>
                  <td className="px-3 py-2 font-mono text-xs" title={c.companyId}>{c.companyId ? c.companyId.slice(0, 8) : "—"}</td>
                  <td className="numeric px-3 py-2 text-right">{c.identitiesLinked ?? 0}</td>
                  <td className="numeric px-3 py-2 text-right">{c.membershipsCreated ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function IncompleteCard() {
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState(0);
  const selected = companyId.trim();
  const q = useIncomplete({ companyId: selected, page, size: INCOMPLETE_PAGE_SIZE }, { query: { enabled: selected !== "", retry: false } });
  const items = q.data?.data.items ?? [];
  const total = q.data?.data.total ?? 0;

  return (
    <FormCard title="Eksik alanlı üyelikler" description="Birimi veya sezonu boş kalan üyelikler. Liste her zaman tek kurumla sınırlıdır; kurum seçimi zorunludur.">
      <CompanySelect label="Kurum" allowAll={false} value={companyId} onChange={(id) => { setCompanyId(id); setPage(0); }} />
      {selected === "" ? (
        <EmptyState tone="neutral" compact title="Kurum seçin" description="Eksik alanlı üyelikleri görmek için bir kurum seçin." />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} compact />
      ) : (
        <>
          <SectionTable
            toolbar={<SectionToolbar count={total} noun="üyelik" loading={q.isLoading} />}
            loading={q.isLoading}
            empty="Eksik alanlı üyelik yok"
            columns={["Ad", "Kullanıcı adı", "Tür / rol", "Durum", "Eksik", "Başlangıç"]}
            rows={items.map((r) => [
              r.displayName ?? "—",
              <span key="u" className="font-mono text-[13px]">{r.username ?? "—"}</span>,
              [r.userType, r.role].filter(Boolean).join(" / ") || "—",
              r.status ?? "—",
              <div key="m" className="flex flex-wrap gap-1">
                {missingLabels(r).map((l) => (
                  <Badge key={l} tone="warning">{l}</Badge>
                ))}
              </div>,
              formatDateTime(r.startedAt),
            ])}
          />
          {total > INCOMPLETE_PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-fg-muted">
                {page * INCOMPLETE_PAGE_SIZE + 1}–{Math.min(total, (page + 1) * INCOMPLETE_PAGE_SIZE)} / {total}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="min-h-11" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Önceki</Button>
                <Button type="button" variant="secondary" className="min-h-11" disabled={(page + 1) * INCOMPLETE_PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </FormCard>
  );
}
