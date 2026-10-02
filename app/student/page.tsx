"use client";

import { useAuth } from "@/src/components/auth-provider";

export default function StudentHomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ilc-line">
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold">
          Bugün
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ilc-navy/75">
          Yaklaşan sınavların ve sonuçlarının listesi burada görünecek. Şimdilik
          oturumun hazır.
        </p>
        <p className="mt-4 text-sm text-ilc-navy/60">
          {loading
            ? "Yükleniyor…"
            : user?.displayName || user?.username || "Öğrenci"}
        </p>
      </section>
      <section className="rounded-3xl bg-ilc-ink p-6 text-white shadow-sm">
        <p className="text-xs tracking-[0.15em] text-white/60 uppercase">İpucu</p>
        <p className="mt-2 font-[family-name:var(--font-fraunces)] text-lg">
          Sınava girmeden önce cihazını ve bağlantını kontrol et.
        </p>
      </section>
    </div>
  );
}
