"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getStaffQueryKey,
  useAddScope,
  useCreateStaff,
  useDeleteScope,
  useInstitutes,
  useResetPassword,
  useRoles,
  useStaff,
  useUpdateStaff,
} from "@/src/api/generated/admin-companies/admin-companies";
import type { StaffDto } from "@/src/api/generated/models";
import { FormGroup } from "@/src/features/authoring/shared/FormGroup";
import { userStatusLabel } from "@/src/features/admin/labels";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  FormDialog,
  IconSearch,
  IconX,
  Input,
  PasswordInput,
  SectionTable,
  SectionToolbar,
  Select,
  errorMessage,
  notify,
} from "@/src/ui";

const COLUMNS = ["Ad", "Kullanıcı adı", "Roller", "Durum", ""];
type Status = "ACTIVE" | "PASSIVE" | "LOCKED";

function fullName(r?: StaffDto | null) {
  return `${r?.firstName ?? ""} ${r?.lastName ?? ""}`.trim() || r?.username || "Personel";
}

export function StaffSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error, refetch } = useStaff(id);
  const roles = useRoles(id).data?.data ?? [];
  const institutesData = useInstitutes(id).data;
  const instituteName = useMemo(
    () => Object.fromEntries((institutesData?.data ?? []).map((i) => [i.id!, i.name ?? ""])),
    [institutesData],
  );
  const all = data?.data ?? [];
  const [q, setQ] = useState("");
  const needle = q.trim().toLocaleLowerCase("tr-TR");
  const rows = needle
    ? all.filter((r) => [r.firstName, r.lastName, r.username, r.email].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR").includes(needle))
    : all;
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const addScope = useAddScope();
  const deleteScope = useDeleteScope();
  const resetPassword = useResetPassword();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDto | null>(null);
  const [scopeForId, setScopeForId] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<StaffDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Rol penceresi güncel listeden okunur: rol eklenip kaldırıldıkça yenilenir.
  const scopeFor = all.find((r) => r.id === scopeForId) ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getStaffQueryKey(id) });

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  const openNew = () => {
    setFormError(null);
    setOpen(true);
  };

  return (
    <div className="grid gap-4">
      <SectionTable
        toolbar={
          <SectionToolbar count={rows.length} noun="personel" loading={isLoading}>
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              icon={<IconSearch className="size-4" />}
              placeholder="Ad, kullanıcı adı, e-posta…"
              aria-label="Personel ara"
              wrapperClassName="w-full sm:w-72"
            />
            <Button size="sm" onClick={openNew}>
              Personel ekle
            </Button>
          </SectionToolbar>
        }
        loading={isLoading}
        empty={needle ? "Eşleşen personel yok" : "Henüz personel yok"}
        emptyHint={needle ? "Farklı bir arama deneyin." : "Öğretmen ve yöneticileri ekleyin, ardından rol atayın."}
        emptyTone={needle ? "neutral" : "primary"}
        emptyAction={needle ? undefined : <Button onClick={openNew}>Personel ekle</Button>}
        columns={COLUMNS}
        rows={rows.map((r) => [
          <div key="n" className="min-w-0">
            <p className="font-medium text-fg">{fullName(r)}</p>
            {r.email ? <p className="truncate text-xs text-fg-subtle">{r.email}</p> : null}
          </div>,
          <span key="u" className="font-mono text-[13px]">{r.username}</span>,
          (r.scopes ?? []).length ? (
            <div key="r" className="flex flex-wrap gap-1">
              {(r.scopes ?? []).map((s) => (
                <Badge key={s.id} tone="neutral">
                  {`${s.roleName ?? "Rol"}${s.instituteId && instituteName[s.instituteId] ? ` · ${instituteName[s.instituteId]}` : ""}`}
                </Badge>
              ))}
            </div>
          ) : (
            <span key="r" className="text-warning">Rol yok</span>
          ),
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : r.status === "LOCKED" ? "danger" : "warning"} dot>
            {userStatusLabel(r.status)}
          </Badge>,
          <div key="a" className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setFormError(null); setScopeForId(r.id!); }}>
              Roller
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setFormError(null); setEditing(r); }}>
              Düzenle
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setFormError(null); setResetFor(r); }}>
              Parola sıfırla
            </Button>
          </div>,
        ])}
      />

      <FormDialog
        open={resetFor !== null}
        onClose={() => setResetFor(null)}
        title="Parola sıfırla"
        description={`${fullName(resetFor)} kişisinin mevcut parolası hemen geçersiz olur. Yeni parolayı belirleyin ve kişiye güvenli bir kanaldan iletin.`}
        submitLabel="Kaydet"
        pending={resetPassword.isPending}
        error={formError}
        onSubmit={async (fd) => {
          if (!resetFor?.id) return;
          const password = String(fd.get("password") || "");
          const confirm = String(fd.get("confirmPassword") || "");
          if (password.length < 6) {
            setFormError("Parola en az 6 karakter olmalı.");
            return;
          }
          if (password !== confirm) {
            setFormError("Parolalar eşleşmiyor.");
            return;
          }
          setFormError(null);
          try {
            await resetPassword.mutateAsync({ id, uid: resetFor.id, data: { password } });
            setResetFor(null);
            notify.success("Parola sıfırlandı");
          } catch (err) {
            const message = errorMessage(err, "Parola sıfırlanamadı");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Yeni parola" required hint="En az 6 karakter.">
          <PasswordInput name="password" required minLength={6} autoComplete="new-password" />
        </Field>
        <Field label="Yeni parola (tekrar)" required>
          <PasswordInput name="confirmPassword" required minLength={6} autoComplete="new-password" />
        </Field>
      </FormDialog>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Personel ekle"
        description="Ekledikten sonra Roller'den yetki verin; rolü olmayan personel menüde hiçbir ekran görmez."
        submitLabel="Ekle"
        pending={create.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          try {
            await create.mutateAsync({
              id,
              data: {
                username: String(fd.get("username") || "").trim(),
                password: String(fd.get("password") || "") || undefined,
                firstName: String(fd.get("firstName") || "").trim(),
                lastName: String(fd.get("lastName") || "").trim(),
                email: String(fd.get("email") || "").trim() || undefined,
              },
            });
            await invalidate();
            setOpen(false);
            notify.success("Personel eklendi");
          } catch (err) {
            const message = errorMessage(err, "Personel eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <FormGroup title="Kişi">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ad" required>
              <Input name="firstName" required />
            </Field>
            <Field label="Soyad" required>
              <Input name="lastName" required />
            </Field>
          </div>
          <Field label="E-posta">
            <Input name="email" type="email" />
          </Field>
        </FormGroup>
        <FormGroup title="Giriş">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kullanıcı adı" required>
              <Input name="username" required autoComplete="off" />
            </Field>
            <Field label="Parola" hint="Boş bırakılırsa sistem üretir.">
              <PasswordInput name="password" autoComplete="new-password" />
            </Field>
          </div>
        </FormGroup>
      </FormDialog>

      <FormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Personeli düzenle"
        description={editing ? `Kullanıcı adı: ${editing.username ?? "—"}` : undefined}
        submitLabel="Kaydet"
        pending={update.isPending}
        error={formError}
        onSubmit={async (fd) => {
          if (!editing?.id) return;
          setFormError(null);
          try {
            await update.mutateAsync({
              id,
              uid: editing.id,
              data: {
                firstName: String(fd.get("firstName") || "").trim(),
                lastName: String(fd.get("lastName") || "").trim(),
                email: String(fd.get("email") || "").trim() || undefined,
                phone: String(fd.get("phone") || "").trim() || undefined,
                status: String(fd.get("status") || "ACTIVE") as Status,
              },
            });
            await invalidate();
            setEditing(null);
            notify.success("Personel güncellendi");
          } catch (err) {
            const message = errorMessage(err, "Personel güncellenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ad" required>
            <Input name="firstName" required defaultValue={editing?.firstName ?? ""} />
          </Field>
          <Field label="Soyad" required>
            <Input name="lastName" required defaultValue={editing?.lastName ?? ""} />
          </Field>
          <Field label="E-posta">
            <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
          </Field>
          <Field label="Telefon">
            <Input name="phone" type="tel" defaultValue={editing?.phone ?? ""} />
          </Field>
        </div>
        <Field label="Durum" hint="Pasif ya da kilitli personel panele giriş yapamaz.">
          <Select name="status" defaultValue={editing?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Aktif</option>
            <option value="PASSIVE">Pasif</option>
            <option value="LOCKED">Kilitli</option>
          </Select>
        </Field>
      </FormDialog>

      <FormDialog
        open={scopeFor !== null}
        onClose={() => setScopeForId(null)}
        title={`Roller · ${fullName(scopeFor)}`}
        description="Rol, personelin göreceği ekranları ve yapabileceği işlemleri belirler. Kampüs seçilmezse kurum genelinde geçerlidir."
        submitLabel="Rol ekle"
        pending={addScope.isPending}
        error={formError}
        onSubmit={async (fd) => {
          if (!scopeFor?.id) return;
          setFormError(null);
          try {
            await addScope.mutateAsync({
              id,
              uid: scopeFor.id,
              data: {
                roleId: String(fd.get("roleId") || ""),
                instituteId: String(fd.get("instituteId") || "") || undefined,
              },
            });
            await invalidate();
            notify.success("Rol eklendi");
          } catch (err) {
            const message = errorMessage(err, "Rol eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <div className="grid gap-2">
          <p className="text-[13px] font-semibold text-fg">Mevcut roller</p>
          {(scopeFor?.scopes ?? []).length === 0 ? (
            <p className="rounded-md bg-warning-bg px-3 py-2 text-[13px] text-warning">Henüz rol yok — personel hiçbir ekranı göremez.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {(scopeFor?.scopes ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-fg">{s.roleName ?? "Rol"}</span>
                    <span className="text-fg-subtle"> · {s.instituteId ? (instituteName[s.instituteId] ?? "Kampüs") : "Kurum geneli"}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`${s.roleName ?? "Rol"} rolünü kaldır`}
                    disabled={deleteScope.isPending}
                    onClick={async () => {
                      if (!scopeFor?.id || !s.id) return;
                      try {
                        await deleteScope.mutateAsync({ id, uid: scopeFor.id, sid: s.id });
                        await invalidate();
                        notify.success("Rol kaldırıldı");
                      } catch (err) {
                        notify.error(errorMessage(err, "Rol kaldırılamadı"));
                      }
                    }}
                  >
                    <IconX className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <Field label="Yeni rol" required hint={roles.length === 0 ? "Kurumda tanımlı rol yok." : undefined}>
            <Select name="roleId" required defaultValue="">
              <option value="">Seçin</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kapsam">
            <Select name="instituteId" defaultValue="">
              <option value="">Kurum geneli</option>
              {(institutesData?.data ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormDialog>
    </div>
  );
}
