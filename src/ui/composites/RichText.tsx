import { cn } from "@/src/lib/utils/cn";
import { isHtml, sanitizeRichText } from "@/src/lib/utils/html";

/**
 * Editörden gelen açıklama metni: HTML ise izinli listeyle (sanitizeRichText) temizlenip biçimli (başlık, liste, kalın, tablo) gösterilir;
 * düz metinse satır sonları korunur. Ham etiketler (`<p>`, `<strong>`) hiçbir zaman ekrana yazılmaz.
 */
export function RichText({ value, className }: { value: string; className?: string }) {
  const base = "text-[13px] leading-relaxed text-fg-muted";
  if (!isHtml(value)) return <p className={cn(base, "whitespace-pre-line", className)}>{value}</p>;
  return (
    <div
      className={cn(
        base,
        "min-w-0 break-words",
        "[&_a]:text-primary [&_a]:underline [&_b]:text-fg [&_strong]:text-fg",
        "[&_h1]:mt-3 [&_h1]:text-[15px] [&_h1]:font-semibold [&_h1]:text-fg [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-fg [&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-fg [&_h4]:mt-3 [&_h4]:font-semibold [&_h4]:text-fg",
        "[&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1",
        "[&_blockquote]:mt-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3",
        "[&_table]:mt-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-bg [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-fg",
        "[&_img]:mt-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md",
        "[&>*:first-child]:mt-0",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}
