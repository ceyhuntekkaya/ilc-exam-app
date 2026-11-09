"use client";

import { runStatus } from "@/src/api/generated/ai-grading-controller/ai-grading-controller";
import { aggregateRuns, runFinished, type RunProgress } from "@/src/features/grading/aiGradingModel";
import { useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

export const AI_RUN_POLL_MS = 5000;

/**
 * R-30: AI koşumlarının ilerlemesi. `track(runIds)` ile eklenen koşumlar `pollMs`'de bir sorgulanır; hepsi bitince
 * `onFinished` bir kez çağrılır ve izleme bırakılır. Koşum kimliği YALNIZ bellekte tutulur: sayfa yenilenirse
 * sürmekte olan iş, cevapların `jobStatus` alanından (liste yenilemesiyle) görülür.
 */
export function useAiRuns(
  companyId: string,
  onFinished: (progress: RunProgress) => void,
  pollMs: number = AI_RUN_POLL_MS,
) {
  const [runIds, setRunIds] = useState<string[]>([]);
  const results = useQueries({
    queries: runIds.map((runId) => ({
      queryKey: ["ai-run", companyId, runId],
      queryFn: async () => (await runStatus(companyId, runId)).data,
      refetchInterval: (query: { state: { data?: Parameters<typeof runFinished>[0] } }) =>
        runFinished(query.state.data) ? false : pollMs,
      gcTime: 0,
    })),
  });
  const progress = aggregateRuns(results.map((r) => r.data));
  const finishedRef = useRef(onFinished);
  useEffect(() => {
    finishedRef.current = onFinished;
  });
  // Sorgusu hata veren koşum izlemeden düşer (sonsuz "bekleniyor" olmasın); liste yine de yenilenir.
  const settled = runIds.length > 0 && results.every((r) => (r.data ? runFinished(r.data) : r.isError));
  const runKey = runIds.join(",");
  const settledRef = useRef(false);
  const handledKey = useRef("");
  useEffect(() => {
    settledRef.current = settled;
    if (!settled || handledKey.current === runKey) return;
    handledKey.current = runKey;
    finishedRef.current(progress);
  });

  const track = useCallback((ids: string[]) => {
    const next = ids.filter(Boolean);
    if (next.length === 0) return;
    // Önceki koşumlar bitmişse ilerleme yeni koşumla sıfırdan başlar.
    setRunIds((current) => (settledRef.current ? next : [...new Set([...current, ...next])]));
  }, []);

  return { track, active: runIds.length > 0 && !settled, progress };
}
