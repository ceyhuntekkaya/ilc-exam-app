import type { InteractionType, Skill } from "@/src/features/authoring/shared/client";

export type ScoringMode = "ALL_OR_NOTHING" | "PARTIAL" | "PARTIAL_WITH_PENALTY" | "RUBRIC";

export type TemplateSpec = {
  type: InteractionType;
  label: string;
  hint: string;
  defaultSkill: Skill;
  scoringModes: ScoringMode[];
  requiresRubric: boolean;
  autoGradable: boolean;
};

export const TEMPLATE_REGISTRY: TemplateSpec[] = [
  {
    type: "MULTIPLE_CHOICE",
    label: "Çoktan seçmeli",
    hint: "Tek doğru seçenek; hızlı otomatik puanlama.",
    defaultSkill: "READING",
    scoringModes: ["ALL_OR_NOTHING"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "MULTIPLE_RESPONSE",
    label: "Çoklu seçim",
    hint: "Birden fazla doğru; kısmi puan desteklenir.",
    defaultSkill: "READING",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL", "PARTIAL_WITH_PENALTY"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "TRUE_FALSE",
    label: "Doğru / Yanlış",
    hint: "İfadeleri True/False/Not given ile işaretle.",
    defaultSkill: "READING",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "FILL_IN_THE_BLANKS",
    label: "Boşluk doldurma",
    hint: "Metinde seçenekli boşluklar veya kelime bankası.",
    defaultSkill: "USE_OF_ENGLISH",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "SHORT_ANSWER",
    label: "Kısa cevap",
    hint: "Serbest yazım; kabul edilen cevap listesiyle otomatik.",
    defaultSkill: "WRITING",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "MATCHING",
    label: "Eşleştirme",
    hint: "Sol-sağ eşleme; sağ öğe yeniden kullanılabilir.",
    defaultSkill: "READING",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "ORDERING",
    label: "Sıralama",
    hint: "Öğeleri doğru sıraya koy.",
    defaultSkill: "READING",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "GROUPING",
    label: "Gruplama",
    hint: "Öğeleri etiketli gruplara yerleştir.",
    defaultSkill: "READING",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "HOTSPOT_SELECT",
    label: "Hotspot seç",
    hint: "Görsel üzerinde bölge seçimi.",
    defaultSkill: "READING",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "HOTSPOT_PLACE",
    label: "Hotspot yerleştir",
    hint: "Öğeleri görsel bölgelerine sürükle.",
    defaultSkill: "READING",
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL"],
    requiresRubric: false,
    autoGradable: true,
  },
  {
    type: "OPEN_ENDED",
    label: "Açık uçlu yazma",
    hint: "Writing görevi; rubrik zorunlu (yayın).",
    defaultSkill: "WRITING",
    scoringModes: ["RUBRIC"],
    requiresRubric: true,
    autoGradable: false,
  },
  {
    type: "AUDIO_RESPONSE",
    label: "Sesli cevap",
    hint: "Speaking veya Listening. Öğrenci ses kaydeder; transkript rubriğe göre AI ile puanlanır.",
    defaultSkill: "SPEAKING",
    scoringModes: ["RUBRIC"],
    requiresRubric: true,
    autoGradable: false,
  },
  {
    type: "VIDEO_RESPONSE",
    label: "Video cevap",
    hint: "Video kaydı veya yükleme; rubrik gerekir.",
    defaultSkill: "SPEAKING",
    scoringModes: ["RUBRIC"],
    requiresRubric: true,
    autoGradable: false,
  },
  {
    type: "IMAGE_RESPONSE",
    label: "Görsel yükleme",
    hint: "Aday görsel yükler; rubrik ile puanlanır.",
    defaultSkill: "WRITING",
    scoringModes: ["RUBRIC"],
    requiresRubric: true,
    autoGradable: false,
  },
];

export function getTemplate(type: string | null | undefined): TemplateSpec | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.type === type);
}
