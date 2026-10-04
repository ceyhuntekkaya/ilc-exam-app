"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetQueryKey,
  useGet,
  useUpdate,
} from "@/src/api/generated/admin-companies/admin-companies";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { companyStatusLabel } from "@/src/features/admin/labels";
import {
  Button,
  DefinitionList,
  Field,
  FormCard,
  FormGrid,
  FormMessage,
  Input,
  errorMessage,
  notify,
} from "@/src/ui";

export default function CompanyOverviewPage() {
  return (
    <CompanyDetailFrame section="overview">
      <OverviewBody />
    </CompanyDetailFrame>
  );
}

function OverviewBody() {
  const { id } = useParams<{ id: string }>();
  const { data } = useGet(id);
  const company = data?.data;
  const update = useUpdate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  if (!company) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    try {
      await update.mutateAsync({
        id,
        data: {
          name: String(fd.get("name") || ""),
          logoUrl: String(fd.get("logoUrl") || "") || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetQueryKey(id) });
      setEditing(false);
      setOk(true);
      notify.success("Kaydedildi");
    } catch (err) {
      const message = errorMessage(err, "Kaydedilemedi");
      setError(message);
      notify.error(message);
    }
  }

  if (!editing) {
    return (
      <div className="grid gap-4">
        <DefinitionList
          items={[
            { term: "Ad", description: company.name },
            { term: "Kod", description: company.code },
            { term: "Durum", description: companyStatusLabel(company.status) },
            { term: "Logo", description: company.logoUrl || "—", wide: true },
            {
              term: "Oluşturulma",
              description: company.createdAt
                ? new Date(company.createdAt).toLocaleString("tr-TR")
                : "—",
            },
          ]}
        />
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Düzenle
          </Button>
          {ok ? <FormMessage tone="success">Kaydedildi</FormMessage> : null}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSave}>
      <FormCard
        title="Kurum bilgileri"
        footer={
          <>
            {error ? <FormMessage tone="danger">{error}</FormMessage> : <span />}
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Vazgeç
            </Button>
            <Button type="submit" loading={update.isPending}>
              Kaydet
            </Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Ad" required>
            <Input name="name" defaultValue={company.name} required />
          </Field>
          <Field label="Kod" hint="Kod değiştirilemez">
            <Input value={company.code} disabled />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Logo URL">
              <Input name="logoUrl" defaultValue={company.logoUrl ?? ""} />
            </Field>
          </div>
        </FormGrid>
      </FormCard>
    </form>
  );
}
