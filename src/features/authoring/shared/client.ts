import { authoringFetch } from "@/src/features/authoring/shared/api";

export type VersionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "RETIRED";
export type InteractionType =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_RESPONSE"
  | "TRUE_FALSE"
  | "FILL_IN_THE_BLANKS"
  | "SHORT_ANSWER"
  | "MATCHING"
  | "ORDERING"
  | "GROUPING"
  | "HOTSPOT_SELECT"
  | "HOTSPOT_PLACE"
  | "OPEN_ENDED"
  | "AUDIO_RESPONSE"
  | "VIDEO_RESPONSE"
  | "IMAGE_RESPONSE";
export type Skill =
  | "READING"
  | "LISTENING"
  | "WRITING"
  | "SPEAKING"
  | "GRAMMAR"
  | "VOCABULARY"
  | "USE_OF_ENGLISH";
export type CefrLevel = "PRE_A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type ScoringMode = "ALL_OR_NOTHING" | "PARTIAL" | "PARTIAL_WITH_PENALTY" | "RUBRIC";

export type QuestionSummary = {
  versionId: string;
  questionId: string;
  code: string;
  versionNo: number;
  status: VersionStatus;
  cefrLevel?: CefrLevel | null;
  ageBand?: string | null;
  primaryType?: InteractionType | null;
  primarySkill?: Skill | null;
  types?: InteractionType[];
  tags?: string[];
  calibrationStatus?: string;
  exposureCount?: number;
};

export type QuestionPart = {
  id: string;
  position: number;
  interactionType: InteractionType;
  skill?: Skill | null;
  maxScore: number;
  content: { stem?: unknown[]; interaction?: Record<string, unknown> } | unknown;
  answerKey: unknown;
  outcomeIds?: string[];
  difficulty?: number | null;
  rubricVersionId?: string | null;
  scoringMode?: ScoringMode | null;
};

export type QuestionBody = {
  /** Wire may be a plain string or `{ html }` depending on client; backend accepts both. */
  instruction?: { html: string } | string | null;
  instructionAudio?: { mediaId: string; playback?: unknown } | null;
  mainAudio?: { type?: string; id?: string; mediaId?: string | null; playback?: unknown } | null;
  stimulus?: unknown[];
};

export type QuestionDetail = {
  versionId: string;
  questionId: string;
  code: string;
  versionNo: number;
  status: VersionStatus;
  body: QuestionBody;
  cefrLevel?: CefrLevel | null;
  mebGrade?: number | null;
  ageBand?: string | null;
  estimatedTimeSec?: number | null;
  timeLimitSec?: number | null;
  securityLevel?: string | null;
  tagIds?: string[];
  parts: QuestionPart[];
  irtA?: number | null;
  irtB?: number | null;
  exposureCount?: number;
  calibrationStatus?: string;
  editable: boolean;
};

export type ExamListItem = {
  id: string;
  code: string;
  title: string;
  status: string;
  purpose: string;
  minLevel: string;
  maxLevel: string;
  versionNumber: number;
};

export type ExamDetail = {
  id: string;
  code: string;
  title: string;
  status: string;
  purpose: string;
  minLevel: string;
  maxLevel: string;
  totalPoints: number;
  durationSeconds?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  welcomeHtml?: string | null;
  descriptionHtml?: string | null;
  versionNumber: number;
  session?: Record<string, unknown> | null;
  navigation?: Record<string, unknown> | null;
  media?: Record<string, unknown> | null;
  randomization?: Record<string, unknown> | null;
  scoring?: Record<string, unknown> | null;
  results?: Record<string, unknown> | null;
  attemptPolicy?: Record<string, unknown> | null;
  proctoring?: Record<string, unknown> | null;
  scoreBands?: Array<{
    id: string;
    sectionId?: string | null;
    minPercent: number;
    maxPercent: number;
    cefrLevel?: string | null;
    label: string;
    passing: boolean;
    awardUnits?: number | null;
    canDoHtml?: string | null;
    displayOrder: number;
  }>;
  sections: Array<{
    id: string;
    title: string;
    skill: string;
    displayOrder: number;
    instructionsHtml?: string | null;
    durationSeconds?: number | null;
    breakAfterSeconds?: number | null;
    weightPercent?: number | null;
    minPassingPercent?: number | null;
    subSections: Array<{
      id: string;
      title: string;
      taskType?: string | null;
      displayOrder: number;
      selectionMode: string;
      selectionCount?: number | null;
      bankCriteria?: Record<string, unknown> | null;
      blueprint?: Record<string, unknown> | null;
      questions: Array<{
        id: string;
        questionId: string;
        questionVersionId: string;
        displayOrder: number;
        role: string;
        points: number;
      }>;
    }>;
  }>;
};

export type MediaItem = {
  id: string;
  kind: string;
  status: string;
  mimeType: string;
  altText?: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
  durationMs?: number | null;
  sizeBytes?: number | null;
  originalFilename?: string | null;
  transcript?: string | null;
  license?: string | null;
  contentUrl?: string | null;
};

