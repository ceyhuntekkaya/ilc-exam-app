import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BulkImportResult } from "@/src/api/generated/models";

const mutateAsyncMock = vi.fn();
vi.mock("@/src/api/generated/bulk-import/bulk-import", () => ({
  useBulkImport: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}));

const { BulkImportSection, buildAccountsCsv } = await import("./BulkImportSection");

const RESULT: BulkImportResult = {
  batchId: "batch-1",
  totalRows: 400,
  successCount: 393,
  errorCount: 7,
  createdAccounts: [
    { rowNumber: 1, username: "ilc000123", initialPassword: "aB3xQ9pL" },
    { rowNumber: 2, username: "ilc000124", initialPassword: "zT7mN2wR" },
  ],
  errors: [{ rowNumber: 5, reason: "soyad eksik", rawRowData: "Ahmet,," }],
};

function csvFile() {
  return new File(["ad,soyad\nAhmet,Yılmaz"], "ogrenciler.csv", { type: "text/csv" });
}

describe("BulkImportSection", () => {
  afterEach(() => {
    mutateAsyncMock.mockReset();
  });

  it("renders the Turkish summary, created-accounts table (with plaintext password) and error table after upload", async () => {
    mutateAsyncMock.mockResolvedValue({ data: RESULT });
    renderWithProviders(<BulkImportSection companyId="company-1" />);

    const fileInput = screen.getByLabelText("CSV dosyası", { selector: "input" });
    fireEvent.change(fileInput, { target: { files: [csvFile()] } });

    fireEvent.click(screen.getByRole("button", { name: "Yükle" }));

    await waitFor(() => {
      expect(screen.getByText("400 satırdan 393'i oluşturuldu, 7'si hatalı.")).toBeInTheDocument();
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "company-1", data: { file: expect.any(File) } }),
    );

    // Oluşturulan hesaplar tablosu: kullanıcı adı + düz metin ilk parola görünür.
    expect(screen.getByText("ilc000123")).toBeInTheDocument();
    expect(screen.getByText("aB3xQ9pL")).toBeInTheDocument();

    // Hatalı satır tablosu: satır no + neden + ham veri.
    expect(screen.getByText("soyad eksik")).toBeInTheDocument();
    expect(screen.getByText("Ahmet,,")).toBeInTheDocument();
  });

  it("shows the upload error message and does not render a result when the mutation rejects", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("network down"));
    renderWithProviders(<BulkImportSection companyId="company-1" />);

    const fileInput = screen.getByLabelText("CSV dosyası", { selector: "input" });
    fireEvent.change(fileInput, { target: { files: [csvFile()] } });
    fireEvent.click(screen.getByRole("button", { name: "Yükle" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.queryByText(/satırdan/)).not.toBeInTheDocument();
  });
});

describe("buildAccountsCsv", () => {
  it("produces a CSV header plus one row per created account, including the plaintext initial password", () => {
    const csv = buildAccountsCsv(RESULT.createdAccounts ?? []);
    expect(csv).toBe(
      ["satir,kullanici_adi,ilk_parola", "1,ilc000123,aB3xQ9pL", "2,ilc000124,zT7mN2wR"].join("\n"),
    );
  });

  it("returns only the header for an empty account list", () => {
    expect(buildAccountsCsv([])).toBe("satir,kullanici_adi,ilk_parola");
  });
});
