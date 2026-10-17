"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customInstance } from "@/src/api/mutator";
import {
  getBranchesQueryKey,
  useBranches,
  useCreateBranch,
  useGrades,
  useInstitutes,
  useYears,
} from "@/src/api/generated/admin-companies/admin-companies";
import { yearStatusLabel } from "@/src/features/admin/labels";
import {
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

const COLUMNS = ["Ad", "Kampüs", "Seviye", ""];

export function BranchesSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const yearsQ = useYears(id);
  const institutesQ = useInstitutes(id);
  const gradesQ = useGrades(id);
  const years = useMemo(() => yearsQ.data?.data ?? [], [yearsQ.data]);
  const institutes = useMemo(() => institutesQ.data?.data ?? [], [institutesQ.data]);
  const grades = useMemo(
    () => [...(gradesQ.data?.data ?? [])].filter((g) => g.status !== "PASSIVE").sort((a, b) => (a.levelOrder ?? 999) - (b.levelOrder ?? 999)),
    [gradesQ.data],
  );
  const activeYear = years.find((y) => y.status === "ACTIVE") ?? years[0];
  const [yearId, setYearId] = useState<string | undefined>(undefined);
  const selectedYear = yearId ?? activeYear?.id;

  const { data, isLoading, isError, error, refetch } = useBranches(id, { academicYearId: selectedYear }, {
    query: { enabled: !!selectedYear },
  });
  const [instituteFilter, setInstituteFilter] = useState("");
  const all = data?.data ?? [];
  const rows = instituteFilter ? all.filter((r) => r.instituteId === instituteFilter) : all;
  const create = useCreateBranch();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const rename = useMutation({
    mutationFn: (body: { id: string; name: string }) =>
      customInstance(`/companies/${id}/branches/${body.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: body.name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getBranchesQueryKey(id) });
      notify.success("Sınıf adı güncellendi");
      setRenaming(null);
    },
    onError: (err) => {
      const message = errorMessage(err, "Sınıf adı güncellenemedi");
      setFormError(message);
      notify.error(message);
    },
  });
  const remove = useMutation({
    mutationFn: (branchId: string) => customInstance(`/companies/${id}/branches/${branchId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getBranchesQueryKey(id) });
      notify.success("Sınıf silindi");
      setToDelete(null);
    },
    onError: (err) => notify.error(errorMessage(err, "Sınıf silinemedi")),
  });

  const instituteName = useMemo(() => Object.fromEntries(institutes.map((i) => [i.id!, i.name ?? ""])), [institutes]);
  const gradeName = useMemo(() => Object.fromEntries(grades.map((g) => [g.id!, g.name ?? ""])), [grades]);

  const setupLoading = yearsQ.isLoading || institutesQ.isLoading || gradesQ.isLoading;
  const setupError = yearsQ.error ?? institutesQ.error ?? gradesQ.error;
  if (setupError) {
    return (
      <ErrorState
        error={setupError}
        onRetry={() => void Promise.all([yearsQ.refetch(), institutesQ.refetch(), gradesQ.refetch()])}
        compact
      />
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  // Sınıf; sezon + kampüs + seviyeye bağlı. Eksik önkoşulu açıkça söyle (sonsuz yükleme yerine).
  const missing = [
    years.length === 0 && "sezon",
    institutes.length === 0 && "kampüs",
    grades.length === 0 && "seviye",
  ].filter(Boolean) as string[];
  if (!setupLoading && missing.length > 0) {
    return (
      <EmptyState
        tone="warning"
        title="Önce kurum yapısını tamamlayın"
        description={`Sınıf eklemek için en az bir ${missing.join(", ")} gerekiyor. Üstteki sekmelerden ekleyip bu sekmeye dönün.`}
      />
    );
  }

  const loading = setupLoading || isLoading;

  return (
    <div className="grid gap-4">
      <SectionTable
        toolbar={
          <SectionToolbar count={rows.length} noun="sınıf" loading={loading}>
            <Select
              aria-label="Sezon"
              value={selectedYear ?? ""}
              onChange={(e) => setYearId(e.target.value || undefined)}
              className="w-full sm:w-52"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {`${y.name ?? ""}${y.status !== "ACTIVE" ? ` (${yearStatusLabel(y.status)})` : ""}`}
                </option>
              ))}
            </Select>
            {institutes.length > 1 ? (
              <Select aria-label="Kampüs" value={instituteFilter} onChange={(e) => setInstituteFilter(e.target.value)} className="w-full sm:w-52">
                <option value="">Tüm kampüsler</option>
                {institutes.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button
              size="sm"
              onClick={() => {
                setFormError(null);
                setOpen(true);
              }}
              disabled={!selectedYear}
            >
              Sınıf ekle
            </Button>
          </SectionToolbar>
        }
        loading={loading}
        empty={instituteFilter ? "Bu kampüste sınıf yok" : "Bu sezonda sınıf yok"}
        emptyTone={instituteFilter ? "neutral" : "primary"}
        emptyHint="Öğrenciler sınıflara kaydedilir; atamalar sınıf bazında yapılabilir."
        emptyAction={
          <Button
            onClick={() => {
              setFormError(null);
              setOpen(true);
            }}
          >
            Sınıf ekle
          </Button>
        }
        columns={COLUMNS}
        rows={[...rows]
          .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "tr", { numeric: true }))
          .map((r) => [
            r.name,
            instituteName[r.instituteId!] ?? "—",
            gradeName[r.gradeId!] ?? "—",
            <div key="a" className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="min-h-11"
                onClick={() => {
                  setFormError(null);
                  setRenaming({ id: r.id!, name: r.name ?? "" });
                }}
              >
                Ad
              </Button>
              <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setToDelete({ id: r.id!, name: r.name ?? "Sınıf" })}>
                Sil
              </Button>
            </div>,
          ])}
      />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sınıf ekle"
        description={`Sezon: ${years.find((y) => y.id === selectedYear)?.name ?? "—"}`}
        submitLabel="Ekle"
        pending={create.isPending}
        error={formError}
        onSubmit={async (fd) => {
          setFormError(null);
          if (!selectedYear) return;
          try {
            await create.mutateAsync({
              id,
              data: {
                name: String(fd.get("name") || "").trim(),
                instituteId: String(fd.get("instituteId") || ""),
                academicYearId: selectedYear,
                gradeId: String(fd.get("gradeId") || ""),
              },
            });
            // Önek: sezon listesi + kurum ayarlarındaki toplam sınıf sayacı birlikte yenilenir.
            await queryClient.invalidateQueries({ queryKey: getBranchesQueryKey(id) });
            setOpen(false);
            notify.success("Sınıf eklendi");
          } catch (err) {
            const message = errorMessage(err, "Sınıf eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <Field label="Ad" required>
          <Input name="name" required placeholder="4-A" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kampüs" required>
            <Select name="instituteId" required defaultValue={instituteFilter || (institutes.length === 1 ? institutes[0].id : "")}>
              <option value="">Seçin</option>
              {institutes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Seviye" required>
            <Select name="gradeId" required defaultValue="">
              <option value="">Seçin</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormDialog>
      <FormDialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Sınıf adı"
        submitLabel="Kaydet"
        pending={rename.isPending}
        error={formError}
        onSubmit={async (fd) => {
          if (!renaming) return;
          setFormError(null);
          try {
            await rename.mutateAsync({ id: renaming.id, name: String(fd.get("name") || "").trim() });
          } catch {
            return;
          }
        }}
      >
        <Field label="Ad" required>
          <Input name="name" required defaultValue={renaming?.name ?? ""} />
        </Field>
      </FormDialog>
      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Sınıf silinsin mi?"
        confirmLabel="Sil"
        pending={remove.isPending}
        description={toDelete ? `"${toDelete.name}" silinir. Kayıtlı öğrencisi veya ataması varsa silinmez.` : undefined}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
        }}
      />
    </div>
  );
}
