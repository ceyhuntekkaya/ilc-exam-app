import { formatTry } from "@/src/lib/format/money";

export function AmountDelta({
  snapshot,
  current,
  delta,
}: {
  snapshot: string | number | null | undefined;
  current: string | number | null | undefined;
  delta?: string | number | null;
}) {
  return (
    <p className="text-sm text-fg">
      <span className="text-fg-muted">At order </span>
      <span className="numeric">{formatTry(snapshot)}</span>
      <span className="text-fg-muted"> · current </span>
      <span className="numeric">{formatTry(current)}</span>
      {delta != null && delta !== "" ? (
        <>
          <span className="text-fg-muted"> · difference </span>
          <span className="numeric">{typeof delta === "number" || typeof delta === "string" ? formatTry(delta) : delta}</span>
        </>
      ) : null}
    </p>
  );
}
