"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/src/components/auth-provider";
import { matchingNavItem, staffNavGroups, visibleNav } from "@/src/config/panel-nav";
import { hasAnyPermission } from "@/src/lib/permissions";
import { PanelProvider } from "@/src/features/panel/PanelContext";
import { PanelChrome } from "@/src/features/shell/PanelChrome";
import { UiVariantProvider } from "@/src/ui/primitives/UiVariant";
import { ButtonLink, EmptyState, IconLock, Skeleton } from "@/src/ui";

/**
 * Okul personeli kabuğu — admin ile aynı PanelChrome ve tema (`data-panel="staff"`).
 * Fark: menü rol yetkilerine göre süzülür, yetkisiz sayfada "erişim yok" gösterilir,
 * kontroller `staff` varyantında (tablet için en az 44px dokunma hedefi).
 */
export function StaffShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const groups = visibleNav("STAFF", user?.permissions);
  const match = matchingNavItem(pathname, staffNavGroups());
  const denied =
    !loading && Boolean(match?.perms) && !hasAnyPermission(user?.permissions, match?.perms);

  return (
    <PanelProvider role="STAFF" basePath="/staff">
      <PanelChrome
        panel="staff"
        title="Personel"
        homeHref="/staff"
        roleLabel="Kurum personeli"
        groups={groups}
        navLoading={loading}
      >
        <UiVariantProvider variant="staff">
          {loading ? <PageSkeleton /> : denied ? <NoAccess /> : children}
        </UiVariantProvider>
      </PanelChrome>
    </PanelProvider>
  );
}

function PageSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Yükleniyor">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function NoAccess() {
  return (
    <EmptyState
      icon={<IconLock className="size-5" />}
      title="Bu sayfaya erişiminiz yok"
      description="Rolünüz bu ekranı kapsamıyor. Gerekliyse kurum yöneticinizden rolünüzün güncellenmesini isteyin."
      action={
        <ButtonLink href="/staff" variant="secondary">
          Panele dön
        </ButtonLink>
      }
    />
  );
}
