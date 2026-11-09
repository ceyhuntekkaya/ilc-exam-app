import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const entitlementsState = vi.fn();
const openMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/src/api/generated/individual-attempt/individual-attempt", () => ({
  useEntitlements: () => entitlementsState(),
  useOpen1: () => ({ mutateAsync: openMock, isPending: false }),
  getEntitlementsQueryKey: () => ["/me/individual/entitlements"],
}));

const { EntitlementsView } = await import("./EntitlementsView");

const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, refetch: vi.fn() });
const failed = (error: unknown) => ({ data: undefined, isLoading: false, isError: true, error, refetch: vi.fn() });
const future = new Date(Date.now() + 90 * 86_400_000).toISOString();

afterEach(() => {
  vi.clearAllMocks();
  entitlementsState.mockReset();
});

describe("EntitlementsView", () => {
  it("hak yoksa hata değil boş durum gösterir ve mağazaya yönlendirir", () => {
    entitlementsState.mockReturnValue(ok([]));
    renderWithProviders(<EntitlementsView />);
    expect(screen.getByText("Henüz hakkınız yok")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ürünlere göz at" })).toHaveAttribute("href", "/shop");
  });

  it("denemeyi başlat: open çağrılır ve mevcut öğrenci sınav akışına yönlendirir", async () => {
    entitlementsState.mockReturnValue(ok([{ skuId: "sku-1", skuName: "Seviye Tespit", total: 2, available: 2, validUntil: future }]));
    openMock.mockResolvedValue({ data: { recipientId: "rec-7", created: true } });
    renderWithProviders(<EntitlementsView />);
    fireEvent.click(screen.getByRole("button", { name: "Denemeyi başlat" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/student/exams/rec-7"));
    expect(openMock).toHaveBeenCalledWith({ skuId: "sku-1" });
  });

  it("açık deneme varsa open çağrılmadan doğrudan devam eder", () => {
    entitlementsState.mockReturnValue(ok([{ skuId: "sku-1", skuName: "Seviye Tespit", total: 1, available: 1, validUntil: future, openRecipientId: "rec-3" }]));
    renderWithProviders(<EntitlementsView />);
    fireEvent.click(screen.getByRole("button", { name: "Denemeye devam et" }));
    expect(pushMock).toHaveBeenCalledWith("/student/exams/rec-3");
    expect(openMock).not.toHaveBeenCalled();
  });

  it("409 (sonuç bekleniyor) sunucu mesajıyla gösterilir, yönlendirme olmaz", async () => {
    entitlementsState.mockReturnValue(ok([{ skuId: "sku-1", skuName: "Seviye Tespit", total: 1, available: 1, validUntil: future }]));
    openMock.mockRejectedValue(Object.assign(new Error("Sonuç bekleniyor: önceki denemenizin sonucu yayınlanmadan yeni deneme açılamaz"), { status: 409 }));
    renderWithProviders(<EntitlementsView />);
    fireEvent.click(screen.getByRole("button", { name: "Denemeyi başlat" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Sonuç bekleniyor"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("kullanılmış ve süresi dolmuş hakta başlatma düğmesi yoktur", () => {
    entitlementsState.mockReturnValue(
      ok([
        { skuId: "a", skuName: "Kullanılmış", total: 1, available: 0, validUntil: future },
        { skuId: "b", skuName: "Süresi dolmuş", total: 1, available: 1, validUntil: "2020-01-01T00:00:00Z" },
      ]),
    );
    renderWithProviders(<EntitlementsView />);
    expect(screen.queryByRole("button", { name: /Denemeyi başlat|devam et/ })).not.toBeInTheDocument();
    expect(screen.getByText("Hak kullanıldı")).toBeInTheDocument();
    expect(screen.getByText("Süresi doldu")).toBeInTheDocument();
  });

  it("kurumsal öğrenci (400 Yalnızca bireysel aday) hata ekranı değil açıklama görür", () => {
    entitlementsState.mockReturnValue(failed(Object.assign(new Error("Yalnızca bireysel aday"), { status: 400 })));
    renderWithProviders(<EntitlementsView />);
    expect(screen.getByText("Bu bölüm bireysel adaylar içindir")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("beklenmeyen hatada yeniden dene sunulur", () => {
    entitlementsState.mockReturnValue(failed(Object.assign(new Error("boom"), { status: 500 })));
    renderWithProviders(<EntitlementsView />);
    expect(screen.getByRole("button", { name: "Yeniden dene" })).toBeInTheDocument();
  });
});
