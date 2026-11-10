import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const addMock = vi.fn();
const query = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
const BRANCH_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const IDENTITY_ID = "bbbbbbbb-0000-0000-0000-000000000002";

let rules: unknown[] = [];

vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  getTargetRulesQueryKey: (id: string) => [`/r/${id}`],
  getPreviewQueryKey: (id: string) => [`/p/${id}`],
  useTargetRules: () => query(rules),
  useAddTargetRule: () => ({ mutateAsync: addMock, isPending: false }),
  useRemoveTargetRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/src/api/generated/org-units/org-units", () => ({
  useList20: () =>
    query({
      items: [
        { id: "root", name: "Kurum", unitType: "ROOT", childCount: 1 },
        { id: "camp", parentId: "root", name: "Kampüs A", unitType: "INSTITUTE", childCount: 1 },
        { id: BRANCH_ID, parentId: "camp", name: "9-A", unitType: "BRANCH", childCount: 0 },
      ],
    }),
}));
vi.mock("@/src/api/mutator", () => ({
  customInstance: vi.fn(async () => ({
    data: [
      { id: "u1", ilcIdentityId: IDENTITY_ID, firstName: "Ali", lastName: "Yılmaz", studentNumber: "12", status: "ACTIVE" },
      { id: "u2", firstName: "Veli", lastName: "Can", status: "ACTIVE" },
    ],
  })),
}));

const { TargetingStep } = await import("./TargetingStep");

function renderStep() {
  return renderWithProviders(<TargetingStep companyId="c1" distributionId="d1" onBack={vi.fn()} onNext={vi.fn()} />);
}

describe("TargetingStep", () => {
  afterEach(() => {
    addMock.mockReset();
    rules = [];
  });

  it("şube listeden seçilir; kural seçilen şubenin kimliğiyle yazılır", async () => {
    addMock.mockResolvedValue({});
    renderStep();

    expect(screen.queryByLabelText(/kimliği/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/^Şube/), { target: { value: BRANCH_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Kuralı ekle" }));

    await waitFor(() =>
      expect(addMock).toHaveBeenCalledWith({
        distributionId: "d1",
        data: { type: "UNIT", exclude: false, refId: BRANCH_ID, includeSubtree: false },
      }),
    );
  });

  it("şube seçilmeden kural eklenmez", () => {
    renderStep();
    fireEvent.click(screen.getByRole("button", { name: "Kuralı ekle" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bir şube seçin.");
    expect(addMock).not.toHaveBeenCalled();
  });

  it("öğrenci adıyla seçilir; değer ilcIdentityId; bağlanmamış hesap için uyarı", async () => {
    addMock.mockResolvedValue({});
    renderStep();

    fireEvent.change(screen.getByLabelText(/Kural türü/), { target: { value: "STATIC_LIST" } });
    expect(await screen.findByText(/1 öğrencinin hesabı henüz/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Öğrenci/), { target: { value: IDENTITY_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Kuralı ekle" }));

    await waitFor(() =>
      expect(addMock).toHaveBeenCalledWith({
        distributionId: "d1",
        data: { type: "STATIC_LIST", exclude: false, refId: IDENTITY_ID },
      }),
    );
  });

  it("eklenen kurallarda kimlik yerine şube yolu ve öğrenci adı görünür", async () => {
    rules = [
      { id: "r1", type: "UNIT", refId: BRANCH_ID, includeSubtree: false, exclude: false },
      { id: "r2", type: "STATIC_LIST", refId: IDENTITY_ID, exclude: true },
    ];
    renderStep();

    const list = screen.getByRole("list");
    expect(within(list).getByText("Kampüs A › 9-A")).toBeInTheDocument();
    expect(await within(list).findByText("Ali Yılmaz (12)")).toBeInTheDocument();
    expect(within(list).queryByText(/bbbbbbbb/)).toBeNull();
  });
});
