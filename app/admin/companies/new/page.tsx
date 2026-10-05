"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCreate } from "@/src/api/generated/admin-companies/admin-companies";
import {
  Button,
  Field,
  FormCard,
  FormGrid,
  FormMessage,
  Input,
  PageHeader,
  PasswordInput,
  errorMessage,
  notify,
} from "@/src/ui";

export default function NewCompanyPage() {
  const router = useRouter();
  const create = useCreate();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    for (const [a, b, msg] of [
      ["subscriptionStart", "subscriptionEnd", "Üyelik bitişi başlangıçtan önce olamaz."],
      ["academicYearStart", "academicYearEnd", "Sezon bitişi başlangıçtan önce olamaz."],
    ] as const) {
      const s = String(fd.get(a) || "");
      const en = String(fd.get(b) || "");
      if (s && en && en < s) {
        setError(msg);
        return;
      }
    }
    try {
      const result = await create.mutateAsync({
        data: {
          name: String(fd.get("name") || ""),
          code: String(fd.get("code") || ""),
          logoUrl: String(fd.get("logoUrl") || "") || undefined,
          subscriptionStart: String(fd.get("subscriptionStart") || "") || undefined,
          subscriptionEnd: String(fd.get("subscriptionEnd") || "") || undefined,
          maxStudents: Number(fd.get("maxStudents") || 0),
          instituteName: String(fd.get("instituteName") || "") || undefined,
          instituteCode: String(fd.get("instituteCode") || "") || undefined,
          academicYearName: String(fd.get("academicYearName") || "") || undefined,
          academicYearStart: String(fd.get("academicYearStart") || "") || undefined,
          academicYearEnd: String(fd.get("academicYearEnd") || "") || undefined,
          admin: {
            username: String(fd.get("adminUsername") || ""),
            password: String(fd.get("adminPassword") || ""),
            email: String(fd.get("adminEmail") || "") || undefined,
            firstName: String(fd.get("adminFirstName") || ""),
            lastName: String(fd.get("adminLastName") || ""),
          },
        },
      });
      const id = result.data.id;
      notify.success("Kurum oluşturuldu");
      router.push(`/admin/companies/${id}`);
    } catch (err) {
      const message = errorMessage(err, "Kurum oluşturulamadı");
      setError(message);
      notify.error(message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Yeni kurum"
        description="Kurum, üyelik, kampüs, sezon ve ilk müdür hesabı tek adımda oluşturulur."
        back={{ href: "/admin/companies", label: "Kurumlara dön" }}
      />

      <form onSubmit={onSubmit} className="grid gap-4">
        <FormCard title="Kurum" description="Temel kimlik bilgileri.">
          <FormGrid>
            <Field label="Ad" required>
              <Input name="name" required />
            </Field>
            <Field label="Kod" required hint="Küçük harf, benzersiz (örn. abc-koleji)">
              <Input name="code" required />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Logo URL">
                <Input name="logoUrl" />
              </Field>
            </div>
          </FormGrid>
        </FormCard>

        <FormCard title="Üyelik" description="İlk abonelik dönemi.">
          <FormGrid>
            <Field label="Üyelik başlangıcı" hint="Boş = bugün">
              <Input name="subscriptionStart" type="date" />
            </Field>
            <Field label="Üyelik bitişi" hint="Bu günün sonunda erişim kapanır">
              <Input name="subscriptionEnd" type="date" />
            </Field>
            <Field label="En fazla öğrenci" hint="0 = sınırsız">
              <Input name="maxStudents" type="number" min={0} defaultValue={0} />
            </Field>
          </FormGrid>
        </FormCard>

        <FormCard title="Yapı" description="İlk kampüs ve sezon (boş bırakılırsa varsayılanlar kullanılır).">
          <FormGrid>
            <Field label="Kampüs adı">
              <Input name="instituteName" placeholder="Merkez Kampüs" />
            </Field>
            <Field label="Kampüs kodu">
              <Input name="instituteCode" />
            </Field>
            <Field label="Sezon adı">
              <Input name="academicYearName" placeholder="2026-2027" />
            </Field>
            <Field label="Sezon başlangıcı">
              <Input name="academicYearStart" type="date" />
            </Field>
            <Field label="Sezon bitişi">
              <Input name="academicYearEnd" type="date" />
            </Field>
          </FormGrid>
        </FormCard>

        <FormCard
          title="İlk müdür"
          description="Kurum genel yetkili personel hesabı (Müdür rolü)."
          footer={
            <>
              {error ? <FormMessage tone="danger">{error}</FormMessage> : <span />}
              <Button type="submit" loading={create.isPending}>
                Kurumu oluştur
              </Button>
            </>
          }
        >
          <FormGrid>
            <Field label="Kullanıcı adı" required>
              <Input name="adminUsername" required autoComplete="off" />
            </Field>
            <Field label="Parola" required>
              <PasswordInput name="adminPassword" required autoComplete="new-password" />
            </Field>
            <Field label="Ad" required>
              <Input name="adminFirstName" required />
            </Field>
            <Field label="Soyad" required>
              <Input name="adminLastName" required />
            </Field>
            <div className="sm:col-span-2">
              <Field label="E-posta">
                <Input name="adminEmail" type="email" />
              </Field>
            </div>
          </FormGrid>
        </FormCard>
      </form>
    </div>
  );
}
