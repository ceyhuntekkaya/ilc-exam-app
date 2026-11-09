import type { SheetItem } from "@/src/api/generated/models";

export type SheetPart = { id: string; type: string; stemHtml: string[]; options: Array<{ id: string; text: string }> };
export type SheetContent = { instructionHtml: string; stimulusHtml: string[]; parts: SheetPart[] };

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `{html}` | string → metin; diğerleri boş. */
function html(value: unknown): string {
  if (typeof value === "string") return value;
  if (isObject(value) && typeof value.html === "string") return value.html;
  return "";
}

function textBlocks(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter(isObject)
    .filter((b) => b.type === "TEXT")
    .map((b) => html(b.text))
    .filter((s) => s.trim() !== "");
}

/**
 * Panelist kâğıdındaki maddenin okunur metni. Yalnız yönerge, uyaran/gövde metni, parça kökü ve seçenek METİNLERİ alınır;
 * anahtar (`answerKey`), puanlama ve zorluk alanları BİLEREK okunmaz — panelist doğru cevabı ya da zorluğu görmemeli
 * (Angoff değerlendirmesi yanlı olur). Medya blokları metne çevrilmez; `hasMedia` ile ayrıca bildirilir.
 */
export function sheetContent(item: Pick<SheetItem, "body" | "parts">): SheetContent {
  const body = isObject(item.body) ? item.body : {};
  const parts: SheetPart[] = (item.parts ?? []).map((raw, index) => {
    const part = isObject(raw) ? raw : {};
    const content = isObject(part.content) ? part.content : {};
    const interaction = isObject(content.interaction) ? content.interaction : content;
    const optionsRaw = Array.isArray(interaction.options) ? interaction.options : [];
    return {
      id: typeof part.id === "string" ? part.id : String(index),
      type: typeof part.interactionType === "string" ? part.interactionType : "",
      stemHtml: textBlocks(content.stem),
      options: optionsRaw.filter(isObject).map((o, i) => ({ id: typeof o.id === "string" ? o.id : String(i), text: html(o.text) })).filter((o) => o.text.trim() !== ""),
    };
  });
  return { instructionHtml: html(body.instruction), stimulusHtml: textBlocks(body.stimulus), parts };
}

export function hasMedia(item: Pick<SheetItem, "body" | "parts">): boolean {
  const body = isObject(item.body) ? item.body : {};
  const stimulus = Array.isArray(body.stimulus) ? body.stimulus : [];
  const bodyMedia = Boolean(isObject(body.mainAudio) && body.mainAudio.mediaId) || stimulus.some((b) => isObject(b) && b.type !== "TEXT");
  const partMedia = (item.parts ?? []).some((raw) => {
    const content = isObject(raw) && isObject(raw.content) ? raw.content : {};
    return Array.isArray(content.stem) && content.stem.some((b) => isObject(b) && b.type !== "TEXT");
  });
  return bodyMedia || partMedia;
}
