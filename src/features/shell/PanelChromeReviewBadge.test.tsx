import { renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";

const calls: string[] = [];
vi.mock("next/navigation", () => ({ usePathname: () => "/staff" }));
vi.mock("@/src/components/auth-provider", () => ({
  useAuth: () => ({ user: { companyId: "company-1", displayName: "Personel" }, signOut: vi.fn(), loading: false }),
}));
vi.mock("@/src/api/mutator", () => ({
  customInstance: vi.fn(async (url: string) => {
    calls.push(url);
    return { data: { items: [], page: 0, size: 1, total: 3 }, status: 200 };
  }),
}));

const { PanelProvider } = await import("@/src/features/panel/PanelContext");
const { PanelChrome } = await import("./PanelChrome");
const { visibleNav } = await import("@/src/config/panel-nav");
const { Perm } = await import("@/src/lib/permissions");

describe("menü açık talep rozeti (R-32)", () => {
  it("açık talep sayısı status=OPEN&size=1 'total' üzerinden gösterilir", async () => {
    renderWithProviders(
      <PanelProvider role="STAFF" basePath="/staff">
        <PanelChrome panel="staff" title="Personel" homeHref="/staff" groups={visibleNav("STAFF", [Perm.assignmentEvaluate], "company-1")}>
          <p>içerik</p>
        </PanelChrome>
      </PanelProvider>,
    );
    const badge = await screen.findByTestId("review-open-badge");
    expect(badge).toHaveTextContent("3");
    expect(badge).toHaveAttribute("aria-label", "3 açık talep");
    await waitFor(() => expect(calls).toEqual(["/companies/company-1/review-requests?status=OPEN&page=0&size=1"]));
  });

  it("menüde 'İnceleme talepleri' yoksa (izin yok) sayı sorgulanmaz", async () => {
    calls.length = 0;
    renderWithProviders(
      <PanelProvider role="STAFF" basePath="/staff">
        <PanelChrome panel="staff" title="Personel" homeHref="/staff" groups={visibleNav("STAFF", [Perm.assignmentManage], "company-1")}>
          <p>içerik</p>
        </PanelChrome>
      </PanelProvider>,
    );
    await screen.findByText("içerik");
    expect(screen.queryByTestId("review-open-badge")).not.toBeInTheDocument();
    expect(calls).toEqual([]);
  });
});
