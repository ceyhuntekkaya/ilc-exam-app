/**
 * F2-04/D17: hotspot bölgeleri arasında ok tuşlarıyla gezinme — Tab zaten çalışıyordu
 * (bölgeler native `<button>`), bu salt bir hız/konfor katmanı. Saf fonksiyon: DOM/React'ten
 * bağımsız, test edilebilir.
 */
export function nextFocusIndex(current: number, total: number, direction: 1 | -1): number {
  if (total <= 0) return current;
  return (current + direction + total) % total;
}
