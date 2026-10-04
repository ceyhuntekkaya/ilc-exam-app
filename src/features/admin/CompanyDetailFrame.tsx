"use client";

import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  getGetQueryKey,
  useActivate,
  useDelete,
  useGet,
  useSuspend,
} from "@/src/api/generated/admin-companies/admin-companies";
import {
  companyDetailNav,
  companySectionMeta,
  type CompanySection,
} from "@/src/config/company-detail-nav";
import { companyStatusLabel, companyStatusTone } from "@/src/features/admin/labels";
import {
  ActionBar,
  Button,
  ConfirmDialog,
  DetailGroupTabs,
  DetailSectionPills,
  DetailShell,
  EntityHeader,
  ErrorState,
  errorMessage,
  notify,
} from "@/src/ui";

export function CompanyDetailFrame({
  section,
  children,
}: {
  section: CompanySection;
  children: ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const companyId = params.id;
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useGet(companyId);
  const company = data?.data;
  const suspend = useSuspend();
  const activate = useActivate();
  const remove = useDelete();
  const [confirm, setConfirm] = useState<"suspend" | "activate" | "delete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const meta = companySectionMeta(section);
  const groups = companyDetailNav(companyId, section);

  async function runAction() {
    if (!confirm) return;
    setActionError(null);
    try {
      if (confirm === "suspend") {
        await suspend.mutateAsync({ id: companyId });
        notify.success("Kurum askıya alındı");
      }
      if (confirm === "activate") {
        await activate.mutateAsync({ id: companyId });
        notify.success("Kurum aktifleştirildi");
      }
      if (confirm === "delete") {
        await remove.mutateAsync({ id: companyId });
        notify.success("Kurum silindi");
      }
      await queryClient.invalidateQueries({ queryKey: getGetQueryKey(companyId) });
      setConfirm(null);
    } catch (err) {
      const message = errorMessage(err, "İşlem başarısız");
      setActionError(message);
      notify.error(message);
    }
  }

  if (isError) {
    return <ErrorState message={error instanceof Error ? error.message : "Kurum yüklenemedi"} />;
  }

  return (
    <>
      <DetailShell
        back={{ href: "/admin/companies", label: "Kurumlara dön" }}
        header={
          isLoading || !company ? (
            <div className="h-20 animate-pulse rounded-lg bg-neutral-100" />
          ) : (
            <EntityHeader
              title={company.name ?? "Kurum"}
              identity={company.code}
              status={companyStatusLabel(company.status)}
              statusTone={companyStatusTone(company.status)}
              metrics={[
                { label: "Kampüs", value: String(company.instituteCount ?? 0), icon: "store" },
                { label: "Personel", value: String(company.staffCount ?? 0), icon: "users" },
                { label: "Öğrenci", value: String(company.studentCount ?? 0), icon: "users" },
                {
                  label: "Üyelik",
                  value: company.activeSubscription
                    ? `${company.activeSubscription.endDate ?? "—"}`
                    : "Yok",
                  tone: company.activeSubscription ? "success" : "warning",
                },
              ]}
              actions={
                <ActionBar>
                  {company.status === "ACTIVE" ? (
                    <Button variant="secondary" size="sm" onClick={() => setConfirm("suspend")}>
                      Askıya al
                    </Button>
                  ) : null}
                  {company.status === "SUSPENDED" ? (
                    <Button variant="secondary" size="sm" onClick={() => setConfirm("activate")}>
                      Aktifleştir
                    </Button>
                  ) : null}
                  {company.status !== "PASSIVE" ? (
                    <Button variant="danger" size="sm" onClick={() => setConfirm("delete")}>
                      Sil
                    </Button>
                  ) : null}
                </ActionBar>
              }
            />
          )
        }
        tabs={<DetailGroupTabs groups={groups} />}
        subtabs={<DetailSectionPills groups={groups} />}
        sectionGroup={meta.group}
        sectionTitle={meta.title}
      >
        {children}
      </DetailShell>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => {
          setConfirm(null);
          setActionError(null);
        }}
        title={
          confirm === "delete"
            ? "Kurumu sil"
            : confirm === "suspend"
              ? "Kurumu askıya al"
              : "Kurumu aktifleştir"
        }
        description={
          confirm === "delete"
            ? "Kurum pasife alınır (soft delete). Devam etmek istiyor musunuz?"
            : confirm === "suspend"
              ? "Askıdaki kurumda okuma ve yazma kilitlenir."
              : "Kurum yeniden aktif hale getirilecek."
        }
        confirmLabel="Onayla"
        onConfirm={() => {
          void runAction();
        }}
        tone={confirm === "activate" ? "primary" : "danger"}
        pending={suspend.isPending || activate.isPending || remove.isPending}
        error={actionError ?? undefined}
      />
    </>
  );
}
