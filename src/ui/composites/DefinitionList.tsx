import type { ReactNode } from "react";

/**
 * Panel detaylarındaki alanlar: etiket üstte (küçük, soluk), değer altta (vurgulu). Genişlikte 2–3 sütuna yayılır;
 * uzun metinler (politika, not) `wide` ile tam satır kaplar.
 */
export function DefinitionList({
  items,
}: {
  items: { term: string; description: ReactNode; wide?: boolean }[];
}) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.term} className={item.wide ? "min-w-0 sm:col-span-2 xl:col-span-3" : "min-w-0"}>
          <dt className="text-xs text-fg-subtle">{item.term}</dt>
          <dd className="mt-0.5 text-sm font-medium break-words whitespace-pre-line text-fg">{item.description ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
