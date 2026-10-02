"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";

export function Tabs({
  items,
}: {
  items: { id: string; label: string; panel: ReactNode }[];
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const current = items.find((item) => item.id === active) ?? items[0];
  if (!current) return null;
  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {items.map((item) => {
          const selected = item.id === current.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "min-h-11 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap",
                selected ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="mt-4">
        {current.panel}
      </div>
    </div>
  );
}
