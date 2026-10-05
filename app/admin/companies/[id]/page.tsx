"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetQueryKey,
  useGet,
  useUpdate,
} from "@/src/api/generated/admin-companies/admin-companies";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { companyDetailHref, type CompanySection } from "@/src/config/company-detail-nav";
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

/** Genel bakıştan sık kullanılan bölümlere kısayol; her biri kendi vurgu tonunda. */
const SHORTCUTS: { section: CompanySection; label: string; hint: string; tone: string; icon: string }[] = [
  { section: "students", label: "Öğrenciler", hint: "Kayıt ve sınıf ataması", tone: "[--t:var(--accent-ink)] [--tb:var(--accent-ink-bg)]", icon: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m2 15h3a5 5 0 0 0-4-4.9" },
  { section: "staff", label: "Personel", hint: "Kullanıcı, rol ve kapsam", tone: "[--t:var(--accent-plum)] [--tb:var(--accent-plum-bg)]", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" },
  { section: "grants", label: "Lisanslı sınavlar", hint: "Kuruma tanınan haklar", tone: "[--t:var(--accent-teal)] [--tb:var(--accent-teal-bg)]", icon: "M8 4h8l3 3v13H5V4h3ZM9 10h6M9 14h6M9 18h3" },
  { section: "assignments", label: "Sınav atamaları", hint: "Aç, kapat, izle", tone: "[--t:var(--accent-marker)] [--tb:var(--accent-marker-bg)]", icon: "M5 6h14v14H5V6Zm0 4h14M9 4v4m6-4v4" },
  { section: "subscription", label: "Üyelik", hint: "Süre ve öğrenci kotası", tone: "[--t:var(--accent-red)] [--tb:var(--accent-red-bg)]", icon: "M4 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4V7Zm0 0V6a2 2 0 0 1 2-2h10M16 13h.01" },
  { section: "institutes", label: "Kampüsler", hint: "Yapı: kampüs, sezon, sınıf", tone: "[--t:var(--accent-ink)] [--tb:var(--accent-ink-bg)]", icon: "M4 20h16M6 20V6l6-3 6 3v14M10 20v-5h4v5" },
];

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
      <div className="grid gap-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-fg">Kimlik</h3>
          <div className="flex items-center gap-3">
            {ok ? <FormMessage tone="success">Kaydedildi</FormMessage> : null}
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
          </div>
        </div>
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
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold text-fg">Hızlı erişim</h3>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SHORTCUTS.map((item) => (
              <li key={item.section}>
                <Link
                  href={companyDetailHref(id, item.section)}
                  className={`group flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 transition hover:border-(--t)/40 hover:shadow-sm ${item.tone}`}
                >
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--tb) text-(--t)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{item.label}</span>
                    <span className="block truncate text-[13px] text-fg-subtle">{item.hint}</span>
                  </span>
                  <span aria-hidden className="text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-(--t)">→</span>
                </Link>
              </li>
            ))}
          </ul>
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
