import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const calls: { url: string; method: string }[] = [];
const row = (n: number, extra: Record<string, unknown> = {}) => ({
  answerId: `a${n}`,
  applicationId: `app${n}`,
  candidateName: `Aday ${n}`,
  examTitle: "ILC Placement",
  interactionType: "OPEN_ENDED",
  examPoints: 10,
  submittedAt: "2026-11-01T10:00:00Z",
  ...extra,
});

vi.mock("@/src/api/mutator", () => ({
  customInstance: vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET" });
    if (url.includes("/grading/human-queue")) {
      const reason = new URL(url, "http://x").searchParams.get("reason");
      const items =
        reason === "AUDIT_PENDING"
          ? [row(2, { aiScore: 7, scoreSource: "AI_ACCEPTED", auditPending: true })]
          : reason === "UNREVIEWED_AI"
            ? [row(3, { aiScore: 5, scoreSource: "AI_ACCEPTED" })]
            : [row(1, { escapeReason: "POLICY_HUMAN", jobStatus: "AWAITING_REVIEW" })];
      return { data: { items, page: 0, size: 20, total: items.length }, status: 200 };
    }
    return { data: { answerId: "a2", source: "HUMAN" }, status: 200 };
  }),
}));

const { IndividualHumanQueue, humanQueueRowToCard } = await import("./IndividualHumanQueue");

afterEach(() => {
  calls.length = 0;
});

const POOL = "a0000000-0000-7000-8000-000000000020";

describe("IndividualHumanQueue (R-30)", () => {
  it("varsayılan sekme AWAITING; sekme filtresi uca reason olarak geçer", async () => {
    renderWithProviders(<IndividualHumanQueue />);
    expect(await screen.findByText("Aday 1")).toBeInTheDocument();
    expect(calls[0].url).toContain(`/companies/${POOL}/grading/human-queue?`);
    expect(calls[0].url).toContain("reason=AWAITING");
    expect(screen.getByText("Bu sınav insan puanlaması istiyor")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Denetim bekliyor/ }));
    expect(await screen.findByText("Aday 2")).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("reason=AUDIT_PENDING"))).toBe(true);
    expect(within(screen.getByTestId("answer-card-a2")).getByText("Denetim bekliyor")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Gözden geçirilmedi/ }));
    expect(await screen.findByText("Aday 3")).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("reason=UNREVIEWED_AI"))).toBe(true);
  });

  it("AI puanlı satırda Onayla approve çağırır; insana düşen satırda Onayla yok", async () => {
    renderWithProviders(<IndividualHumanQueue />);
    await screen.findByText("Aday 1");
    expect(within(screen.getByTestId("answer-card-a1")).queryByRole("button", { name: "Onayla" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Gözden geçirilmedi/ }));
    const card = await screen.findByTestId("answer-card-a3");
    fireEvent.click(within(card).getByRole("button", { name: "Onayla" }));
    await waitFor(() =>
      expect(calls).toContainEqual({ url: `/companies/${POOL}/answers/a3/evaluation/approve`, method: "POST" }),
    );
  });

  it("satır → kart çevirisi AI puanını ve nedeni taşır, reviewedBy boş bırakır", () => {
    const card = humanQueueRowToCard(row(9, { aiScore: 4, scoreSource: "AI_ACCEPTED", escapeReason: "MODEL_ERROR" }));
    expect(card).toMatchObject({ finalScore: 4, scored: true, reviewedBy: null, escapeReason: "MODEL_ERROR" });
  });
});
