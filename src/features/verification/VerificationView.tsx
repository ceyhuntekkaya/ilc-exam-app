import { Badge } from "@/src/ui/primitives/Badge";
import { DefinitionList } from "@/src/ui/composites/DefinitionList";
import { EmptyState } from "@/src/ui/composites/EmptyState";

type VerificationBody = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function date(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleDateString("en-GB");
}

function skillLines(value: unknown): { skill: string; band: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is { skill?: unknown; band?: unknown } => typeof row === "object" && row !== null)
    .map((row) => ({ skill: str(row.skill) ?? "—", band: str(row.band) ?? "—" }));
}

/**
 * F5-07: doğrulama sayfasının GÖRÜNÜMÜ — kimlik doğrulamasız, herkese açık. Üç sonuç şekli
 * YAPISAL olarak ayrı (backend {@code VerificationResult} sealed interface'inin HTTP karşılığı):
 * sertifika alanları (sertifika numarası/geçerlilik/imza durumu) seviye raporu görünümünde
 * HİÇ render EDİLMEZ — boş değil, YOK (F5-11'in kuralı burada tamamlanıyor).
 */
export function VerificationView({ body }: { body: VerificationBody }) {
  const status = str(body.status);

  if (status === "CERTIFICATE" || status === "REVOKED") {
    return <CertificateOrRevokedView body={body} revoked={status === "REVOKED"} />;
  }
  if (status === "LEVEL_REPORT") {
    return <LevelReportView body={body} />;
  }
  return <NotFoundView />;
}

function CertificateOrRevokedView({ body, revoked }: { body: VerificationBody; revoked: boolean }) {
  const candidateName = str(body.candidateName) ?? "—";
  const examTitle = str(body.examTitle) ?? "—";
  const certificateCode = str(body.certificateCode) ?? "—";
  const issuedAt = date(body.issuedAt);
  const validUntil = date(body.validUntil);
  const expired = body.expired === true;
  const cefrLevel = str(body.cefrLevel);
  const grade = str(body.grade);
  const integrityLevel = str(body.integrityLevel);
  const assuranceLevel = str(body.assuranceLevel);
  const skillBreakdownIncluded = body.skillBreakdownIncluded === true;
  const skills = skillLines(body.skillBreakdown);
  const revocationReason = str(body.revocationReason);
  const revokedAt = date(body.revokedAt);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">Certificate</Badge>
        {revoked ? (
          <Badge tone="danger">Revoked</Badge>
        ) : expired ? (
          <Badge tone="warning">Expired</Badge>
        ) : (
          <Badge tone="success">Valid</Badge>
        )}
      </div>

      {revoked ? (
        <div className="rounded-lg border border-danger/20 bg-danger-bg p-3 text-sm text-danger">
          This certificate has been revoked{revokedAt ? ` (${revokedAt})` : ""}.
          {revocationReason ? ` Reason: ${revocationReason}` : null}
        </div>
      ) : null}

      <DefinitionList
        items={[
          { term: "Name", description: candidateName },
          { term: "Exam", description: examTitle },
          { term: "Certificate number", description: certificateCode },
          { term: "Issue date", description: issuedAt ?? "—" },
          { term: "Valid until", description: validUntil ?? "No expiry" },
          { term: "CEFR band", description: cefrLevel ?? "—" },
          { term: "Grade", description: grade ?? "—" },
          { term: "Integrity level", description: integrityLevel ?? "—" },
          { term: "Assurance level", description: assuranceLevel ?? "—" },
        ]}
      />

      {skillBreakdownIncluded && skills.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-medium text-fg-subtle">Skill breakdown</h3>
          <DefinitionList items={skills.map((s) => ({ term: s.skill, description: s.band }))} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * R-20: yeniden yayınlanan/iptal edilen sonucun ESKİ seviye raporu kodu `superseded=true` döner; aday/sınav/seviye alanı YOKTUR
 * (geçersiz belge bilgi sızdırmaz). Alan yoksa/null ise (eski sunucu) geçerli rapor sayılır — yalnız açık `true` geçersiz kılar.
 */
export function isSupersededLevelReport(body: VerificationBody): boolean {
  return body.superseded === true;
}

function SupersededLevelReportView() {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Level report</Badge>
        <Badge tone="danger">Superseded</Badge>
      </div>
      <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg p-3 text-sm text-danger">
        This report has been superseded (the result was republished or cancelled).
      </div>
      <div className="rounded-lg border border-border bg-neutral-50 p-3 text-sm font-medium text-fg">
        This document is not a certificate.
      </div>
    </div>
  );
}

function LevelReportView({ body }: { body: VerificationBody }) {
  if (isSupersededLevelReport(body)) return <SupersededLevelReportView />;
  const candidateName = str(body.candidateName) ?? "—";
  const examTitle = str(body.examTitle) ?? "—";
  const issuedAt = date(body.issuedAt);
  const cefrLevel = str(body.cefrLevel);
  const grade = str(body.grade);
  const integrityLevel = str(body.integrityLevel);
  const assuranceLevel = str(body.assuranceLevel);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Level report</Badge>
      </div>
      <div className="rounded-lg border border-border bg-neutral-50 p-3 text-sm font-medium text-fg">
        This document is not a certificate.
      </div>
      <DefinitionList
        items={[
          { term: "Name", description: candidateName },
          { term: "Exam", description: examTitle },
          { term: "Issue date", description: issuedAt ?? "—" },
          { term: "CEFR band", description: cefrLevel ?? "—" },
          { term: "Grade", description: grade ?? "—" },
          { term: "Integrity level", description: integrityLevel ?? "—" },
          { term: "Assurance level", description: assuranceLevel ?? "—" },
        ]}
      />
    </div>
  );
}

function NotFoundView() {
  return (
    <EmptyState
      tone="neutral"
      title="Not found"
      description="No certificate or level report matches this code. Check the code and try again."
    />
  );
}
