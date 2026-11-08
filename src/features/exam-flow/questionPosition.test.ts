import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPositionFailureStats,
  itemMatchesPosition,
  positionIdOf,
  resetPositionFailureStats,
  sendQuestionPosition,
  type PositionItem,
} from "@/src/features/exam-flow/questionPosition";

const QUESTION_VERSION_ID = "11111111-1111-7111-8111-111111111111"; // examQuestionId (QuestionVersion)
const PART_A = "22222222-2222-7222-8222-22222222222a";
const PART_B = "22222222-2222-7222-8222-22222222222b";

const item: PositionItem = {
  examQuestionId: QUESTION_VERSION_ID,
  question: { parts: [{ id: PART_A }, { id: PART_B }] },
};
const session = { applicationId: "app-1", sessionToken: "tok" };

afterEach(() => {
  resetPositionFailureStats();
  vi.restoreAllMocks();
});

describe("positionIdOf — sunucunun beklediği kimlik uzayı", () => {
  it("QuestionVersion kimliğini (examQuestionId) DEĞİL, ilk parçanın question_part.id'sini verir", () => {
    expect(positionIdOf(item)).toBe(PART_A);
    expect(positionIdOf(item)).not.toBe(QUESTION_VERSION_ID);
  });

  it("parçası olmayan soru için null verir (yanlış kimliğe düşmez)", () => {
    expect(positionIdOf({ examQuestionId: QUESTION_VERSION_ID, question: { parts: [] } })).toBeNull();
    expect(positionIdOf({ examQuestionId: QUESTION_VERSION_ID, question: {} })).toBeNull();
    expect(positionIdOf(undefined)).toBeNull();
  });

  it("boş/eksik kimlikli parçaları atlar", () => {
    expect(positionIdOf({ question: { parts: [{ id: "" }, { id: null }, { id: PART_B }] } })).toBe(PART_B);
  });
});

describe("itemMatchesPosition — kaldığı soruyu bulma", () => {
  it("sunucunun saklayıp döndürdüğü PARÇA kimliğiyle eşleşir (çok parçalı sorunun herhangi bir parçası)", () => {
    expect(itemMatchesPosition(item, PART_A)).toBe(true);
    expect(itemMatchesPosition(item, PART_B)).toBe(true);
  });

  it("eski examQuestionId değeriyle de eşleşir; boş/bilinmeyen kimlikle eşleşmez", () => {
    expect(itemMatchesPosition(item, QUESTION_VERSION_ID)).toBe(true);
    expect(itemMatchesPosition(item, "baska")).toBe(false);
    expect(itemMatchesPosition(item, null)).toBe(false);
    expect(itemMatchesPosition(item, undefined)).toBe(false);
  });
});

describe("sendQuestionPosition", () => {
  it("sunucuya PARÇA kimliğini gönderir (examQuestionId değil)", async () => {
    const put = vi.fn().mockResolvedValue({});
    await sendQuestionPosition(put, session, "sec-1", item);
    expect(put).toHaveBeenCalledWith("app-1", "tok", "sec-1", PART_A);
    expect(put).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), QUESTION_VERSION_ID);
  });

  it("parçası olmayan soruda hiçbir şey göndermez", () => {
    const put = vi.fn();
    expect(sendQuestionPosition(put, session, "sec-1", { question: { parts: [] } })).toBeNull();
    expect(put).not.toHaveBeenCalled();
  });

  it("sunucu reddini YUTMAZ: sayar ve konsola yazar, ama sınav akışını kesmez (fırlatmaz)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rejection = Object.assign(new Error("Bilinmeyen itemId: x"), { status: 400 });
    const put = vi.fn().mockRejectedValue(rejection);

    await expect(sendQuestionPosition(put, session, "sec-1", item)).resolves.toBeUndefined();

    expect(getPositionFailureStats()).toEqual({ failures: 1, lastStatus: 400, lastMessage: "Bilinmeyen itemId: x" });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0][1]).toMatchObject({ sectionId: "sec-1", itemId: PART_A, status: 400 });
  });

  it("ağ hatasında (status yok) da sayılır", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await sendQuestionPosition(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")), session, "s", item);
    expect(getPositionFailureStats()).toMatchObject({ failures: 1, lastStatus: null, lastMessage: "Failed to fetch" });
  });
});
