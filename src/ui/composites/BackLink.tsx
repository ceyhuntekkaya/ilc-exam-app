import Link from "next/link";

/** Sayfanın en üstünde üst listeye dönüş linki ("← Satıcılar"); detay ve form sayfalarında aynı görünüm. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-fg-muted transition-colors hover:text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}
