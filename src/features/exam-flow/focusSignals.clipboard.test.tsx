import { renderWithProviders } from "@/src/test/renderWithProviders";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enqueueEventMock = vi.fn();
vi.mock("@/src/features/exam-flow/eventQueue", () => ({ enqueueEvent: enqueueEventMock }));

const { useExamFocusSignals } = await import("./focusSignals");

/**
 * F3-15/Kural: "önlem engel değil, kayıttır." Kopyalama/yapıştırma hiçbir koşulda
 * preventDefault() edilmez (erişilebilirlik araçları panoyu kullanır) — bu testler yalnız
 * olayın KAYDEDİLDİĞİNİ kanıtlar, tarayıcının panoyu engellediğini DEĞİL.
 */
function Harness() {
  useExamFocusSignals({ applicationId: "app-1", inSection: true, active: true, blockShortcuts: true });
  return <div>sınav ekranı</div>;
}

describe("focusSignals — pano olayları", () => {
  beforeEach(() => {
    enqueueEventMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records a copy without preventing the native clipboard action", async () => {
    renderWithProviders(<Harness />);

    const event = new Event("copy", { bubbles: true, cancelable: true });
    const prevented = await act(async () => !document.dispatchEvent(event));

    expect(enqueueEventMock).toHaveBeenCalledWith("app-1", "CLIPBOARD_COPY");
    expect(prevented).toBe(false);
  });

  it("records a paste without preventing the native clipboard action", async () => {
    renderWithProviders(<Harness />);

    const event = new Event("paste", { bubbles: true, cancelable: true });
    const prevented = await act(async () => !document.dispatchEvent(event));

    expect(enqueueEventMock).toHaveBeenCalledWith("app-1", "CLIPBOARD_PASTE");
    expect(prevented).toBe(false);
  });

  it("does not record clipboard events once the exam is no longer active", async () => {
    function InactiveHarness() {
      useExamFocusSignals({ applicationId: "app-1", inSection: true, active: false, blockShortcuts: true });
      return <div>bitti</div>;
    }
    renderWithProviders(<InactiveHarness />);

    document.dispatchEvent(new Event("copy", { bubbles: true, cancelable: true }));

    expect(enqueueEventMock).not.toHaveBeenCalledWith("app-1", "CLIPBOARD_COPY");
  });
});
