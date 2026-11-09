import { describe, expect, it } from "vitest";

import { VerificationView } from "@/src/features/verification/VerificationView";
import { renderWithProviders, screen } from "@/src/test/renderWithProviders";

describe("VerificationView", () => {
  it("bulunamadı durumunda hiçbir belge alanı göstermez", () => {
    renderWithProviders(<VerificationView body={{ status: "NOT_FOUND" }} />);
    expect(screen.getByText("Bulunamadı")).toBeInTheDocument();
  });

  it("sertifika görünümünde sertifika alanlarını gösterir", () => {
    renderWithProviders(
      <VerificationView
        body={{
          status: "CERTIFICATE",
          certificateCode: "ABCDE12345",
          candidateName: "Ayşe Yılmaz",
          examTitle: "ILC B1",
          cefrLevel: "B1",
          validUntil: null,
          skillBreakdownIncluded: false,
        }}
      />,
    );
    expect(screen.getByText("ABCDE12345")).toBeInTheDocument();
    expect(screen.getByText("Ayşe Yılmaz")).toBeInTheDocument();
    expect(screen.getByText("Geçerli")).toBeInTheDocument();
  });

  it("seviye raporu görünümü 'sertifika değildir' ibaresini gösterir ve sertifika numarası HİÇ render etmez", () => {
    renderWithProviders(
      <VerificationView
        body={{
          status: "LEVEL_REPORT",
          verificationCode: "XYZ999",
          candidateName: "Ayşe Yılmaz",
          examTitle: "ILC B1",
          cefrLevel: "B1",
        }}
      />,
    );
    expect(screen.getByText(/bir sertifika değildir/i)).toBeInTheDocument();
    // F5-11'in kuralı: sertifika numarası/geçerlilik alanı adı sayfada HİÇ geçmez (boş değil, yok).
    expect(screen.queryByText("Sertifika numarası")).not.toBeInTheDocument();
    expect(screen.queryByText("Geçerlilik bitişi")).not.toBeInTheDocument();
  });

  it("iptal edilmiş sertifika için 'bulunamadı' DEMEZ, eski bilgileri gösterir", () => {
    renderWithProviders(
      <VerificationView
        body={{
          status: "REVOKED",
          certificateCode: "ABCDE12345",
          candidateName: "Ayşe Yılmaz",
          examTitle: "ILC B1",
          revocationReason: "Basım hatası",
        }}
      />,
    );
    expect(screen.queryByText("Bulunamadı")).not.toBeInTheDocument();
    expect(screen.getByText("İptal edilmiştir")).toBeInTheDocument();
    expect(screen.getByText("ABCDE12345")).toBeInTheDocument();
  });
  it("R-20: superseded=true seviye raporu 'geçersiz kılındı' der; aday/sınav/seviye alanı HİÇ görünmez (gövdede olsa bile)", () => {
    renderWithProviders(
      <VerificationView
        body={{ status: "LEVEL_REPORT", superseded: true, verificationCode: "OLD1", candidateName: "Ayşe Yılmaz", examTitle: "ILC B1", cefrLevel: "B1", grade: null }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Bu rapor geçersiz kılındı (sonuç yeniden yayınlandı veya iptal edildi).");
    expect(screen.queryByText("Ayşe Yılmaz")).not.toBeInTheDocument();
    expect(screen.queryByText("ILC B1")).not.toBeInTheDocument();
    expect(screen.queryByText("CEFR bandı")).not.toBeInTheDocument();
    expect(screen.queryByText("Sertifika numarası")).not.toBeInTheDocument();
    expect(screen.getByText(/bir sertifika değildir/i)).toBeInTheDocument();
  });

  it("R-20: superseded=false/null/yok → geçerli rapor görünür; null alanlar çökmez", () => {
    for (const superseded of [false, null, undefined]) {
      const { unmount } = renderWithProviders(
        <VerificationView body={{ status: "LEVEL_REPORT", superseded, candidateName: null, examTitle: null, cefrLevel: null, grade: null, integrityLevel: null, assuranceLevel: null, issuedAt: null }} />,
      );
      expect(screen.queryByText(/geçersiz kılındı/)).not.toBeInTheDocument();
      expect(screen.getByText("CEFR bandı")).toBeInTheDocument();
      unmount();
    }
  });
});
