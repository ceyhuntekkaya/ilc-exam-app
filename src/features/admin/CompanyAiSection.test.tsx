import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/features/admin/companyAiApi", () => ({
  getCompanyAiSettings: vi.fn(async () => ({ sttLanguage: "tr" })),
  saveCompanyAiSettings: vi.fn(),
}));

const { CompanyAiSection, OPENAI_KVKK_WARNING } = await import("./CompanyAiSection");

describe("CompanyAiSection (R-30)", () => {
  it("merkez ekranında KVKK uyarısı sabit metinle görünür; 'Merkez ayarı kullanılıyor' görünmez", async () => {
    renderWithProviders(<CompanyAiSection companyId="hq" central />);
    expect(await screen.findByTestId("kvkk-warning")).toHaveTextContent(
      "OpenAI seçilirse aday cevapları yurt dışındaki sağlayıcıya gönderilir. Hukuk onayı olmadan canlıda seçmeyin (K-H08).",
    );
    expect(OPENAI_KVKK_WARNING).toContain("K-H08");
    expect(screen.queryByText("Merkez ayarı kullanılıyor")).toBeNull();
  });

  it("kurum ekranında ayar boşsa 'Merkez ayarı kullanılıyor' yazar", async () => {
    renderWithProviders(<CompanyAiSection companyId="co-1" />);
    expect(await screen.findByText("Merkez ayarı kullanılıyor")).toBeInTheDocument();
    expect(screen.queryByTestId("kvkk-warning")).toBeNull();
  });
});
