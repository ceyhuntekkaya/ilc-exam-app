import { cn } from "@/src/lib/utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

// İnce iç halka (ring-current/15): açık zeminde rozet kenarı belirgin, renk tek kaynaktan.
const tones: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-fg-muted ring-neutral-300/60",
  success: "bg-success-bg text-success ring-current/15",
  warning: "bg-warning-bg text-warning ring-current/15",
  danger: "bg-danger-bg text-danger ring-current/15",
  info: "bg-info-bg text-info ring-current/15",
  brand: "bg-primary-50 text-primary ring-current/15",
};

/** dot: hap şeklinde, başında renkli nokta (panel tablolarındaki durum rozeti). */
export function Badge({ tone = "neutral", dot = false, children }: { tone?: Tone; dot?: boolean; children: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", dot ? "gap-1.5 rounded-full" : "rounded-md", tones[tone])}>
      {dot ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
