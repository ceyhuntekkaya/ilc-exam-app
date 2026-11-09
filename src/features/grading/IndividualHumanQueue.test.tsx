import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const calls: { url: string; method: string; body?: unknown }[] = [];
const POOL = "pool-company-id-from-backend";
const row = (n: number, extra: Record<string, unknown> = {}) => ({
  answer: { text: `cevap ${n}` },
  mediaIds: [],
  transcripts: [],
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
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url === "/grading/individual-pool") return { data: { companyId: POOL }, status: 200 };
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

describe("IndividualHumanQueue (R-30)", () => {
  it("varsayılan sekme AWAITING; sekme filtresi uca reason olarak geçer", async () => {
    renderWithProviders(<IndividualHumanQueue />);
    expect(await screen.findByText("Aday 1")).toBeInTheDocument();
    // kimlik backend'den gelir (sabit yok)
    expect(calls[0].url).toBe("/grading/individual-pool");
    expect(calls[1].url).toContain(`/companies/${POOL}/grading/human-queue?`);
    expect(calls[1].url).toContain("reason=AWAITING");
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
      expect(calls).toContainEqual({ url: `/companies/${POOL}/answers/a3/evaluation/approve`, method: "POST", body: undefined }),
    );
  });

  it("kart tam: cevap metni görünür; AWAITING satırında puan girip Kaydet PUT evaluation çağırır", async () => {
    renderWithProviders(<IndividualHumanQueue />);
    const card = await screen.findByTestId("answer-card-a1");
    expect(within(card).getByText("cevap 1")).toBeInTheDocument();
    fireEvent.change(within(card).getByLabelText(/Sınav soru puanı/), { target: { value: "8" } });
    fireEvent.click(within(card).getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT" && c.url.includes("/answers/a1/evaluation"))).toBe(true));
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.body).toMatchObject({ finalScore: 8 });
  });

  it("AI puanlı satırda Değiştir alanları açar ve Kaydet PUT ile insan puanı yazar", async () => {
    renderWithProviders(<IndividualHumanQueue />);
    await screen.findByText("Aday 1");
    fireEvent.click(screen.getByRole("button", { name: /Gözden geçirilmedi/ }));
    const card = await screen.findByTestId("answer-card-a3");
    expect(within(card).getByLabelText(/Sınav soru puanı/)).toBeDisabled();
    fireEvent.click(within(card).getByRole("button", { name: "Değiştir" }));
    fireEvent.change(within(card).getByLabelText(/Sınav soru puanı/), { target: { value: "9" } });
    fireEvent.click(within(card).getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT" && c.url.includes("/answers/a3/evaluation"))).toBe(true));
  });

  it("satır → kart çevirisi AI puanını ve nedeni taşır, reviewedBy boş bırakır", () => {
    const card = humanQueueRowToCard(row(9, { aiScore: 4, scoreSource: "AI_ACCEPTED", escapeReason: "MODEL_ERROR" }));
    expect(card).toMatchObject({ finalScore: 4, scored: true, reviewedBy: null, escapeReason: "MODEL_ERROR", answer: { text: "cevap 9" } });
  });
});
