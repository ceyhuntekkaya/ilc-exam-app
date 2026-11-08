export type UiLocale = "tr" | "en";

const SUPPORTED: readonly UiLocale[] = ["tr", "en"];
const FALLBACK: UiLocale = "tr";

function parse(raw: string | null | undefined): UiLocale | null {
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  return (SUPPORTED as readonly string[]).includes(code) ? (code as UiLocale) : null;
}

/**
 * Çözüm sırası: kullanıcının kendi uiLocale'i varsa o, yoksa kurumun defaultUiLocale'i,
 * o da yoksa "tr". Backend'deki MessageConfig.resolveUiLocale ile birebir aynı mantık
 * (bkz. ilc-parent/plan/faz-0/F0-11-i18n.md).
 */
export function resolveUiLocale(
  userUiLocale?: string | null,
  companyDefaultUiLocale?: string | null,
): UiLocale {
  return parse(userUiLocale) ?? parse(companyDefaultUiLocale) ?? FALLBACK;
}
