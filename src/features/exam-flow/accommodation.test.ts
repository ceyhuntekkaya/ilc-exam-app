import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAccommodationPresentationMock = vi.fn();
vi.mock("@/src/features/exam-flow/api", () => ({
  fetchAccommodationPresentation: fetchAccommodationPresentationMock,
}));

const { useAccommodationPresentation } = await import("./accommodation");

/**
 * F3-09/Adım 7: sunum düzenlemeleri — canlı okunur, hiçbir koşulda (yükleniyor/hata/eksik
 * oturum) "etkin" varsayılmaz (fail-safe, fail-open DEĞİL).
 */
describe("useAccommodationPresentation", () => {
  beforeEach(() => {
    fetchAccommodationPresentationMock.mockClear();
  });

  it("defaults to no accommodations while the session is not yet known", () => {
    const { result } = renderHook(() => useAccommodationPresentation(undefined, undefined));

    expect(result.current).toEqual({ screenReader: false, largeFont: false, highContrast: false });
    expect(fetchAccommodationPresentationMock).not.toHaveBeenCalled();
  });

  it("fetches once the session is known and applies the server's result", async () => {
    fetchAccommodationPresentationMock.mockResolvedValue({ screenReader: false, largeFont: true, highContrast: true });

    const { result } = renderHook(() => useAccommodationPresentation("app-1", "token-1"));

    await waitFor(() => expect(result.current.largeFont).toBe(true));
    expect(result.current).toEqual({ screenReader: false, largeFont: true, highContrast: true });
    expect(fetchAccommodationPresentationMock).toHaveBeenCalledWith("app-1", "token-1");
  });

  it("does not refetch when the session identifiers stay the same across rerenders", async () => {
    fetchAccommodationPresentationMock.mockResolvedValue({ screenReader: false, largeFont: true, highContrast: false });

    const { result, rerender } = renderHook(
      ({ applicationId, sessionToken }) => useAccommodationPresentation(applicationId, sessionToken),
      { initialProps: { applicationId: "app-1", sessionToken: "token-1" } },
    );
    await waitFor(() => expect(result.current.largeFont).toBe(true));

    rerender({ applicationId: "app-1", sessionToken: "token-1" });

    expect(fetchAccommodationPresentationMock).toHaveBeenCalledTimes(1);
  });
});
