import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConsentTextRow } from "@/src/api/generated/models";

const addVersionMock = vi.fn();
const useListConsentTextsMock = vi.fn();

vi.mock("@/src/api/generated/consent-administration/consent-administration", () => ({
  useListConsentTexts: () => useListConsentTextsMock(),
  useAddVersion: () => ({ mutateAsync: addVersionMock, isPending: false }),
  getListConsentTextsQueryKey: () => ["/consent-texts"],
}));

const { ConsentTextsSection } = await import("./ConsentTextsSection");

// Sıra TYPE_INFO ile aynı: MEDIA_RECORDING, DATA_PROCESSING, EMPLOYMENT_CONTEXT, DEMOGRAPHIC_DATA.
const ROWS: ConsentTextRow[] = [
  {
    id: "row-1",
    consentType: "MEDIA_RECORDING",
    versions: [
      { id: "v1", versionNo: 1, uiLocale: "tr-TR", body: "Eski metin", effectiveAt: "2025-01-01T00:00:00Z", createdAt: "2025-01-01T00:00:00Z" },
      { id: "v2", versionNo: 2, uiLocale: "tr-TR", body: "Yeni metin", effectiveAt: "2026-01-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z" },
    ],
  },
  { id: "row-2", consentType: "DATA_PROCESSING", versions: [] },
  // Hukuktan metin gelmedi: EMPLOYMENT_CONTEXT bugün bilerek boş (F3B-18 açık maddesi) — hata değil.
  { id: "row-3", consentType: "EMPLOYMENT_CONTEXT", versions: [] },
  { id: "row-4", consentType: "DEMOGRAPHIC_DATA", versions: [] },
];

describe("ConsentTextsSection", () => {
  afterEach(() => {
    addVersionMock.mockReset();
    useListConsentTextsMock.mockReset();
  });

  it("boş metinli tipler için 'Henüz metin tanımlanmadı' gösterir ve sürümleri en yeni üstte listeler", () => {
    useListConsentTextsMock.mockReturnValue({
      data: { data: ROWS },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<ConsentTextsSection />);

    const versionLabels = screen.getAllByText(/^Sürüm \d$/);
    expect(versionLabels[0]).toHaveTextContent("Sürüm 2");
    expect(versionLabels[1]).toHaveTextContent("Sürüm 1");

    // DATA_PROCESSING, EMPLOYMENT_CONTEXT, DEMOGRAPHIC_DATA: üçü de boş.
    expect(screen.getAllByText("Henüz metin tanımlanmadı.")).toHaveLength(3);
  });

  it("yeni sürüm formunu gönderince addVersion doğru ConsentType ve gövdeyle çağrılır", async () => {
    useListConsentTextsMock.mockReturnValue({
      data: { data: ROWS },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    addVersionMock.mockResolvedValue({ data: {} });
    renderWithProviders(<ConsentTextsSection />);

    // 4 kart, aynı placeholder: 4. metin alanı DEMOGRAPHIC_DATA kartına ait (TYPE_INFO sırası).
    const textareas = screen.getAllByPlaceholderText("Rıza metni…");
    expect(textareas).toHaveLength(4);
    fireEvent.change(textareas[3], { target: { value: "  Demografik rıza metni  " } });

    const buttons = screen.getAllByRole("button", { name: "Sürüm ekle" });
    fireEvent.click(buttons[3]);

    await waitFor(() => {
      expect(addVersionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "DEMOGRAPHIC_DATA",
          data: expect.objectContaining({ uiLocale: "tr-TR", body: "Demografik rıza metni" }),
        }),
      );
    });
  });
});
