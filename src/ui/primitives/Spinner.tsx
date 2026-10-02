export function Spinner({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-fg-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
      {label}
    </span>
  );
}
