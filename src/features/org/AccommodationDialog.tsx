"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customInstance } from "@/src/api/mutator";
import {
  Badge,
  Button,
  Checkbox,
  Field,
  FormDialog,
  Input,
  errorMessage,
  notify,
} from "@/src/ui";

type AccommodationProfileDto = {
  id: string;
  extraTimePercent: number | null;
  mandatoryBreakMinutes: number | null;
  screenReader: boolean;
  largeFont: boolean;
  highContrast: boolean;
  separateRoom: boolean;
  exemptSkillCode: string | null;
} | null;

/**
 * F3-09/Adım 7: düzenleme (accommodation) profili ekranı. D16/Dokunulmayacaklar: profil
 * KURUM YÖNETİCİSİ tarafından tanımlanır, aday hiçbir şekilde kendi profilini seçemez — bu
 * yüzden bu ekran yalnız staff/admin panelinde (StudentsSection), öğrenci tarafında hiç yok.
 * Formda "Kaydet" her zaman mevcut aktif profili (varsa) KAPATIP yeni bir profil tanımlar
 * (backend, AccommodationProfileService.define) — ayrı bir "görüntüle/düzenle" moduna
 * gerek yok, FormDialog'un her zaman etkin olan tek gönder düğmesiyle tutarlı.
 */
export function AccommodationDialog({
  companyId,
  studentId,
  studentLabel,
  open,
  onClose,
}: {
  companyId: string;
  studentId: string;
  studentLabel: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryKey = ["accommodation", companyId, studentId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      customInstance<{ data: AccommodationProfileDto }>(`/companies/${companyId}/students/${studentId}/accommodation`),
    enabled: open,
  });
  const profile = data?.data ?? null;
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const define = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      customInstance(`/companies/${companyId}/students/${studentId}/accommodation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      notify.success("Düzenleme profili kaydedildi");
      onClose();
    },
    onError: (err) => {
      const message = errorMessage(err, "Düzenleme profili kaydedilemedi");
      setFormError(message);
      notify.error(message);
    },
  });

  const revoke = useMutation({
    mutationFn: () =>
      customInstance(`/companies/${companyId}/students/${studentId}/accommodation/${profile?.id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Kurum yöneticisi tarafından kaldırıldı" }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      notify.success("Düzenleme profili kaldırıldı");
    },
    onError: (err) => notify.error(errorMessage(err, "Kaldırılamadı")),
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Düzenleme profili"
      description={`${studentLabel} — ek süre, zorunlu mola, sunum düzenlemeleri ve beceri muafiyeti. Aday bu ayarları kendisi seçemez.`}
      submitLabel={profile ? "Güncelle" : "Tanımla"}
      pending={define.isPending}
      error={formError}
      onSubmit={async (fd) => {
        setFormError(null);
        const extraTimePercent = String(fd.get("extraTimePercent") || "").trim();
        const mandatoryBreakMinutes = String(fd.get("mandatoryBreakMinutes") || "").trim();
        const exemptSkillCode = String(fd.get("exemptSkillCode") || "").trim();
        await define.mutateAsync({
          extraTimePercent: extraTimePercent ? Number(extraTimePercent) : null,
          mandatoryBreakMinutes: mandatoryBreakMinutes ? Number(mandatoryBreakMinutes) : null,
          screenReader: fd.get("screenReader") === "on",
          largeFont: fd.get("largeFont") === "on",
          highContrast: fd.get("highContrast") === "on",
          separateRoom: fd.get("separateRoom") === "on",
          exemptSkillCode: exemptSkillCode || null,
        });
      }}
    >
      {isLoading ? (
        <p className="text-sm text-fg-muted">Yükleniyor…</p>
      ) : profile ? (
        <div className="grid gap-2 rounded-md border border-border bg-bg/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success" dot>
              Şu an etkin
            </Badge>
            {profile.extraTimePercent ? <Badge tone="neutral">{`Ek süre %${profile.extraTimePercent}`}</Badge> : null}
            {profile.mandatoryBreakMinutes ? (
              <Badge tone="neutral">{`Zorunlu mola ${profile.mandatoryBreakMinutes} dk`}</Badge>
            ) : null}
            {profile.exemptSkillCode ? <Badge tone="warning">{`Muaf: ${profile.exemptSkillCode}`}</Badge> : null}
          </div>
          <Button type="button" size="sm" variant="danger" loading={revoke.isPending} onClick={() => revoke.mutate()}>
            Düzenlemeyi kaldır
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ek süre (%)" hint="Boş = ek süre yok.">
          <Input name="extraTimePercent" type="number" min={0} defaultValue={profile?.extraTimePercent ?? ""} />
        </Field>
        <Field label="Zorunlu mola (dk)" hint="Boş = zorunlu mola yok. Süreye eklenir, kısaltmaz.">
          <Input name="mandatoryBreakMinutes" type="number" min={0} defaultValue={profile?.mandatoryBreakMinutes ?? ""} />
        </Field>
      </div>
      <Field label="Muaf beceri kodu" hint="Örn. LISTENING. Boş = muafiyet yok. Toplam puanın paydasından arındırılır.">
        <Input name="exemptSkillCode" defaultValue={profile?.exemptSkillCode ?? ""} />
      </Field>
      <div className="grid gap-1 sm:grid-cols-2">
        <Checkbox name="screenReader" label="Ekran okuyucu" defaultChecked={profile?.screenReader ?? false} />
        <Checkbox name="largeFont" label="Büyük yazı tipi" defaultChecked={profile?.largeFont ?? false} />
        <Checkbox name="highContrast" label="Yüksek kontrast" defaultChecked={profile?.highContrast ?? false} />
        <Checkbox name="separateRoom" label="Ayrı oda" defaultChecked={profile?.separateRoom ?? false} />
      </div>
    </FormDialog>
  );
}
