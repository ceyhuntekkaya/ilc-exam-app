const ZONE = "Europe/Istanbul";

const stamp = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

/** Anı İstanbul duvar saati olarak basar. */
export function istanbulLabel(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return stamp.format(date);
}

/** `datetime-local` duvar saatini İstanbul anına çevirir. */
export function istanbulInstant(wall: string): string | undefined {
  if (!wall) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMinutes(new Date(guess)) * 60_000;
  const instant = guess - offsetMinutes(new Date(first)) * 60_000;
  return new Date(instant).toISOString();
}

function offsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
  return Math.round((asUtc - date.getTime()) / 60_000);
}
