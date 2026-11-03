import { ExamSessionProvider } from "@/src/features/exam-player/session/ExamSessionContext";
import { dropAnswerOutbox, getAnswerOutbox } from "@/src/features/exam-player/session/answerOutbox";
import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { InteractionRenderer } from "@/src/features/exam-player/interactions/InteractionRenderer";

/**
 * F3-00 referans testi 1: bir MULTIPLE_CHOICE maddesi render edilir, seçenek tıklanır,
 * `answerOutbox`'a doğru yanıt düşer. `useAnswerSync` → `ExamSessionContext.saveAnswer` →
 * (burada) GERÇEK `AnswerOutbox.put` — mock değil, asıl üretim kodunun tükettiği aynı sınıf.
 */
describe("MULTIPLE_CHOICE render + answerOutbox", () => {
  const applicationId = "app-1";
  const itemId = "part-1";

  afterEach(() => {
    dropAnswerOutbox(applicationId);
  });

  it("writes the clicked option into the real answer outbox", async () => {
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
        <InteractionRenderer
          type="MULTIPLE_CHOICE"
          itemId={itemId}
          interaction={{
            options: [
              { id: "opt-paris", text: "Paris" },
              { id: "opt-lyon", text: "Lyon" },
            ],
          }}
        />
      </ExamSessionProvider>,
    );

    await userEvent.click(screen.getByText("Paris"));

    expect(outbox.getAnswer(itemId)).toEqual({ optionId: "opt-paris" });
  });
});
