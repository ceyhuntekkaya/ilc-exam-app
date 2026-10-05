"use client";

import { customInstance } from "@/src/api/mutator";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Row = { recipientId?: string; studentId?: string; status?: string; lastSeenAt?: string; focusLoss?: number };

export default function MonitorPage() {
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    const res = await customInstance<{ data: Row[] }>(`/assignments/${params.id}/monitor`);
    setRows(res.data ?? []);
  }

  useEffect(() => {
    void load().catch((err: Error) => setNote(err.message));
    const timer = window.setInterval(() => void load().catch(() => undefined), 15000);
    return () => window.clearInterval(timer);
  }, [params.id]);

  async function act(path: string, body?: unknown) {
    await customInstance(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setNote("İşlem kaydedildi");
    await load();
  }

  return (
    <section className="grid gap-3">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-ilc-navy">Canlı izleme</h1>
      {note ? <p className="text-sm text-ilc-navy/70">{note}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-xl bg-white px-3 ring-1 ring-ilc-line" onClick={() => act(`/assignments/${params.id}/close`)}>
          Atamayı kapat
        </button>
        <button type="button" className="min-h-11 rounded-xl bg-white px-3 ring-1 ring-ilc-line" onClick={() => act(`/assignments/${params.id}/finish-remaining`)}>
          Kalanları bitir
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-ilc-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ilc-line">
              <th className="px-3 py-3">Öğrenci</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3">Son görülme</th>
              <th className="px-3 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.recipientId ?? index} className="border-b border-ilc-line/60">
                <td className="px-3 py-3">{row.studentId ?? row.recipientId}</td>
                <td className="px-3 py-3">{row.status}</td>
                <td className="px-3 py-3">{row.lastSeenAt ?? "—"}</td>
                <td className="px-3 py-3">
                  {row.recipientId ? (
                    <button
                      type="button"
                      className="min-h-11 text-ilc-teal"
                      onClick={() => act(`/recipients/${row.recipientId}/grant-attempt`)}
                    >
                      Hak ver
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
