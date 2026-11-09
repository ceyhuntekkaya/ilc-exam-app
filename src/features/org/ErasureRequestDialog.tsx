"use client";

import { useState } from "react";
import { useSubmit } from "@/src/api/generated/erasure-requests/erasure-requests";
import { submitFailureMessage, toSubmitBody, validateErasureReason } from "@/src/features/admin/retentionModel";
import { Field, FormDialog, Textarea, notify } from "@/src/ui";

/**
 * R-24: kurum personelinin KENDİ adayı adına silme talebi açması (`student:manage`). Talep açmak hiçbir şey silmez; yürütme
 * ve ret yalnız merkezdedir. Başka kurumun adayı için sunucu aynı 403'ü döner (varlık sızdırılmaz).
 */
export function ErasureRequestDialog({ student, onClose }: { student: { id?: string; firstName?: string; lastName?: string }; onClose: () => void }) {
  const submit = useSubmit();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const issue = validateErasureReason(reason);
  const name = `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || "Öğrenci";

  async function send() {
    if (issue || !student.id) return;
    setError(null);
    try {
      await submit.mutateAsync({ data: toSubmitBody({ subjectUserId: student.id, reason }) });
      notify.success("Silme talebi merkeze iletildi");
      onClose();
    } catch (err) {
      setError(submitFailureMessage(err));
    }
  }

  return (
    <FormDialog
      open
      title={`${name} — veri silme talebi`}
      description="Talep merkeze iletilir ve merkez tarafından değerlendirilir; bu işlem verileri hemen silmez. Açık itiraz, yasal tutma ya da itiraz süresi varsa ilgili veriler engel kalkana kadar silinmez."
      submitLabel="Talebi ilet"
      pending={submit.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void send()}
    >
      <Field label="Açıklama (isteğe bağlı)" error={issue ?? undefined}>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </FormDialog>
  );
}
