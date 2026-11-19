"use client";

import {
  getCandidatesQueryKey,
  getDetailQueryKey,
  getList6QueryKey,
  useCancelDistribution,
  useCloseDistribution,
  useDeleteDraftDistribution,
  useRenameDistribution,
  useRescheduleDistribution,
} from "@/src/api/generated/company-distributions/company-distributions";
import type { DistributionRow } from "@/src/api/generated/models";
import {
  CLOSE_DESCRIPTION,
  cancelDescription,
  cancelOutcome,
  closeOutcome,
  manageActions,
  toWallTime,
  toWindowRequest,
  validateReschedule,
} from "@/src/features/distribution/distributionModel";
import { Button, ConfirmDialog, Field, FormDialog, Input, errorMessage, notify } from "@/src/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Dialog = "rename" | "window" | "close" | "cancel" | "remove" | null;

/**
 * Dağıtım yönetimi: ad değiştir, tarihleri uzat, iptal et, taslağı sil. Hangi eylemin görüneceği
 * `manageActions` ile belirlenir (sunucu kurallarının aynası); kuralı sunucu yine uygular.
 * Yalnız `assignment:manage` olan görür — çağıran bileşen yetkiyi denetler.
 */
export function DistributionManageActions({ distribution }: { distribution: DistributionRow }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Pencerenin bitip bitmediği render sırasında değil, diyalog açılırken (tıklamada) hesaplanır.
  const [windowEnded, setWindowEnded] = useState(false);
  const id = distribution.id ?? "";
  const actions = manageActions(distribution);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: getDetailQueryKey(id) });
    void queryClient.invalidateQueries({ queryKey: getCandidatesQueryKey(id) });
    void queryClient.invalidateQueries({ queryKey: getList6QueryKey() });
  }
  function close() {
    setDialog(null);
    setFormError(null);
  }

  const rename = useRenameDistribution({
    mutation: {
      onSuccess: () => {
        notify.success("Dağıtım adı güncellendi");
        close();
        refresh();
      },
      onError: (err) => setFormError(errorMessage(err, "Ad güncellenemedi")),
    },
  });
  const reschedule = useRescheduleDistribution({
    mutation: {
      onSuccess: () => {
        notify.success("Dağıtım tarihleri güncellendi");
        close();
        refresh();
      },
      onError: (err) => setFormError(errorMessage(err, "Tarihler güncellenemedi")),
    },
  });
  const cancel = useCancelDistribution({
    mutation: {
      onSuccess: (response) => {
        notify.success(cancelOutcome(response.data));
        close();
        refresh();
      },
      onError: (err) => setFormError(errorMessage(err, "Dağıtım iptal edilemedi")),
    },
  });
  const closeNow = useCloseDistribution({
    mutation: {
      onSuccess: (response) => {
        notify.success(closeOutcome(response.data));
        close();
        refresh();
      },
      onError: (err) => setFormError(errorMessage(err, "Dağıtım kapatılamadı")),
    },
  });
  const remove = useDeleteDraftDistribution({
    mutation: {
      onSuccess: () => {
        notify.success("Taslak silindi");
        close();
        void queryClient.invalidateQueries({ queryKey: getList6QueryKey() });
        router.push("/staff/distributions");
      },
      onError: (err) => setFormError(errorMessage(err, "Taslak silinemedi")),
    },
  });

  if (!id || !(actions.rename || actions.reschedule || actions.close || actions.cancel || actions.remove)) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {actions.rename ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setDialog("rename")}>
            Adı değiştir
          </Button>
        ) : null}
        {actions.reschedule ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => {
              setWindowEnded(distribution.windowClosesAt ? Date.parse(distribution.windowClosesAt) <= Date.now() : false);
              setDialog("window");
            }}>
            Tarihleri değiştir
          </Button>
        ) : null}
        {actions.close ? (
          <Button type="button" size="sm" variant="primary" onClick={() => setDialog("close")}>
            Teslim ettir
          </Button>
        ) : null}
        {actions.cancel ? (
          <Button type="button" size="sm" variant="danger" onClick={() => setDialog("cancel")}>
            Dağıtımı iptal et
          </Button>
        ) : null}
        {actions.remove ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setDialog("remove")}>
            Taslağı sil
          </Button>
        ) : null}
      </div>

      <FormDialog
        open={dialog === "rename"}
        title="Dağıtım adını değiştir"
        submitLabel="Kaydet"
        pending={rename.isPending}
        error={formError}
        onClose={close}
        onSubmit={(data) => {
          setFormError(null);
          const name = String(data.get("name") ?? "").trim();
          if (!name) return setFormError("Ad boş olamaz.");
          if (name.length > 150) return setFormError("Ad en fazla 150 karakter olabilir.");
          rename.mutate({ distributionId: id, data: { name } });
        }}
      >
        <Field label="Ad" required>
          <Input name="name" defaultValue={distribution.name ?? ""} maxLength={150} autoComplete="off" />
        </Field>
      </FormDialog>

      <FormDialog
        open={dialog === "window"}
        title="Dağıtım tarihlerini değiştir"
        description={
          windowEnded
            ? "Pencere kapandı. Yeni bir kapanış tarihi vererek dağıtımı yeniden uzatabilirsiniz."
            : "Kapanış yalnız ileri alınabilir. Pencere başladıysa açılış tarihi değiştirilemez. Saatler İstanbul saatidir."
        }
        submitLabel="Kaydet"
        pending={reschedule.isPending}
        error={formError}
        onClose={close}
        onSubmit={(data) => {
          setFormError(null);
          const opens = String(data.get("opensAt") ?? "");
          const closes = String(data.get("closesAt") ?? "");
          const problem = validateReschedule(distribution, opens, closes);
          if (problem) return setFormError(problem);
          reschedule.mutate({ distributionId: id, data: toWindowRequest(opens, closes) });
        }}
      >
        <Field label="Açılış (İstanbul saati)" required>
          <Input name="opensAt" type="datetime-local" defaultValue={toWallTime(distribution.windowOpensAt)} />
        </Field>
        <Field label="Kapanış (İstanbul saati)" required>
          <Input name="closesAt" type="datetime-local" defaultValue={toWallTime(distribution.windowClosesAt)} />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={dialog === "close"}
        title="Bütün öğrencilerin sınavı teslim edilsin mi?"
        description={CLOSE_DESCRIPTION}
        confirmLabel="Teslim ettir"
        tone="danger"
        pending={closeNow.isPending}
        error={formError ?? undefined}
        onClose={close}
        onConfirm={() => {
          setFormError(null);
          closeNow.mutate({ distributionId: id });
        }}
      />

      <ConfirmDialog
        open={dialog === "cancel"}
        title="Dağıtım iptal edilsin mi?"
        description={cancelDescription(distribution.status)}
        confirmLabel="İptal et"
        tone="danger"
        pending={cancel.isPending}
        error={formError ?? undefined}
        onClose={close}
        onConfirm={() => {
          setFormError(null);
          cancel.mutate({ distributionId: id });
        }}
      />

      <ConfirmDialog
        open={dialog === "remove"}
        title="Taslak silinsin mi?"
        description="Hiç açılmamış taslak ve hedefleme kuralları silinir. Açılmış dağıtım silinmez, iptal edilir."
        confirmLabel="Sil"
        tone="danger"
        pending={remove.isPending}
        error={formError ?? undefined}
        onClose={close}
        onConfirm={() => {
          setFormError(null);
          remove.mutate({ distributionId: id });
        }}
      />
    </>
  );
}
