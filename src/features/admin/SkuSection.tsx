"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListQueryKey,
  useActivate,
  useCreate,
  useList,
  useRetire,
  useUpdate,
} from "@/src/api/generated/product-sku-catalog/product-sku-catalog";
import { useList4 as useListBundles } from "@/src/api/generated/policy-bundles/policy-bundles";
import { useListAgeBands } from "@/src/api/generated/authoring-dictionaries/authoring-dictionaries";
import type { AgeBandDto, BundleDto, SkuDto } from "@/src/api/generated/models";
import { PURPOSE_ORDER, purposeLabel, shortId, sortBundles } from "@/src/features/admin/policyBundleModel";
import {
  CEFR_LEVELS,
  EMPTY_SKU_FORM,
  OUTPUT_TYPES,
  bundleOptionLabel,
  isCertificateOutputAllowed,
  levelLabel,
  levelRange,
  normalizeOutput,
  outputLabel,
  skuToForm,
  statusLabel,
  statusTone,
  toSkuRequest,
  validateSkuForm,
  type SkuFormState,
} from "@/src/features/admin/skuModel";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Field,
  FormDialog,
  Input,
  Select,
  SectionTable,
  SectionToolbar,
  errorMessage,
  notify,
} from "@/src/ui";

type DialogTarget = { sku: SkuDto | null } | null;
type ConfirmTarget = { action: "activate" | "retire"; sku: SkuDto } | null;

