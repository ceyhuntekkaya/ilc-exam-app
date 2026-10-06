import { z } from "zod";

export const clockSchema = z.object({
  examRemainingMs: z.number().nullable(),
  sectionRemainingMs: z.number().nullable(),
  running: z.boolean(),
  serverNow: z.string(),
  timeWarningSeconds: z.number().optional(),
});

export const sectionStateSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  questionCount: z.number(),
  durationMs: z.number().nullable(),
  remainingMs: z.number().nullable(),
  status: z.string(),
  canEnter: z.boolean(),
  lockReason: z.string().nullable(),
  allowBack: z.boolean(),
  allowSkip: z.boolean(),
  allowFlag: z.boolean(),
  allowReturnAfterLeave: z.boolean(),
  enterCount: z.number(),
});

export const examStateSchema = z.object({
  applicationId: z.string(),
  stage: z.enum(["WELCOME", "DEVICE_CHECK", "SECTION_LIST", "IN_SECTION", "FINISHED"]),
  status: z.string(),
  finishedReason: z.string().nullable(),
  acknowledgementAt: z.string().nullable(),
  requiresMicrophone: z.boolean(),
  requiresCamera: z.boolean(),
  checksPassed: z.array(z.string()),
  sections: z.array(sectionStateSchema),
  clock: clockSchema,
  currentSectionId: z.string().nullable(),
  currentItemId: z.string().nullable(),
  answeredItemIds: z.array(z.string()),
  canFinish: z.boolean(),
});

export const attemptSummarySchema = z.object({
  attemptNo: z.number(),
  status: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  finishedReason: z.string().nullable(),
});

export const assignmentCardSchema = z.object({
  recipientId: z.string(),
  assignmentId: z.string(),
  examTitle: z.string(),
  status: z.string(),
  availableFrom: z.string().nullable(),
  availableUntil: z.string().nullable(),
  attemptsTotal: z.number(),
  attemptsUsed: z.number(),
  attemptsLeft: z.number(),
  totalPoints: z.number().nullable(),
  durationSeconds: z.number().nullable(),
  timingMode: z.string().nullable(),
  sectionCount: z.number(),
  questionCount: z.number(),
  attempts: z.array(attemptSummarySchema),
  activeApplicationId: z.string().nullable(),
  cta: z.enum(["START", "RESUME", "NONE"]),
  blockedReason: z.string().nullable(),
});

export const sectionPreviewSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  questionCount: z.number(),
  durationSeconds: z.number().nullable(),
  status: z.string().nullable(),
});

export const assignmentPreviewSchema = z.object({
  assignment: assignmentCardSchema,
  welcomeHtml: z.string(),
  welcomeHtmlSha256: z.string(),
  sections: z.array(sectionPreviewSchema),
  acknowledgementAt: z.string().nullable(),
});

export const startResultSchema = z.object({
  applicationId: z.string(),
  sessionToken: z.string(),
  attemptNo: z.number(),
  state: examStateSchema,
});

export type ExamState = z.infer<typeof examStateSchema>;
export type SectionState = z.infer<typeof sectionStateSchema>;
export type AssignmentCard = z.infer<typeof assignmentCardSchema>;
export type AssignmentPreview = z.infer<typeof assignmentPreviewSchema>;
export type ClockState = z.infer<typeof clockSchema>;
