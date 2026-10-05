"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { NavGroup } from "@/src/config/panel-nav";
import { useAuth } from "@/src/components/auth-provider";
import { cn } from "@/src/lib/utils/cn";

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  home: "M4 10.5 12 4l8 6.5M6 10v9h12v-9",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  power: "M12 3v9M7.5 6.5a7 7 0 1 0 9 0",
  building: "M4 20h16M6 20V6l6-3 6 3v14M10 20v-5h4v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4 12h2M18 12h2M12 4v2M12 18v2",
  list: "M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01",
};

function iconFor(href: string): string {
  if (href === "/admin") return ICONS.home;
  if (href.includes("compan")) return ICONS.building;
  if (href.includes("system") || href.includes("setting")) return ICONS.settings;
  return ICONS.list;
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(displayName?: string | null, email?: string | null, username?: string | null) {
  const source = displayName?.trim() || email || username || "A";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

export function PanelChrome({
  title,
  groups,
  children,
}: {
  title: string;
  groups: NavGroup[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);

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

  const roleLabel = "Süper yönetici";
  const userName = loading
    ? "…"
    : user?.displayName || user?.email || user?.username || "Admin";
  const homeHref = "/admin";
  const current = groups
    .flatMap((group) => group.items.map((item) => ({ group: group.label, item })))
    .filter(({ item }) => isActive(pathname, item.href))
    .sort((a, b) => b.item.href.length - a.item.href.length)[0];

  return (
    <div data-panel="" className="min-h-dvh overflow-x-clip bg-bg text-fg">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-neutral-950/50 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        id="panel-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col bg-linear-to-b from-neutral-800 to-neutral-900 text-neutral-200 shadow-[1px_0_0_rgb(255_255_255/0.06)] transition-transform duration-300 ease-out lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label={`${title} menüsü`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/8 px-5">
          <Link href={homeHref} className="flex min-w-0 items-center gap-2.5" onClick={close}>
            <span className="truncate text-base font-bold tracking-tight text-white">ILC Center</span>
            <span className="rounded-md bg-primary-400/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary-200 uppercase">
              {title}
            </span>
          </Link>
          <button
            type="button"
            onClick={close}
            className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-300 hover:bg-white/8 hover:text-white lg:hidden"
            aria-label="Menüyü kapat"
          >
            <Icon d={ICONS.close} className="size-5" />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-color:var(--color-neutral-600)_transparent] scrollbar-thin">
          {groups.map((group, index) => (
            <div key={group.label} className={index === 0 ? "" : "mt-5"}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = current?.item.href === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group/nav relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-white/10 text-white before:absolute before:inset-y-1.5 before:left-0 before:w-0.75 before:rounded-full before:bg-primary-500"
                            : "text-neutral-300 hover:bg-white/6 hover:text-white",
                        )}
                      >
                        <Icon d={iconFor(item.href)} className={cn("size-4.5 shrink-0", active ? "text-primary-300" : "text-neutral-400 group-hover/nav:text-neutral-200")} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/8 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white" aria-hidden="true">
              {initials(user?.displayName, user?.email, user?.username)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-100">{userName}</p>
              <p className="text-xs text-neutral-400">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-300 hover:bg-danger-500/15 hover:text-danger-300"
              aria-label="Çıkış yap"
              title="Çıkış yap"
            >
              <Icon d={ICONS.power} className="size-4.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:ml-64">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          İçeriğe geç
        </a>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur-lg sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="-ml-2 inline-flex size-10 items-center justify-center rounded-lg text-fg-muted hover:bg-bg hover:text-fg lg:hidden"
              aria-label="Menüyü aç"
              aria-expanded={open}
              aria-controls="panel-sidebar"
            >
              <Icon d={ICONS.menu} className="size-5" />
            </button>
            <p className="flex min-w-0 items-center gap-1.5 text-sm">
              {current && current.group !== current.item.label ? (
                <>
                  <span className="hidden shrink-0 text-fg-subtle sm:inline">{current.group}</span>
                  <span className="hidden text-border-strong sm:inline" aria-hidden="true">
                    /
                  </span>
                </>
              ) : null}
              <span className="truncate font-semibold text-fg">{current?.item.label ?? title}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              className="flex size-9 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700 lg:hidden"
              title={`${userName} · ${roleLabel}`}
              aria-hidden="true"
            >
              {initials(user?.displayName, user?.email, user?.username)}
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 focus:outline-none [&_button:not(:disabled)]:cursor-pointer">
          {children}
        </main>
      </div>
    </div>
  );
}
