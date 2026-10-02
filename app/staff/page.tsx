"use client";

import { useAuth } from "@/src/components/auth-provider";

export default function StaffDashboardPage() {
  const { user, loading } = useAuth();

  return (
    <div className="rounded-lg border border-ilc-line bg-white p-6 shadow-sm">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">
        Personel paneli
      </h1>
      <p className="mt-2 text-ilc-navy/70">
        Sınav, öğrenci ve rapor işlemleri bu alanda yer alacak.
      </p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md bg-ilc-paper p-4">
          <dt className="text-xs font-semibold tracking-wide text-ilc-navy/60 uppercase">
            Kullanıcı
          </dt>
          <dd className="mt-1 text-lg font-medium">
            {loading ? "…" : user?.displayName ?? "—"}
          </dd>
        </div>
        <div className="rounded-md bg-ilc-paper p-4">
          <dt className="text-xs font-semibold tracking-wide text-ilc-navy/60 uppercase">
            İzin sayısı
          </dt>
          <dd className="mt-1 text-lg font-medium">
            {user?.permissions?.length ?? 0}
          </dd>
        </div>
      </dl>
    </div>
  );
}
