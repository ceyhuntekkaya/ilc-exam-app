import { cn } from "@/src/lib/utils/cn";

export type TimelineItem = {
  id: string;
  title: string;
  at?: string;
  note?: string;
  current?: boolean;
};

export function StatusTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="grid gap-0">
      {items.map((item, index) => (
        <li key={item.id} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1 h-3 w-3 rounded-full border-2",
                item.current ? "border-primary bg-primary" : "border-border-strong bg-surface",
              )}
              aria-hidden
            />
            {index < items.length - 1 ? <span className="w-px flex-1 bg-border" aria-hidden /> : null}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-fg">{item.title}</p>
            {item.at ? <p className="text-xs text-fg-muted">{item.at}</p> : null}
            {item.note ? <p className="mt-1 text-sm text-fg-muted">{item.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
