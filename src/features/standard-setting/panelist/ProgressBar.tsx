import { formatProgress, progressPercent } from "@/src/features/standard-setting/model";

/** Panelist ilerleme göstergesi: kaydedilmiş puanlanan madde / toplam. */
export function ProgressBar({ label, done, total }: { label: string; done?: number; total?: number }) {
  const percent = progressPercent(done, total);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="font-medium text-fg">{label}</span>
        <span className="numeric text-fg-muted">
          {formatProgress(done, total)} · %{percent}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
