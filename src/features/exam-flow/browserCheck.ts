/**
 * F3-16/Adım 4: istemci tarafı tespit — BİLGİLENDİRME amaçlıdır, karar DEĞİLDİR (D67: karar
 * sunucuda verilir — `BrowserPolicy.classify`/`ApplicationLifecycleService.assertBrowserSupported`;
 * User-Agent istemciden gelir ve değiştirilebilir). Burada `BrowserPolicy.java`'nın regex mantığı
 * ve V116'nın varsayılan politika satırları (CHROMIUM>=120 TAM, SAFARI_DESKTOP/SAFARI_IOS>=17
 * ALISTIRMA, FIREFOX>=121 ALISTIRMA, eşleşmeyen ENGELLI) aynen yansıtılır. Bir şirket politika
 * tablosunu özelleştirirse bu tahmin sapabilir — zararı yoktur, sunucu yine de gerçek kuralı uygular.
 */

export type BrowserClass = "TAM" | "ALISTIRMA" | "ENGELLI";

const BROWSER_CLASS_ORDER: Record<BrowserClass, number> = { TAM: 0, ALISTIRMA: 1, ENGELLI: 2 };

export type DetectedBrowser = { name: string; version: number | null; browserClass: BrowserClass };

const DEFAULT_MIN_VERSION: Record<string, number> = {
  CHROMIUM: 120,
  SAFARI_DESKTOP: 17,
  SAFARI_IOS: 17,
  FIREFOX: 121,
};

const DEFAULT_CLASS: Record<string, BrowserClass> = {
  CHROMIUM: "TAM",
  SAFARI_DESKTOP: "ALISTIRMA",
  SAFARI_IOS: "ALISTIRMA",
  FIREFOX: "ALISTIRMA",
};

/**
 * Edge/Chromium ÖNCE kontrol edilir (Edge'in UA'sı "Chrome/XXX" token'ını da taşır). Opera da
 * "Chrome/XXX" taşır ama "OPR/" ile ayırt edilir (`BrowserPolicy.detect`'in aynı istisnası).
 * Safari sürümü "Version/XX" token'ındadır, "Safari/XX" DEĞİL (o WebKit motor sürümü).
 * iOS/iPadOS Safari UA'sı "iPhone"/"iPad"/"iPod" taşır.
 */
export function detectBrowser(userAgent: string): DetectedBrowser {
  if (!userAgent) return { name: "Unknown", version: null, browserClass: "ENGELLI" };

  const edge = userAgent.match(/Edg\/(\d+)/);
  if (edge) return classified("Edge", "CHROMIUM", Number(edge[1]));

  const chrome = userAgent.match(/Chrome\/(\d+)/);
  if (chrome && !/OPR\//.test(userAgent)) return classified("Chrome", "CHROMIUM", Number(chrome[1]));

  const isIos = /iPhone|iPad|iPod/.test(userAgent);
  const safariVersion = userAgent.match(/Version\/(\d+)/);
  if (userAgent.includes("Safari/") && safariVersion) {
    return classified(isIos ? "Safari (iOS)" : "Safari", isIos ? "SAFARI_IOS" : "SAFARI_DESKTOP", Number(safariVersion[1]));
  }

  const firefox = userAgent.match(/Firefox\/(\d+)/);
  if (firefox) return classified("Firefox", "FIREFOX", Number(firefox[1]));

  return { name: "Unknown", version: null, browserClass: "ENGELLI" };
}

function classified(name: string, family: string, version: number): DetectedBrowser {
  const minVersion = DEFAULT_MIN_VERSION[family];
  const browserClass = version >= minVersion ? DEFAULT_CLASS[family] : "ENGELLI";
  return { name, version, browserClass };
}

/** Kural: algılanan sınıf gerekenden EN AZ o kadar güçlü olmalı (daha düşük/eşit sıra). */
export function meetsRequirement(detected: BrowserClass, required: BrowserClass): boolean {
  return BROWSER_CLASS_ORDER[detected] <= BROWSER_CLASS_ORDER[required];
}

export const BROWSER_CLASS_LABEL: Record<BrowserClass, string> = {
  TAM: "Chrome, Edge or another Chromium-based browser (120+)",
  ALISTIRMA: "Chrome, Edge, Safari (17+) or Firefox (121+)",
  ENGELLI: "a supported browser",
};
