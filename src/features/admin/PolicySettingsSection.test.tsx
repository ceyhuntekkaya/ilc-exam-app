import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const changeMock = vi.fn();
const listMock = vi.fn();
const historyMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => ({ role: "SUPER_ADMIN", basePath: "/admin" }) }));
vi.mock("@/src/api/generated/policy-settings/policy-settings", () => ({
  useList1: (key: string) => listMock(key),
  useHistory: (key: string) => historyMock(key),
  useChange: () => ({ mutateAsync: changeMock, isPending: false }),
  getList1QueryKey: (key: string) => [`/settings/policy/${key}`],
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const { PolicySettingsSection } = await import("./PolicySettingsSection");

const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  canMock.mockReset();
  listMock.mockReset();
  historyMock.mockReset();
});

function row(key: string) {
  return screen.getByTestId(`setting-${key}`);
}

describe("PolicySettingsSection", () => {
  it("kayıtlı değeri, kod varsayılanını ve karar bekleyen tanımsız değeri ayrı gösterir", () => {
    canMock.mockReturnValue(true);
    listMock.mockImplementation((key: string) => (key === "APPEAL_WINDOW_DAYS" ? ok([{ id: "1", value: "45", effectiveFrom: "2026-01-01T00:00:00Z", status: "ACTIVE" }]) : ok([])));
    renderWithProviders(<PolicySettingsSection />);
    expect(within(row("APPEAL_WINDOW_DAYS")).getByText("45 gün")).toBeInTheDocument();
    expect(within(row("RETAKE_WAITING_PERIOD_DAYS")).getByText("30 gün")).toBeInTheDocument();
    expect(within(row("RETAKE_WAITING_PERIOD_DAYS")).getByText("Kod varsayılanı")).toBeInTheDocument();
    expect(within(row("ORDER_REFUND_RATE_AFTER_WINDOW")).getByText("Tanımsız")).toBeInTheDocument();
    expect(within(row("ORDER_REFUND_RATE_AFTER_WINDOW")).getByText("Ticari karar bekliyor")).toBeInTheDocument();
    expect(within(row("GUARDIAN_CONSENT_TIMEOUT_DAYS")).getByText("Hukuki karar bekliyor")).toBeInTheDocument();
  });

  it("yetkisizde 'Değiştir' düğmesi yoktur, geçmiş açılabilir", () => {
    canMock.mockReturnValue(false);
    listMock.mockReturnValue(ok([]));
    renderWithProviders(<PolicySettingsSection />);
    expect(screen.queryByRole("button", { name: "Değiştir" })).not.toBeInTheDocument();
    expect(within(row("APPEAL_WINDOW_DAYS")).getByRole("button", { name: "Geçmiş" })).toBeInTheDocument();
  });

  it("planlı (ileri tarihli) değişikliği gösterir", () => {
    canMock.mockReturnValue(true);
    listMock.mockImplementation((key: string) =>
      key === "APPEAL_WINDOW_DAYS" ? ok([{ id: "9", value: "60", effectiveFrom: "2099-01-01T00:00:00Z", status: "ACTIVE" }]) : ok([]),
    );
    renderWithProviders(<PolicySettingsSection />);
    expect(within(row("APPEAL_WINDOW_DAYS")).getByText(/Planlı: 60 gün/)).toBeInTheDocument();
  });

  it("değiştir: gerekçe olmadan gönderilmez; gerekçeyle GLOBAL kapsamlı yeni sürüm yazılır", async () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([]));
    changeMock.mockResolvedValue({ data: {} });
    renderWithProviders(<PolicySettingsSection />);
    fireEvent.click(within(row("APPEAL_WINDOW_DAYS")).getByRole("button", { name: "Değiştir" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Yeni değer/), { target: { value: "45" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(changeMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Değişiklik gerekçesi zorunlu")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Değişiklik gerekçesi/), { target: { value: "Hukuk görüşü 2026/14" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(changeMock).toHaveBeenCalled());
    const call = changeMock.mock.calls[0][0];
    expect(call.key).toBe("APPEAL_WINDOW_DAYS");
    expect(call.data).toMatchObject({ scope: "GLOBAL", value: "45", reason: "Hukuk görüşü 2026/14" });
    expect(new Date(call.data.effectiveFrom).getTime()).toBeGreaterThan(Date.now());
  });

  it("geçersiz değer gönderilmez; sunucu 400 mesajı aynen gösterilir", async () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([]));
    changeMock.mockRejectedValue(Object.assign(new Error("APPEAL_WINDOW_DAYS null olamaz"), { status: 400 }));
    renderWithProviders(<PolicySettingsSection />);
    fireEvent.click(within(row("APPEAL_WINDOW_DAYS")).getByRole("button", { name: "Değiştir" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Yeni değer/), { target: { value: "abc" } });
    fireEvent.change(within(dialog).getByLabelText(/Değişiklik gerekçesi/), { target: { value: "x" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(changeMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Tam sayı girin")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Yeni değer/), { target: { value: "30" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("APPEAL_WINDOW_DAYS null olamaz");
  });

  it("geçmiş penceresi eski → yeni değeri ve gerekçeyi listeler", () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([]));
    historyMock.mockReturnValue(ok([{ id: "h1", key: "APPEAL_WINDOW_DAYS", oldValue: "30", newValue: "45", changedBy: "0190a1b2-c3d4", changedAt: "2026-11-01T10:00:00Z", reason: "Hukuk görüşü" }]));
    renderWithProviders(<PolicySettingsSection />);
    fireEvent.click(within(row("APPEAL_WINDOW_DAYS")).getByRole("button", { name: "Geçmiş" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("30 gün → 45 gün")).toBeInTheDocument();
    expect(within(dialog).getByText(/Gerekçe: Hukuk görüşü/)).toBeInTheDocument();
  });
});
