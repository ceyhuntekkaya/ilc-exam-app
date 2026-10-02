const money = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Gösterim. Tutarı hesaplamaz; 4 haneli kuruşu 2 haneye yuvarlar. Sıfır `0,00 ₺` olur. */
export function formatTry(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "—";
  return money.format(amount);
}

export function isNegativeMoney(value: string | number | null | undefined): boolean {
  if (typeof value === "number") return value < 0;
  if (typeof value !== "string") return false;
  return value.trim().startsWith("-");
}

/** `1.234,56` ve `1234.56` ikisini de ondalık stringe çevirir. Hesap yapmaz. */
export function parseMoneyInput(value: string): string | null {
  const trimmed = value.trim().replace(/\s/g, "");
  if (!trimmed) return null;
  const negative = trimmed.startsWith("-");
  const raw = negative ? trimmed.slice(1) : trimmed;
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = raw.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return negative ? `-${normalized}` : normalized;
}
