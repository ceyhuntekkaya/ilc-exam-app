/** Kutu yazılamayan iş diske girmez. Yenileme, blob'u olmayan bir işi diriltmez. */
export function jobsToPersist<T extends { applicationId: string; durable?: boolean }>(stored: T[], live: T[]): T[] {
  const rest = stored.filter((job) => !live.some((item) => item.applicationId === job.applicationId));
  return [...rest, ...live.filter((job) => job.durable)];
}
