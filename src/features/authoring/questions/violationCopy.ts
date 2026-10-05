import { getTemplate } from "@/src/features/authoring/templates/registry";

export type QuestionViolation = {
  path: string;
  code?: string;
  message: string;
};

type PartRef = { interactionType?: string | null };

type Segment = { key: string; index?: number };

const SKIP = new Set(["content", "interaction"]);

/** Alan adı → yazarın ekranda gördüğü etiket. */
const FIELD: Record<string, string> = {
  cefrLevel: "CEFR",
  mebGrade: "MEB sınıfı",
  ageBand: "Yaş bandı",
  estimatedTimeSec: "Tahmini süre",
  timeLimitSec: "Süre limiti",
  parts: "Alt sorular",
  body: "Uyaran",
  instruction: "Yönerge",
  instructionAudio: "Yönerge sesi",
  mainAudio: "Ana dinleme sesi",
  stimulus: "Uyaran",
  stem: "Soru metni",
  text: "Metin",
  options: "Seçenekler",
  left: "Sol taraf",
  right: "Sağ taraf",
  items: "Öğeler",
  blanks: "Boşluklar",
  blankId: "Boşluk adı",
  wordBank: "Kelime bankası",
  choices: "Seçenekler",
  groups: "Gruplar",
  label: "Ad",
  regions: "Bölgeler",
  zones: "Yerleştirme bölgeleri",
  statements: "Maddeler",
  labels: "Etiketler",
  trueLabel: "Doğru etiketi",
  falseLabel: "Yanlış etiketi",
  notGivenLabel: "Belirtilmemiş etiketi",
  mediaId: "Dosya",
  caption: "Altyazı",
  columns: "Kolon sayısı",
  playback: "Oynatma",
  maxPlays: "Dinleme veya izleme hakkı",
  skill: "Beceri",
  difficulty: "Zorluk",
  maxScore: "Puan",
  scoringMode: "Puanlama",
  rubricVersionId: "Rubrik",
  outcomeIds: "Kazanımlar",
  answerKey: "Cevap",
  correctOptionId: "Doğru seçenek",
  correctOptionIds: "Doğru seçenekler",
  correctChoiceIds: "Doğru cevap",
  acceptedAnswers: "Kabul edilen cevaplar",
  correctOrder: "Doğru sıra",
  pairs: "Eşleşmeler",
  groupOf: "Grup ataması",
  correctRegionIds: "Doğru bölgeler",
  zoneOf: "Bölge ataması",
  elementPoints: "Parça puanları",
  sampleAnswers: "Örnek cevap",
  distractors: "Çeldiriciler",
  minSelections: "En az seçim",
  maxSelections: "En fazla seçim",
  minWords: "En az kelime",
  maxWords: "En fazla kelime",
  maxChars: "Karakter sınırı",
  minDurationSec: "En kısa kayıt",
  maxDurationSec: "En uzun kayıt",
  prepTimeSec: "Hazırlık süresi",
  maxAttempts: "Kayıt hakkı",
  maxFiles: "Dosya sayısı",
  maxFileSizeMb: "Dosya boyutu",
  minWidthPx: "En küçük genişlik",
  minHeightPx: "En küçük yükseklik",
  allowedMimeTypes: "Dosya türleri",
  orientation: "Yön",
  draggableFormat: "Sürüklenecek öğe türü",
  draggables: "Sürüklenecek öğeler",
  zoneCapacity: "Bölge kapasitesi",
  shape: "Bölge şekli",
  id: "Kimlik",
  supply: "Seçenek kaynağı",
};

/** İndeksli koleksiyonun tekil adı: options[2] → "3. seçenek". */
const SINGULAR: Record<string, string> = {
  options: "seçenek",
  left: "sol öğe",
  right: "sağ öğe",
  items: "öğe",
  blanks: "boşluk",
  groups: "grup",
  regions: "bölge",
  zones: "bölge",
  statements: "madde",
  wordBank: "kelime",
  choices: "seçenek",
  stimulus: "blok",
  stem: "blok",
  sampleAnswers: "örnek cevap",
  draggables: "sürüklenecek öğe",
};

/** Kimlik çocuklarının okunur adı: answers.s1 okunmaz, boşluk etiketleri okunur. */
const BLANK_PARENTS = new Set(["correctChoiceIds", "acceptedAnswers", "blanks", "blankId"]);

function parsePath(path: string): Segment[] {
  return path.split(".").filter(Boolean).map((token) => {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?$/.exec(token);
    if (!match) return { key: token };
    return { key: match[1], index: match[2] != null ? Number(match[2]) : undefined };
  });
}

function phrase(seg: Segment, parent: string | undefined, parts: PartRef[]): string | null {
  if (SKIP.has(seg.key) && seg.index == null) return null;

  if (seg.key === "parts") {
    if (seg.index == null) return "Alt sorular";
    const label = getTemplate(parts[seg.index]?.interactionType)?.label;
    const base = `${seg.index + 1}. alt soru`;
    return label ? `${base} (${label})` : base;
  }

  if (seg.index != null) {
    const noun = SINGULAR[seg.key] ?? FIELD[seg.key] ?? "öğe";
    return `${seg.index + 1}. ${noun}`;
  }

  if (!(seg.key in FIELD)) {
    if (parent && BLANK_PARENTS.has(parent)) return `[[${seg.key}]]`;
    return null;
  }

  return FIELD[seg.key];
}

export function describeQuestionViolation(
  violation: QuestionViolation,
  parts: PartRef[] = [],
): { where: string; text: string } {
  const segments = parsePath(violation.path);
  const bits: string[] = [];
  segments.forEach((seg, i) => {
    const label = phrase(seg, i > 0 ? segments[i - 1].key : undefined, parts);
    if (label) bits.push(label);
  });
  const where = bits.length ? bits.join(" · ") : "Soru";
  const text = violation.message?.trim() || "Bu alan eksik. İlgili bölümü doldurun.";
  return { where, text };
}

/** Uyarının açması gereken sekme ve alt soru. */
export function focusForViolation(path: string): { panel: number; partIndex: number | null } {
  const part = /parts\[(\d+)\]/.exec(path);
  const partIndex = part ? Number(part[1]) : null;
  if (
    path.startsWith("body") ||
    path.includes("instruction") ||
    path.includes("mainAudio") ||
    path.includes(".stimulus")
  ) {
    return { panel: 2, partIndex };
  }
  if (path.includes("sampleAnswers")) return { panel: 5, partIndex };
  if (
    path.includes("answerKey") ||
    path.includes(".skill") ||
    path.includes("maxScore") ||
    path.includes("scoringMode") ||
    path.includes("difficulty") ||
    path.includes("outcome") ||
    path.includes("rubric") ||
    path.includes("elementPoints")
  ) {
    return { panel: 4, partIndex };
  }
  if (path.includes("parts")) return { panel: 3, partIndex };
  return { panel: 1, partIndex };
}
