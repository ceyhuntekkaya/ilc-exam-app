const istanbul = new Intl.DateTimeFormat("tr-TR", {
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
  if (start) return `${start} tarihinden itibaren`;
  if (end) return `${end} tarihine kadar`;
  return "Tarih sınırı yok";
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null || seconds <= 0) return "Süresiz";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export function formatClock(ms: number | null) {
  if (ms == null) return "Süresiz";
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function attemptLabel(status: string, reason?: string | null) {
  if (reason === "PROCTOR_LIMIT") return "Gözetim sınırı";
  if (reason === "EXAM_TIME_UP") return "Süre doldu";
  if (reason === "WINDOW_CLOSED") return "Süre penceresi kapandı";
  if (status === "SUBMITTED") return "Teslim edildi";
  if (status === "AUTO_SUBMITTED") return "Otomatik teslim";
  if (status === "IN_PROGRESS" || status === "CHECKING" || status === "READY") return "Devam ediyor";
  if (status === "INVALIDATED") return "Geçersiz";
  return status;
}

export function sectionStatusLabel(status?: string | null) {
  switch (status) {
    case "LOCKED":
      return "Kilitli";
    case "AVAILABLE":
      return "Açık";
    case "ACTIVE":
      return "Devam ediyor";
    case "LEFT":
      return "Ara verildi";
    case "COMPLETED":
      return "Tamamlandı";
    case "EXPIRED":
      return "Süre doldu";
    default:
      return "Başlanmadı";
  }
}
