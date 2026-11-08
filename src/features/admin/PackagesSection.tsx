"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useList3 as useListCompanies } from "@/src/api/generated/admin-companies/admin-companies";
import { useList as useListSkus } from "@/src/api/generated/product-sku-catalog/product-sku-catalog";
import {
  getList4QueryKey,
  useCancel1,
  useCreate3,
  useList4,
  usePurchase,
  useUpdate2,
} from "@/src/api/generated/subscription-packages-central/subscription-packages-central";
import type { PackageDto, SkuDto } from "@/src/api/generated/models";
import {
  OVERAGE_POLICIES,
  SCOPES,
  EMPTY_PURCHASE_FORM,
  activeSkus,
  balanceHint,
  balanceState,
  emptyPackageForm,
  isActivePackage,
  newIdempotencyKey,
  overageLabel,
  packageStatusLabel,
  packageStatusTone,
  packageToForm,
  scopeLabel,
  skuOptionLabel,
  toPackageRequest,
  toPurchaseRequest,
  validatePackageForm,
  validatePurchaseForm,
  validityRange,
  type PackageFormState,
  type PurchaseFormState,
} from "@/src/features/admin/packageModel";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FormDialog,
  Input,
  SectionTable,
  SectionToolbar,
  Select,
  errorMessage,
  notify,
} from "@/src/ui";

type FormTarget = { pkg: PackageDto | null } | null;

const INFO_BANNER = "Kurum kendi paketini oluşturamaz; bakiyesini ve hareketlerini kurum panelinde görür.";

/**
 * R-09: merkez paket yönetimi. `companyId` verilirse kurum sabittir (kurum detay çerçevesi);
 * verilmezse önce kurum seçilir. Yalnız merkez yönetimi; sunucu 400/409 metinleri olduğu gibi gösterilir.
 */
export function PackagesSection({ companyId: fixedCompanyId }: { companyId?: string }) {
  const [pickedId, setPickedId] = useState("");
  const companyId = fixedCompanyId ?? pickedId;

  return (
    <div className="grid gap-4">
      <p role="note" className="rounded-lg bg-info-bg px-3 py-2 text-[13px] text-info">
        {INFO_BANNER}
      </p>
      {fixedCompanyId ? null : <CompanyPicker value={pickedId} onChange={setPickedId} />}
      {companyId ? (
        <CompanyPackages key={companyId} companyId={companyId} />
      ) : (
        <EmptyState embedded tone="neutral" title="Kurum seçilmedi" description="Paketlerini görmek için yukarıdan bir kurum seçin." />
      )}
    </div>
  );
}

function CompanyPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const companies = useListCompanies({ size: 100 });
  if (companies.isError) return <ErrorState error={companies.error} onRetry={() => void companies.refetch()} compact />;
  const rows = (companies.data?.data.content ?? []).filter((c) => c.id);
  return (
    <div className="max-w-md">
      <Field label="Kurum" hint={companies.isLoading ? "Kurumlar yükleniyor…" : undefined}>
        <Select searchable searchPlaceholder="Kurum ara" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Kurum seçin</option>
          {rows.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.name} (${c.code})` : c.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

function CompanyPackages({ companyId }: { companyId: string }) {
  const packages = useList4(companyId);
  const skusQuery = useListSkus();
  const skus: SkuDto[] = useMemo(() => skusQuery.data?.data ?? [], [skusQuery.data]);
  const rows: PackageDto[] = packages.data?.data ?? [];
  const skuById = useMemo(() => new Map(skus.map((s) => [s.id, s])), [skus]);

  const [form, setForm] = useState<FormTarget>(null);
  const [purchase, setPurchase] = useState<PackageDto | null>(null);
  const [cancel, setCancel] = useState<PackageDto | null>(null);

  if (packages.isError) return <ErrorState error={packages.error} onRetry={() => void packages.refetch()} compact />;

  return (
    <>
      <SectionTable
        loading={packages.isLoading}
        columns={["Ürün", "Kapsam", "Kota", "Bakiye", "Geçerlilik", "Aşım", "Durum", ""]}
        empty="Bu kurumun paketi yok"
        emptyHint="İlk paketi eklemek için “Paket tanımla”yı kullanın."
        toolbar={
          <SectionToolbar count={rows.length} noun="paket" loading={packages.isLoading}>
            <Button onClick={() => setForm({ pkg: null })}>Paket tanımla</Button>
          </SectionToolbar>
        }
        rows={rows.map((pkg) => {
          const sku = pkg.skuId ? skuById.get(pkg.skuId) : undefined;
          const balance = balanceState(pkg);
          const hint = balanceHint(balance);
          const active = isActivePackage(pkg);
          return [
            <div key="sku" className="grid">
              <span className="font-medium text-fg">{sku?.code ?? "—"}</span>
              {sku?.name ? <span className="text-xs text-fg-subtle">{sku.name}</span> : null}
            </div>,
            pkg.scope === "ORG_UNIT" && pkg.orgUnitId ? `${scopeLabel(pkg.scope)} · ${pkg.orgUnitId.slice(0, 8)}…` : scopeLabel(pkg.scope),
            pkg.quota ?? "—",
            <div key="bal" className="grid" data-balance={balance.kind}>
              <span className={balance.warning ? "font-semibold text-warning" : "font-medium text-fg"}>{balance.text}</span>
              {hint ? <span className="text-xs text-warning">{hint}</span> : null}
            </div>,
            validityRange(pkg),
            pkg.overagePolicy === "FLEX" ? `${overageLabel(pkg.overagePolicy)} (+${pkg.flexAllowance ?? 0})` : overageLabel(pkg.overagePolicy),
            <Badge key="st" tone={packageStatusTone(pkg.status)} dot>
              {packageStatusLabel(pkg.status)}
            </Badge>,
            <div key="a" className="flex justify-end gap-1.5">
              {active ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setPurchase(pkg)}>
                    Hak ekle
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setForm({ pkg })}>
                    Düzenle
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setCancel(pkg)}>
                    İptal et
                  </Button>
                </>
              ) : null}
            </div>,
          ];
        })}
      />

      {form ? (
        <PackageFormDialog
          key={form.pkg?.id ?? "new"}
          companyId={companyId}
          pkg={form.pkg}
          skus={skus}
          onClose={() => setForm(null)}
        />
      ) : null}
      {purchase ? <PurchaseDialog key={purchase.id} companyId={companyId} pkg={purchase} onClose={() => setPurchase(null)} /> : null}
      <CancelConfirm companyId={companyId} pkg={cancel} onClose={() => setCancel(null)} />
    </>
  );
}

export function PackageFormDialog({
  companyId,
  pkg,
  skus,
  onClose,
}: {
  companyId: string;
  pkg: PackageDto | null;
  skus: SkuDto[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const create = useCreate3();
  const update = useUpdate2();
  const editing = pkg !== null;
  const [form, setForm] = useState<PackageFormState>(() => (pkg ? packageToForm(pkg) : emptyPackageForm()));
  const [error, setError] = useState<string | null>(null);
  // Yeni pakette yalnız ACTIVE SKU; düzenlemede mevcut SKU (emekli olsa da) görünür kalır.
  const options = editing ? skus.filter((s) => s.id === pkg.skuId) : activeSkus(skus);

  function patch(next: Partial<PackageFormState>) {
    setForm((s) => ({ ...s, ...next }));
  }

  async function submit() {
    setError(null);
    const problem = validatePackageForm(form);
    if (problem) {
      setError(problem);
      return;
    }
    const data = toPackageRequest(form);
    try {
      if (pkg?.id) await update.mutateAsync({ companyId, id: pkg.id, data });
      else await create.mutateAsync({ companyId, data });
      await queryClient.invalidateQueries({ queryKey: getList4QueryKey(companyId) });
      notify.success(editing ? "Paket güncellendi" : "Paket tanımlandı");
      onClose();
    } catch (err) {
      // 400/409: backend `{"error": "..."}` metni (ör. bireysel kapsam, FLEX/HARD_STOP uyumsuzluğu).
      setError(errorMessage(err, "Paket kaydedilemedi"));
    }
  }

  return (
    <FormDialog
      open
      title={editing ? "Paketi düzenle" : "Paket tanımla"}
      description={
        editing
          ? undefined
          : "Paket ve kotanın tamamı için ilk satın alma hareketi birlikte yazılır."
      }
      submitLabel={editing ? "Kaydet" : "Tanımla"}
      pending={create.isPending || update.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field label="Ürün (SKU)" required hint={editing ? "Ürün ve kapsam sonradan değiştirilemez." : "Yalnız aktif ürünler listelenir."}>
        <Select value={form.skuId} disabled={editing} onChange={(e) => patch({ skuId: e.target.value })}>
          <option value="">Ürün seçin</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {skuOptionLabel(s)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kapsam">
          <Select value={form.scope} disabled={editing} onChange={(e) => patch({ scope: e.target.value })}>
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Kota"
          required
          hint={
            editing
              ? "Kotayı değiştirmek bakiyeyi değiştirmez. Hak eklemek için “Hak ekle”yi kullanın."
              : undefined
          }
        >
          <Input inputMode="numeric" value={form.quota} readOnly={editing} onChange={(e) => patch({ quota: e.target.value })} />
        </Field>
      </div>

      {form.scope === "ORG_UNIT" ? (
        <Field label="Birim kimliği" required hint="Birimin UUID’si.">
          <Input value={form.orgUnitId} disabled={editing} onChange={(e) => patch({ orgUnitId: e.target.value })} />
        </Field>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Geçerlilik başlangıcı" required>
          <Input type="date" value={form.validFrom} onChange={(e) => patch({ validFrom: e.target.value })} />
        </Field>
        <Field label="Geçerlilik bitişi" required>
          <Input type="date" value={form.validUntil} onChange={(e) => patch({ validUntil: e.target.value })} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Aşım politikası">
          <Select value={form.overagePolicy} onChange={(e) => patch({ overagePolicy: e.target.value })}>
            {OVERAGE_POLICIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {form.overagePolicy === "FLEX" ? (
          <Field label="Aşım payı" required hint="Bakiye bittikten sonra izin verilen ek hak sayısı.">
            <Input inputMode="numeric" value={form.flexAllowance} onChange={(e) => patch({ flexAllowance: e.target.value })} />
          </Field>
        ) : null}
      </div>
    </FormDialog>
  );
}

/** Her açılışta (bileşen yeniden bağlanınca) taze `idempotencyKey`; hata sonrası yeniden denemede aynı anahtar kalır. */
export function PurchaseDialog({ companyId, pkg, onClose }: { companyId: string; pkg: PackageDto; onClose: () => void }) {
  const queryClient = useQueryClient();
  const purchase = usePurchase();
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [form, setForm] = useState<PurchaseFormState>(EMPTY_PURCHASE_FORM);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (purchase.isPending) return;
    setError(null);
    const problem = validatePurchaseForm(form);
    if (problem) {
      setError(problem);
      return;
    }
    if (!pkg.id) return;
    try {
      await purchase.mutateAsync({ companyId, id: pkg.id, data: toPurchaseRequest(form, idempotencyKey) });
      await queryClient.invalidateQueries({ queryKey: getList4QueryKey(companyId) });
      notify.success("Hak eklendi");
      onClose();
    } catch (err) {
      // 409: paket aktif değil.
      setError(errorMessage(err, "Hak eklenemedi"));
    }
  }

  return (
    <FormDialog
      open
      title="Hak ekle"
      description={`Mevcut: ${balanceState(pkg).text}. Eklenen miktar paketin bakiyesine satın alma hareketi olarak yazılır.`}
      submitLabel="Ekle"
      pending={purchase.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field label="Miktar" required>
        <Input inputMode="numeric" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
      </Field>
      <Field label="Referans" hint="İsteğe bağlı (ör. fatura ya da sipariş no).">
        <Input value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} />
      </Field>
    </FormDialog>
  );
}

function CancelConfirm({ companyId, pkg, onClose }: { companyId: string; pkg: PackageDto | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const cancel = useCancel1();
  const [error, setError] = useState<string | undefined>();

  function close() {
    setError(undefined);
    onClose();
  }

  async function run() {
    if (!pkg?.id) return;
    setError(undefined);
    try {
      await cancel.mutateAsync({ companyId, id: pkg.id });
      await queryClient.invalidateQueries({ queryKey: getList4QueryKey(companyId) });
      notify.success("Paket iptal edildi");
      close();
    } catch (err) {
      setError(errorMessage(err, "Paket iptal edilemedi"));
    }
  }

  return (
    <ConfirmDialog
      open={pkg !== null}
      title="Paketi iptal et"
      description="Paket iptal edilir (durumu “İptal edildi” olur) ve listede kalır. Devam etmek istiyor musunuz?"
      confirmLabel="İptal et"
      tone="danger"
      pending={cancel.isPending}
      error={error}
      onClose={close}
      onConfirm={() => void run()}
    />
  );
}
