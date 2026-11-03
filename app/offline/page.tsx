import { EmptyState } from "@/src/ui";

/**
 * F3-01: service worker (public/sw.js) navigasyon isteği ağdan düşerse bu sayfayı döner —
 * yalnız uygulama KABUĞU çevrimdışı açılır, sınav verisi/medyası değil (o F3-05'in işi).
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <EmptyState
          tone="warning"
          title="Çevrimdışısınız"
          description="İnternet bağlantısı yok. Uygulama kabuğu önbellekten açıldı; sınav verisi veya yeni sayfalar bağlantı gelince yüklenir."
        />
      </div>
    </main>
  );
}
