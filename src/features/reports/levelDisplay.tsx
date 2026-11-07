import { Badge } from "@/src/ui/primitives/Badge";
import type { ReportModel } from "@/src/api/generated/models";

/**
 * F5-03: {@code integrityLevel} (F3-14, sınavın NASIL gözetlendiği) ve {@code assuranceLevel}
 * (F4-05, puanın ölçeğe güvenle bağlanma durumu) İKİ FARKLI KAVRAM — D30/D44 her ikisinin de
 * her görünümde basılmasını ZORUNLU kılar, birini diğeriyle KARIŞTIRMA.
 */
export function IntegrityAssuranceBadges({ report }: { report: Pick<ReportModel, "integrityLevel" | "assuranceLevel"> }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="info">{`Bütünlük: ${report.integrityLevel ?? "—"}`}</Badge>
      <Badge tone={report.assuranceLevel === "EQUATED" ? "success" : report.assuranceLevel === "UNVERIFIED" ? "warning" : "neutral"}>
        {`Güvence: ${report.assuranceLevel ?? "—"}`}
      </Badge>
    </div>
  );
}

export function cefrLabel(level: string | undefined | null): string {
  return level ?? "—";
}

/** F2-05'in kuralı: kazanım kırılımı YÜZDE+madde sayısı taşır, TOPLAM YOK — buradan toplama yapılmaz. */
export function OutcomeBreakdownTable({ outcomes }: { outcomes: { outcomeId?: string; code?: string; name?: string; percent?: number; itemCount?: number; insufficientData?: boolean }[] | undefined }) {
  if (!outcomes || outcomes.length === 0) {
    return <p className="text-sm text-fg-muted">Kazanım kırılımı yok.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-fg-subtle">
          <th className="py-1 pr-3">Kazanım</th>
          <th className="py-1 pr-3">Yüzde</th>
          <th className="py-1">Madde sayısı</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {outcomes.map((o) => (
          <tr key={o.outcomeId ?? o.code}>
            <td className="py-1.5 pr-3">{o.name ?? o.code ?? "—"}</td>
            <td className="py-1.5 pr-3">{o.insufficientData ? "Yetersiz veri" : o.percent != null ? `%${Math.round(o.percent)}` : "—"}</td>
            <td className="py-1.5">{o.itemCount ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
