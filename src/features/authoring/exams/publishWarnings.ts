/**
 * R-07 (K-A14): yayın onayında uyarılar GÖRÜNÜR olmalı. H-03'ün pilot-madde uyarısı yalnız "Eksikleri kontrol et"e
 * basılırsa görünüyordu; kimse basmazsa uyarı hiç görülmüyor, veri de toplanmıyordu. Yayın onay penceresi artık
 * sunucunun doğrulama sonucunu (uyarı + hata) metne katar.
 */

export type PublishIssue = { severity: string; path?: string; message: string };

const MAX_SHOWN = 3;

export function publishConfirmDescription(base: string, issues: ReadonlyArray<PublishIssue>): string {
  const errors = issues.filter((issue) => issue.severity === "ERROR");
  const warnings = issues.filter((issue) => issue.severity === "WARNING");
  const parts = [base];

  if (errors.length > 0) {
    parts.push(`DİKKAT: ${errors.length} hata var, yayın reddedilecek: ${errors[0].message}`);
  }
  if (warnings.length > 0) {
    const shown = warnings.slice(0, MAX_SHOWN).map((issue) => issue.message).join(" • ");
    const more = warnings.length > MAX_SHOWN ? ` • +${warnings.length - MAX_SHOWN} uyarı daha` : "";
    parts.push(`Uyarılar (${warnings.length}): ${shown}${more}. Bu uyarılar yayını engellemez.`);
  }
  return parts.join(" ");
}
