import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** R-30: puanlama ekranı kuyruğa geçti. Tarayıcı AI sonucunu KAYDETMEZ (ai-evaluation / PUT evaluation çağrılmaz). */
const calls: { url: string; method: string; body?: unknown }[] = [];
let queueItems: Record<string, unknown>[] = [];
let runStatuses: Record<string, unknown>[] = [];

function reply(url: string, init?: RequestInit) {
  const method = init?.method ?? "GET";
  calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
  const path = url.split("?")[0];
  if (path.endsWith("/grading") && path.includes("/assignments/")) return { data: queueItems };
  if (path.endsWith("/grading/summary"))
    return { data: { submitted: 3, grace: 0, awaitingAuto: 0, awaitingManual: 1, ready: 1, published: 0, awaitingAudit: 2, unreviewedAi: 1 } };
  if (path.endsWith("/ai-request-preview")) return { data: [] };
  if (path.endsWith("/grading-prerequisites")) return { data: { missingCount: 0 } };
  if (path.endsWith("/ai-prompts")) return { data: { items: [{ questionVersionId: "qv-1", questionCode: "W1", versionNo: 1, questionOrder: 4, currentExam: true }], editable: true } };
  if (path.endsWith("/grading/ai-runs") && method === "POST")
    return { data: { runIds: ["run-1"], queued: 2, skippedScored: 1, skippedGrace: 0, skippedPublished: 0, skippedActive: 0 }, status: 200 };
  if (path.includes("/grading/ai-runs/")) return { data: runStatuses.shift() ?? runStatuses[0], status: 200 };
  if (path.endsWith("/ai-jobs")) return { data: { runId: "run-s", jobId: "j1", queued: true }, status: 200 };
  if (path.endsWith("/evaluation/approve")) return { data: { answerId: "a2", source: "HUMAN", finalScore: 6, versionNo: 3 }, status: 200 };
  return { data: {} };
}

vi.mock("@/src/api/mutator", () => ({
  customInstance: vi.fn(async (url: string, init?: RequestInit) => reply(url, init)),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/src/features/panel/PanelContext", () => ({
  useOpsHref: () => ({ assignments: "/staff/exams/assignments", grading: (id: string) => `/staff/grading/${id}`, gradingBoard: "/staff/grading" }),
}));
vi.mock("@/src/features/assignments/assignmentScope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/features/assignments/assignmentScope")>();
  return {
    ...actual,
    AssignmentScopeFields: () => null,
    useAssignmentScope: () => ({
      query: "x",
      filters: { instituteId: "", yearId: "", examVersionId: "ev-1", gradeId: "", branchId: "" },
      writeFilters: vi.fn(),
      campusId: "",
      seasonId: "",
      examValue: "ev-1",
      gradeValue: "",
      branchValue: "",
      assignments: [],
      gradingId: "",
      listError: null,
      listLoading: false,
      listFailed: false,
      refetchLists: vi.fn(),
      ready: true,
    }),
  };
});

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { GradingSection } = await import("./GradingSection");

const base = { applicationId: "app-1", attemptNo: 1, interactionType: "OPEN_ENDED", scored: false, published: false, mediaIds: [], transcripts: [], examPoints: 10 };

beforeEach(() => {
  calls.length = 0;
  runStatuses = [{ status: "COMPLETED", total: 2, done: 1, failed: 0, awaitingReview: 1, pending: 0, running: 0 }];
  queueItems = [
    { ...base, answerId: "a1", studentName: "Ada", answer: { text: "cevap bir" }, questionVersionId: "qv-1", jobStatus: "AWAITING_REVIEW", escapeReason: "PROMPT_MISSING" },
    { ...base, answerId: "a2", studentName: "Bora", answer: { text: "cevap iki" }, scored: true, finalScore: 6, scoreSource: "AI_ACCEPTED", reviewedBy: null, rationale: "iyi", feedback: "güzel" },
    { ...base, answerId: "a3", studentName: "Cem", answer: { text: "cevap üç" }, jobStatus: "PENDING" },
  ];
});
afterEach(() => vi.clearAllMocks());

const urls = () => calls.map((c) => `${c.method} ${c.url.split("?")[0]}`);

