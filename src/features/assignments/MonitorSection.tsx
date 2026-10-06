"use client";

import { close, finishRemaining, useMonitor } from "@/src/api/generated/assignment-controller/assignment-controller";
import { useStudents } from "@/src/api/generated/admin-companies/admin-companies";
import { useOpsHref, usePanelCompanyId } from "@/src/features/panel/PanelContext";
import { Badge, Button, ConfirmDialog, ErrorState, PageHeader, SectionTable, errorMessage, notify } from "@/src/ui";
import { useMemo, useState } from "react";

const REFRESH_MS = 15000;

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const STATUS: Record<string, { label: string; tone: Tone }> = {
  NOT_STARTED: { label: "Başlamadı", tone: "neutral" },
  PENDING: { label: "Bekliyor", tone: "neutral" },
  IN_PROGRESS: { label: "Sınavda", tone: "info" },
  ACTIVE: { label: "Sınavda", tone: "info" },
  PAUSED: { label: "Duraklatıldı", tone: "warning" },
  SUBMITTED: { label: "Teslim etti", tone: "success" },
  COMPLETED: { label: "Tamamladı", tone: "success" },
  FINISHED: { label: "Tamamladı", tone: "success" },
  EXPIRED: { label: "Süre doldu", tone: "warning" },
  ABSENT: { label: "Girmedi", tone: "danger" },
};

function statusOf(code?: string | null) {
  return code ? (STATUS[code] ?? { label: code, tone: "neutral" as Tone }) : { label: "—", tone: "neutral" as Tone };
}

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Atama canlı izleme: özet sayaçlar + öğrenci tablosu, 15 sn'de bir sessiz yenileme.
 * Geri alınamayan işlemler (kapat / kalanları bitir) onay ister.
 */
export function MonitorSection({ assignmentId }: { assignmentId: string }) {
  const query = useMonitor(assignmentId, { query: { refetchInterval: REFRESH_MS } });
  const rows = query.data?.data ?? [];
  const loaded = query.isSuccess;
  const updatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;
  const [confirm, setConfirm] = useState<"close" | "finish" | null>(null);
  const [pending, setPending] = useState(false);
  const hrefs = useOpsHref();
  const companyId = usePanelCompanyId();
  const studentsQ = useStudents(companyId ?? "", { query: { enabled: Boolean(companyId) } });
  // Tabloda kimlik yerine ad; liste gelmezse kimlik gösterilir.
  const studentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of studentsQ.data?.data ?? []) {
      if (s.id) map.set(s.id, `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim());
    }
    return map;
  }, [studentsQ.data]);

  async function runConfirmed() {
    if (!confirm) return;
    setPending(true);
    try {
      await (confirm === "close" ? close(assignmentId) : finishRemaining(assignmentId));
      notify.success(confirm === "close" ? "Atama kapatıldı" : "Kalan oturumlar bitirildi");
      setConfirm(null);
      await query.refetch();
    } catch (err) {
      notify.error(errorMessage(err, "İşlem başarısız"));
    } finally {
      setPending(false);
    }
  }

  const header = (
    <PageHeader
      title="Canlı izleme"
      description="Öğrencilerin sınav durumu 15 saniyede bir kendiliğinden yenilenir."
      back={{ href: hrefs.assignments, label: "Atamalar" }}
    />
  );

  if (query.isError && !loaded) {
    return (
      <div>
        {header}
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      </div>
    );
  }

  const counts = rows.reduce(
    (acc, row) => {
      const tone = statusOf(row.status).tone;
      if (tone === "info") acc.active++;
      else if (tone === "success") acc.done++;
      else acc.other++;
      return acc;
    },
    { active: 0, done: 0, other: 0 },
  );

  return (
    <div>
      {header}
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-2 text-[13px]">
          {[
            { label: "Toplam", value: rows.length, cls: "text-fg" },
            { label: "Sınavda", value: counts.active, cls: "text-info" },
            { label: "Tamamlayan", value: counts.done, cls: "text-success" },
            { label: "Diğer", value: counts.other, cls: "text-fg-muted" },
          ].map((item) => (
            <div key={item.label} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-50 px-2.5 py-1 ring-1 ring-border">
              <dt className="text-fg-subtle">{item.label}</dt>
              <dd className={`numeric font-semibold ${item.cls}`}>{loaded ? item.value : "…"}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle" aria-live="polite">
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success-400 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-success-500" />
            </span>
            Canlı · {updatedAt ? updatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "bağlanıyor"}
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={() => setConfirm("finish")}>
            Kalanları bitir
          </Button>
          <Button type="button" size="sm" variant="danger" onClick={() => setConfirm("close")}>
            Atamayı kapat
          </Button>
        </div>
      </div>

      <SectionTable
        loading={!loaded}
        empty="Henüz katılımcı yok"
        emptyHint="Öğrenciler sınava girdikçe burada anlık görünür."
        columns={["Öğrenci", "Durum", "Son görülme"]}
        rows={rows.map((row) => {
          const s = statusOf(row.status);
          return [
            studentName.get(row.studentId ?? "") ? (
              <span key="n" className="font-medium">{studentName.get(row.studentId ?? "")}</span>
            ) : (
              <span key="n" className="font-mono text-[13px]">{row.studentId ?? "—"}</span>
            ),
            <span key="s" className="inline-flex flex-wrap items-center gap-1">
              <Badge tone={s.tone} dot>
                {s.label}
              </Badge>
              {row.proctorFlagged || row.finishedReason === "PROCTOR_LIMIT" ? (
                <span title={row.proctorFlagReason || "Odak kaybı sınırı aşıldı"}>
                  <Badge tone="danger">Şüpheli</Badge>
                </span>
              ) : null}
            </span>,
            <span key="t" title={row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString("tr-TR") : undefined}>
              {timeAgo(row.lastSeenAt)}
            </span>,
          ];
        })}
      />

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "close" ? "Atamayı kapat" : "Kalan oturumları bitir"}
        description={
          confirm === "close"
            ? "Atama yeni girişlere kapanır. Sınavı henüz başlatmamış öğrenciler artık giremez."
            : "Devam eden tüm oturumlar şu anki cevaplarıyla teslim edilir. Bu işlem geri alınamaz."
        }
        confirmLabel={confirm === "close" ? "Kapat" : "Bitir"}
        tone="danger"
        pending={pending}
        onConfirm={() => void runConfirmed()}
      />
    </div>
    </div>
  );
}
