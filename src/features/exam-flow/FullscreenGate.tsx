"use client";

import { canRequestFullscreen } from "@/src/features/exam-flow/fullscreen";
import { KidButton } from "@/src/features/student/ui";
import { IconMonitor } from "@/src/ui/icons";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Tam ekrandan çıkılınca soruları kapatır. Buton yeni bir tıklamadır;
 * tarayıcı ancak bu tıklamayla yeniden tam ekran açar.
 */
export function FullscreenGate({ onResume }: { onResume: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = canRequestFullscreen();

  useEffect(() => {
    const panel = document.querySelector("[data-panel='student']");
    panel?.setAttribute("inert", "");
    return () => panel?.removeAttribute("inert");
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fullscreen-title"
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-white px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-50 text-primary-700 [&>svg]:size-7">
          <IconMonitor aria-hidden />
        </span>
        <h2 id="fullscreen-title" className="mt-4 text-xl font-bold text-neutral-900">
          The test is paused
        </h2>
        <p className="mt-2 text-base text-neutral-700">
          {supported
            ? "You left full screen. The timer has stopped. Go back to full screen to continue."
            : "This browser cannot open the test in full screen. Use Chrome, Edge, or Safari on a tablet or computer."}
        </p>
        {error ? (
          <p role="alert" className="mt-3 rounded-2xl bg-(--kid-coral-bg) px-4 py-3 font-medium text-(--kid-coral)">
            {error}
          </p>
        ) : null}
        {supported ? (
          <KidButton
            size="lg"
            full
            className="mt-6"
            autoFocus
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void onResume()
                .catch(() => setError("Full screen did not open. Tap the button again."))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Opening full screen…" : "Back to full screen"}
          </KidButton>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
