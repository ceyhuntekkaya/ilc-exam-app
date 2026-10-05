"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * Açılır panel (Select listesi, takvim) için ortak konumlandırma.
 *
 * Sorun: panel tetikleyicinin içinde `absolute` olunca `overflow-hidden`/`overflow-auto` kapsayıcılarda (kart, tablo,
 * yapışkan yan panel) kırpılıyor ya da komşu katmanların arkasında kalıyordu.
 * Çözüm: panel portal ile kapsayıcıdan çıkarılır ve `position: fixed` ile tetikleyicinin ekrandaki yerine konur.
 * - Modal `<dialog>` içindeyse panel o dialog'a taşınır (tarayıcının üst katmanında kalsın); değilse `document.body`.
 * - Kaydırma (tüm kaydırılabilir atalar, capture) ve yeniden boyutlandırmada konum güncellenir.
 * - Konum DOM'a doğrudan yazılır (render tetiklemez; effect içinde setState yok).
 *
 * Kullanım: açarken `prepare(anchor)` (olay işleyicisinde) → `container`; paneli `createPortal(..., container)` ile çiz,
 * panel öğesine `panelRef` ver. Dışarı tıklama kontrolünde `panelRef.current` da "içeride" sayılmalı.
 */
export function useFloatingPanel(
  anchor: RefObject<HTMLElement | null>,
  open: boolean,
  options: { upward: boolean; alignRight?: boolean; matchWidth?: boolean; gap?: number },
) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { upward, alignRight = false, matchWidth = false, gap = 6 } = options;

  function prepare(el: HTMLElement | null) {
    setContainer(el?.closest("dialog") ?? (typeof document !== "undefined" ? document.body : null));
  }

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current;
      const p = panelRef.current;
      if (!a || !p) return;
      const r = a.getBoundingClientRect();
      p.style.position = "fixed";
      p.style.zIndex = "70";
      p.style.top = upward ? "" : `${r.bottom + gap}px`;
      p.style.bottom = upward ? `${window.innerHeight - r.top + gap}px` : "";
      p.style.left = alignRight ? "" : `${Math.max(8, r.left)}px`;
      p.style.right = alignRight ? `${Math.max(8, window.innerWidth - r.right)}px` : "";
      if (matchWidth) p.style.minWidth = `${r.width}px`;
      p.style.maxWidth = `calc(100vw - 16px)`;
    };
    place();
    // Panel ilk karede portal'a takılır; bir sonraki karede de konumla (ref gecikmesi).
    const frame = requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, upward, alignRight, matchWidth, gap, anchor, container]);

  return { panelRef, container, prepare };
}
