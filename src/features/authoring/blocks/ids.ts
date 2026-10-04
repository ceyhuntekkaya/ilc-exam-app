export function newId(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
}

export function stabilizeId(raw: string, fallbackPrefix = "id"): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return cleaned || newId(fallbackPrefix);
}

/** Next free `prefix1`, `prefix2`, … among existing ids (e.g. s1, s2). */
export function nextSequentialId(prefix: string, existing: Iterable<string>): string {
  const used = new Set(existing);
  let n = 1;
  while (used.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}
