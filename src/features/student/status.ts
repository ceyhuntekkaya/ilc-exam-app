import type { AssignmentCard } from "@/src/features/exam-flow/schema";
import type { KidTone } from "@/src/features/student/ui";

/** Ana sayfa grupları: şimdi girilebilir, yakında açılacak, bitenler. */
export type ExamGroup = "now" | "soon" | "done";

export function examGroup(card: AssignmentCard): ExamGroup {
  if (card.cta === "START" || card.cta === "RESUME") return "now";
  if (card.blockedReason === "NOT_OPEN_YET") return "soon";
  return "done";
}

export function examStatus(card: AssignmentCard): { tone: KidTone; label: string } {
  if (card.cta === "RESUME") return { tone: "sun", label: "Yarım kaldı" };
  if (card.cta === "START") return { tone: "sky", label: card.attemptsUsed > 0 ? "Yeniden girebilirsin" : "Hazır" };
  if (card.blockedReason === "NOT_OPEN_YET") return { tone: "neutral", label: "Yakında" };
  if (card.attempts.some((attempt) => attempt.finishedAt)) return { tone: "mint", label: "Tamamlandı" };
  return { tone: "neutral", label: "Süresi geçti" };
}

export function sectionTone(status?: string | null): { tone: KidTone; label: string } {
  switch (status) {
    case "LOCKED":
      return { tone: "neutral", label: "Kilitli" };
    case "ACTIVE":
      return { tone: "sun", label: "Devam ediyor" };
    case "LEFT":
      return { tone: "sun", label: "Ara verdin" };
    case "COMPLETED":
      return { tone: "mint", label: "Bitti" };
    case "EXPIRED":
      return { tone: "coral", label: "Süre doldu" };
    default:
      return { tone: "sky", label: "Hazır" };
  }
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" });
const timeOnly = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
const longDay = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", weekday: "long" });

/** Çocuğun okuyabileceği tarih: "Bugün 14:00", "Yarın 09:30", "12 Ekim Pazartesi 10:00". */
export function friendlyWhen(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const key = dayKey.format(date);
  const time = timeOnly.format(date);
  if (key === dayKey.format(today)) return `Bugün ${time}`;
  if (key === dayKey.format(tomorrow)) return `Yarın ${time}`;
  return `${longDay.format(date)} ${time}`;
}

/** Ad içinden ilk ismi al: "Ayşe Nur Kaya" → "Ayşe". */
export function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? "";
}
