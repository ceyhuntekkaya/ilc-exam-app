import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL otomatik temizlemiyor — her testten sonra DOM'u söker, aksi halde ardışık testlerde
// aynı data-testid birden çok kez bulunur (bu pakette bu bulundu, HotspotViews.test.tsx/
// ExamFlowProvider.test.tsx birden çok `render` çağırıyor).
afterEach(() => {
  cleanup();
});

// F3-00: jsdom'da eksik olan, bileşen testlerinde sık çarpılan iki API'nin stub'ı.
// jsdom crypto.randomUUID'yi zaten taşıyabilir (Node'un Web Crypto'su) — varsa dokunulmaz.
if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    value: { ...(globalThis.crypto ?? {}), randomUUID: () => "00000000-0000-4000-8000-000000000000" },
    configurable: true,
  });
}

// jsdom URL.createObjectURL'ü HİÇ uygulamaz — medya cevap görünümlerinin (AUDIO/VIDEO/IMAGE_RESPONSE)
// yükleme önizlemesi bunu çağırır (F3-02).
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob://test";
}

// jsdom matchMedia'yı HİÇ uygulamaz — Tailwind/tema sarmalayıcılarının dokunduğu ortak nokta.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
