import { renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { trueFalseFixture } from "@/src/test/fixtures/items";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionView } from "./QuestionView";
import type { QuestionViewModel } from "./types";

const model: QuestionViewModel = {
  stimulus: [],
  instructionAudio: { mediaId: "instruction-1" },
  parts: [{ id: "p1", position: 0, interactionType: "TRUE_FALSE", stem: [], interaction: trueFalseFixture }],
};

/**
 * F3-04/Adım 4: `youngLearnerMode` CSS sınıfını VE yönerge sesinin büyük/otomatik-çalan
 * görünüme (`YoungLearnerInstructionAudio`) geçtiğini doğrular — `MediaAudio`'nun kendisi
 * `YoungLearnerMode.test.tsx`'te ayrıca test edilir, burada yalnız SEÇİM (mod kapalı/açık).
 */
describe("QuestionView young-learner mode", () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to the normal icon instruction button, no young-learner class", () => {
    const { container } = renderWithProviders(<QuestionView model={model} />);

    expect(container.querySelector(".exam-player")).not.toHaveClass("exam-player--young-learner");
    expect(screen.getByRole("button", { name: /listen to the instructions/i })).toBeInTheDocument();
  });

  it("applies the young-learner class and auto-plays the instruction audio via the large button", async () => {
    const { container } = renderWithProviders(<QuestionView model={model} youngLearnerMode />);

    expect(container.querySelector(".exam-player")).toHaveClass("exam-player--young-learner");
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/listening|tap to listen/i)).toBeInTheDocument();
  });
});
