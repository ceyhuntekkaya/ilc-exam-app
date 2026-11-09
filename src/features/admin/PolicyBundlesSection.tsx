"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getList4QueryKey, useCreate2, useList4, useUpdate1 } from "@/src/api/generated/policy-bundles/policy-bundles";
import type { BundleDto } from "@/src/api/generated/models";
import {
  CERTIFICATION_LOCKED_KEYS,
  CREATABLE_PURPOSES,
  FIELD_DEFS,
  emptyFieldLabels,
  isCertification,
  isDirty,
  isFieldLocked,
  purposeLabel,
  setBooleanValue,
  setValue,
  shortId,
  sortBundles,
  toFormState,
  toUpdateBody,
  toggleEditable,
  type BundleFormState,
  type FieldDef,
} from "@/src/features/admin/policyBundleModel";
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  FormCard,
  FormDialog,
  FormMessage,
  Input,
  Select,
  SectionSkeleton,
  errorMessage,
  notify,
} from "@/src/ui";

/**
 * R-08: merkez (SUPER_ADMIN) politika demetleri. Liste tipe göre sıralanır; seçilen demet tipli formla düzenlenir
 * (PUT /policy-bundles/{id}). Demetin tipi değişmez. Doğrulama sunucudadır: 400 `error` metni olduğu gibi gösterilir.
 */
