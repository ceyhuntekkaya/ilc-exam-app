import { describe, expect, it } from "vitest";
import { answerKeyVisible, choicePaint } from "./choiceTone";

describe("concealed report card choices", () => {
  it("paints a correct selection green when the key is hidden", () => {
    const choices = [{ selected: true, correct: false }, { selected: false, correct: false }];
    expect(answerKeyVisible(choices)).toBe(false);
    expect(choicePaint(choices[0], false, "CORRECT")).toBe("success");
    expect(choicePaint(choices[1], false, "CORRECT")).toBe("plain");
  });

  it("keeps a wrong selection red and a partial selection neutral", () => {
    const selected = { selected: true, correct: false };
    expect(choicePaint(selected, false, "WRONG")).toBe("danger");
    expect(choicePaint(selected, false, "PARTIAL")).toBe("plain");
  });

  it("keeps the staff key colors when any choice is marked correct", () => {
    expect(choicePaint({ selected: true, correct: true }, true, "CORRECT")).toBe("success");
    expect(choicePaint({ selected: true, correct: false }, true, "WRONG")).toBe("danger");
    expect(choicePaint({ selected: false, correct: true }, true, "WRONG")).toBe("key");
  });
});
