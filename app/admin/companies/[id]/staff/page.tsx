"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getStaffQueryKey,
  useAddScope,
  useCreateStaff,
  useResetPassword,
  useRoles,
  useStaff,
} from "@/src/api/generated/admin-companies/admin-companies";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { userStatusLabel } from "@/src/features/admin/labels";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  FormDialog,
  Input,
  PasswordInput,
  SectionTable,
  Select,
  errorMessage,
  notify,
} from "@/src/ui";

export default function CompanyStaffPage() {
  return (
    <CompanyDetailFrame section="staff">
      <Body />
    </CompanyDetailFrame>
  );
}

function Body() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useStaff(id);
  const rolesQ = useRoles(id);
  const rows = data?.data ?? [];
  const roles = rolesQ.data?.data ?? [];
  const create = useCreateStaff();
  const addScope = useAddScope();
  const resetPassword = useResetPassword();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scopeFor, setScopeFor] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <div className="grid gap-4">
      {tempPassword ? (
        <p className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg">
          Geçici parola: <span className="font-mono font-semibold">{tempPassword}</span>
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          Personel ekle
        </Button>
      </div>
      <SectionTable
        flush
        empty="Personel yok"
        columns={["Ad", "Kullanıcı", "Durum", "Roller", ""]}
        rows={rows.map((r) => [
          `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
          r.username,
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : "warning"} dot>
            {userStatusLabel(r.status)}
          </Badge>,
          (r.scopes ?? []).map((s) => s.roleName).filter(Boolean).join(", ") || "—",
          <div key="a" className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setScopeFor(r.id!)}>
              Rol
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  const res = await resetPassword.mutateAsync({ id, uid: r.id! });
                  setTempPassword(res.data.temporaryPassword ?? null);
                  notify.success("Parola sıfırlandı");
                } catch (err) {
                  notify.error(errorMessage(err, "Parola sıfırlanamadı"));
                }
              }}
            >
              Parola
            </Button>
          </div>,
        ])}
      />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Personel ekle"
        submitLabel="Ekle"
        pending={create.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          try {
            await create.mutateAsync({
              id,
              data: {
                username: String(fd.get("username") || ""),
                password: String(fd.get("password") || "") || undefined,
                firstName: String(fd.get("firstName") || ""),
                lastName: String(fd.get("lastName") || ""),
                email: String(fd.get("email") || "") || undefined,
              },
            });
            await queryClient.invalidateQueries({ queryKey: getStaffQueryKey(id) });
            setOpen(false);
            notify.success("Personel eklendi");
          } catch (err) {
            const message = errorMessage(err, "Personel eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Kullanıcı adı" required>
          <Input name="username" required />
        </Field>
        <Field label="Parola" hint="Boş bırakılırsa sistem üretir">
          <PasswordInput name="password" />
        </Field>
        <Field label="Ad" required>
          <Input name="firstName" required />
        </Field>
        <Field label="Soyad" required>
          <Input name="lastName" required />
        </Field>
        <Field label="E-posta">
          <Input name="email" type="email" />
        </Field>
      </FormDialog>

      <FormDialog
        open={!!scopeFor}
        onClose={() => setScopeFor(null)}
        title="Rol / kapsam ata"
        submitLabel="Ata"
        pending={addScope.isPending}
        error={formError}
        onSubmit={async (fd) => {
          if (!scopeFor) return;
          setFormError(null);
          try {
            await addScope.mutateAsync({
              id,
              uid: scopeFor,
              data: { roleId: String(fd.get("roleId") || "") },
            });
            await queryClient.invalidateQueries({ queryKey: getStaffQueryKey(id) });
            setScopeFor(null);
            notify.success("Rol atandı");
          } catch (err) {
            const message = errorMessage(err, "Rol atanamadı");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Rol" required>
          <Select name="roleId" required>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-[13px] text-fg-muted">
          Boş kapsam = kurum geneli (HQ). Kampüs/seviye kısıtı sonra eklenebilir.
        </p>
      </FormDialog>
    </div>
  );
}
