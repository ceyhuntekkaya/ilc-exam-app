import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const catalogState = vi.fn();
const myOrdersState = vi.fn();
const detailState = vi.fn();
const createOrderMock = vi.fn();
const cancelMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/src/api/generated/individual-catalog/individual-catalog", () => ({
  useCatalog: () => catalogState(),
}));
vi.mock("@/src/api/generated/payment/payment", () => ({
  useCreateOrder: () => ({ mutateAsync: createOrderMock, isPending: false }),
  useCancel: () => ({ mutateAsync: cancelMock, isPending: false }),
  useMyOrders: () => myOrdersState(),
  useDetail1: () => detailState(),
  getMyOrdersQueryKey: () => ["/payment/orders/mine"],
  getDetail1QueryKey: (id: string) => [`/payment/orders/${id}`],
}));

const { CatalogView } = await import("./CatalogView");
const { OrdersView } = await import("./OrdersView");
const { CheckoutView } = await import("./CheckoutView");

const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  catalogState.mockReset();
  myOrdersState.mockReset();
  detailState.mockReset();
});

describe("CatalogView", () => {
  it("katalog boşsa hata değil boş durum gösterir", () => {
    catalogState.mockReturnValue(ok([]));
    renderWithProviders(<CatalogView />);
    expect(screen.getByText("Şu anda satışta ürün yok")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ürünü listeler, satın alınca siparişi oluşturup ödeme ekranına yönlendirir", async () => {
    catalogState.mockReturnValue(ok([{ skuId: "sku-1", name: "Seviye Tespit", examPurpose: "PLACEMENT", minLevel: "A1", maxLevel: "B2", outputType: "LEVEL_REPORT", price: 450, currency: "TRY" }]));
    createOrderMock.mockResolvedValue({ data: { order: { id: "ord-9" }, instructions: {} } });
    renderWithProviders(<CatalogView />);
    expect(screen.getByText("Seviye Tespit")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Satın al" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/shop/orders/ord-9"));
    expect(createOrderMock).toHaveBeenCalledWith({ data: { skuId: "sku-1" } });
  });

  it("409 mesajını olduğu gibi gösterir ve yönlendirmez", async () => {
    catalogState.mockReturnValue(ok([{ skuId: "sku-1", name: "Ürün", price: 10, currency: "TRY" }]));
    createOrderMock.mockRejectedValue(Object.assign(new Error("Önceki ödemenizin hakkı henüz tanımlanmadı"), { status: 409 }));
    renderWithProviders(<CatalogView />);
    fireEvent.click(screen.getByRole("button", { name: "Satın al" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Önceki ödemenizin hakkı henüz tanımlanmadı"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("yükleme hatasında yeniden dene sunar", () => {
    catalogState.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: Object.assign(new Error("x"), { status: 500 }), refetch: vi.fn() });
    renderWithProviders(<CatalogView />);
    expect(screen.getByRole("button", { name: "Yeniden dene" })).toBeInTheDocument();
  });
});

describe("OrdersView", () => {
  const rows = [
    { id: "o1", skuName: "Seviye Tespit", price: 450, currency: "TRY", referenceCode: "ILC-AAA", status: "CREATED", entitlementStatus: "NONE", createdAt: "2026-11-09T10:00:00Z" },
    { id: "o2", skuName: "Alıştırma", price: 100, currency: "TRY", referenceCode: "ILC-BBB", status: "APPROVED", entitlementStatus: "PENDING", createdAt: "2026-11-08T10:00:00Z" },
  ];

  it("boşsa kataloğa yönlendiren boş durum gösterir", () => {
    myOrdersState.mockReturnValue(ok([]));
    renderWithProviders(<OrdersView />);
    expect(screen.getByText("Henüz siparişiniz yok")).toBeInTheDocument();
  });

  it("durum ve hak rozetlerini gösterir; yalnız ödeme bekleyende Öde/İptal çıkar", () => {
    myOrdersState.mockReturnValue(ok(rows));
    renderWithProviders(<OrdersView />);
    expect(screen.getByText("Ödeme bekleniyor")).toBeInTheDocument();
    expect(screen.getByText("Ödeme onaylandı")).toBeInTheDocument();
    expect(screen.getByText("Hakkınız hazırlanıyor")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Öde" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "İptal et" })).toHaveLength(1);
  });

  it("iptali onay sonrası gönderir", async () => {
    myOrdersState.mockReturnValue(ok(rows));
    cancelMock.mockResolvedValue({ data: {} });
    renderWithProviders(<OrdersView />);
    fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
    fireEvent.click(screen.getByRole("button", { name: "Evet, iptal et" }));
    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith({ id: "o1", data: { reason: "Aday iptal etti" } }));
  });
});

describe("CheckoutView", () => {
  const order = {
    id: "o1",
    skuName: "Seviye Tespit",
    price: 450,
    currency: "TRY",
    referenceCode: "ILC-4F7Q-2K",
    status: "CREATED",
    entitlementStatus: "NONE",
    instructions: {
      providerCode: "MANUAL_TRANSFER",
      details: { iban: "TR330006100519786457841326", accountHolder: "ILC Eğitim A.Ş.", bankName: "Örnek Banka", referenceCode: "ILC-4F7Q-2K", amount: "450.00", currency: "TRY" },
    },
  };

  it("havale talimatını ve referans kodunu gösterir", () => {
    detailState.mockReturnValue(ok(order));
    renderWithProviders(<CheckoutView orderId="o1" />);
    expect(screen.getByLabelText("Referans kodu")).toHaveTextContent("ILC-4F7Q-2K");
    expect(screen.getByText("TR33 0006 1005 1978 6457 8413 26")).toBeInTheDocument();
    expect(screen.getByText("ILC Eğitim A.Ş.")).toBeInTheDocument();
    expect(screen.getByText("Örnek Banka")).toBeInTheDocument();
  });

  it("IBAN tanımsızsa talimat yerine bilgilendirme gösterir", () => {
    detailState.mockReturnValue(ok({ ...order, instructions: { providerCode: "MANUAL_TRANSFER", details: { iban: "", accountHolder: "", bankName: "", referenceCode: "ILC-4F7Q-2K" } } }));
    renderWithProviders(<CheckoutView orderId="o1" />);
    expect(screen.getByText(/Havale bilgileri şu an görüntülenemiyor/)).toBeInTheDocument();
  });

  it("süresi dolmuş siparişte havale bilgisini göstermez", () => {
    detailState.mockReturnValue(ok({ ...order, status: "EXPIRED" }));
    renderWithProviders(<CheckoutView orderId="o1" />);
    expect(screen.getByText(/süresi doldu/)).toBeInTheDocument();
    expect(screen.queryByText("TR33 0006 1005 1978 6457 8413 26")).not.toBeInTheDocument();
  });

  it("onaylı siparişte hak hazırlanıyor notunu gösterir", () => {
    detailState.mockReturnValue(ok({ ...order, status: "APPROVED", entitlementStatus: "PENDING", instructions: undefined }));
    renderWithProviders(<CheckoutView orderId="o1" />);
    expect(screen.getByText(/Hakkınız hazırlanıyor/)).toBeInTheDocument();
  });
});
