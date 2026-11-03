"use client";

/**
 * F3-03/Adım 2: odak tuzağı — tam ekran bir uyarı/mola kutusu açıldığında Tab arkadaki
 * (görünmez/pasif) sayfaya KAÇMAMALI (WCAG 2.4.3). Bugün `role="alertdialog"`/`aria-modal="true"`
 * taşıyan kutular (gözetmenin odak uyarısı, bağlantı bekleme ekranı, `KidDialog`) bunu HİÇ
 * uygulamıyordu — `aria-modal` sözünü tutmayan bir ARIA özniteliğiydi, olmamasından KÖTÜ
 * (ekran okuyucu "modal" der ama Tab arkaya geçer).
 */
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * `active` true olduğunda: önceki odağı hatırlar, kutunun içine (ilk odaklanabilir öğeye,
 * yoksa kutunun kendisine) taşır, Tab/Shift+Tab'ı kutunun İÇİNDE döndürür. `active` false
 * olduğunda (ya da bileşen kalkınca) odağı aldığı yere GERİ VERİR — F3-15'in odak kaybı
 * sayacı bundan etkilenmez, bkz. `focusSignals.ts`: o `document.hasFocus()`'a (pencere
 * düzeyinde) bakar, sayfa İÇİNDE bir öğeden başka bir öğeye `.focus()` taşımak pencereyi
 * hiç "odaksız" bırakmaz.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const node = containerRef.current;
    if (!node) return;
    const container: HTMLElement = node;

    returnFocusTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial = focusableWithin(container)[0] ?? container;
    if (!container.hasAttribute("tabindex") && initial === container) container.tabIndex = -1;
    initial.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = focusableWithin(container);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      } else if (!container.contains(current)) {
        // Kutunun dışına bir şekilde çıkıldıysa (ör. programatik) ilk öğeye geri al.
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      const toRestore = returnFocusTo.current;
      if (toRestore && document.contains(toRestore)) toRestore.focus();
      returnFocusTo.current = null;
    };
  }, [active, containerRef]);
}
