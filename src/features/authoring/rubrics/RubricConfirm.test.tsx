import { fireEvent, renderWithProviders, screen, within } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import { RubricConfirm } from "@/src/features/authoring/rubrics/RubricEditor";

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

function renderConfirm(action: "approve" | "remove" | null, extra: Partial<{ retired: boolean; unsaved: boolean }> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <RubricConfirm
      action={action}
      name="APEX A2 Writing W1"
      code="APEX_A2_W1"
      retired={extra.retired ?? false}
      unsaved={extra.unsaved ?? false}
      pending={false}
      onClose={onClose}
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm, onClose };
}

describe("RubricConfirm", () => {
  it("approve asks in an in-app modal (not window.confirm) and says the version becomes read-only", () => {
    const browserConfirm = vi.spyOn(window, "confirm");
    const { onConfirm } = renderConfirm("approve", { unsaved: true });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Rubriği onayla")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("“APEX A2 Writing W1” (APEX_A2_W1)");
    expect(dialog).toHaveTextContent("değiştirilemez");
    expect(dialog).toHaveTextContent("Kaydedilmemiş madde değişiklikleri önce kaydedilir");

    fireEvent.click(within(dialog).getByRole("button", { name: "Onayla" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(browserConfirm).not.toHaveBeenCalled();
    browserConfirm.mockRestore();
  });

  it("removal distinguishes deleting a draft from retiring an approved rubric", () => {
    renderConfirm("remove");
    expect(screen.getByRole("dialog")).toHaveTextContent("geri alınamaz");
    expect(screen.getByRole("button", { name: "Sil" })).toBeInTheDocument();
  });

  it("retiring keeps questions that already use the rubric", () => {
    renderConfirm("remove", { retired: true });
    expect(screen.getByRole("dialog")).toHaveTextContent("kullanan sorular etkilenmez");
    expect(screen.getByRole("button", { name: "Emekliye ayır" })).toBeInTheDocument();
  });

  it("stays closed without an action", () => {
    renderConfirm(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