describe("GradingSection (R-30)", () => {
  it("Tümünü değerlendir ai-runs çağırır; ai-evaluation ve PUT evaluation çağırmaz", async () => {
    renderWithProviders(<GradingSection companyId="co-1" assignmentId="as-1" />);
    const button = await screen.findByRole("button", { name: "Tümünü değerlendir" });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(urls()).toContain("POST /companies/co-1/grading/ai-runs"));
    const run = calls.find((c) => c.url.endsWith("/grading/ai-runs"));
    expect(run?.body).toEqual({ assignmentIds: ["as-1"] });
    expect(urls().some((u) => u.includes("ai-evaluation"))).toBe(false);
    expect(urls().some((u) => u.startsWith("PUT") && u.includes("/evaluation"))).toBe(false);
  });

  it("koşum sorgulanır; bitince liste ve özet yeniden çekilir", async () => {
    renderWithProviders(<GradingSection companyId="co-1" assignmentId="as-1" />);
    const button = await screen.findByRole("button", { name: "Tümünü değerlendir" });
    await waitFor(() => expect(button).not.toBeDisabled());
    const listBefore = () => calls.filter((c) => c.url.includes("/assignments/as-1/grading")).length;
    const summaryBefore = () => calls.filter((c) => c.url.includes("/grading/summary")).length;
    const l0 = listBefore();
    const s0 = summaryBefore();
    fireEvent.click(button);
    await waitFor(() => expect(urls()).toContain("GET /companies/co-1/grading/ai-runs/run-1"));
    // run-1 bitmiş döndü: onFinished liste + özeti bir daha çeker.
    await waitFor(() => expect(listBefore()).toBeGreaterThan(l0 + 1));
    await waitFor(() => expect(summaryBefore()).toBeGreaterThan(s0 + 1));
  });

  it("rozetler ve özet sayaçları: eksik AI metni, sırada, gözden geçirilmedi, denetim bekliyor", async () => {
    renderWithProviders(<GradingSection companyId="co-1" assignmentId="as-1" />);
    expect(await screen.findAllByText("Bu sorunun AI metni yok")).not.toHaveLength(0);
    expect(screen.getByText("Sırada")).toBeInTheDocument();
    expect(within(screen.getByTestId("answer-card-a2")).getByText("AI puanı — gözden geçirilmedi")).toBeInTheDocument();
    // özet çubuğu
    await waitFor(() => expect(screen.getAllByText("Denetim bekliyor").length).toBeGreaterThan(0));
    expect(screen.getAllByText(/2 deneme denetim bekliyor/).length).toBeGreaterThan(0);
    // eksik AI metni listesi: soru tekil, "AI metni" sekmesine bağlantı
    const missing = screen.getByTestId("missing-prompts");
    expect(missing).toHaveTextContent("4. soru (W1)");
    expect(missing).toHaveTextContent("1 cevap insan kuyruğunda");
  });

  it("Onayla approve çağırır, puanı yeniden yazmaz (PUT yok); Değiştir alanları açar", async () => {
    renderWithProviders(<GradingSection companyId="co-1" assignmentId="as-1" />);
    const card = await screen.findByTestId("answer-card-a2");
    const inCard = within(card);
    // AI puanlı kartta alanlar kilitli; Değiştir açar
    expect(inCard.getByLabelText(/Sınav soru puanı/)).toBeDisabled();
    fireEvent.click(inCard.getByRole("button", { name: "Değiştir" }));
    expect(inCard.getByLabelText(/Sınav soru puanı/)).not.toBeDisabled();
    fireEvent.click(inCard.getByRole("button", { name: "Onayla" }));
    await waitFor(() => expect(urls()).toContain("POST /companies/co-1/answers/a2/evaluation/approve"));
    expect(urls().some((u) => u.startsWith("PUT"))).toBe(false);
  });

  it("tek cevap AI ile değerlendir ai-jobs çağırır", async () => {
    renderWithProviders(<GradingSection companyId="co-1" assignmentId="as-1" />);
    const card = await screen.findByTestId("answer-card-a1");
    fireEvent.click(within(card).getByRole("button", { name: "AI ile Değerlendir" }));
    await waitFor(() => expect(urls()).toContain("POST /companies/co-1/answers/a1/ai-jobs"));
    expect(urls().some((u) => u.includes("ai-evaluation"))).toBe(false);
  });
});
