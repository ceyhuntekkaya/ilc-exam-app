// Editörden (zengin metin) gelen HTML için ortak yardımcılar. Vitrin ve panel aynı temizleme kuralını kullanır.

// Adres özniteliğinin gerçek şeması: HTML varlıkları (&#106; &#x6A; &colon; &Tab;) çözülür, kontrol karakterleri ve
// boşluklar atılır (tarayıcı URL ayrıştırırken aynısını yapar); "java&#x09;script:" gibi kodlanmış hileler yakalanır.
function unsafeUrl(raw: string): boolean {
  const value = raw
    .replace(/^["']|["']$/g, "")
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16) || 32))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCodePoint(Number(dec) || 32))
    .replace(/&(colon|tab|newline);/gi, (_, name: string) => ({ colon: ":", tab: "\t", newline: "\n" })[name.toLowerCase()] ?? "")
    .replace(/[\u0000- ]/g, "")
    .toLowerCase();
  return /^(javascript|vbscript|data):/.test(value);
}

/**
 * Çalıştırılabilir içerikleri (script, iframe, svg/math, olay öznitelikleri, javascript: bağlantıları) ayıklar.
 * Olay özniteliği yalnız boşluktan değil "/" ya da tırnaktan sonra da gelebilir (`<svg/onload=…>`, `<img src="x"/onerror=…>`).
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|svg|math|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|svg|math|noscript|template|base|meta|link|frame|frameset)\b[^>]*>/gi, "")
    // Öznitelik temizliği yalnız etiketlerin içinde: metindeki "online=1" gibi ifadeler bozulmaz.
    .replace(/<[a-zA-Z](?:"[^"]*"|'[^']*'|[^'">])*>/g, (tag) =>
      tag
        .replace(/([\s/"'])on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "$1")
        .replace(/([\s/"'])((?:xlink:)?href|src|action|formaction|srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (whole, sep: string, name: string, value: string) =>
          unsafeUrl(value) || name.toLowerCase() === "srcdoc" ? sep : whole,
        ),
    )
    .replace(/javascript:/gi, "");
}

// Panelde gösterilen, başkasının yazdığı metinler (satıcı açıklaması, sözleşme) için izinli liste: yalnız biçim etiketleri kalır.
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "b", "strong", "i", "em", "u", "s", "sub", "sup", "small", "mark", "span", "div",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "a", "img",
]);
// İçeriğiyle birlikte atılan etiketler (metni de anlamsız ya da tehlikeli).
const DROPPED_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|svg|math|textarea|select|title|head)\b[\s\S]*?<\/\1\s*>/gi;
// Yalnız açık şemalı ya da site içi adresler; kodlanmış "javascript:" gibi hileler desene uymadığı için düşer.
const SAFE_URL = /^(https?:\/\/|mailto:|\/(?!\/)|#)[^"'<>\s]*$/i;

function safeAttribute(tag: string, attrs: string, name: "href" | "src"): string {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs);
  const value = (match?.[2] ?? match?.[3] ?? match?.[4] ?? "").trim();
  if (!value || !SAFE_URL.test(value)) return "";
  const extra = tag === "a" ? ' target="_blank" rel="noopener noreferrer nofollow"' : ' alt="" loading="lazy"';
  return ` ${name}="${value}"${extra}`;
}

/**
 * Katı temizleme (izinli liste): izin verilmeyen etiketler atılır, izinlilerde öznitelik bırakılmaz
 * (bağlantıda yalnız güvenli `href`, görselde yalnız güvenli `src`). Stil/sınıf/olay öznitelikleri hiç geçmez.
 */
export function sanitizeRichText(html: string): string {
  // Bir etiket silinince çevresi yeni etiket oluşturabilir ("<<x>img onerror=…>"): sonuç değişmeyene kadar tekrarlanır.
  let current = html;
  for (let pass = 0; pass < 10; pass++) {
    const next = sanitizePass(current);
    if (next === current) return next;
    current = next;
  }
  // Yakınsamayan (kötü niyetli) girdi: biçim bırakılmaz, düz metin gösterilir.
  return htmlToText(current).replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[char] as string);
}

function sanitizePass(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(DROPPED_WITH_CONTENT, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (whole, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (tag === "font") {
        if (whole.startsWith("</")) return "</span>";
        const color = safeColor(attrs);
        return color ? `<span style="color: ${color}">` : "<span>";
      }
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (whole.startsWith("</")) return `</${tag}>`;
      if (tag === "a") return `<a${safeAttribute(tag, attrs, "href")}>`;
      if (tag === "img") {
        const src = safeAttribute(tag, attrs, "src");
        return src ? `<img${src}>` : "";
      }
      return `<${tag}${safeStyle(attrs)}>`;
    });
}

/** Editörün ürettiği hizalama ve palet rengi; başka stil (konum, url, expression) geçmez. */
function safeStyle(attrs: string): string {
  const match = /\sstyle\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  const raw = (match?.[2] ?? match?.[3] ?? match?.[4] ?? "").toLowerCase();
  const kept: string[] = [];
  for (const decl of raw.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    const name = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (name === "text-align" && /^(left|center|right)$/.test(value)) kept.push(`text-align: ${value}`);
    if (name === "color") {
      const color = safeColorValue(value);
      if (color) kept.push(`color: ${color}`);
    }
  }
  return kept.length ? ` style="${kept.join("; ")}"` : "";
}

function safeColor(attrs: string): string | null {
  const fromStyle = safeStyle(attrs).match(/color:\s*(#[0-9a-f]{3,6})/i)?.[1] ?? null;
  if (fromStyle) return fromStyle;
  const match = /\scolor\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  return safeColorValue(match?.[2] ?? match?.[3] ?? match?.[4] ?? "");
}

function safeColorValue(value: string): string | null {
  const color = value.trim().toLowerCase();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(color) ? color : null;
}

/** Metin HTML etiketi içeriyor mu (editör çıktısı mı, düz metin mi). */
export function isHtml(value: string): boolean {
  return /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i.test(value);
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };

/** HTML'i okunur düz metne çevirir: blok etiketleri satır sonu olur, diğer etiketler atılır (liste hücresi, önizleme, öneri değeri için). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
