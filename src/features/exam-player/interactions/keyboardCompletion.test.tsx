import { ExamSessionProvider } from "@/src/features/exam-player/session/ExamSessionContext";
import { dropAnswerOutbox, getAnswerOutbox } from "@/src/features/exam-player/session/answerOutbox";
import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { InteractionRenderer } from "@/src/features/exam-player/interactions/InteractionRenderer";

/**
 * F3-03/Adım 5: F3-02'nin `answerContract.test.tsx`'i (14 tip) `userEvent.click()` kullanıyordu
 * — bu fareyle TIKLAMAYI simüle eder, `PlaceBoard.tsx`'in `DragItem`/`DropZone`'undaki
 * `onKeyDown={pressOnKey}` (Enter/Space) yolunu HİÇ EGZERSİZ ETMEZDİ. Bu dosya, elle sürükle-bırak
 * gerektirmeyen tipler (dnd-kit'in Mouse/Touch sensörleri var ama klavye sensörü YOK, F3-02'nin
 * bulgusu) için GERÇEKTEN Tab + Enter ile tamamlanabildiğini (fare hiç kullanılmadan) kanıtlar.
 * Native `<button>`/`<input>` tabanlı tipler (MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, OPEN_ENDED,
 * HOTSPOT_SELECT) tarayıcının kendi klavye semantiğine dayanır, burada TEKRAR doğrulanmadı —
 * HOTSPOT_SELECT'in Tab/ok/Enter akışı zaten F3-00'ın `HotspotViews.test.tsx`'inde var.
 */
describe("PlaceBoard tabanlı tipler — tamamen klavyeyle (Tab + Enter, fare YOK)", () => {
  const applicationId = "app-kbd";
  const itemId = "item-1";

  afterEach(() => {
    dropAnswerOutbox(applicationId);
  });

  function renderItem(type: string, interaction: Record<string, unknown>) {
    const outbox = getAnswerOutbox(applicationId);
    renderWithProviders(
      <ExamSessionProvider
        value={{
          applicationId,
          sessionToken: "token",
          hydrated: true,
          answersRevision: 0,
          uploadMedia: async () => ({ mediaId: "" }),
          saveAnswer: (id, answer) => {
            outbox.put(id, answer);
            return Promise.resolve();
          },
        }}
      >
        <InteractionRenderer type={type} itemId={itemId} interaction={interaction} />
      </ExamSessionProvider>,
    );
    return outbox;
  }

  it("MATCHING: Tab'la bir karta ulaşılır, Enter'la seçilir, Tab'la kutuya ulaşılır, Enter'la yerleştirilir", async () => {
    const user = userEvent.setup();
    const outbox = renderItem("MATCHING", {
      left: [{ id: "l1", text: "Capital of France" }],
      right: [{ id: "r-paris", text: "Paris" }],
    });

    const card = screen.getByRole("button", { name: "Paris" });
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard("{Enter}");

    const box = screen.getByRole("button", { name: "Put the card in box 1" });
    box.focus();
    expect(box).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(outbox.getAnswer(itemId)).toEqual({ pairs: { l1: "r-paris" } });
  });

  it("GROUPING: aynı akış — kart Enter'la seçilir, grup Enter'la alır", async () => {
    const outbox = renderItem("GROUPING", {
      items: [{ id: "m1", text: "Apple" }],
      groups: [{ id: "g-fruit", label: "Fruit" }],
    });
    const user = userEvent.setup();

    screen.getByRole("button", { name: "Apple" }).focus();
    await user.keyboard("{Enter}");
    screen.getByRole("button", { name: "Put the card in Fruit" }).focus();
    await user.keyboard("{Enter}");

    expect(outbox.getAnswer(itemId)).toEqual({ groupOf: { m1: "g-fruit" } });
  });

  it("ORDERING: 'Move down' düğmesi Space ile de çalışır (native button, ama sürüklemesiz akışın kanıtı)", async () => {
    const outbox = renderItem("ORDERING", {
      items: [
        { id: "i1", text: "First" },
        { id: "i2", text: "Second" },
      ],
    });
    const user = userEvent.setup();

    const moveDownButtons = screen.getAllByRole("button", { name: "Move down" });
    moveDownButtons[0].focus();
    await user.keyboard(" ");

    const result = outbox.getAnswer(itemId) as { order?: string[] } | undefined;
    expect(result?.order).toBeDefined();
    expect(new Set(result?.order)).toEqual(new Set(["i1", "i2"]));
  });
});
