"use client";

export function ReconnectOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 px-6 text-center backdrop-blur-sm">
      <div className="max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ilc-line">
        <h2 className="text-xl font-semibold text-ilc-navy">Bağlantı bekleniyor</h2>
        <p className="mt-2 text-sm text-ilc-navy/80">
          Süreniz işlemiyor. Bağlantı gelince kaldığınız sorudan devam edeceksiniz.
        </p>
      </div>
    </div>
  );
}