export function PolicyBundlesSection() {
  const { data, isLoading, isError, error, refetch } = useList4();
  const bundles = useMemo(() => sortBundles(data?.data ?? []), [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;
  if (isLoading) return <SectionSkeleton />;

  const selected = bundles.find((b) => b.id === selectedId) ?? bundles[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <aside className="grid content-start gap-2" aria-label="Demet listesi">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-fg-muted">{bundles.length} demet</p>
          <Button variant="secondary" onClick={() => setCreating(true)}>
            Yeni demet
          </Button>
        </div>
        {bundles.length === 0 ? (
          <EmptyState embedded tone="neutral" title="Henüz demet yok" description="İlk demeti oluşturmak için “Yeni demet”i kullanın." />
        ) : (
          <ul className="grid gap-1.5">
            {bundles.map((bundle) => {
              const active = bundle.id === selected?.id;
              return (
                <li key={bundle.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(bundle.id ?? null)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                      active ? "border-primary-500 bg-primary-50/60" : "border-border bg-surface hover:border-border-strong"
                    }`}
                  >
                    <span className="grid">
                      <span className="font-medium text-fg">{purposeLabel(bundle.examPurpose)}</span>
                      <span className="text-xs text-fg-subtle">{shortId(bundle.id)}</span>
                    </span>
                    {isCertification(bundle.examPurpose) ? <Badge tone="brand">Kilitli alanlar</Badge> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <div className="min-w-0">
        {selected ? (
          <BundleEditor key={selected.id} bundle={selected} />
        ) : (
          <EmptyState embedded tone="neutral" title="Demet seçilmedi" description="Soldaki listeden bir demet seçin." />
        )}
      </div>

      <NewBundleDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          if (id) setSelectedId(id);
        }}
      />
    </div>
  );
}

export function BundleEditor({ bundle }: { bundle: BundleDto }) {
  const queryClient = useQueryClient();
  const update = useUpdate1();
  const [form, setForm] = useState<BundleFormState>(() => toFormState(bundle));
  const [base, setBase] = useState<BundleDto>(bundle);
  const [formError, setFormError] = useState<string | null>(null);
  const certification = isCertification(base.examPurpose);
  const dirty = isDirty(form, base);

  async function onSave() {
    setFormError(null);
    const empty = emptyFieldLabels(form);
    if (empty.length > 0) {
      setFormError(`Boş bırakılamaz: ${empty.join(", ")}`);
      return;
    }
    try {
      const res = await update.mutateAsync({ id: base.id ?? "", data: toUpdateBody(form) });
      const saved = res.data;
      setBase(saved);
      setForm(toFormState(saved));
      await queryClient.invalidateQueries({ queryKey: getList4QueryKey() });
      notify.success("Demet kaydedildi");
    } catch (err) {
      // 400: backend `{"error": "..."}` metni (ör. "SCORING_MODE geçersiz: X") mutator'da Error.message olur.
      setFormError(errorMessage(err, "Demet kaydedilemedi"));
    }
  }

  return (
    <FormCard
      title={`${purposeLabel(base.examPurpose)} demeti`}
      description={`Kimlik: ${shortId(base.id)} · tip değiştirilemez`}
      aside={base.certificateLocked ? <Badge tone="warning">Sertifika kilitli</Badge> : undefined}
      footer={
        <>
          {formError ? <FormMessage tone="danger">{formError}</FormMessage> : <span className="sm:mr-auto" />}
          <Button
            variant="ghost"
            disabled={!dirty || update.isPending}
            onClick={() => {
              setForm(toFormState(base));
              setFormError(null);
            }}
          >
            Geri al
          </Button>
          <Button loading={update.isPending} disabled={!dirty} onClick={() => void onSave()}>
            Kaydet
          </Button>
        </>
      }
    >
      {certification ? (
        <div role="note" className="rounded-lg border border-primary-500/30 bg-primary-50/60 px-3 py-2.5 text-[13px] text-fg-muted">
          <p className="font-medium text-fg">Sertifikasyon demeti</p>
          <p className="mt-0.5">
            {CERTIFICATION_LOCKED_KEYS.join(" ve ")} alanları bu demette olduğu gibi kalmalıdır: sertifika kapısı açık, ceza puanlaması
            kapalı. Sertifika kapısının açılması ayrıca iki akademik onay gerektirir; bu ekran onu değiştirmez.
          </p>
        </div>
      ) : null}

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {FIELD_DEFS.map((def) => (
          <FieldControl
            key={def.key}
            def={def}
            value={form.values[def.key] ?? ""}
            locked={isFieldLocked(base.examPurpose, def.key)}
            onChange={(next) => setForm((s) => setValue(s, def.key, next))}
            onToggle={(checked) => setForm((s) => setBooleanValue(s, def.key, checked))}
          />
        ))}
      </div>

      <fieldset className="grid gap-1 border-t border-border pt-4">
        <legend className="text-[13px] font-medium text-fg">Kurumun değiştirebileceği alanlar</legend>
        <p className="text-xs text-fg-subtle">İşaretli alanları kurum yöneticisi kendi ayarlarında değiştirebilir.</p>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {FIELD_DEFS.map((def) => (
            <Checkbox
              key={def.key}
              label={def.label}
              checked={form.editable.includes(def.key)}
              onChange={(e) => setForm((s) => toggleEditable(s, def.key, e.target.checked))}
            />
          ))}
        </div>
      </fieldset>
    </FormCard>
  );
}

function FieldControl({
  def,
  value,
  locked,
  onChange,
  onToggle,
}: {
  def: FieldDef;
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
  onToggle: (checked: boolean) => void;
}) {
  if (def.kind === "boolean") {
    return (
      <Checkbox
        label={def.label}
        description={locked ? "Bu demette değiştirilemez." : def.hint}
        checked={value === "true"}
        disabled={locked}
        onChange={(e) => onToggle(e.target.checked)}
      />
    );
  }
  if (def.kind === "enum") {
    const options = def.options ?? [];
    // Sunucudan gelen değer listede yoksa (yeni bir enum değeri) sessizce silinmesin diye seçenek olarak tutulur.
    const known = options.some((o) => o.value === value);
    return (
      <Field label={def.label}>
        <Select value={value} disabled={locked} onChange={(e) => onChange(e.target.value)}>
          {!known && value ? <option value={value}>{value}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  return (
    <Field label={def.label} hint={def.hint}>
      <Input value={value} disabled={locked} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function NewBundleDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id?: string) => void;
}) {
  const queryClient = useQueryClient();
  const create = useCreate2();
  const [purpose, setPurpose] = useState<string>(CREATABLE_PURPOSES[0]);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      const res = await create.mutateAsync({ data: { examPurpose: purpose as BundleDto["examPurpose"] } });
      await queryClient.invalidateQueries({ queryKey: getList4QueryKey() });
      notify.success("Demet oluşturuldu");
      onCreated(res.data?.id);
    } catch (err) {
      setError(errorMessage(err, "Demet oluşturulamadı"));
    }
  }

  return (
    <FormDialog
      open={open}
      title="Yeni demet"
      description="Seçilen tipin varsayılan değerleriyle oluşturulur; sonra düzenleyebilirsiniz."
      submitLabel="Oluştur"
      pending={create.isPending}
      error={error}
      onClose={() => {
        setError(null);
        onClose();
      }}
      onSubmit={() => void submit()}
    >
      <Field label="Demet tipi">
        <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          {CREATABLE_PURPOSES.map((p) => (
            <option key={p} value={p}>
              {purposeLabel(p)}
            </option>
          ))}
        </Select>
      </Field>
    </FormDialog>
  );
}
