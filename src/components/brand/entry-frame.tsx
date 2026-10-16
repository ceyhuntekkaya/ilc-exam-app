import { cn } from "@/src/lib/utils/cn";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const logoClass = "mx-auto h-auto w-auto max-h-32 max-w-full sm:max-h-40 md:max-h-44";

export function EntryFrame({
  children,
  wide = false,
  footer,
  lang,
  panel,
  logoHref,
}: {
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
  lang?: string;
  panel?: "student";
  logoHref?: string;
}) {
  const logo = (
    <Image
      src="/brand/logo.png"
      alt="İngiliz Kültür Koleji"
      width={375}
      height={175}
      priority
      className={logoClass}
    />
  );

  return (
    <div
      lang={lang}
      data-panel={panel}
      className="relative flex min-h-dvh flex-1 flex-col overflow-x-hidden bg-[#1c1a40] px-4 py-6 sm:px-8 md:py-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(-32deg,transparent_0_16px,rgba(227,12,26,0.1)_16px_18px)]"
      />
      <div className={cn("relative m-auto w-full", wide ? "max-w-2xl" : "max-w-lg")}>
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(8,6,28,0.38)]">
          <div aria-hidden className="h-2 bg-[#e30c1a]" />
          <div className="px-5 pt-7 pb-6 sm:px-8 sm:pt-8 sm:pb-8">
            {logoHref ? (
              <Link href={logoHref} aria-label="İngiliz Kültür Koleji, ana sayfa" className="mx-auto block w-fit rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#333167]">
                {logo}
              </Link>
            ) : (
              logo
            )}
            {children}
          </div>
        </div>
        {footer ? <div className="mt-5 px-2 text-center text-sm text-white/85">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EntryDoor({
  href,
  title,
  detail,
  tone,
}: {
  href: string;
  title: string;
  detail: string;
  tone: "navy" | "crimson";
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center gap-4 rounded-2xl border border-[#333167]/12 bg-[#f6f5fa] px-4 py-4 transition hover:border-[#333167]/28 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#333167] sm:min-h-[5.5rem] sm:px-5"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg leading-tight font-semibold tracking-tight text-[#241f4a]">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-[#3c3960]/80">{detail}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full text-white transition group-hover:translate-x-0.5",
          tone === "navy" ? "bg-[#333167] group-hover:bg-[#282652]" : "bg-[#d01224] group-hover:bg-[#b50e1e]",
        )}
      >
        <svg viewBox="0 0 20 20" className="size-5" fill="none">
          <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

export const entryFieldClass =
  "mt-1.5 min-h-12 w-full rounded-xl border border-[#d7d5e4] bg-[#f7f6fb] px-3.5 text-base text-[#1c1a33] outline-none transition placeholder:text-[#8a87a3] focus:border-[#333167] focus:bg-white focus:ring-4 focus:ring-[#333167]/15";

export const entryButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#333167] px-4 text-base font-semibold text-white transition hover:bg-[#282652] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#333167] disabled:opacity-60 [&>svg]:size-5 [&>svg]:shrink-0";
