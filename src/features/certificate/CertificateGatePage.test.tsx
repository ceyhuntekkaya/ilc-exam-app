import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const statusState = vi.fn();
const approveMock = vi.fn();
const canMock = vi.fn();

vi.mock("@/src/components/auth-provider", () => ({ useAuth: () => ({ user: { userId: "me" } }) }));
vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => ({ basePath: "/staff" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/staff/content/certificate-gate" }));
vi.mock("@/src/features/psychometrics/central", async (importActual) => ({
  ...(await importActual<typeof import("@/src/features/psychometrics/central")>()),
  useCentralRequest: () => ({ ready: true, tenantId: "hq", request: undefined }),
}));
vi.mock("@/src/api/generated/certificate-approvals/certificate-approvals", () => ({
  useStatus: () => statusState(),
  useApprove2: () => ({ mutateAsync: approveMock, isPending: false }),
  getStatusQueryKey: (id: string) => [`/policy/bundles/${id}/certificate-approvals`],
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { ApprovalPanel, ReadinessReportView } = await import("./CertificateGatePage");

const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  statusState.mockReset();
  canMock.mockReset();
});

describe("ApprovalPanel", () => {
  it("bir onay varken 1/2 gösterir, onaylayanı adlandırır ve kapı açık DEMEZ", () => {
    canMock.mockReturnValue(true);
    statusState.mockReturnValue(
      ok({ bundleId: "b1", certificateEnabledFlag: true, requiredApprovals: 2, distinctApprovers: 1, bundleConditionsMet: false, calibrationCheckedHere: false, approvals: [{ id: "a1", approvedBy: "0190a1b2-c3d4", approvedAt: "2026-11-09T09:00:00Z", note: "Uygundur" }] }),
    );
    renderWithProviders(<ApprovalPanel bundleId="b1" />);
    expect(screen.getByText("1/2 farklı onay")).toBeInTheDocument();
    expect(screen.getByText("Kullanıcı 0190a1b2")).toBeInTheDocument();
    expect(screen.getByText("Demet koşulları sağlanmadı")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("GELMEZ");
    expect(screen.getByRole("button", { name: "Onay ver" })).toBeInTheDocument();
  });

  it("iki onay tamam olsa bile 'Demet koşulları sağlandı' yazar, 'kapı açık' yazmaz", () => {
    canMock.mockReturnValue(true);
    statusState.mockReturnValue(
      ok({ bundleId: "b1", certificateEnabledFlag: true, requiredApprovals: 2, distinctApprovers: 2, bundleConditionsMet: true, calibrationCheckedHere: false, approvals: [{ id: "a1", approvedBy: "x" }, { id: "a2", approvedBy: "me" }] }),
    );
    renderWithProviders(<ApprovalPanel bundleId="b1" />);
    expect(screen.getByText("2/2 farklı onay")).toBeInTheDocument();
    expect(screen.getByText("Demet koşulları sağlandı (bayrak açık + 2 onay)")).toBeInTheDocument();
    expect(screen.queryByText(/Sertifika kapısı AÇIK/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Onay ver" })).not.toBeInTheDocument();
    expect(screen.getByText("Siz")).toBeInTheDocument();
  });

  it("aynı kişi ikinci kez onay veremez (düğme yok); yetkisizde düğme gizli", () => {
    statusState.mockReturnValue(ok({ certificateEnabledFlag: true, requiredApprovals: 2, distinctApprovers: 1, approvals: [{ id: "a1", approvedBy: "me" }] }));
    canMock.mockReturnValue(true);
    const { unmount } = renderWithProviders(<ApprovalPanel bundleId="b1" />);
    expect(screen.queryByRole("button", { name: "Onay ver" })).not.toBeInTheDocument();
    unmount();
    statusState.mockReturnValue(ok({ certificateEnabledFlag: true, requiredApprovals: 2, distinctApprovers: 0, approvals: [] }));
    canMock.mockReturnValue(false);
    renderWithProviders(<ApprovalPanel bundleId="b1" />);
    expect(screen.queryByRole("button", { name: "Onay ver" })).not.toBeInTheDocument();
  });

  it("onay verir: not ile POST, sunucu 409 mesajı aynen gösterilir", async () => {
    canMock.mockReturnValue(true);
    statusState.mockReturnValue(ok({ certificateEnabledFlag: true, requiredApprovals: 2, distinctApprovers: 0, approvals: [] }));
    approveMock.mockRejectedValue(Object.assign(new Error("Demette CERTIFICATE_ENABLED kapalı; onaydan önce merkez yönetimi bayrağı açmalı"), { status: 409 }));
    renderWithProviders(<ApprovalPanel bundleId="b1" />);
    fireEvent.click(screen.getByRole("button", { name: "Onay ver" }));
    const dialog = screen.getByRole("dialog", { name: "Sertifika açma onayı ver" });
    fireEvent.change(within(dialog).getByLabelText(/Not/), { target: { value: "İncelendi" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Onay ver" }));
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith({ bundleId: "b1", data: { note: "İncelendi" } }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("CERTIFICATE_ENABLED kapalı");
  });

  it("403 (merkez dışı) durum okuması hata olarak sunucu mesajıyla gösterilir", () => {
    statusState.mockReturnValue({ isLoading: false, isError: true, error: Object.assign(new Error("Yalnız merkez yetkilisi"), { status: 403 }), refetch: vi.fn() });
    renderWithProviders(<ApprovalPanel bundleId="b1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Yalnız merkez yetkilisi");
  });
});

describe("ReadinessReportView", () => {
  it("kapı kapalıyken eksik koşulları ve tanımsız eşikleri listeler", () => {
    renderWithProviders(
      <ReadinessReportView
        report={{
          ready: false,
          conditions: [
            { name: "CALIBRATED_ITEM_RATIO", thresholdDefined: false, met: false, detail: "Eşik tanımsız" },
            { name: "STANDARD_SETTING_COMPLETE", thresholdDefined: true, met: false },
          ],
          scope: { scoredItemCount: 30 },
          inputs: { calibratedItemRatio: 0, standardSettingComplete: false },
          thresholds: {},
        }}
      />,
    );
    expect(screen.getByText("Sertifika kapısı KAPALI")).toBeInTheDocument();
    expect(screen.getByText("30 puanlanan madde")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("eşik tanımsız");
    expect(screen.getAllByText("Eşik tanımsız").length).toBeGreaterThan(0);
  });
});
