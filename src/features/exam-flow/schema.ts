import { z } from "zod";

const absentString = z.string().nullish();
const absentNumber = z.number().nullish();

export const clockSchema = z.object({
  examRemainingMs: absentNumber,
  sectionRemainingMs: absentNumber,
  running: z.boolean(),
  serverNow: z.string(),
  timeWarningSeconds: absentNumber,
});

export const sectionStateSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  questionCount: z.number(),
  durationMs: absentNumber,
  remainingMs: absentNumber,
  status: z.string(),
  canEnter: z.boolean(),
  lockReason: absentString,
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
  finishedReason: absentString,
  acknowledgementAt: absentString,
  requiresMicrophone: z.boolean(),
  requiresCamera: z.boolean(),
  checksPassed: z.array(z.string()),
  sections: z.array(sectionStateSchema),
  clock: clockSchema,
  currentSectionId: absentString,
  currentItemId: absentString,
  answeredItemIds: z.array(z.string()),
  canFinish: z.boolean(),
  proctoring: z.object({
    level: z.enum(["OPEN", "STANDARD", "STRICT"]),
    blockCopyPaste: z.boolean(),
    blockContextMenu: z.boolean(),
    requireFullscreen: z.boolean(),
    focusLossLimit: z.number(),
    focusLossCount: z.number(),
  }),
});

export const attemptSummarySchema = z.object({
  attemptNo: z.number(),
  status: z.string(),
  startedAt: absentString,
  finishedAt: absentString,
  finishedReason: absentString,
});

export const assignmentCardSchema = z.object({
  recipientId: z.string(),
  assignmentId: z.string(),
  examTitle: z.string(),
  status: z.string(),
  availableFrom: absentString,
  availableUntil: absentString,
  attemptsTotal: z.number(),
  attemptsUsed: z.number(),
  attemptsLeft: z.number(),
  totalPoints: absentNumber,
  durationSeconds: absentNumber,
  timingMode: absentString,
  sectionCount: z.number(),
  questionCount: z.number(),
  attempts: z.array(attemptSummarySchema),
  activeApplicationId: absentString,
  cta: z.enum(["START", "RESUME", "NONE"]),
  blockedReason: absentString,
});

export const sectionPreviewSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  questionCount: z.number(),
  durationSeconds: absentNumber,
  status: absentString,
});

export const assignmentPreviewSchema = z.object({
  assignment: assignmentCardSchema,
  welcomeHtml: z.string(),
  welcomeHtmlSha256: z.string(),
  sections: z.array(sectionPreviewSchema),
  acknowledgementAt: absentString,
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
