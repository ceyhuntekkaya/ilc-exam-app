import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 20%, rgba(15,118,110,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 10%, rgba(196,92,38,0.14), transparent 50%), linear-gradient(165deg, #f7f4ef 0%, #e8e0d4 45%, #d9e5e2 100%)",
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <p className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight text-ilc-ink md:text-3xl">
          ILC
        </p>
        <nav className="flex gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-ilc-navy transition hover:bg-white/50"
          >
            Personel
          </Link>
          <Link
            href="/login/student"
            className="rounded-md bg-ilc-navy px-3 py-2 text-white transition hover:bg-ilc-ink"
          >
            Öğrenci
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-center px-6 pb-20 pt-8 md:px-12">
        <p className="font-[family-name:var(--font-fraunces)] text-5xl leading-[1.05] font-semibold tracking-tight text-ilc-ink md:text-7xl lg:max-w-3xl">
          ILC Center Exams
        </p>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ilc-navy/80 md:text-xl">
          Kurum, personel ve öğrenci için ayrı çalışma alanları. Giriş yaparak
          rolünüze uygun panele geçin.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-ilc-teal px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Personel Girişi
          </Link>
          <Link
            href="/login/student"
            className="inline-flex items-center justify-center rounded-md border border-ilc-ink/20 bg-white/60 px-6 py-3 text-base font-semibold text-ilc-ink backdrop-blur transition hover:bg-white"
          >
            Öğrenci Girişi
          </Link>
        </div>
      </main>
    </div>
  );
}
