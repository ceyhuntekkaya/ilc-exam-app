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
  if (card.cta === "RESUME") return { tone: "sun", label: "Not finished" };
  if (card.cta === "START") return { tone: "sky", label: card.attemptsUsed > 0 ? "You can try again" : "Ready" };
  if (card.blockedReason === "NOT_OPEN_YET") return { tone: "neutral", label: "Coming soon" };
  if (card.attempts.some((attempt) => attempt.finishedAt)) return { tone: "mint", label: "Done" };
  return { tone: "neutral", label: "Closed" };
}

export function sectionTone(status?: string | null): { tone: KidTone; label: string } {
  switch (status) {
    case "LOCKED":
      return { tone: "neutral", label: "Locked" };
    case "ACTIVE":
      return { tone: "sun", label: "In progress" };
    case "LEFT":
      return { tone: "sun", label: "On a break" };
    case "COMPLETED":
      return { tone: "mint", label: "Finished" };
    case "EXPIRED":
      return { tone: "coral", label: "Time is up" };
    default:
      return { tone: "sky", label: "Ready" };
  }
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" });
const timeOnly = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
const longDay = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", weekday: "long" });

/** Çocuğun okuyabileceği tarih: "Today 14:00", "Tomorrow 09:30", "Monday 12 October 10:00". */
export function friendlyWhen(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const key = dayKey.format(date);
  const time = timeOnly.format(date);
  if (key === dayKey.format(today)) return `Today ${time}`;
  if (key === dayKey.format(tomorrow)) return `Tomorrow ${time}`;
  return `${longDay.format(date)} ${time}`;
}

/** Ad içinden ilk ismi al: "Ayşe Nur Kaya" → "Ayşe". */
export function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? "";
}
