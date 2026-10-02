import { formatTry, isNegativeMoney } from "@/src/lib/format/money";
import { cn } from "@/src/lib/utils/cn";

export function MoneyBreakdown({
  rows,
  totalLabel,
  total,
}: {
  rows: { label: string; amount: string | number | null | undefined }[];
  totalLabel?: string;
  total?: string | number | null;
}) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-border">
            <th className="py-2 text-left font-normal text-fg-muted">{row.label}</th>
            <td className={cn("numeric py-2 text-right", isNegativeMoney(row.amount) && "text-danger")}>
              {formatTry(row.amount)}
            </td>
          </tr>
        ))}
        {totalLabel != null ? (
          <tr>
            <th className="py-2 text-left font-medium text-fg">{totalLabel}</th>
            <td className={cn("numeric py-2 text-right font-semibold", isNegativeMoney(total) && "text-danger")}>
              {formatTry(total)}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
