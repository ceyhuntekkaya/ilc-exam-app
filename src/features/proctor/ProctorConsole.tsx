"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addProctorNote,
  listSeats,
  pauseAllCandidates,
  recordIdentityCheck,
  resumeAllCandidates,
  startProctorSession,
  stopProctorSession,
  type SessionSeat,
} from "@/src/features/proctor/api";
import { Badge, Button, ConfirmDialog, ErrorState, PageHeader, SectionTable, errorMessage, notify } from "@/src/ui";

const SEAT_STATUS: Record<SessionSeat["status"], { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  ASSIGNED: { label: "Atandı", tone: "neutral" },
  CHECKED_IN: { label: "Girdi", tone: "info" },
  NO_SHOW: { label: "Gelmedi", tone: "danger" },
};

type DialogKind = "start" | "stop" | "pauseAll" | "resumeAll" | null;

/**
 * F3-12/Adım 5: gözetmen konsolu. Oturma planı (koltuk/aday listesi) F3-11'in verisi; bu ekran
 * eylemler ekler (başlat/durdur/toplu duraklat-devam ettir/kimlik kontrolü/not) — her biri
 * sunucuda ilgili denemenin olay günlüğüne yazılır (kabul kriteri, backend DURUM.md).
 * Merkez/salon/seans/koltuk YÖNETİMİ (F3-11'in kendi, henüz kurulmamış frontend'i) BU EKRANDA
 * YOK — konsol, zaten planlanmış/koltuklu bir seans üzerinde çalışır.
 */
