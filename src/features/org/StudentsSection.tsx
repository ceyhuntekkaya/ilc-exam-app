"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customInstance } from "@/src/api/mutator";
import {
  getStudentsQueryKey,
  useBranches,
  useCreateStudent,
  useGrades,
  useInstitutes,
  useUpdateStudent,
  useYears,
} from "@/src/api/generated/admin-companies/admin-companies";
import type { StudentDto } from "@/src/api/generated/models";
import { AccommodationDialog } from "@/src/features/org/AccommodationDialog";
import { FormGroup } from "@/src/features/authoring/shared/FormGroup";
import { userStatusLabel } from "@/src/features/admin/labels";
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  FilterTabs,
  FormDialog,
  IconSearch,
  Input,
  SectionTable,
  SectionToolbar,
  Select,
  errorMessage,
  notify,
} from "@/src/ui";

const COLUMNS = ["Ad", "No", "Kullanıcı adı", "Sınıf", "Durum", ""];
type Status = "ACTIVE" | "PASSIVE" | "LOCKED";

export function StudentsSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const needle = q.trim();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["students-page", id, page, needle, status],
    queryFn: () =>
      customInstance<{ data: { items: StudentDto[]; total: number } }>(
        `/companies/${id}/students?page=${page}&size=50${needle ? `&q=${encodeURIComponent(needle)}` : ""}${status ? `&status=${encodeURIComponent(status)}` : ""}`,
      ),
  });
  const years = useYears(id).data?.data ?? [];
  const institutes = useInstitutes(id).data?.data ?? [];
  const gradesData = useGrades(id).data;
  const grades = useMemo(
    () => [...(gradesData?.data ?? [])].filter((g) => g.status !== "PASSIVE").sort((a, b) => (a.levelOrder ?? 999) - (b.levelOrder ?? 999)),
    [gradesData],
  );
  const branchesData = useBranches(id, undefined).data;
  const branches = useMemo(() => branchesData?.data ?? [], [branchesData]);
  const activeYear = years.find((y) => y.status === "ACTIVE");

  const all = data?.data.items ?? [];
  const total = data?.data.total ?? 0;
  const rows = all;

  const branchName = useMemo(() => Object.fromEntries(branches.map((b) => [b.id!, b.name ?? ""])), [branches]);
  const gradeName = useMemo(() => Object.fromEntries(grades.map((g) => [g.id!, g.name ?? ""])), [grades]);

  /** Aktif sezondaki (yoksa son) kaydın sınıf/seviye adı. */
  function placement(student: StudentDto) {
    const list = student.enrollments ?? [];
    const e = list.find((x) => x.academicYearId === activeYear?.id) ?? list[list.length - 1];
    if (!e) return null;
    return [e.branchId ? branchName[e.branchId] : null, e.gradeId ? gradeName[e.gradeId] : null].filter(Boolean).join(" · ") || null;
  }

  const create = useCreateStudent();
  const update = useUpdateStudent();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Kayıt alanları zincirli: sınıf listesi sezon + kampüs + seviyeye göre süzülür.
  const [yearId, setYearId] = useState("");
  const [instituteId, setInstituteId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [completing, setCompleting] = useState<StudentDto | null>(null);
  const [moving, setMoving] = useState<StudentDto | null>(null);
  const [accommodating, setAccommodating] = useState<StudentDto | null>(null);
  const [moveBranch, setMoveBranch] = useState("");
  const completeEnrollment = useMutation({
    mutationFn: (body: { studentId: string; enrollmentId: string }) =>
      customInstance(`/companies/${id}/students/${body.studentId}/enrollments/${body.enrollmentId}/complete`, { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getStudentsQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: ["students-page", id] });
      notify.success("Kayıt bitirildi");
      setCompleting(null);
    },
    onError: (err) => notify.error(errorMessage(err, "Kayıt bitirilemedi")),
  });
  const transferEnrollment = useMutation({
    mutationFn: (body: { studentId: string; enrollmentId: string; instituteId: string; gradeId: string; branchId: string }) =>
      customInstance(`/companies/${id}/students/${body.studentId}/enrollments/${body.enrollmentId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instituteId: body.instituteId, gradeId: body.gradeId, branchId: body.branchId }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getStudentsQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: ["students-page", id] });
      notify.success("Öğrenci nakledildi");
      setMoving(null);
    },
    onError: (err) => {
      const message = errorMessage(err, "Nakil yapılamadı");
      setFormError(message);
      notify.error(message);
    },
  });
  const branchOptions = branches.filter(
    (b) =>
      (!yearId || b.academicYearId === yearId) &&
      (!instituteId || b.instituteId === instituteId) &&
      (!gradeId || b.gradeId === gradeId),
  );

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  function openNew() {
    setFormError(null);
    setYearId(activeYear?.id ?? "");
    setInstituteId(institutes.length === 1 ? (institutes[0].id ?? "") : "");
    setGradeId("");
    setBranchId("");
    setOpen(true);
  }

  return (
    <div className="grid gap-4">
      <SectionTable
        tabs={
          <FilterTabs
              label="Öğrenci durumu"
              value={status}
              onChange={(value) => { setStatus(value); setPage(0); }}
              items={[
                { label: "Tümü", value: null, count: status == null && !isLoading ? total : undefined },
                { label: "Aktif", value: "ACTIVE", count: status === "ACTIVE" && !isLoading ? total : undefined },
                { label: "Pasif", value: "PASSIVE", count: status === "PASSIVE" && !isLoading ? total : undefined },
                { label: "Kilitli", value: "LOCKED", count: status === "LOCKED" && !isLoading ? total : undefined },
              ]}
            />
        }
        toolbar={
          <SectionToolbar count={total} noun="öğrenci" loading={isLoading}>
            <Input
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              icon={<IconSearch className="size-4" />}
              placeholder="Ad, numara, kullanıcı adı…"
              aria-label="Öğrenci ara"
              wrapperClassName="w-full sm:w-72"
            />
            <Button size="sm" onClick={openNew}>
              Öğrenci ekle
            </Button>
          </SectionToolbar>
        }
        loading={isLoading}
        empty={needle || status ? "Eşleşen öğrenci yok" : "Henüz öğrenci yok"}
        emptyHint={
          needle || status
            ? "Aramayı ya da durum filtresini değiştirin."
            : "Öğrenciler kullanıcı adıyla giriş yapar. İlk öğrenciyi ekleyip bir sınıfa kaydedin."
        }
        emptyTone={needle || status ? "neutral" : "primary"}
        emptyAction={needle || status ? undefined : <Button onClick={openNew}>Öğrenci ekle</Button>}
        columns={COLUMNS}
        rows={rows.map((r) => [
          `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—",
          r.studentNumber ? <span key="no" className="numeric">{r.studentNumber}</span> : "—",
          <span key="u" className="font-mono text-[13px]">{r.username}</span>,
          placement(r) ?? <span key="p" className="text-fg-subtle">Kayıt yok</span>,
          <Badge key="s" tone={r.status === "ACTIVE" ? "success" : r.status === "LOCKED" ? "danger" : "warning"} dot>
            {userStatusLabel(r.status)}
          </Badge>,
          <div key="a" className="flex flex-wrap justify-end gap-2">
            {(r.enrollments ?? []).some((row) => row.status === "ACTIVE") ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    setFormError(null);
                    setMoveBranch("");
                    setMoving(r);
                  }}
                >
                  Nakil
                </Button>
                <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setCompleting(r)}>
                  Kaydı bitir
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="min-h-11"
              onClick={() => setAccommodating(r)}
            >
              Düzenleme profili
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                setFormError(null);
                setEditing(r);
              }}
            >
              Düzenle
            </Button>
          </div>,
        ])}
      />
      {total > 50 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-fg-muted">{page * 50 + 1}–{Math.min(total, (page + 1) * 50)} / {total}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="min-h-11" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Önceki</Button>
            <Button type="button" variant="secondary" className="min-h-11" disabled={(page + 1) * 50 >= total} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
          </div>
        </div>
      ) : null}

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Öğrenci ekle"
        description="Öğrenci, kullanıcı adıyla giriş yapar. Sınıf seçerseniz sınıf bazlı atamalara otomatik dahil olur."
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
                firstName: String(fd.get("firstName") || "").trim(),
                lastName: String(fd.get("lastName") || "").trim(),
                studentNumber: String(fd.get("studentNumber") || "").trim(),
                academicYearId: yearId || undefined,
                instituteId: instituteId || undefined,
                gradeId: gradeId || undefined,
                branchId: branchId || undefined,
              },
            });
            await queryClient.invalidateQueries({ queryKey: getStudentsQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: ["students-page", id] });
            setOpen(false);
            notify.success("Öğrenci eklendi");
          } catch (err) {
            const message = errorMessage(err, "Öğrenci eklenemedi");
            setFormError(message);
            notify.error(message);
          }
        }}
      >
        <FormGroup title="Kimlik">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ad" required>
              <Input name="firstName" required />
            </Field>
            <Field label="Soyad" required>
              <Input name="lastName" required />
            </Field>
            <Field label="Öğrenci no" required>
              <Input name="studentNumber" required inputMode="numeric" />
            </Field>
            <Field label="Kullanıcı adı" required hint="Giriş için; benzersiz olmalı.">
              <Input name="username" required autoComplete="off" />
            </Field>
          </div>
        </FormGroup>
        <FormGroup title="Kayıt" hint="İsteğe bağlı; sonradan da yapılabilir.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sezon">
              <Select value={yearId} onChange={(e) => { setYearId(e.target.value); setBranchId(""); }}>
                <option value="">Seçilmedi</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kampüs">
              <Select value={instituteId} onChange={(e) => { setInstituteId(e.target.value); setBranchId(""); }}>
                <option value="">Seçilmedi</option>
                {institutes.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seviye">
              <Select value={gradeId} onChange={(e) => { setGradeId(e.target.value); setBranchId(""); }}>
                <option value="">Seçilmedi</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sınıf" hint={branchOptions.length === 0 ? "Bu seçime uyan sınıf yok." : undefined}>
              <Select
                value={branchId}
                disabled={branchOptions.length === 0}
                onChange={(e) => {
                  const next = e.target.value;
                  setBranchId(next);
                  // Sınıf seçilince kampüs/seviye ondan doldurulur.
                  const b = branches.find((x) => x.id === next);
                  if (b?.instituteId) setInstituteId(b.instituteId);
                  if (b?.gradeId) setGradeId(b.gradeId);
                }}
              >
                <option value="">Seçilmedi</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </FormGroup>
      </FormDialog>

      <FormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Öğrenciyi düzenle"
        description={editing ? `Kullanıcı adı: ${editing.username ?? "—"} · No: ${editing.studentNumber ?? "—"}` : undefined}
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
                status: String(fd.get("status") || "ACTIVE") as Status,
              },
            });
            await queryClient.invalidateQueries({ queryKey: getStudentsQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: ["students-page", id] });
            setEditing(null);
            notify.success("Öğrenci güncellendi");
          } catch (err) {
            const message = errorMessage(err, "Öğrenci güncellenemedi");
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
        </div>
        <Field label="Durum" hint="Kilit giriş yasağıdır ve geri alınır. Pasif geri alınamaz ve aktif kaydı kapatır. Açık denemesi olan öğrenci pasif yapılamaz.">
          <Select name="status" defaultValue={editing?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Aktif</option>
            <option value="PASSIVE">Pasif</option>
            <option value="LOCKED">Kilitli</option>
          </Select>
        </Field>
      </FormDialog>
      <ConfirmDialog
        open={completing !== null}
        onClose={() => setCompleting(null)}
        title="Kayıt bitirilsin mi?"
        confirmLabel="Bitir"
        pending={completeEnrollment.isPending}
        description={
          completing
            ? `${`${completing.firstName ?? ""} ${completing.lastName ?? ""}`.trim()} bu sezondaki kaydı kapanır. Yeni atama kadrosuna yazılmaz.`
            : undefined
        }
        onConfirm={() => {
          const enrollment = (completing?.enrollments ?? []).find((row) => row.status === "ACTIVE");
          if (completing?.id && enrollment?.id) {
            completeEnrollment.mutate({ studentId: completing.id, enrollmentId: enrollment.id });
          }
        }}
      />
      <FormDialog
        open={moving !== null}
        onClose={() => setMoving(null)}
        title="Nakil"
        description="Eski kayıt kapanır. Öğrenci seçilen sınıfta yeni kayıt açar."
        submitLabel="Naklet"
        pending={transferEnrollment.isPending}
        error={formError}
        onSubmit={async () => {
          const enrollment = (moving?.enrollments ?? []).find((row) => row.status === "ACTIVE");
          const branch = branches.find((row) => row.id === moveBranch);
          if (!moving?.id || !enrollment?.id || !branch?.id || !branch.instituteId || !branch.gradeId) {
            setFormError("Sınıf seçin.");
            return;
          }
          setFormError(null);
          try {
            await transferEnrollment.mutateAsync({
              studentId: moving.id,
              enrollmentId: enrollment.id,
              instituteId: branch.instituteId,
              gradeId: branch.gradeId,
              branchId: branch.id,
            });
          } catch {
            return;
          }
        }}
      >
        <Field label="Yeni sınıf" required>
          <Select value={moveBranch} onChange={(e) => setMoveBranch(e.target.value)} required>
            <option value="">Seçin</option>
            {branches
              .filter((row) => {
                const enrollment = (moving?.enrollments ?? []).find((item) => item.status === "ACTIVE");
                return !enrollment?.academicYearId || row.academicYearId === enrollment.academicYearId;
              })
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
          </Select>
        </Field>
      </FormDialog>
      {accommodating?.id ? (
        <AccommodationDialog
          companyId={id}
          studentId={accommodating.id}
          studentLabel={`${accommodating.firstName ?? ""} ${accommodating.lastName ?? ""}`.trim() || "Öğrenci"}
          open={accommodating !== null}
          onClose={() => setAccommodating(null)}
        />
      ) : null}
    </div>
  );
}
