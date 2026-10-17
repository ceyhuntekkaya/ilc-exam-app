export type ChoicePaint = "success" | "danger" | "key" | "plain";

/** Anahtar görünürse şık kendi doğru/yanlışını boyar. Gizliyken seçili satır soru hükmünden gelir. */
export function choicePaint(
  choice: { selected: boolean; correct: boolean },
  keyVisible: boolean,
  verdict: string,
): ChoicePaint {
  if (keyVisible) {
    if (choice.selected && choice.correct) return "success";
    if (choice.selected && !choice.correct) return "danger";
    if (!choice.selected && choice.correct) return "key";
    return "plain";
  }
  if (!choice.selected) return "plain";
  if (verdict === "CORRECT") return "success";
  if (verdict === "WRONG") return "danger";
  return "plain";
}

export function answerKeyVisible(choices: { correct: boolean }[]) {
  return choices.some((choice) => choice.correct);
}
