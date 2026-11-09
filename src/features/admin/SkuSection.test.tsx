import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BundleDto } from "@/src/api/generated/models";

const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/src/api/generated/product-sku-catalog/product-sku-catalog", () => ({
  useList: () => ({ data: { data: [] }, isLoading: false, isError: false }),
  useCreate: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdate: () => ({ mutateAsync: updateMock, isPending: false }),
  useActivate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRetire: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getListQueryKey: () => ["/skus"],
}));
vi.mock("@/src/api/generated/policy-bundles/policy-bundles", () => ({
  useList3: () => ({ data: { data: [] } }),
}));
vi.mock("@/src/api/generated/authoring-dictionaries/authoring-dictionaries", () => ({
  useListAgeBands: () => ({ data: { data: [] } }),
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

// Admin Select'in açık listesi aktif satırı kaydırır; jsdom `scrollIntoView` uygulamaz.
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const { SkuFormDialog } = await import("./SkuSection");

const PLACEMENT: BundleDto = { id: "aaaaaaaa-1", examPurpose: "PLACEMENT", values: { CERTIFICATE_ENABLED: "false" } };
const CERTIFICATION: BundleDto = { id: "bbbbbbbb-2", examPurpose: "CERTIFICATION", values: { CERTIFICATE_ENABLED: "true" } };

function renderDialog() {
  return renderWithProviders(<SkuFormDialog sku={null} bundles={[PLACEMENT, CERTIFICATION]} ageBands={[]} onClose={vi.fn()} />);
}

/** FormDialog admin görünümündedir: Select, buton + liste kutusu olarak çizilir (gizli native select etiketsiz). */
function pick(field: string | RegExp, option: string | RegExp) {
  fireEvent.click(screen.getByLabelText(field));
  fireEvent.mouseDown(screen.getByRole("option", { name: option }));
}

function openList(field: string | RegExp) {
  fireEvent.click(screen.getByLabelText(field));
}

function fillBasics() {
  fireEvent.change(screen.getByLabelText(/^Kod/), { target: { value: "SKU-1" } });
  fireEvent.change(screen.getByLabelText(/^Ad/), { target: { value: "Ürün" } });
}

describe("SkuFormDialog", () => {
  afterEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
  });

  it("sertifika kapısı kapalı demette CERTIFICATE çıktısı seçilemez; açık demette seçilebilir", () => {
    renderDialog();
    openList("Çıktı türü");
    expect(screen.getByRole("option", { name: "Sertifika" })).toHaveAttribute("aria-disabled", "true"); // demet henüz seçilmedi

    pick(/Politika demeti/, /^Seviye tespit/);
    openList("Çıktı türü");
    expect(screen.getByRole("option", { name: "Sertifika" })).toHaveAttribute("aria-disabled", "true");

    pick(/Politika demeti/, /^Sertifikasyon/);
    openList("Çıktı türü");
    expect(screen.getByRole("option", { name: "Sertifika" })).not.toHaveAttribute("aria-disabled");
  });

  it("CERTIFICATE seçiliyken kapalı demete geçilirse çıktı seviye raporuna döner", () => {
    renderDialog();
    pick(/Politika demeti/, /^Sertifikasyon/);
    pick("Çıktı türü", "Sertifika");
    expect(screen.getByLabelText("Çıktı türü")).toHaveTextContent("Sertifika");
    pick(/Politika demeti/, /^Seviye tespit/);
    expect(screen.getByLabelText("Çıktı türü")).toHaveTextContent("Seviye raporu");
  });

  it("geçerli formu oluşturma isteğine çevirir", async () => {
    createMock.mockResolvedValue({ data: {} });
    renderDialog();
    fillBasics();
    pick(/Politika demeti/, /^Sertifikasyon/);
    pick("Çıktı türü", "Sertifika");
    fireEvent.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0].data).toMatchObject({
      code: "SKU-1",
      name: "Ürün",
      policyBundleId: CERTIFICATION.id,
      outputType: "CERTIFICATE",
    });
  });

  it("sunucu 409 metnini gösterir", async () => {
    createMock.mockRejectedValue(new Error("Sertifika çıktısı için demette CERTIFICATE_ENABLED açık olmalı"));
    renderDialog();
    fillBasics();
    pick(/Politika demeti/, /^Seviye tespit/);
    fireEvent.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("CERTIFICATE_ENABLED açık olmalı");
  });

  it("demet seçilmeden gönderilemez", async () => {
    renderDialog();
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Politika demeti seçilmeli.");
    expect(createMock).not.toHaveBeenCalled();
  });
});
