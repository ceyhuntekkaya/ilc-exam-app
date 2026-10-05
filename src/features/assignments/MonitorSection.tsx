"use client";

import { close, finishRemaining, monitor } from "@/src/api/generated/assignment-controller/assignment-controller";
import type { PresenceRow } from "@/src/api/generated/models";
import { Button, ErrorState } from "@/src/ui";
import { useCallback, useEffect, useState } from "react";

export function MonitorSection({ assignmentId }: { assignmentId: string }) {
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await monitor(assignmentId);
    setRows(res.data ?? []);
  }, [assignmentId]);

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
    const timer = window.setInterval(() => void load().catch(() => undefined), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function act(run: () => Promise<unknown>) {
    try {
      await run();
      setNote("İşlem kaydedildi");
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }

  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid gap-3">
      {note ? <p className="text-sm text-fg-muted">{note}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => act(() => close(assignmentId))}>
          Atamayı kapat
        </Button>
        <Button type="button" variant="secondary" onClick={() => act(() => finishRemaining(assignmentId))}>
          Kalanları bitir
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-3">Öğrenci</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3">Son görülme</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.applicationId ?? index} className="border-b border-border/60">
                <td className="px-3 py-3">{row.studentId ?? "—"}</td>
                <td className="px-3 py-3">{row.status ?? "—"}</td>
                <td className="px-3 py-3">
                  {row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString("tr-TR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
