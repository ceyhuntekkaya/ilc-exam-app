import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { useFocusTrap } from "./focusTrap";

/**
 * F3-03/Adım 2: odak tuzağı — `role="alertdialog"`/`aria-modal="true"` taşıyan kutuların
 * (gözetmenin odak uyarısı, bağlantı bekleme ekranı, `KidDialog`) hepsi `aria-modal` sözünü
 * artık tutuyor: Tab arkaya KAÇMIYOR, kapanınca odak nereden geldiyse ORAYA döner.
 */
function Harness() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, open);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button">Background button</button>
      {open ? (
        <div ref={containerRef} role="dialog">
          <button type="button">First</button>
          <button type="button">Second</button>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

describe("useFocusTrap", () => {
  it("moves focus into the container and keeps Tab from escaping to the background", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    // Son öğeden (Close) Tab — arkadaki "Background button"a KAÇMAMALI, ilk öğeye döner.
    await user.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();

    // Shift+Tab ilk öğeden — son öğeye (Close) döner (geriye de kaçmaz).
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("returns focus to the triggering element once the trap deactivates", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const openButton = screen.getByRole("button", { name: "Open" });
    await user.click(openButton);
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(openButton).toHaveFocus();
  });
});
