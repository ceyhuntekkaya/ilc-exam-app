import type { UiLocale } from "@/src/lib/i18n/locale";

/**
 * Sözlük (bkz. ilc-parent/plan/faz-0/F0-11-i18n.md). Bu paket toplu metin taşımaz —
 * tek bir örnek anahtar, altyapının çalıştığını göstermek için (StudentResultView'daki
 * deneme, bkz. o dosya).
 */
const dictionary = {
  tr: {
    "student.reportCard.title": "Karne",
  },
  en: {
    "student.reportCard.title": "Report card",
  },
} as const satisfies Record<UiLocale, Record<string, string>>;

export type DictionaryKey = keyof (typeof dictionary)["tr"];

export function t(key: DictionaryKey, locale: UiLocale): string {
  return dictionary[locale][key];
}