export type ReviewItem = {
  id: string;
  targetType: string;
  targetId: string;
  status: string;
  submittedBy: string;
  assignedTo?: string | null;
  submittedAt: string;
};

export const authoringApi = {
  listQuestions: (params?: { status?: string; cefr?: string; q?: string; skill?: string; type?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.cefr) sp.set("cefr", params.cefr);
    if (params?.q) sp.set("q", params.q);
    if (params?.skill) sp.set("skill", params.skill);
    if (params?.type) sp.set("type", params.type);
    const qs = sp.toString();
    return authoringFetch<QuestionSummary[]>(`/authoring/questions${qs ? `?${qs}` : ""}`);
  },
  createQuestion: (body: { interactionType?: string; skill?: string }) =>
    authoringFetch<QuestionDetail>("/authoring/questions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getQuestion: (versionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}`),
  updateMetadata: (versionId: string, body: Record<string, unknown>) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/metadata`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  updateBody: (versionId: string, body: unknown) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/body`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  addPart: (versionId: string, body: { interactionType: string; skill?: string; maxScore?: number }) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/parts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePart: (versionId: string, partId: string, body: Record<string, unknown>) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/parts/${partId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  movePart: (versionId: string, partId: string, index: number) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/parts/${partId}/move`, {
      method: "PUT",
      body: JSON.stringify({ index }),
    }),
  removePart: (versionId: string, partId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/parts/${partId}`, {
      method: "DELETE",
    }),
  submitQuestion: (versionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/submit-review`, {
      method: "POST",
    }),
  approveQuestion: (versionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/approve`, {
      method: "POST",
    }),
  returnDraft: (versionId: string, note?: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/return-draft`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  validateQuestion: (versionId: string, publish = false) =>
    authoringFetch<Array<{ severity: string; path: string; message: string; code?: string }>>(
      `/authoring/questions/versions/${versionId}/validate?publish=${publish}`,
    ),
  impact: (questionId: string) =>
    authoringFetch<{ examCount: number; publishedExamCount: number; exams?: Array<{ id: string; code: string; title: string; status: string }> }>(
      `/authoring/questions/${questionId}/impact`,
    ),
  cloneQuestion: (questionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/${questionId}/clone`, { method: "POST" }),
  newVersion: (questionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/${questionId}/new-version`, {
      method: "POST",
    }),
  archiveQuestion: (questionId: string) =>
    authoringFetch(`/authoring/questions/${questionId}/archive`, { method: "POST" }),
  listExams: (status?: string) =>
    authoringFetch<ExamListItem[]>(`/authoring/exams${status ? `?status=${status}` : ""}`),
  createExam: (body: Record<string, unknown>) =>
    authoringFetch<ExamDetail>("/authoring/exams", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getExam: (id: string) => authoringFetch<ExamDetail>(`/authoring/exams/${id}`),
  updateExam: (id: string, body: Record<string, unknown>) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  updateExamSettings: (id: string, body: Record<string, unknown>) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/settings`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  addScoreBand: (id: string, body: Record<string, unknown>) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/score-bands`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  removeScoreBand: (id: string, bandId: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/score-bands/${bandId}`, { method: "DELETE" }),
  addSection: (id: string, title: string, skill: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/sections`, {
      method: "POST",
      body: JSON.stringify({ title, skill }),
    }),
  updateSection: (id: string, sectionId: string, body: Record<string, unknown>) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/sections/${sectionId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  removeSection: (id: string, sectionId: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/sections/${sectionId}`, { method: "DELETE" }),
  reorderSections: (id: string, orderedIds: string[]) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/sections/reorder`, {
      method: "PUT",
      body: JSON.stringify({ orderedIds }),
    }),
  addSubSection: (id: string, sectionId: string, title: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/sections/${sectionId}/sub-sections`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  updateSubSection: (id: string, subId: string, body: Record<string, unknown>) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/sub-sections/${subId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  removeSubSection: (id: string, sectionId: string, subId: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/sections/${sectionId}/sub-sections/${subId}`, {
      method: "DELETE",
    }),
  attachQuestion: (examId: string, subId: string, questionVersionId: string, points?: number) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${examId}/sub-sections/${subId}/questions`, {
      method: "POST",
      body: JSON.stringify({ questionVersionId, points }),
    }),
  updateQuestionLink: (examId: string, linkId: string, body: { points?: number; role?: string }) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${examId}/questions/${linkId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  detachQuestion: (examId: string, linkId: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${examId}/questions/${linkId}`, { method: "DELETE" }),
  autoFill: (examId: string, subId: string, count = 5) =>
    authoringFetch<{ added: number }>(
      `/authoring/exams/${examId}/sub-sections/${subId}/auto-fill?count=${count}`,
      { method: "POST" },
    ),
  validateExam: (id: string) =>
    authoringFetch<Array<{ severity: string; path: string; message: string }>>(
      `/authoring/exams/${id}/validate`,
    ),
  publishExam: (id: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/publish`, { method: "POST" }),
  submitExam: (id: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/submit-review`, { method: "POST" }),
  listMedia: (kind?: string) =>
    authoringFetch<MediaItem[]>(`/authoring/media${kind ? `?kind=${kind}` : ""}`),
  uploadMedia: (kind: string, file: File, meta?: {
    durationMs?: number | null;
    altText?: string | null;
    transcript?: string | null;
    license?: string | null;
    source?: string | null;
    attribution?: string | null;
  }) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    if (meta?.durationMs != null) form.append("durationMs", String(meta.durationMs));
    if (meta?.altText) form.append("altText", meta.altText);
    if (meta?.transcript) form.append("transcript", meta.transcript);
    if (meta?.license) form.append("license", meta.license);
    if (meta?.source) form.append("source", meta.source);
    if (meta?.attribution) form.append("attribution", meta.attribution);
    return authoringFetch<MediaItem>("/authoring/media/upload", {
      method: "POST",
      body: form,
    });
  },
  updateMediaMeta: (id: string, body: Record<string, unknown>) =>
    authoringFetch<MediaItem>(`/authoring/media/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  listReviews: (status?: string) =>
    authoringFetch<ReviewItem[]>(`/authoring/reviews${status ? `?status=${status}` : ""}`),
  listTags: () => authoringFetch<Array<{ id: string; name: string }>>("/authoring/tags"),
  createTag: (name: string) =>
    authoringFetch<{ id: string; name: string }>("/authoring/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  listAgeBands: () =>
    authoringFetch<Array<{ id: string; code: string; label: string }>>("/authoring/age-bands"),
  createAgeBand: (body: Record<string, unknown>) =>
    authoringFetch("/authoring/age-bands", { method: "POST", body: JSON.stringify(body) }),
  listOutcomes: () =>
    authoringFetch<
      Array<{ id: string; code: string; description: string; skill?: string; cefrLevel?: string }>
    >("/authoring/outcomes"),
  createOutcome: (body: Record<string, unknown>) =>
    authoringFetch("/authoring/outcomes", { method: "POST", body: JSON.stringify(body) }),
  listRubrics: () =>
    authoringFetch<
      Array<{ id: string; code: string; name: string; skill: string; currentVersionId?: string | null }>
    >("/authoring/rubrics"),
  getRubric: (id: string) =>
    authoringFetch<{
      id: string;
      code: string;
      name: string;
      skill: string;
      versionId: string;
      versionNo: number;
      status: string;
      definition?: unknown;
      maxRawScore?: number;
    }>(`/authoring/rubrics/${id}`),
  createRubric: (body: Record<string, unknown>) =>
    authoringFetch("/authoring/rubrics", { method: "POST", body: JSON.stringify(body) }),
  updateRubricDefinition: (versionId: string, body: Record<string, unknown>) =>
    authoringFetch(`/authoring/rubrics/versions/${versionId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  approveRubric: (versionId: string) =>
    authoringFetch(`/authoring/rubrics/versions/${versionId}/approve`, { method: "POST" }),
  listFormats: () =>
    authoringFetch<
      Array<{ id: string; code: string; name: string; description?: string; skeleton?: unknown }>
    >("/authoring/formats"),
  createFormat: (body: Record<string, unknown>) =>
    authoringFetch("/authoring/formats", { method: "POST", body: JSON.stringify(body) }),
  updateFormat: (id: string, body: Record<string, unknown>) =>
    authoringFetch(`/authoring/formats/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  importQuestions: (rows: Array<Record<string, unknown>>) =>
    authoringFetch<{ rows: Array<{ row: number; ok: boolean; error?: string }> }>(
      "/authoring/import/questions",
      { method: "POST", body: JSON.stringify(rows) },
    ),
  tts: (text: string) =>
    authoringFetch<{ message: string }>("/authoring/helpers/tts", {
      method: "POST",
      body: JSON.stringify({ text, locale: "en-GB" }),
    }),
  stt: (mediaId: string) =>
    authoringFetch<{ transcript: string; message: string }>("/authoring/helpers/stt-transcript", {
      method: "POST",
      body: JSON.stringify({ mediaId }),
    }),
  updateIrt: (versionId: string, a: number, b: number, status: string) =>
    authoringFetch(`/authoring/questions/versions/${versionId}/irt`, {
      method: "PUT",
      body: JSON.stringify({ a, b, status }),
    }),
  history: (questionId: string) =>
    authoringFetch<Array<{ action: string; summary: string; createdAt: string }>>(
      `/authoring/questions/${questionId}/history`,
    ),
  enemies: (questionId: string) =>
    authoringFetch<string[]>(`/authoring/questions/${questionId}/enemies`),
  addEnemy: (questionId: string, enemyId: string) =>
    authoringFetch(`/authoring/questions/${questionId}/enemies/${enemyId}`, { method: "POST" }),
  removeEnemy: (questionId: string, enemyId: string) =>
    authoringFetch(`/authoring/questions/${questionId}/enemies/${enemyId}`, { method: "DELETE" }),
};
