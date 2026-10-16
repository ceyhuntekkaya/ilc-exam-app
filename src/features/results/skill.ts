/** Sınav bölümünün becerisi → ortak beceri rengi (theme-colors.css `--color-skill-*`). */
export type SkillFamily = "reading" | "listening" | "writing" | "speaking" | "language";

const FAMILY: Record<string, SkillFamily> = {
  READING: "reading",
  LISTENING: "listening",
  WRITING: "writing",
  SPEAKING: "speaking",
  GRAMMAR: "language",
  VOCABULARY: "language",
  USE_OF_ENGLISH: "language",
};

export function skillFamily(skill?: string | null): SkillFamily | null {
  return skill ? FAMILY[skill.trim().toUpperCase()] ?? null : null;
}

/** Tailwind sınıfları tam yazılı kalmalı; dinamik birleştirilen sınıf derlenmez. */
export const skillClass: Record<SkillFamily, { solid: string; ink: string; tint: string }> = {
  reading: { solid: "bg-skill-reading", ink: "text-skill-reading-ink", tint: "bg-skill-reading-tint" },
  listening: { solid: "bg-skill-listening", ink: "text-skill-listening-ink", tint: "bg-skill-listening-tint" },
  writing: { solid: "bg-skill-writing", ink: "text-skill-writing-ink", tint: "bg-skill-writing-tint" },
  speaking: { solid: "bg-skill-speaking", ink: "text-skill-speaking-ink", tint: "bg-skill-speaking-tint" },
  language: { solid: "bg-skill-language", ink: "text-skill-language-ink", tint: "bg-skill-language-tint" },
};
