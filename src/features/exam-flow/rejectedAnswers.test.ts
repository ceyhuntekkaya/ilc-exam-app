import { beforeEach, describe, expect, it, vi } from "vitest";

const customInstance = vi.fn();
vi.mock("@/src/api/mutator", () => ({ customInstance: (...args: unknown[]) => customInstance(...args) }));

import { ExamApiError, postState } from "./api";

function rejection(body: Record<string, unknown>) {
  return Object.assign(new Error("Unprocessable"), { status: 422, data: body });
}

describe("close request rejected by the server", () => {
  beforeEach(() => {
    customInstance.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("carries only the rejected question ids so the page can mark them with !", async () => {
    customInstance.mockRejectedValue(
      rejection({
        code: "ANSWERS_NOT_SAVED",
        error: "Bazı cevaplar kaydedilemedi",
        results: [
          { itemId: "q-ok", status: "WRITTEN", code: "" },
          { itemId: "q-audio", status: "REJECTED", code: "INVALID_ANSWER" },
          { itemId: "q-late", status: "REJECTED", code: "ANSWER_LOCKED" },
          { itemId: "", status: "REJECTED", code: "INVALID_ANSWER" },
        ],
      }),
    );
    const err = await postState("/applications/a/sections/s/leave", "token", { answers: [] }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ExamApiError);
    const flow = err as ExamApiError;
    expect(flow.code).toBe("ANSWERS_NOT_SAVED");
    expect(flow.message).toBe("Some answers could not be saved. Please check the questions marked with ! and try again.");
    expect(flow.rejectedItemIds).toEqual(["q-audio", "q-late"]);
  });

  it("has no rejected ids for other errors", async () => {
    customInstance.mockRejectedValue(rejection({ code: "SECTION_CLOSED", error: "kapalı" }));
    const err = (await postState("/applications/a/sections/s/leave", "token").catch((e: unknown) => e)) as ExamApiError;
    expect(err.rejectedItemIds).toBeUndefined();
  });
});
