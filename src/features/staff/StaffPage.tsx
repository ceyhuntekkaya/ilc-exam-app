"use client";

import type { ReactNode } from "react";
import { usePanelCompanyId } from "@/src/features/panel/PanelContext";
import { EmptyState, PageHeader } from "@/src/ui";

/**
 * Staff sayfa çerçevesi: `PageHeader` (admin'deki gibi serif başlık) + içerik.
 * Bölüm tabloları (`SectionTable`) kendi kartını çizer (sekme + araç çubuğu + tablo tek çerçevede),
 * bu yüzden burada ek bir dış kart yok — kart içinde kart olmasın.
 * `bare`: içerik kendi başlığını çiziyorsa (sihirbaz, izleme, değerlendirme) yalnız kurum kimliği kontrolü yapılır.
 */
export function StaffPage({
  title,
  description,
  actions,
  bare = false,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  bare?: boolean;
  children: (companyId: string) => ReactNode;
}) {
  const companyId = usePanelCompanyId();
  const body = companyId ? (
    children(companyId)
  ) : (
    <EmptyState
      tone="warning"
      title="Kurum bilgisi bulunamadı"
      description="Hesabınız bir kuruma bağlı görünmüyor. Çıkış yapıp yeniden girin; sorun sürerse yöneticinize başvurun."
    />
  );

  if (bare) return <>{body}</>;
  return (
    <div>
      {title ? <PageHeader title={title} description={description} actions={actions} /> : null}
      {body}
    </div>
  );
}
