// F3-01: PWA uygulama kabuğu service worker'ı. ELLE YAZILDI — Workbox/kütüphane YOK (bilinçli,
// bkz. plan/faz-3/F3-01-pwa-iskelet.md): kapsam dar ve öngörülebilir, önbellek stratejisi
// cömert olmamalı. Yalnız KABUK (HTML/JS/CSS/font/ikon) önbekleklenir — sınav paketi ve
// medya F3-05'in işi, bu dosya onlara hiç dokunmaz.
//
// Sürüm güncellemesi sınav SIRASINDA uygulanmaz: install() yeni sürümü önbekleğe alır ama
// activate() etmez (self.skipWaiting() OTOMATİK çağrılmaz) — yalnız sayfa "SKIP_WAITING"
// mesajı gönderirse (src/lib/pwa/registerServiceWorker.ts, aktif oturum YOKSA) devreye girer.

const CACHE_VERSION = "v1";
const SHELL_CACHE = `ilc-shell-${CACHE_VERSION}`;

// Build zamanında hash'lenen _next/static/** dosyaları burada SABİT yazılamaz (her derlemede
// adı değişir) — onlar fetch anında cache-first ile eklenir. Burada yalnız adı SABİT, build'den
// bağımsız yol'lar var.
const SHELL_URLS = ["/manifest.json", "/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Tek bir eksik dosya kurulumu düşürmesin (ör. offline derlenmemiş bir ortamda).
          }),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// src/lib/pwa/registerServiceWorker.ts: aktif sınav oturumu YOKSA bu mesajı gönderir.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isCacheableStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/brand/")
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Kesin kural: API yanıtları HİÇ önbelleklenmez, bu fetch handler'a hiç girmez — tarayıcı
  // doğrudan ağa gider. Bir cevap gönderiminin önbellekten dönmesi sessiz veri kaybı olurdu.
  if (url.pathname.startsWith("/api/")) {
    return;
  }
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.open(SHELL_CACHE).then((cache) => cache.match("/offline")),
      ),
    );
    return;
  }

  if (isCacheableStaticAsset(url)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const network = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => null);
        // Stale-while-revalidate: varsa önbellekten hemen dön, arka planda tazele.
        return cached ?? (await network) ?? Response.error();
      }),
    );
  }
});
