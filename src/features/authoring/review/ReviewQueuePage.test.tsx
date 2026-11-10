import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listReviews: vi.fn(),
  getQuestion: vi.fn(),
  approveQuestion: vi.fn(),
}));

vi.mock("@/src/features/authoring/shared/client", () => ({ authoringApi: api }));
vi.mock("@/src/features/authoring/shared/tenant", () => ({ useAuthoringTenant: () => ({ tenant: "t1" }) }));
vi.mock("@/src/features/panel/PanelContext", () => ({
  useCan: () => true,
  useContentBasePath: (k: string) => `/staff/content/${k}`,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/src/features/exam-player", () => ({
  QuestionPreviewShell: () => <div data-testid="preview">önizleme</div>,
}));

import { ReviewQueuePage } from "@/src/features/authoring/review/ReviewQueuePage";

const review = (id: string, label: string) => ({
  id,
  targetType: "QUESTION_VERSION",
  targetId: `v-${id}`,
  status: "PENDING",
  submittedBy: "u1",
  submittedAt: new Date().toISOString(),
  label,
});

const detail = (versionId: string, code: string) => ({
  versionId,
  questionId: "q",
  code,
  versionNo: 1,
  status: "IN_REVIEW",
  body: {},
  parts: [],
  editable: false,
});

describe("ReviewQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listReviews.mockResolvedValue({ items: [review("r1", "Soru bir"), review("r2", "Soru iki")], total: 2 });
    api.getQuestion.mockImplementation((id: string) => Promise.resolve(detail(id, id === "v-r1" ? "Q-001" : "Q-002")));
    api.approveQuestion.mockImplementation((id: string) => Promise.resolve(detail(id, "x")));
  });

  it("shows the first item's preview beside the list and approves it without leaving the page", async () => {
    renderWithProviders(<ReviewQueuePage />);

    expect(await screen.findByTestId("preview")).toBeInTheDocument();
    expect(await screen.findByText("Q-001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Onayla" }));
    await waitFor(() => expect(api.approveQuestion).toHaveBeenCalledWith("v-r1"));
    // Onaydan sonra kuyruk yenilenir ve sıradaki soruya geçilir.
    await waitFor(() => expect(api.listReviews).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Q-002")).toBeInTheDocument();
  });

  it("switches the preview when another row is picked", async () => {
    renderWithProviders(<ReviewQueuePage />);
    fireEvent.click(await screen.findByRole("button", { name: /Soru iki/ }));
    expect(await screen.findByText("Q-002")).toBeInTheDocument();
    expect(api.getQuestion).toHaveBeenLastCalledWith("v-r2");
  });
});
