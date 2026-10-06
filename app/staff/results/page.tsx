import { ComingSoonPage } from "@/src/features/staff/ComingSoonPage";

export default function StaffResultsPage() {
  return (
    <ComingSoonPage
      title="Sınav sonuçları"
      description="Yayınlanan sınav sonuçlarını öğrenci, sınıf ve kampüs bazında burada takip edebileceksiniz."
      fallback={{ href: "/staff/reports", label: "Raporlara git" }}
    />
  );
}