/** R-08: merkez ürün kataloğu (SKU). Yalnız SUPER_ADMIN; sunucu 400/409 metinleri olduğu gibi gösterilir. */
export function SkuSection() {
  const skus = useList();
  const bundlesQuery = useListBundles();
  const ageBandsQuery = useListAgeBands();
  const bundles = useMemo(() => sortBundles(bundlesQuery.data?.data ?? []), [bundlesQuery.data]);
  const ageBands: AgeBandDto[] = ageBandsQuery.data?.data ?? [];
  const rows: SkuDto[] = skus.data?.data ?? [];

  const [dialog, setDialog] = useState<DialogTarget>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget>(null);

  if (skus.isError) return <ErrorState error={skus.error} onRetry={() => void skus.refetch()} compact />;

  const bundleById = new Map(bundles.map((b) => [b.id, b]));

  return (
    <>
      <SectionTable
        loading={skus.isLoading}
        columns={["Kod", "Ad", "Tip", "Seviye", "Çıktı", "Demet", "Durum", ""]}
        empty="Henüz ürün yok"
        emptyHint="İlk SKU’yu eklemek için “Yeni SKU”yu kullanın."
        toolbar={
          <SectionToolbar count={rows.length} noun="SKU" loading={skus.isLoading}>
            <Button onClick={() => setDialog({ sku: null })}>Yeni SKU</Button>
          </SectionToolbar>
        }
        rows={rows.map((sku) => {
          const bundle = bundleById.get(sku.policyBundleId);
          return [
            sku.code,
            sku.name,
            purposeLabel(sku.examPurpose),
            levelRange(sku),
            outputLabel(sku.outputType),
            bundle ? `${purposeLabel(bundle.examPurpose)} · ${shortId(bundle.id)}` : shortId(sku.policyBundleId),
            <Badge key="s" tone={statusTone(sku.status)} dot>
              {statusLabel(sku.status)}
            </Badge>,
            <div key="a" className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setDialog({ sku })}>
                Düzenle
              </Button>
              {sku.status === "DRAFT" ? (
                <Button variant="secondary" size="sm" onClick={() => setConfirm({ action: "activate", sku })}>
                  Etkinleştir
                </Button>
              ) : null}
              {sku.status === "ACTIVE" ? (
                <Button variant="danger" size="sm" onClick={() => setConfirm({ action: "retire", sku })}>
                  Emekli et
                </Button>
              ) : null}
            </div>,
          ];
        })}
      />

      {dialog ? (
        <SkuFormDialog
          key={dialog.sku?.id ?? "new"}
          sku={dialog.sku}
          bundles={bundles}
          ageBands={ageBands}
          onClose={() => setDialog(null)}
        />
      ) : null}

      <SkuStatusConfirm target={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

export function SkuFormDialog({
  sku,
  bundles,
  ageBands,
  onClose,
}: {
  sku: SkuDto | null;
  bundles: BundleDto[];
  ageBands: AgeBandDto[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const create = useCreate();
  const update = useUpdate();
  const [form, setForm] = useState<SkuFormState>(() => (sku ? skuToForm(sku) : EMPTY_SKU_FORM));
  const [error, setError] = useState<string | null>(null);
  const bundle = bundles.find((b) => b.id === form.policyBundleId);
  const certificateAllowed = isCertificateOutputAllowed(bundle);

  function patch(next: Partial<SkuFormState>) {
    setForm((s) => ({ ...s, ...next }));
  }

  function onBundleChange(policyBundleId: string) {
    const next = bundles.find((b) => b.id === policyBundleId);
    setForm((s) => ({ ...s, policyBundleId, outputType: normalizeOutput(s.outputType, next) }));
  }

  async function submit() {
    setError(null);
    const problem = validateSkuForm(form);
    if (problem) {
      setError(problem);
      return;
    }
    const data = toSkuRequest(form);
    try {
      if (sku?.id) await update.mutateAsync({ id: sku.id, data });
      else await create.mutateAsync({ data });
      await queryClient.invalidateQueries({ queryKey: getListQueryKey() });
      notify.success(sku ? "SKU güncellendi" : "SKU oluşturuldu");
      onClose();
    } catch (err) {
      // 400/409: backend `{"error": "..."}` metni (ör. sertifika çıktısı + kapalı sertifika kapısı).
      setError(errorMessage(err, "SKU kaydedilemedi"));
    }
  }

  return (
    <FormDialog
      open
      title={sku ? "SKU düzenle" : "Yeni SKU"}
      submitLabel={sku ? "Kaydet" : "Oluştur"}
      pending={create.isPending || update.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kod" required>
          <Input value={form.code} onChange={(e) => patch({ code: e.target.value })} />
        </Field>
        <Field label="Ad" required>
          <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Sınav tipi">
          <Select value={form.examPurpose} onChange={(e) => patch({ examPurpose: e.target.value })}>
            {PURPOSE_ORDER.map((p) => (
              <option key={p} value={p}>
                {purposeLabel(p)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Yaş bandı">
          <Select value={form.ageBandOptionId} onChange={(e) => patch({ ageBandOptionId: e.target.value })}>
            <option value="">Belirtilmedi</option>
            {ageBands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.label ?? band.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="En düşük seviye">
          <Select value={form.minLevel} onChange={(e) => patch({ minLevel: e.target.value })}>
            <option value="">Belirtilmedi</option>
            {CEFR_LEVELS.map((l) => (
              <option key={l} value={l}>
                {levelLabel(l)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="En yüksek seviye">
          <Select value={form.maxLevel} onChange={(e) => patch({ maxLevel: e.target.value })}>
            <option value="">Belirtilmedi</option>
            {CEFR_LEVELS.map((l) => (
              <option key={l} value={l}>
                {levelLabel(l)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Politika demeti" required>
        <Select value={form.policyBundleId} onChange={(e) => onBundleChange(e.target.value)}>
          <option value="">Demet seçin</option>
          {bundles.map((b) => (
            <option key={b.id} value={b.id}>
              {bundleOptionLabel(b)}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Çıktı türü"
        hint={
          certificateAllowed
            ? undefined
            : "Sertifika çıktısı için seçilen demette sertifika kapısı (CERTIFICATE_ENABLED) açık olmalıdır."
        }
      >
        <Select value={form.outputType} onChange={(e) => patch({ outputType: e.target.value })}>
          {OUTPUT_TYPES.map((o) => (
            <option key={o.value} value={o.value} disabled={o.value === "CERTIFICATE" && !certificateAllowed}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Geçerlilik (gün)" hint="Boş bırakılabilir.">
          <Input
            inputMode="numeric"
            value={form.validityDays}
            onChange={(e) => patch({ validityDays: e.target.value })}
          />
        </Field>
        <Checkbox
          label="Modül içerir"
          checked={form.includesModule}
          onChange={(e) => patch({ includesModule: e.target.checked })}
        />
      </div>
    </FormDialog>
  );
}

function SkuStatusConfirm({ target, onClose }: { target: ConfirmTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const activate = useActivate();
  const retire = useRetire();
  const [error, setError] = useState<string | undefined>();
  const pending = activate.isPending || retire.isPending;
  const isRetire = target?.action === "retire";

  function close() {
    setError(undefined);
    onClose();
  }

  async function run() {
    if (!target?.sku.id) return;
    setError(undefined);
    try {
      if (isRetire) await retire.mutateAsync({ id: target.sku.id });
      else await activate.mutateAsync({ id: target.sku.id });
      await queryClient.invalidateQueries({ queryKey: getListQueryKey() });
      notify.success(isRetire ? "SKU emekli edildi" : "SKU etkinleştirildi");
      close();
    } catch (err) {
      setError(errorMessage(err, "İşlem başarısız"));
    }
  }

  return (
    <ConfirmDialog
      open={target !== null}
      title={isRetire ? "SKU’yu emekli et" : "SKU’yu etkinleştir"}
      description={
        isRetire
          ? `${target?.sku.code ?? ""} emekli edilir (durumu “Emekli” olur). Devam etmek istiyor musunuz?`
          : `${target?.sku.code ?? ""} etkinleştirilir (durumu “Aktif” olur). Devam etmek istiyor musunuz?`
      }
      confirmLabel={isRetire ? "Emekli et" : "Etkinleştir"}
      tone={isRetire ? "danger" : "primary"}
      pending={pending}
      error={error}
      onClose={close}
      onConfirm={() => void run()}
    />
  );
}
