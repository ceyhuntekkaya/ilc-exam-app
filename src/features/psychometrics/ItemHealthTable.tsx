"use client";

import { Badge } from "@/src/ui";
import type { OptionStat } from "@/src/features/psychometrics/api";

/** Backend `CttService.NO_ANSWER_KEY` — cevapsız kalan öğrenciler bu anahtar altında toplanır. */
const NO_ANSWER_KEY = "_NO_ANSWER";

/**
 * Distraktör dağılımı (F4-02 Adım 5). Hangi seçeneğin doğru cevap olduğu bu uçtan gelmiyor —
 * `CttService.ItemReport` sözleşmesi `correctOptionId` taşımıyor, anahtar şüphesi backend'de
 * zaten `ItemHealth.ANSWER_KEY_SUSPICION` uyarısıyla işaretleniyor. Satırlar nokta-biserial'e göre
 * azalan sıralanır: en çok ayırt eden (genelde doğru) seçenek en üstte görünür.
 */
export function ItemHealthTable({ distractors }: { distractors: Record<string, OptionStat> }) {
  const rows = Object.entries(distractors).sort((a, b) => b[1].pointBiserial - a[1].pointBiserial);

  if (rows.length === 0) {
    return <p className="text-sm text-fg-subtle">Distraktör verisi yok.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs text-fg-subtle">
          <tr>
            <th className="px-3 py-2 font-medium">Seçenek</th>
            <th className="px-3 py-2 font-medium">Seçim sayısı</th>
            <th className="px-3 py-2 font-medium">Oran</th>
            <th className="px-3 py-2 font-medium">Nokta-biserial</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([optionId, stat]) => (
            <tr key={optionId} className="border-t border-border">
              <td className="px-3 py-2">
                {optionId === NO_ANSWER_KEY ? (
                  <Badge tone="neutral">Cevapsız</Badge>
                ) : (
                  <span className="font-mono text-xs">{optionId}</span>
                )}
              </td>
              <td className="px-3 py-2">{stat.count}</td>
              <td className="px-3 py-2">{(stat.proportion * 100).toFixed(1)}%</td>
              <td className={`px-3 py-2 font-mono ${stat.pointBiserial < 0 ? "text-danger" : "text-fg"}`}>
                {stat.pointBiserial.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
