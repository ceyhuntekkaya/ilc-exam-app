"use client";

export function ReconnectOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="reconnect-title" className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 px-6 text-center backdrop-blur-sm">
      <div className="max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-neutral-200">
        <span aria-hidden className="mx-auto block size-12 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
        <h2 id="reconnect-title" className="mt-5 text-xl font-bold text-neutral-900">Waiting for the internet connection</h2>
        <p className="mt-2 text-base text-neutral-700">
          Don’t worry, your timer has stopped. When the connection is back, you will continue from the same question.
        </p>
      </div>
    </div>
  );
}
