import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getCompanyAiSettings: vi.fn(async (): Promise<Record<string, unknown>> => ({ sttLanguage: "tr" })),
  saveCompanyAiSettings: vi.fn(async (_id: string, body: Record<string, unknown>) => body),
}));
vi.mock("@/src/features/admin/companyAiApi", () => api);

const { CompanyAiSection, OPENAI_KVKK_WARNING, EXAM_LANGUAGE_LABEL } = await import("./CompanyAiSection");

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

  it("dil boşsa 'Sınavın dilini kullan' seçili gelir ve kayıtta dil gönderilmez (eskiden sessizce 'tr' yazılıyordu)", async () => {
    api.getCompanyAiSettings.mockResolvedValueOnce({ sttBaseUrl: "https://stt.example.com" });
    renderWithProviders(<CompanyAiSection companyId="co-2" />);
    const select = (await screen.findByLabelText("Dil")) as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(screen.getByRole("option", { name: EXAM_LANGUAGE_LABEL })).toBeInTheDocument();
    fireEvent.submit(select.closest("form")!);
    await waitFor(() => expect(api.saveCompanyAiSettings).toHaveBeenCalled());
    expect(api.saveCompanyAiSettings.mock.calls.at(-1)?.[1].sttLanguage).toBeUndefined();
  });
});
