import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadReportCardsPdf } from "./downloadReportCardsPdf";

describe("downloadReportCardsPdf (pilot)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("toplu karneyi Türkçe ister (locale=tr); dil verilmezse sunucu İngilizce basıyordu", async () => {
    // jsdom'un Blob'unda `stream()` yok; `new Response(blob)` CI'da patlıyordu. İndirme yalnız
    // `ok` ve `blob()` okuduğundan asgari bir yanıt taklidi yeterli.
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      blob: async () => new Blob(["%PDF-1.7"]),
    }));
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });

    await downloadReportCardsPdf("c1", { instituteId: "i1", academicYearId: "y1", examVersionId: "e1", branchId: "b1" });

    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/report/companies/c1/report-cards/pdf?");
    expect(new URL(url, "http://x").searchParams.get("locale")).toBe("tr");
    expect(new URL(url, "http://x").searchParams.get("branchId")).toBe("b1");
  });
});
