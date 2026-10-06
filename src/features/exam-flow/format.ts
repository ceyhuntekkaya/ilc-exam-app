const istanbul = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatWhen(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return istanbul.format(date);
}

export function formatRange(from?: string | null, until?: string | null) {
  const start = formatWhen(from);
  const end = formatWhen(until);
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return "No date limit";
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null || seconds <= 0) return "No time limit";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatClock(ms: number | null) {
  if (ms == null) return "No time limit";
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function attemptLabel(status: string, reason?: string | null) {
  if (reason === "PROCTOR_LIMIT") return "Stopped for safety";
  if (reason === "EXAM_TIME_UP") return "Time is up";
  if (reason === "WINDOW_CLOSED") return "The test closed";
  if (status === "SUBMITTED") return "Sent";
  if (status === "AUTO_SUBMITTED") return "Sent automatically";
  if (status === "IN_PROGRESS" || status === "CHECKING" || status === "READY") return "In progress";
  if (status === "INVALIDATED") return "Not valid";
  return status;
}

export function sectionStatusLabel(status?: string | null) {
  switch (status) {
    case "LOCKED":
      return "Locked";
    case "AVAILABLE":
      return "Open";
    case "ACTIVE":
      return "In progress";
    case "LEFT":
      return "On a break";
    case "COMPLETED":
      return "Finished";
    case "EXPIRED":
      return "Time is up";
    default:
      return "Not started";
  }
}
