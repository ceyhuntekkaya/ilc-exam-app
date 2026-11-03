/**
 * F3-03/Adım 4: WCAG 2.2 bağıl parlaklık/kontrast formülü — saf fonksiyon, `exam-player-theme.css`'in
 * renk çiftlerini test altında tutmak için (bir renk değişikliği sessizce kontrastı bozarsa fark edilsin).
 */
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** İki renk arasındaki WCAG kontrast oranı (1–21). Sıra önemsiz. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Düz metin (normal boy): AA ister 4.5:1. */
export function meetsNormalTextAA(hexA: string, hexB: string): boolean {
  return contrastRatio(hexA, hexB) >= 4.5;
}

/** Büyük metin / UI bileşeni durumu (WCAG 1.4.11 Non-text Contrast): AA ister 3:1. */
export function meetsUiComponentAA(hexA: string, hexB: string): boolean {
  return contrastRatio(hexA, hexB) >= 3;
}
