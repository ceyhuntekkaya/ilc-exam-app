"use client";

import { previewModelFromDetail } from "@/src/features/authoring/questions/previewModel";
import { authoringApi } from "@/src/features/authoring/shared/client";
import { QuestionPreviewShell } from "@/src/features/exam-player";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { useEffect, useState } from "react";

const cache = new Map<string, QuestionViewModel>();

/** Sürüm kimliğiyle öğrenci önizlemesini yükler. Sonuç oturum boyunca önbellekte kalır. */
export function QuestionPreviewLoader({ versionId }: { versionId: string }) {
  const [model, setModel] = useState<QuestionViewModel | null>(cache.get(versionId) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = cache.get(versionId);
    if (cached) {
      setModel(cached);
      return;
    }
    let cancel = false;
    setModel(null);
    setError(null);
    void authoringApi
      .getQuestion(versionId)
      .then((detail) => {
        const next = previewModelFromDetail(detail);
        cache.set(versionId, next);
        if (!cancel) setModel(next);
      })
      .catch(() => {
        if (!cancel) setError("Önizleme yüklenemedi.");
      });
    return () => {
      cancel = true;
    };
  }, [versionId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!model) return <p className="text-sm text-fg-muted">Önizleme yükleniyor…</p>;
  return <QuestionPreviewShell model={model} />;
}
