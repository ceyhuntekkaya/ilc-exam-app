"use client";

export function ReconnectOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="reconnect-title" className="fixed inset-0 z-40 flex items-center justify-center bg-(--sb-bg)/90 px-6 text-center">
      <div className="max-w-md rounded-(--sb-r-lg) border-2 border-(--sb-ink) bg-white p-8">
        <span aria-hidden className="mx-auto block size-12 animate-spin rounded-full border-4 border-(--sb-sunken) border-t-(--sb-ink)" />
        <h2 id="reconnect-title" className="mt-5 text-xl font-extrabold text-(--sb-ink)">Waiting for the internet connection</h2>
        <p className="mt-2 text-base text-(--sb-fg-strong)">
          Don’t worry, your timer has stopped. When the connection is back, you will continue from the same question.
        </p>
      </div>
    </div>
  );
}
