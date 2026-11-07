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
});
