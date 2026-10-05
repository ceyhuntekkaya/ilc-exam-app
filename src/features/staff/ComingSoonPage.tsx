export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-ilc-line bg-white p-6 shadow-sm">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">
        {title}
      </h1>
      <p className="mt-2 max-w-xl text-ilc-navy/70">{description}</p>
      <p className="mt-4 inline-flex min-h-11 items-center rounded-md bg-ilc-paper px-3 text-sm text-ilc-navy/60">
        Bu ekran yakında açılacak.
      </p>
    </div>
  );
}
