import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "@/src/features/exam-player/a11y/focusTrap";

const enqueueEventMock = vi.fn();
vi.mock("@/src/features/exam-flow/eventQueue", () => ({ enqueueEvent: enqueueEventMock }));

const { useExamFocusSignals } = await import("./focusSignals");

/**
 * F3-03/Adım 6: "Odak kaybı bütünlük olayıdır... erişilebilirlik için eklenen hiçbir odak
 * hareketi yanlış bütünlük olayı üretmemeli." `useExamFocusSignals`'ın FOCUS_LOST'u
 * `document.hasFocus()`'a (PENCERE düzeyinde) bakarak kararlaştırdığı — sayfa İÇİNDE bir
 * öğeden başka bir öğeye (`useFocusTrap`'in yaptığı gibi) odak taşımanın pencereyi hiç
 * "odaksız" bırakmadığı — burada GERÇEK zamanlayıcılarla (poll + sustain eşiği) kanıtlanıyor.
 */
function Harness() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);
  useExamFocusSignals({ applicationId: "app-1", inSection: true, active: true, blockShortcuts: false });
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open ? (
        <div ref={dialogRef} role="dialog">
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

describe("focusSignals × focusTrap — odak kaybı yanlış tetiklenmez", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    enqueueEventMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opening a focus-trapped dialog (moving focus within the page) never logs FOCUS_LOST", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    // focusSignals 500ms'de bir document.hasFocus() yoklar, 1500ms sürerse FOCUS_LOST sayar —
    // bu pencerenin tamamını geçecek kadar ilerlet.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(enqueueEventMock).not.toHaveBeenCalledWith("app-1", "FOCUS_LOST", expect.anything());
  });

  it("closing the dialog (focus returns to the trigger) also never logs FOCUS_LOST", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(enqueueEventMock).not.toHaveBeenCalledWith("app-1", "FOCUS_LOST", expect.anything());
  });
});
