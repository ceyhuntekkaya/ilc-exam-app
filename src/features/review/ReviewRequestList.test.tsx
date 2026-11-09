import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const POOL = "pool-company-from-backend";
const item = (n: number, extra: Record<string, unknown> = {}) => ({
  reviewRequestId: `rr${n}`,
  status: "OPEN",
  candidateName: `Aday ${n}`,
  examTitle: "ILC Placement",
  reason: `Neden ${n}`,
  requestedAt: "2026-11-01T10:00:00Z",
  ...extra,
});

vi.mock("@/src/features/panel/PanelContext", () => ({
  usePanel: () => ({ role: "SUPER_ADMIN", basePath: "/admin", companyId: null }),
  useCan: () => true,
}));
vi.mock("@/src/api/mutator", () => ({
  customInstance: vi.fn(async (url: string) => {
    calls.push(url);
    if (url === "/grading/individual-pool") return { data: { companyId: POOL }, status: 200 };
    const status = new URL(url, "http://x").searchParams.get("status");
    const items =
      status === "RESOLVED"
        ? [item(2, { status: "RESOLVED", outcome: "CHANGED", resolvedAt: "2026-11-03T10:00:00Z" })]
        : [item(1)];
    return { data: { items, page: 0, size: 20, total: items.length }, status: 200 };
  }),
}));

const { ReviewRequestList } = await import("./ReviewRequestList");

afterEach(() => {
  calls.length = 0;
});

describe("ReviewRequestList (R-32)", () => {
  it("varsayılan Açık sekmesi status=OPEN ile istenir; kurum kimliği backend'den (havuz) gelir", async () => {
    renderWithProviders(<ReviewRequestList />);
    expect(await screen.findByText("Aday 1")).toBeInTheDocument();
    expect(calls[0]).toBe("/grading/individual-pool");
    expect(calls[1]).toBe(`/companies/${POOL}/review-requests?status=OPEN&page=0&size=20`);
    expect(screen.getByText("Neden 1")).toBeInTheDocument();
    expect(screen.getByText("Açık", { selector: "span" })).toBeInTheDocument();
  });

  it("Sonuçlanan sekmesi filtreyi uca status=RESOLVED olarak geçirir ve sonucu gösterir", async () => {
    renderWithProviders(<ReviewRequestList />);
    await screen.findByText("Aday 1");
    fireEvent.click(screen.getByRole("button", { name: /Sonuçlanan/ }));
    expect(await screen.findByText("Aday 2")).toBeInTheDocument();
    await waitFor(() => expect(calls.some((u) => u.includes("status=RESOLVED&page=0"))).toBe(true));
    expect(screen.getByText("Puan güncellendi")).toBeInTheDocument();
  });

  it("satır, ayrıntıya kurum kapsamıyla bağlanır", async () => {
    renderWithProviders(<ReviewRequestList />);
    const link = await screen.findByRole("link", { name: "Aday 1" });
    expect(link).toHaveAttribute("href", `/admin/review-requests/rr1?kurum=${POOL}`);
  });
});
