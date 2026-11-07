import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InstitutionDeclarationRow } from "@/src/api/generated/models";

const declareMock = vi.fn();
const useListDeclarationsMock = vi.fn();

vi.mock("@/src/api/generated/consent-administration/consent-administration", () => ({
  useListDeclarations: () => useListDeclarationsMock(),
  useDeclare: () => ({ mutateAsync: declareMock, isPending: false }),
  getListDeclarationsQueryKey: () => ["/my-company/institution-declarations"],
}));

const { InstitutionDeclarationSection } = await import("./InstitutionDeclarationSection");

const ROWS: InstitutionDeclarationRow[] = [
  {
    id: "decl-1",
    companyId: "company-1",
    scope: ["MEDIA_RECORDING", "DATA_PROCESSING"],
    declaredBy: "Müdür Ayşe",
    documentRef: "Sözleşme eki no: 2025-11",
    declaredAt: "2025-11-01T10:00:00Z",
  },
];

describe("InstitutionDeclarationSection", () => {
  afterEach(() => {
    declareMock.mockReset();
    useListDeclarationsMock.mockReset();
  });

  it("mevcut beyanları Türkçe kapsam etiketleriyle listeler", () => {
    useListDeclarationsMock.mockReturnValue({
      data: { data: ROWS },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<InstitutionDeclarationSection companyId="company-1" />);

    expect(screen.getByText("Görüntü/ses kaydı, Veri işleme")).toBeInTheDocument();
    expect(screen.getByText("Sözleşme eki no: 2025-11")).toBeInTheDocument();
    expect(screen.getByText("Müdür Ayşe")).toBeInTheDocument();
  });

  it("seçili kapsamı ConsentType dizisi olarak ve belge referansıyla declare mutasyonuna gönderir", async () => {
    useListDeclarationsMock.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    declareMock.mockResolvedValue({ data: {} });
    renderWithProviders(<InstitutionDeclarationSection companyId="company-1" />);

    fireEvent.click(screen.getByLabelText("Görüntü/ses kaydı"));
    fireEvent.click(screen.getByLabelText("Demografik veri (örn. ana dil)"));
    fireEvent.change(screen.getByPlaceholderText("Sözleşme eki no: 2026-XX"), {
      target: { value: "Sözleşme eki no: 2026-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Beyanı kaydet" }));

    await waitFor(() => {
      expect(declareMock).toHaveBeenCalledWith({
        data: { scope: ["MEDIA_RECORDING", "DEMOGRAPHIC_DATA"], documentRef: "Sözleşme eki no: 2026-01" },
      });
    });
  });

  it("kapsam seçilmeden gönderilirse mutasyon çağrılmaz ve hata gösterilir", async () => {
    useListDeclarationsMock.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<InstitutionDeclarationSection companyId="company-1" />);

    fireEvent.change(screen.getByPlaceholderText("Sözleşme eki no: 2026-XX"), {
      target: { value: "Sözleşme eki no: 2026-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Beyanı kaydet" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("En az bir rıza türü seçin.");
    });
    expect(declareMock).not.toHaveBeenCalled();
  });
});
