import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PackageDto, SkuDto } from "@/src/api/generated/models";

const createMock = vi.fn();
const purchaseMock = vi.fn();
let packageRows: PackageDto[] = [];

vi.mock("@/src/api/generated/admin-companies/admin-companies", () => ({
  useList6: () => ({ data: { data: { content: [] } }, isLoading: false, isError: false }),
}));
vi.mock("@/src/api/generated/product-sku-catalog/product-sku-catalog", () => ({
  useList: () => ({
    data: { data: [{ id: "sku-1", code: "PLC-A1", name: "Seviye tespit", status: "ACTIVE" }] },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/src/api/generated/subscription-packages-central/subscription-packages-central", () => ({
  useList7: () => ({ data: { data: packageRows }, isLoading: false, isError: false }),
  useCreate5: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdate3: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePurchase: () => ({ mutateAsync: purchaseMock, isPending: false }),
  useCancel1: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getList7QueryKey: (companyId: string) => [`/commerce/companies/${companyId}/packages`],
}));

// jsdom <dialog> `showModal`/`close`'u uygulamaz — `FormDialog` bunlara dayanıyor.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const { PurchaseDialog, PackageFormDialog, PackagesSection } = await import("./PackagesSection");

const PKG: PackageDto = {
  id: "pkg-1",
  companyId: "co-1",
  skuId: "sku-1",
  scope: "COMPANY",
  quota: 100,
  status: "ACTIVE",
  total: 100,
  available: 40,
};
const SKUS = [
  { id: "sku-1", code: "PLC-A1", name: "Seviye tespit", status: "ACTIVE" },
  { id: "sku-2", code: "OLD-1", name: "Eski ürün", status: "RETIRED" },
] as SkuDto[];

function pick(field: string | RegExp, option: string | RegExp) {
  fireEvent.click(screen.getByLabelText(field));
  fireEvent.mouseDown(screen.getByRole("option", { name: option }));
}

describe("PurchaseDialog", () => {
  afterEach(() => {
    purchaseMock.mockReset();
    createMock.mockReset();
  });

  it("pozitif miktar ve taze idempotencyKey gönderir", async () => {
    purchaseMock.mockResolvedValue({ data: {} });
    renderWithProviders(<PurchaseDialog companyId="co-1" pkg={PKG} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^Miktar/), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText(/^Referans/), { target: { value: "FTR-7" } });
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    await waitFor(() => expect(purchaseMock).toHaveBeenCalledTimes(1));
    const arg = purchaseMock.mock.calls[0][0];
    expect(arg).toMatchObject({ companyId: "co-1", id: "pkg-1", data: { amount: 25, reference: "FTR-7" } });
    expect(arg.data.idempotencyKey).toMatch(/\S+/);
  });

  it("her açılışta farklı idempotencyKey üretir", async () => {
    purchaseMock.mockResolvedValue({ data: {} });
    const keys: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      const view = renderWithProviders(<PurchaseDialog companyId="co-1" pkg={PKG} onClose={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/^Miktar/), { target: { value: "5" } });
      fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
      await waitFor(() => expect(purchaseMock).toHaveBeenCalledTimes(i + 1));
      keys.push(purchaseMock.mock.calls[i][0].data.idempotencyKey);
      view.unmount();
    }
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("sıfır, negatif ya da boş miktarı göndermez", async () => {
    renderWithProviders(<PurchaseDialog companyId="co-1" pkg={PKG} onClose={vi.fn()} />);
    for (const value of ["", "0", "-4"]) {
      fireEvent.change(screen.getByLabelText(/^Miktar/), { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Miktar pozitif bir tam sayı olmalı.");
    }
    expect(purchaseMock).not.toHaveBeenCalled();
  });

  it("sunucu 409 metnini gösterir", async () => {
    purchaseMock.mockRejectedValue(new Error("Yalnız aktif pakete hak eklenebilir"));
    renderWithProviders(<PurchaseDialog companyId="co-1" pkg={PKG} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^Miktar/), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Yalnız aktif pakete hak eklenebilir");
  });
});

describe("PackageFormDialog", () => {
  afterEach(() => {
    createMock.mockReset();
  });

  it("yalnız ACTIVE SKU'ları listeler ve HARD_STOP'ta aşım payı göstermez", () => {
    renderWithProviders(<PackageFormDialog companyId="co-1" pkg={null} skus={SKUS} onClose={vi.fn()} />);
    expect(screen.queryByLabelText(/Aşım payı/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/^Ürün/));
    expect(screen.getByRole("option", { name: /PLC-A1/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /OLD-1/ })).toBeNull();
  });

  it("FLEX seçilince aşım payı çıkar ve istekle gider", async () => {
    createMock.mockResolvedValue({ data: {} });
    renderWithProviders(<PackageFormDialog companyId="co-1" pkg={null} skus={SKUS} onClose={vi.fn()} />);
    pick(/^Ürün/, /PLC-A1/);
    fireEvent.change(screen.getByLabelText(/^Kota/), { target: { value: "200" } });
    pick("Aşım politikası", "Esnek aşım");
    fireEvent.change(screen.getByLabelText(/^Aşım payı/), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Tanımla" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0]).toMatchObject({
      companyId: "co-1",
      data: { skuId: "sku-1", scope: "COMPANY", quota: 200, overagePolicy: "FLEX", flexAllowance: 20 },
    });
  });

  it("sunucu 400 metnini gösterir", async () => {
    createMock.mockRejectedValue(new Error("Bireysel kapsamda paket tanımlanamaz"));
    renderWithProviders(<PackageFormDialog companyId="co-1" pkg={null} skus={SKUS} onClose={vi.fn()} />);
    pick(/^Ürün/, /PLC-A1/);
    fireEvent.change(screen.getByLabelText(/^Kota/), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Tanımla" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Bireysel kapsamda paket tanımlanamaz");
  });

  it("düzenlemede kota salt okunur ve açıklama görünür", () => {
    renderWithProviders(<PackageFormDialog companyId="co-1" pkg={PKG} skus={SKUS} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/^Kota/)).toHaveAttribute("readonly");
    expect(screen.getByText(/Kotayı değiştirmek bakiyeyi değiştirmez/)).toBeInTheDocument();
  });
});

describe("PackagesSection", () => {
  afterEach(() => {
    packageRows = [];
  });

  it("bilgi bandını gösterir; iptal paket listede kalır, eylemi yoktur; bakiye 0 uyarılır", () => {
    packageRows = [
      PKG,
      { ...PKG, id: "pkg-2", available: 0 },
      { ...PKG, id: "pkg-3", status: "CANCELLED" },
    ];
    renderWithProviders(<PackagesSection companyId="co-1" />);
    expect(screen.getByText(/Kurum kendi paketini oluşturamaz/)).toBeInTheDocument();
    expect(screen.getAllByText("PLC-A1")).toHaveLength(3);
    expect(screen.getAllByText("40 / 100 kalan")).toHaveLength(2); // aktif + iptal (bakiye değişmez)
    expect(screen.getByText("Bakiye tükendi")).toBeInTheDocument();
    expect(screen.getByText("Paket aktif değil")).toBeInTheDocument();
    expect(screen.getByText("İptal edildi")).toBeInTheDocument();
    // Hak ekle / İptal et yalnız 2 aktif pakette.
    expect(screen.getAllByRole("button", { name: "Hak ekle" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "İptal et" })).toHaveLength(2);
  });
});
