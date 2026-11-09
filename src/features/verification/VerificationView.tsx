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
  return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleDateString("tr-TR");
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
        <Badge tone="brand">Sertifika</Badge>
        {revoked ? (
          <Badge tone="danger">İptal edilmiştir</Badge>
        ) : expired ? (
          <Badge tone="warning">Süresi dolmuş</Badge>
        ) : (
          <Badge tone="success">Geçerli</Badge>
        )}
      </div>

      {revoked ? (
        <div className="rounded-lg border border-danger/20 bg-danger-bg p-3 text-sm text-danger">
          Bu sertifika iptal edilmiştir{revokedAt ? ` (${revokedAt})` : ""}.
          {revocationReason ? ` Gerekçe: ${revocationReason}` : null}
        </div>
      ) : null}

      <DefinitionList
        items={[
          { term: "Ad", description: candidateName },
          { term: "Sınav", description: examTitle },
          { term: "Sertifika numarası", description: certificateCode },
          { term: "Basım tarihi", description: issuedAt ?? "—" },
          { term: "Geçerlilik bitişi", description: validUntil ?? "Süresiz" },
          { term: "CEFR bandı", description: cefrLevel ?? "—" },
          { term: "Kademe", description: grade ?? "—" },
          { term: "Bütünlük seviyesi", description: integrityLevel ?? "—" },
          { term: "Güvence seviyesi", description: assuranceLevel ?? "—" },
        ]}
      />

      {skillBreakdownIncluded && skills.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-medium text-fg-subtle">Beceri kırılımı</h3>
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
        <Badge tone="neutral">Seviye raporu</Badge>
        <Badge tone="danger">Geçersiz kılındı</Badge>
      </div>
      <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg p-3 text-sm text-danger">
        Bu rapor geçersiz kılındı (sonuç yeniden yayınlandı veya iptal edildi).
      </div>
      <div className="rounded-lg border border-border bg-neutral-50 p-3 text-sm font-medium text-fg">
        Bu belge bir sertifika değildir / This document is not a certificate.
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
        <Badge tone="neutral">Seviye raporu</Badge>
      </div>
      <div className="rounded-lg border border-border bg-neutral-50 p-3 text-sm font-medium text-fg">
        Bu belge bir sertifika değildir / This document is not a certificate.
      </div>
      <DefinitionList
        items={[
          { term: "Ad", description: candidateName },
          { term: "Sınav", description: examTitle },
          { term: "Basım tarihi", description: issuedAt ?? "—" },
          { term: "CEFR bandı", description: cefrLevel ?? "—" },
          { term: "Kademe", description: grade ?? "—" },
          { term: "Bütünlük seviyesi", description: integrityLevel ?? "—" },
          { term: "Güvence seviyesi", description: assuranceLevel ?? "—" },
        ]}
      />
    </div>
  );
}

function NotFoundView() {
  return (
    <EmptyState
      tone="neutral"
      title="Bulunamadı"
      description="Bu kodla eşleşen bir sertifika veya seviye raporu yok. Kodu kontrol edip tekrar deneyin."
    />
  );
}
