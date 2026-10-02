import { authoringFetch } from "@/src/features/authoring/shared/api";

export type VersionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "RETIRED";
export type InteractionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_IN_THE_BLANKS"
  | "SHORT_ANSWER"
  | "MATCHING"
  | "ORDERING"
  | "OPEN_ENDED"
  | "AUDIO_RESPONSE"
  | string;
export type Skill =
  | "READING"
  | "LISTENING"
  | "WRITING"
  | "SPEAKING"
  | "GRAMMAR"
  | "VOCABULARY"
  | "USE_OF_ENGLISH";
export type CefrLevel = "PRE_A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

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
  calibrationStatus?: string;
  exposureCount?: number;
};

export type QuestionDetail = {
  versionId: string;
  questionId: string;
  code: string;
  versionNo: number;
  status: VersionStatus;
  body: unknown;
  cefrLevel?: CefrLevel | null;
  mebGrade?: number | null;
  ageBand?: string | null;
  tagIds?: string[];
  parts: Array<{
    id: string;
    position: number;
    interactionType: InteractionType;
    skill?: Skill | null;
    maxScore: number;
    content: unknown;
    answerKey: unknown;
    outcomeIds?: string[];
    difficulty?: number | null;
    rubricVersionId?: string | null;
  }>;
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
  sections: Array<{
    id: string;
    title: string;
    skill: string;
    displayOrder: number;
    subSections: Array<{
      id: string;
      title: string;
      taskType?: string | null;
      displayOrder: number;
      selectionMode: string;
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
  listQuestions: (params?: { status?: string; cefr?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.cefr) sp.set("cefr", params.cefr);
    if (params?.q) sp.set("q", params.q);
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
  updatePart: (versionId: string, partId: string, body: Record<string, unknown>) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/parts/${partId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  submitQuestion: (versionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/submit-review`, {
      method: "POST",
    }),
  approveQuestion: (versionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/versions/${versionId}/approve`, {
      method: "POST",
    }),
  validateQuestion: (versionId: string, publish = false) =>
    authoringFetch<Array<{ severity: string; path: string; message: string }>>(
      `/authoring/questions/versions/${versionId}/validate?publish=${publish}`,
    ),
  impact: (questionId: string) =>
    authoringFetch<{ examCount: number; publishedExamCount: number }>(
      `/authoring/questions/${questionId}/impact`,
    ),
  cloneQuestion: (questionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/${questionId}/clone`, { method: "POST" }),
  newVersion: (questionId: string) =>
    authoringFetch<QuestionDetail>(`/authoring/questions/${questionId}/new-version`, {
      method: "POST",
    }),
  listExams: (status?: string) =>
    authoringFetch<ExamListItem[]>(
      `/authoring/exams${status ? `?status=${status}` : ""}`,
    ),
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
  addSection: (id: string, title: string, skill: string) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${id}/sections`, {
      method: "POST",
      body: JSON.stringify({ title, skill }),
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
  attachQuestion: (examId: string, subId: string, questionVersionId: string, points?: number) =>
    authoringFetch<ExamDetail>(`/authoring/exams/${examId}/sub-sections/${subId}/questions`, {
      method: "POST",
      body: JSON.stringify({ questionVersionId, points }),
    }),
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
  uploadMedia: (kind: string, mimeType: string, filename: string) =>
    authoringFetch<{ mediaId: string; completeUrl: string }>("/authoring/media/upload-url", {
      method: "POST",
      body: JSON.stringify({ kind, mimeType, filename }),
    }),
  completeMedia: (id: string, body: Record<string, unknown>) =>
    authoringFetch<MediaItem>(`/authoring/media/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listReviews: (status?: string) =>
    authoringFetch<ReviewItem[]>(
      `/authoring/reviews${status ? `?status=${status}` : ""}`,
    ),
  listTags: () => authoringFetch<Array<{ id: string; name: string }>>("/authoring/tags"),
  createTag: (name: string) =>
    authoringFetch<{ id: string; name: string }>("/authoring/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  listAgeBands: () =>
    authoringFetch<Array<{ id: string; code: string; label: string }>>("/authoring/age-bands"),
  listOutcomes: () =>
    authoringFetch<
      Array<{ id: string; code: string; description: string; skill?: string; cefrLevel?: string }>
    >("/authoring/outcomes"),
  createOutcome: (body: Record<string, unknown>) =>
    authoringFetch("/authoring/outcomes", { method: "POST", body: JSON.stringify(body) }),
  listRubrics: () =>
    authoringFetch<Array<{ id: string; code: string; name: string; skill: string }>>(
      "/authoring/rubrics",
    ),
  createRubric: (body: Record<string, unknown>) =>
    authoringFetch("/authoring/rubrics", { method: "POST", body: JSON.stringify(body) }),
  listFormats: () =>
    authoringFetch<
      Array<{ id: string; code: string; name: string; description?: string; skeleton?: unknown }>
    >("/authoring/formats"),
  createFormat: (body: Record<string, unknown>) =>
    authoringFetch("/authoring/formats", { method: "POST", body: JSON.stringify(body) }),
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
};
