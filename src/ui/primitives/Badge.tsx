import { cn } from "@/src/lib/utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-bg text-fg",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  brand: "bg-info-bg text-primary",
};

/** dot: hap şeklinde, başında renkli nokta (panel tablolarındaki durum rozeti). */
export function Badge({ tone = "neutral", dot = false, children }: { tone?: Tone; dot?: boolean; children: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium", dot ? "gap-1.5 rounded-full" : "rounded-sm", tones[tone], dot && tone === "neutral" && "bg-neutral-100 text-fg-muted")}>
      {dot ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
