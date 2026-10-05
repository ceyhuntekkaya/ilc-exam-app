"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/src/components/auth-provider";
import {
  isNavActive,
  matchingNavItem,
  staffNavGroups,
  visibleNav,
  type PanelNavGroup,
} from "@/src/config/panel-nav";
import { hasAnyPermission } from "@/src/lib/permissions";
import { cn } from "@/src/lib/utils/cn";
import { PanelProvider } from "@/src/features/panel/PanelContext";
import { UiVariantProvider } from "@/src/ui/primitives/UiVariant";
import { IconMenu, IconX } from "@/src/ui/icons";

export function StaffShell({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  const close = useCallback(() => setOpen(false), []);
  const groups = visibleNav("STAFF", user?.permissions);
  const permKey = (user?.permissions ?? []).join(",");
  const match = matchingNavItem(pathname, staffNavGroups());
  const denied =
    !loading && Boolean(match?.perms) && !hasAnyPermission(user?.permissions, match?.perms);

  useEffect(() => {
    document
      .querySelector<HTMLElement>("#staff-sidebar a[aria-current='page']")
      ?.scrollIntoView({ block: "nearest" });
  }, [pathname, permKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  return (
    <PanelProvider role="STAFF" basePath="/staff">
    <UiVariantProvider variant="staff">
      <div
        data-panel=""
        className="flex min-h-dvh flex-1 flex-col bg-[#f3f0ea] text-ilc-ink"
      >
        <header className="sticky top-0 z-30 border-b border-ilc-line bg-white pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ilc-navy hover:bg-ilc-sand md:hidden"
                aria-expanded={open}
                aria-controls="staff-sidebar"
                onClick={() => setOpen(true)}
              >
                <IconMenu className="size-5" />
                <span className="sr-only">Menüyü aç</span>
              </button>
              <Link
                href="/staff"
                className="truncate font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ilc-navy"
              >
                ILC Personel
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-sm">
              <span className="hidden max-w-[12rem] truncate text-ilc-navy/70 sm:inline">
                {loading ? "…" : user?.displayName ?? "Personel"}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex min-h-11 items-center rounded-md border border-ilc-line px-3 text-sm hover:bg-ilc-sand"
              >
                Çıkış
              </button>
            </div>
          </div>
        </header>

        <div
          className={cn(
            "fixed inset-0 z-40 bg-ilc-navy/40 transition-opacity md:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={close}
          aria-hidden="true"
        />

        <div className="flex min-h-0 flex-1">
          <aside
            id="staff-sidebar"
            className={cn(
              "z-50 flex w-64 max-w-[85vw] flex-col border-r border-ilc-line bg-white transition-transform duration-200 ease-out",
              "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:pt-[env(safe-area-inset-top)] max-md:shadow-lg",
              "md:sticky md:top-14 md:z-0 md:w-56 md:max-h-[calc(100dvh-3.5rem)] md:max-w-none md:self-start md:overflow-y-auto lg:w-60",
              open ? "max-md:translate-x-0" : "max-md:-translate-x-full",
            )}
            aria-label="Personel menüsü"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-ilc-line px-3 md:hidden">
              <span className="text-sm font-medium text-ilc-navy">Menü</span>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-md text-ilc-navy hover:bg-ilc-sand"
                onClick={close}
              >
                <IconX className="size-5" />
                <span className="sr-only">Menüyü kapat</span>
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {loading ? <NavSkeleton /> : <StaffNavList groups={groups} pathname={pathname} onNavigate={close} />}
            </nav>
          </aside>

          <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
            <div className="mx-auto w-full max-w-6xl">
              {loading ? (
                <div className="h-40 rounded-lg bg-white ring-1 ring-ilc-line" aria-hidden="true" />
              ) : denied ? (
                <NoAccess />
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
    </UiVariantProvider>
    </PanelProvider>
  );
}

function StaffNavList({
  groups,
  pathname,
  onNavigate,
}: {
  groups: PanelNavGroup[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-ilc-navy/50 uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href, groups);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex min-h-11 items-center rounded-md px-3 text-sm transition",
                      active
                        ? "bg-ilc-sand font-medium text-ilc-navy"
                        : "text-ilc-navy/80 hover:bg-ilc-paper",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-1">
          <div className="mx-3 h-3 w-16 rounded bg-ilc-sand" />
          <div className="h-11 rounded-md bg-ilc-paper" />
          <div className="h-11 rounded-md bg-ilc-paper" />
        </div>
      ))}
    </div>
  );
}

function NoAccess() {
  return (
    <div className="rounded-lg border border-ilc-line bg-white p-6 shadow-sm">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">
        Bu sayfaya erişiminiz yok
      </h1>
      <p className="mt-2 text-ilc-navy/70">
        Bu işlem için yetkiniz bulunmuyor. Gerekliyse kurum yöneticinizden rolünüzün güncellenmesini isteyin.
      </p>
      <Link
        href="/staff"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-ilc-teal"
      >
        Panele dön
      </Link>
    </div>
  );
}
