"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getStudentsQueryKey,
  useBranches,
  useCreateStudent,
  useGrades,
  useInstitutes,
  useStudents,
  useUpdateStudent,
  useYears,
} from "@/src/api/generated/admin-companies/admin-companies";
import type { StudentDto } from "@/src/api/generated/models";
import { FormGroup } from "@/src/features/authoring/shared/FormGroup";
import { userStatusLabel } from "@/src/features/admin/labels";
import {
  Badge,
  Button,
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
  const { data, isLoading, isError, error, refetch } = useStudents(id);
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

  const all = data?.data ?? [];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const needle = q.trim().toLocaleLowerCase("tr-TR");
  const rows = all.filter(
    (r) =>
      (!status || r.status === status) &&
      (!needle ||
        [r.firstName, r.lastName, r.studentNumber, r.username].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR").includes(needle)),
  );

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

  const count = (code: Status) => all.filter((r) => r.status === code).length;

  return (
    <div className="grid gap-4">
      <SectionTable
        tabs={
          <FilterTabs
              label="Öğrenci durumu"
              value={status}
              onChange={setStatus}
              items={[
                { label: "Tümü", value: null, count: isLoading ? undefined : all.length },
                { label: "Aktif", value: "ACTIVE", count: isLoading ? undefined : count("ACTIVE") },
                { label: "Pasif", value: "PASSIVE", count: isLoading ? undefined : count("PASSIVE") },
                { label: "Kilitli", value: "LOCKED", count: isLoading ? undefined : count("LOCKED") },
              ]}
            />
        }
        toolbar={
          <SectionToolbar count={rows.length} noun="öğrenci" loading={isLoading}>
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
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
          <div key="a" className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
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
        <Field label="Durum" hint="Pasif ya da kilitli öğrenci giriş yapamaz ve yeni atamalara dahil edilmez.">
          <Select name="status" defaultValue={editing?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Aktif</option>
            <option value="PASSIVE">Pasif</option>
            <option value="LOCKED">Kilitli</option>
          </Select>
        </Field>
      </FormDialog>
    </div>
  );
}