export function ProctorConsole({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const seatsQuery = useQuery({
    queryKey: ["proctor-seats", sessionId],
    queryFn: () => listSeats(sessionId),
    refetchInterval: 15000,
  });
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [noteFor, setNoteFor] = useState<{ recipientId: string; mode: "identity" | "note" } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["proctor-seats", sessionId] });
  }

  const start = useMutation({ mutationFn: () => startProctorSession(sessionId) });
  const stop = useMutation({ mutationFn: () => stopProctorSession(sessionId) });
  const pauseAll = useMutation({ mutationFn: () => pauseAllCandidates(sessionId) });
  const resumeAll = useMutation({ mutationFn: () => resumeAllCandidates(sessionId) });
  const identityCheck = useMutation({
    mutationFn: (input: { recipientId: string; note: string }) => recordIdentityCheck(input.recipientId, true, input.note || undefined),
  });
  const addNote = useMutation({
    mutationFn: (input: { recipientId: string; note: string }) => addProctorNote(input.recipientId, input.note),
  });

  const seats = seatsQuery.data ?? [];
  const pending = start.isPending || stop.isPending || pauseAll.isPending || resumeAll.isPending;

  async function runDialogAction() {
    setActionError(null);
    try {
      if (dialog === "start") {
        await start.mutateAsync();
        notify.success("Seans başlatıldı.");
      } else if (dialog === "stop") {
        await stop.mutateAsync();
        notify.success("Seans durduruldu.");
      } else if (dialog === "pauseAll") {
        const result = await pauseAll.mutateAsync();
        notify.success(`${result.pausedCount} aday duraklatıldı.`);
      } else if (dialog === "resumeAll") {
        const result = await resumeAll.mutateAsync();
        notify.success(`${result.resumedCount} adayın süresi devam ettirildi.`);
      }
      setDialog(null);
      invalidate();
    } catch (err) {
      setActionError(errorMessage(err, "İşlem başarısız oldu. Lütfen tekrar deneyin."));
    }
  }

  async function runNoteAction(input: { reason: string }) {
    if (!noteFor) return;
    setActionError(null);
    try {
      if (noteFor.mode === "identity") {
        await identityCheck.mutateAsync({ recipientId: noteFor.recipientId, note: input.reason });
        notify.success("Kimlik kontrolü kaydedildi.");
      } else {
        await addNote.mutateAsync({ recipientId: noteFor.recipientId, note: input.reason });
        notify.success("Not kaydedildi.");
      }
      setNoteFor(null);
    } catch (err) {
      setActionError(errorMessage(err, "İşlem başarısız oldu. Lütfen tekrar deneyin."));
    }
  }

  return (
    <div>
      <PageHeader title="Gözetmen konsolu" description="Oturum eylemleri doğrudan adayların sınav kaydına yazılır." />
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={pending} onClick={() => setDialog("start")}>
            Seansı başlat
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setDialog("stop")}>
            Seansı durdur
          </Button>
          <Button variant="danger" disabled={pending} onClick={() => setDialog("pauseAll")}>
            Tümünü duraklat
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setDialog("resumeAll")}>
            Tümünü devam ettir
          </Button>
        </div>

        {seatsQuery.isError ? (
          <ErrorState error={seatsQuery.error} onRetry={() => void seatsQuery.refetch()} compact />
        ) : (
          <SectionTable
            loading={seatsQuery.isLoading}
            empty="Bu seansta koltuklu aday yok"
            columns={["Koltuk", "Aday", "Durum", "Eylemler"]}
            rows={seats.map((seat) => {
              const status = SEAT_STATUS[seat.status];
              return [
                seat.seatNo ?? "—",
                <span key="r" className="font-mono text-[13px]">{seat.recipientId}</span>,
                <Badge key="s" tone={status.tone} dot>
                  {status.label}
                </Badge>,
                <div key="a" className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setNoteFor({ recipientId: seat.recipientId, mode: "identity" })}>
                    Kimlik kontrolü
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setNoteFor({ recipientId: seat.recipientId, mode: "note" })}>
                    Not ekle
                  </Button>
                </div>,
              ];
            })}
          />
        )}
      </div>

      <ConfirmDialog
        open={dialog === "start"}
        title="Seansı başlat?"
        description="Bu seanstaki her koltuklu adayın sınav kaydına bir olay yazılır."
        confirmLabel="Başlat"
        tone="primary"
        pending={start.isPending}
        error={actionError ?? undefined}
        onClose={() => setDialog(null)}
        onConfirm={() => void runDialogAction()}
      />
      <ConfirmDialog
        open={dialog === "stop"}
        title="Seansı durdur?"
        description="Bu seanstaki her koltuklu adayın sınav kaydına bir olay yazılır."
        confirmLabel="Durdur"
        pending={stop.isPending}
        error={actionError ?? undefined}
        onClose={() => setDialog(null)}
        onConfirm={() => void runDialogAction()}
      />
      <ConfirmDialog
        open={dialog === "pauseAll"}
        title="Tüm adayları duraklat?"
        description="Bu seanstaki her aktif denemenin süresi durur ve yeni cevap kabul edilmez. Yalnız bu konsoldan devam ettirilebilir."
        confirmLabel="Duraklat"
        pending={pauseAll.isPending}
        error={actionError ?? undefined}
        onClose={() => setDialog(null)}
        onConfirm={() => void runDialogAction()}
      />
      <ConfirmDialog
        open={dialog === "resumeAll"}
        title="Tüm adayların süresini devam ettir?"
        description="Duraklama süresi hiçbir adayın süresinden düşülmez."
        confirmLabel="Devam ettir"
        tone="primary"
        pending={resumeAll.isPending}
        error={actionError ?? undefined}
        onClose={() => setDialog(null)}
        onConfirm={() => void runDialogAction()}
      />
      <ConfirmDialog
        open={noteFor?.mode === "identity"}
        title="Kimlik doğrulandı olarak kaydet"
        description="İsteğe bağlı bir not ekleyebilirsiniz (ör. belge türü)."
        confirmLabel="Kaydet"
        tone="primary"
        reasonLabel="Not (opsiyonel)"
        pending={identityCheck.isPending}
        error={actionError ?? undefined}
        onClose={() => setNoteFor(null)}
        onConfirm={(input) => void runNoteAction(input)}
      />
      <ConfirmDialog
        open={noteFor?.mode === "note"}
        title="Gözetmen notu ekle"
        confirmLabel="Kaydet"
        tone="primary"
        reasonRequired
        reasonLabel="Not"
        reasonHint="Örneğin: 10:05'te şüpheli hareket."
        pending={addNote.isPending}
        error={actionError ?? undefined}
        onClose={() => setNoteFor(null)}
        onConfirm={(input) => void runNoteAction(input)}
      />
    </div>
  );
}
