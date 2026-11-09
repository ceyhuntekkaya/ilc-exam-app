import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { describeQuestionViolation } from "@/src/features/authoring/questions/violationCopy";
import { ELEMENT_POINTS_NOTICE } from "./elementPointsNotice";
import { ElementPointsNotice, hasElementPoints } from "./InteractionForms";

describe("E-09 eleman puanı uyarısı", () => {
  it("elementPoints doluyken uyarı görünür (sabit metin)", () => {
    render(<ElementPointsNotice answerKey={{ type: "MULTIPLE_RESPONSE", correctOptionIds: ["a"], elementPoints: { a: 2, b: 1 } }} />);
    expect(screen.getByTestId("element-points-notice")).toHaveTextContent(
      "Bu sorunun eleman puanları var ama puanlamaya henüz yansımıyor; kısmi puan eşit bölünür.",
    );
  });

  it.each([null, undefined, {}, [], "x"])("elementPoints boşken (%j) uyarı görünmez", (raw) => {
    const { container } = render(<ElementPointsNotice answerKey={{ type: "TRUE_FALSE", elementPoints: raw }} />);
    expect(container).toBeEmptyDOMElement();
    expect(hasElementPoints({ elementPoints: raw })).toBe(false);
  });

  it("anahtar yoksa görünmez; tip fark etmez (ORDERING, GROUPING ...)", () => {
    const { container } = render(<ElementPointsNotice answerKey={undefined} />);
    expect(container).toBeEmptyDOMElement();
    expect(hasElementPoints({ type: "ORDERING", correctOrder: ["a"], elementPoints: { a: 1 } })).toBe(true);
  });

  it("violationCopy aynı dille not düşer", () => {
    const { text, where } = describeQuestionViolation({ path: "parts[0].answerKey.elementPoints", message: "Toplam puan tutmuyor." } as never);
    expect(where).toContain("Eleman puanları");
    expect(text).toBe(`Toplam puan tutmuyor. ${ELEMENT_POINTS_NOTICE}`);
  });
});
