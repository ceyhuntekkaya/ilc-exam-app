import { IconAlert, IconCheck } from "@/src/ui/icons";

// Görünüm ../dis-sepetim components/shared/Alert'ten: rozetli ikon + renkli zemin.
const styles = {
  success: {
    box: "bg-success-50 dark:bg-success-950",
    badge: "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400",
    text: "text-success-700 dark:text-success-400",
    Icon: IconCheck,
  },
  danger: {
    box: "bg-danger-50 dark:bg-danger-950",
    badge: "bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-400",
    text: "text-danger-700 dark:text-danger-400",
    Icon: IconAlert,
  },
};

export function Alert({ variant, children }: { variant: keyof typeof styles; children: string }) {
  const s = styles[variant];
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={`flex items-start gap-3 rounded-lg p-4 ${s.box}`}>
      <span aria-hidden className={`flex size-8 shrink-0 items-center justify-center rounded-full ${s.badge}`}>
        <s.Icon className="size-4" />
      </span>
      <p className={`text-sm ${s.text}`}>{children}</p>
    </div>
  );
}
