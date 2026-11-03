import { isExamInProgress } from "@/src/lib/pwa/version";

/**
 * F3-01: `public/sw.js`'i kaydeder. Kurallar:
 * - Yeni sürüm kurulur (`install`) ama aktif oturum varsa (bkz. `isExamInProgress`)
 *   `SKIP_WAITING` mesajı GÖNDERİLMEZ — yeni kabuk `waiting` durumunda bekler.
 * - Oturum yokken (ör. sayfa her yüklendiğinde, rota değiştiğinde) tekrar denenir.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        const tryActivateWaiting = () => {
          if (registration.waiting && !isExamInProgress(window.location.pathname)) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        };

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              tryActivateWaiting();
            }
          });
        });

        // Sayfa yüklendiğinde zaten bekleyen bir sürüm olabilir (önceki ziyarette kuruldu).
        tryActivateWaiting();

        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });
      })
      .catch(() => {
        // Kayıt başarısız olsa da uygulama normal (çevrimiçi) modda çalışır — sessiz geç.
      });
  });
}
