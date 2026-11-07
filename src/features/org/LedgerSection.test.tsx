import { fireEvent, renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EntryRow, PackageBalance, PackageConsumption } from "@/src/api/generated/models";

const usePackagesMock = vi.fn();
const useConsumptionMock = vi.fn();
const useEntriesMock = vi.fn();

vi.mock("@/src/api/generated/company-ledger/company-ledger", () => ({
  usePackages: () => usePackagesMock(),
  useConsumption: () => useConsumptionMock(),
  useEntries: () => useEntriesMock(),
  getPackagesQueryKey: () => ["/my-company/ledger/packages"],
  getConsumptionQueryKey: () => ["/my-company/ledger/consumption"],
}));

const { LedgerSection } = await import("./LedgerSection");

const PACKAGES: PackageBalance[] = [
  {
    packageId: "pkg-1",
    skuId: "sku-aaa111",
    scope: "COMPANY",
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
    quota: 100,
    status: "ACTIVE",
    totalBalance: 100,
    availableBalance: 40,
  },
];

const CONSUMPTION: PackageConsumption[] = [
  {
    packageId: "pkg-2",
    companyId: "company-1",
    skuId: "sku-bbb222",
    scope: "COMPANY",
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
    quota: 50,
    status: "ACTIVE",
    availableBalance: 10,
    consumedCount: 77,
  },
];

describe("LedgerSection", () => {
  afterEach(() => {
    usePackagesMock.mockReset();
    useConsumptionMock.mockReset();
    useEntriesMock.mockReset();
  });

  it("paket bakiyesini ve tüketilen sayısını defterden okunduğu gibi gösterir", () => {
    usePackagesMock.mockReturnValue({ data: { data: PACKAGES }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useConsumptionMock.mockReturnValue({ data: { data: CONSUMPTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useEntriesMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<LedgerSection companyId="company-1" />);

    expect(screen.getByText("sku-aaa1…")).toBeInTheDocument();
    // Kabul kriteri: tüketim raporu `consumedCount`'u doğrudan gösterir, yeniden hesaplamaz.
    expect(screen.getByText("77")).toBeInTheDocument();
  });

  it("boş paket listesinde boş durumu gösterir", () => {
    usePackagesMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useConsumptionMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useEntriesMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<LedgerSection companyId="company-1" />);

    expect(screen.getByText("Henüz kota paketi yok")).toBeInTheDocument();
    expect(screen.getByText("Tüketim raporu boş")).toBeInTheDocument();
  });

  it("paket seçilince o paketin defter hareketlerini listeler", () => {
    usePackagesMock.mockReturnValue({ data: { data: PACKAGES }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useConsumptionMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    const entries: EntryRow[] = [
      { id: "e-1", type: "CONSUMED", amount: 1, reference: "application-9", createdAt: "2026-02-01T10:00:00Z", createdBy: "user-1" },
    ];
    useEntriesMock.mockReturnValue({ data: { data: entries }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<LedgerSection companyId="company-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Hareketler" }));

    expect(screen.getByText("CONSUMED")).toBeInTheDocument();
    expect(screen.getByText("application-9")).toBeInTheDocument();
  });
});
